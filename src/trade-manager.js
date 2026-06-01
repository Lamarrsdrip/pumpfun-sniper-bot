import { pctChange } from './math.js';

export class Position {
  constructor({ mint, name, symbol, entryPrice, sizeSol, score, reasons, openedAt }) {
    this.mint = mint;
    this.name = name;
    this.symbol = symbol;
    this.entryPrice = entryPrice;
    this.sizeSol = sizeSol;
    this.remainingPct = 1;
    this.realizedPnlSol = 0;
    this.score = score;
    this.entryScore = score;
    this.exitScore = null;
    this.reasons = reasons;
    this.openedAt = openedAt;
    this.highPrice = entryPrice;
    this.currentPrice = entryPrice;
    this.unrealizedPnlSol = 0;
    this.unrealizedPct = 0;
    this.stopPrice = entryPrice;
    this.trailingStopPrice = null;
    this.momentumStatus = 'forming';
    this.maxDrawdownPct = 0;
    this.hitTargets = new Set();
    this.closed = false;
  }
}

export class TradeManager {
  constructor(config, broker, events) {
    this.config = config;
    this.broker = broker;
    this.events = events;
    this.positions = new Map();
  }

  async open(snapshot, score, reasons, at = Date.now(), sizeSol) {
    const position = new Position({
      mint: snapshot.mint,
      name: snapshot.name,
      symbol: snapshot.symbol,
      entryPrice: snapshot.price || snapshot.marketCapSol,
      sizeSol,
      score: score.score,
      reasons,
      openedAt: at
    });
    this.positions.set(position.mint, position);
    const execution = await this.broker.buy(position, { maxSlippagePct: this.config.risk.maxSlippagePct });
    this.events.emit('trade:open', { type: 'trade:open', at, position, execution, snapshot });
    return position;
  }

  async update(snapshot, score, at = Date.now()) {
    const position = this.positions.get(snapshot.mint);
    if (!position || position.closed) return;
    const change = pctChange(position.entryPrice, snapshot.price);
    position.currentPrice = snapshot.price;
    position.unrealizedPct = change;
    position.unrealizedPnlSol = position.sizeSol * position.remainingPct * change;
    position.stopPrice = position.entryPrice * (1 - this.config.management.hardStopLossPct);
    position.highPrice = Math.max(position.highPrice, snapshot.price);
    position.maxDrawdownPct = Math.max(position.maxDrawdownPct, snapshot.drawdownFromHighPct);
    if (change >= this.config.management.trailingStartPct) {
      position.trailingStopPrice = position.highPrice * (1 - this.config.management.trailingDistancePct);
    }
    position.momentumStatus = snapshot.recentBuySellRatio > 2.5 ? 'strong' : snapshot.recentBuySellRatio > 1 ? 'stable' : 'fading';

    const emergencyReason = emergencyExitReason(snapshot, change, this.config);
    if (emergencyReason) {
      await this.close(position, snapshot, emergencyReason, at, score);
      return;
    }

    for (const target of this.config.management.takeProfits) {
      if (change >= target.profitPct && !position.hitTargets.has(target.profitPct)) {
        position.hitTargets.add(target.profitPct);
        await this.sellPartial(position, snapshot, target.sellPct, `take profit ${(target.profitPct * 100).toFixed(0)}%`, at);
      }
    }

    const trailStarted = change >= this.config.management.trailingStartPct;
    const trailDrawdown = position.highPrice > 0 ? (position.highPrice - snapshot.price) / position.highPrice : 0;
    if (trailStarted && trailDrawdown >= this.config.management.trailingDistancePct) {
      await this.close(position, snapshot, 'trailing stop after profit', at);
    }
  }

  async sellPartial(position, snapshot, sellPct, reason, at) {
    const pct = Math.min(position.remainingPct, sellPct);
    if (pct <= 0) return;
    const pnlSol = position.sizeSol * pct * pctChange(position.entryPrice, snapshot.price);
    position.realizedPnlSol += pnlSol;
    position.remainingPct -= pct;
    const execution = await this.broker.sell(position, pct, {
      reason,
      maxSlippagePct: this.config.risk.maxSlippagePct,
      exitValueSol: position.sizeSol * pct + pnlSol
    });
    this.events.emit('trade:partialExit', { type: 'trade:partialExit', at, mint: position.mint, pct, pnlSol, reason, execution });
    if (position.remainingPct <= 0.001) await this.close(position, snapshot, 'fully scaled out', at);
  }

  async close(position, snapshot, reason, at = Date.now(), score = null) {
    if (position.closed) return;
    const remaining = position.remainingPct;
    const pnlSol = position.sizeSol * remaining * pctChange(position.entryPrice, snapshot.price);
    position.realizedPnlSol += pnlSol;
    position.remainingPct = 0;
    position.closed = true;
    position.exitScore = score?.score ?? null;
    const execution = await this.broker.sell(position, remaining, {
      reason,
      maxSlippagePct: this.config.risk.maxSlippagePct,
      exitValueSol: position.sizeSol * remaining + pnlSol
    });
    this.positions.delete(position.mint);
    this.events.emit('trade:close', {
      type: 'trade:close',
      at,
      mint: position.mint,
      entryPrice: position.entryPrice,
      exitPrice: snapshot.price,
      pnlSol: position.realizedPnlSol,
      maxDrawdownPct: position.maxDrawdownPct,
      entryScore: position.entryScore,
      exitScore: position.exitScore,
      execution,
      reason
    });
  }
}

function emergencyExitReason(snapshot, change, config) {
  if (change <= -config.management.emergencyStopLossPct) return 'emergency stop loss';
  if (change <= -config.management.hardStopLossPct) return 'hard max loss stop';
  if (snapshot.devSoldPct > config.watch.maxDevSoldPct) return 'dev wallet sold after entry';
  if (snapshot.recentBuySellRatio < 1 / config.risk.abnormalSellPressureRatio) return 'abnormal sell pressure';
  if (snapshot.drawdownFromHighPct > config.management.trailingDistancePct && change > 0) return 'winner losing momentum';
  if (snapshot.lastTradeAgeMs > config.management.staleMomentumMs) return 'volume collapsed';
  return '';
}
