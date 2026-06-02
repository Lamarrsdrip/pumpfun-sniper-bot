import { TokenState } from './token-state.js';
import { blockReasons, rugRiskLevel, scoreToken } from './scoring.js';
import { LiveBroker, PaperBroker } from './broker.js';

export class SniperEngine {
  constructor({ config, events, risk, tradeManager, broker, portfolio }) {
    this.config = config;
    this.events = events;
    this.risk = risk;
    this.tradeManager = tradeManager;
    this.broker = broker;
    this.portfolio = portfolio;
    this.tokens = new Map();
    this.stats = {
      scanned: 0,
      bought: 0,
      watching: 0,
      blocked: 0,
      closed: 0,
      wins: 0,
      losses: 0,
      totalPnlSol: 0,
      blockedRugRisk: 0
    };
    this.blockedMemory = [];
    this.missedRuns = [];
    this.reasonPerformance = new Map();

    events.on('trade:close', (event) => {
      const token = this.tokens.get(event.mint);
      if (token) {
        token.status = 'EXITED';
        token.statusReason = event.reason;
      }
      const accountPnlSol = Number.isFinite(event.netPnlSol) ? event.netPnlSol : event.pnlSol;
      this.stats.closed += 1;
      this.stats.totalPnlSol += accountPnlSol;
      if (accountPnlSol >= 0) this.stats.wins += 1;
      else this.stats.losses += 1;
      this.risk.observeClosedTrade(accountPnlSol, event.at);
      this.portfolio?.recordTradeClose(event, this.broker.equitySol);
    });
    events.on('trade:add', (event) => this.portfolio?.alert({
      at: event.at,
      level: 'info',
      title: `${event.position.symbol || event.position.name || event.position.mint} scout confirmed`,
      detail: `Added ${event.addSizeSol.toFixed(4)} SOL after confirmation`
    }));
    events.on('token:blocked', (event) => this.portfolio?.alert({
      at: event.at,
      level: event.score.score >= 70 ? 'warning' : 'info',
      title: `${event.snapshot.symbol || event.snapshot.name || event.snapshot.mint} blocked`,
      detail: event.reasons[0] || 'risk gate'
    }));
  }

  onNewToken(raw, at = Date.now()) {
    const token = new TokenState({ ...raw, timestamp: raw.timestamp || at });
    if (!token.mint) return;
    this.tokens.set(token.mint, token);
    this.stats.scanned += 1;
    this.events.emit('token:seen', { at, token: token.snapshot(at) });
  }

  async onTrade(raw, at = Date.now()) {
    const mint = raw.mint || raw.token || raw.ca || raw.address;
    if (!mint) return;
    if (!this.tokens.has(mint)) this.tokens.set(mint, new TokenState({ mint, timestamp: at }));
    const token = this.tokens.get(mint);
    token.ingestTrade({ ...raw, timestamp: raw.timestamp || at });
    const snapshot = token.snapshot(at);
    const score = scoreToken(snapshot, this.config);
    token.lastScore = score;
    this.updateOutcomeMemory(snapshot, at);
    await this.tradeManager.update(snapshot, score, at);
    await this.evaluate(snapshot, score, at);
  }

  async onMarketSnapshot(raw, at = Date.now()) {
    const mint = raw.mint || raw.tokenAddress || raw.address;
    if (!mint) return;
    if (!this.tokens.has(mint)) this.tokens.set(mint, new TokenState({ ...raw, mint, timestamp: at }));
    const token = this.tokens.get(mint);
    token.ingestMarketSnapshot({ ...raw, timestamp: raw.timestamp || at });
    const snapshot = token.snapshot(at);
    const score = scoreToken(snapshot, this.config);
    token.lastScore = score;
    this.updateOutcomeMemory(snapshot, at);
    await this.tradeManager.update(snapshot, score, at);
    await this.evaluate(snapshot, score, at);
  }

  async evaluate(snapshot, existingScore = null, at = Date.now()) {
    const openPosition = this.tradeManager.positions.get(snapshot.mint);
    const score = existingScore || scoreToken(snapshot, this.config);
    snapshot.raw.lastScore = score;
    if (openPosition) {
      await this.maybeConfirmScout(openPosition, snapshot, score, at);
      return;
    }
    const reasons = blockReasons(snapshot, score, this.config);
    const riskReasons = this.risk.canOpen({
      openPositions: this.tradeManager.positions.size,
      equitySol: this.broker.equitySol,
      at
    });
    const allBlocks = [...reasons, ...riskReasons];

    if (allBlocks.length) {
      const hardBlock = allBlocks.some(isHardBlock);
      snapshot.raw.status = hardBlock ? 'BLOCKED' : 'WATCHING';
      snapshot.raw.statusReason = allBlocks[0];
      snapshot.raw.blockReasons = allBlocks;
      if (hardBlock) this.stats.blocked += 1;
      else this.stats.watching += 1;
      if (hardBlock && allBlocks.some((reason) => /dev|holder|insider|sell|whale|liquidity/i.test(reason))) {
        this.stats.blockedRugRisk += 1;
      }
      this.recordBlocked(snapshot, score, allBlocks, at);
      this.recordMissedWatch(snapshot, score, allBlocks, at);
      this.events.emit(hardBlock ? 'token:blocked' : 'token:watching', { at, snapshot, score, reasons: allBlocks });
      await this.maybeScout(snapshot, score, allBlocks, at);
      return;
    }

    snapshot.raw.status = 'QUALIFIED';
    snapshot.raw.statusReason = `score ${score.score} passed strict threshold`;
    this.events.emit('token:qualified', { at, snapshot, score });
    if (this.config.mode === 'live' && !this.config.live?.autoTradeEnabled) {
      snapshot.raw.statusReason = 'qualified for review; live auto-trading is disabled';
      return;
    }
    const sizeSol = this.risk.sizePosition(snapshot, score);
    if (sizeSol <= 0) {
      this.events.emit('token:blocked', { at, snapshot, score, reasons: ['position size resolved to zero'] });
      return;
    }
    const entryReasons = explainEntry(snapshot, score);
    await this.tradeManager.open(snapshot, score, entryReasons, at, sizeSol, 'confirmed');
    snapshot.raw.status = 'ENTERED';
    snapshot.raw.statusReason = entryReasons.join(' | ');
    this.stats.bought += 1;
  }

  async maybeScout(snapshot, score, blocks, at) {
    const rc = this.config.runCatcher || {};
    if (!rc.enabled) return;
    if (this.tradeManager.positions.has(snapshot.mint)) return;
    if (score.score < rc.scoutScoreThreshold) return;
    if ((score.categories?.momentum || 0) < rc.minMomentumScore) return;
    if ((score.categories?.safety || 0) < rc.minSafetyScore) return;
    if (score.label === 'Too late') return;
    const hardDangers = blocks.filter((reason) => /dev wallet|top holder|top 5|fake volume|sell pressure|low liquidity|too late|overextended/i.test(reason));
    if (hardDangers.length) return;
    const riskReasons = this.risk.canOpen({ openPositions: this.tradeManager.positions.size, equitySol: this.broker.equitySol, at });
    if (riskReasons.length) return;
    const sizeSol = this.risk.sizePosition(snapshot, score) * rc.scoutRiskMultiplier;
    if (sizeSol <= 0) return;
    await this.tradeManager.open(snapshot, score, [`scout entry: ${score.label}`, `momentum ${Math.round(score.categories.momentum)}`, `safety ${Math.round(score.categories.safety)}`], at, sizeSol, 'scout');
    snapshot.raw.status = 'ENTERED';
    snapshot.raw.statusReason = 'run-catcher scout entry';
    this.stats.bought += 1;
  }

  async maybeConfirmScout(position, snapshot, score, at) {
    const rc = this.config.runCatcher || {};
    if (!rc.enabled || position.entryType !== 'scout' || position.addedAfterScout) return;
    if (score.score < rc.confirmAddScoreThreshold) return;
    if ((score.categories?.safety || 0) < Math.max(70, rc.minSafetyScore || 0)) return;
    if (score.label === 'Too late') return;
    const fullSize = this.risk.sizePosition(snapshot, score);
    const addSize = Math.max(0, fullSize * rc.confirmAddRiskMultiplier);
    await this.tradeManager.addToPosition(position, snapshot, score, ['scout confirmed', `score ${score.score}`, `safety ${Math.round(score.categories.safety)}`], at, addSize);
  }

  recordBlocked(snapshot, score, reasons, at) {
    if (!reasons.length) return;
    const existing = this.blockedMemory.find((item) => item.mint === snapshot.mint);
    if (existing) return;
    this.blockedMemory.unshift({
      mint: snapshot.mint,
      name: snapshot.name,
      symbol: snapshot.symbol,
      at,
      score: score.score,
      label: score.label,
      reasons: reasons.slice(0, 6),
      price: snapshot.price,
      marketCapSol: snapshot.marketCapSol,
      liquiditySol: snapshot.liquiditySol,
      maxPrice: snapshot.price,
      maxRunPct: 0,
      checks: [],
      outcome: 'pending'
    });
    if (this.blockedMemory.length > 300) this.blockedMemory.pop();
  }

  recordMissedWatch(snapshot, score, reasons, at) {
    if (this.missedRuns.some((item) => item.mint === snapshot.mint)) return;
    if (score.score < (this.config.runCatcher?.scoutScoreThreshold || 68) - 8) return;
    this.missedRuns.unshift({
      mint: snapshot.mint,
      name: snapshot.name,
      symbol: snapshot.symbol,
      at,
      watchPrice: snapshot.price,
      maxPrice: snapshot.price,
      maxRunPct: 0,
      score: score.score,
      label: score.label,
      reasons: reasons.slice(0, 5),
      status: 'watching outcome'
    });
    if (this.missedRuns.length > 300) this.missedRuns.pop();
  }

  updateOutcomeMemory(snapshot, at) {
    const checkWindows = this.config.runCatcher?.outcomeCheckMs || [300000, 600000, 1800000];
    for (const item of [...this.blockedMemory, ...this.missedRuns]) {
      if (item.mint !== snapshot.mint) continue;
      item.maxPrice = Math.max(item.maxPrice || 0, snapshot.price || 0);
      item.maxRunPct = item.price || item.watchPrice ? (item.maxPrice - (item.price || item.watchPrice)) / (item.price || item.watchPrice) : 0;
      for (const windowMs of checkWindows) {
        if (at - item.at >= windowMs && !item.checks?.some((check) => check.windowMs === windowMs)) {
          item.checks = item.checks || [];
          item.checks.push({ windowMs, at, maxRunPct: item.maxRunPct, price: snapshot.price });
        }
      }
      const ran = item.maxRunPct >= (this.config.runCatcher?.missedRunPct || 0.6);
      item.outcome = ran ? 'bad block or missed run' : item.checks?.length >= checkWindows.length ? 'good avoid' : 'pending';
      if (ran && item.reasons) {
        for (const reason of item.reasons) {
          const stat = this.reasonPerformance.get(reason) || { reason, missedRuns: 0, goodBlocks: 0 };
          stat.missedRuns += 1;
          this.reasonPerformance.set(reason, stat);
        }
      }
    }
  }

  async paperBuy(mint, options = {}, at = Date.now()) {
    if (this.config.mode !== 'paper') throw new Error('paper execution endpoint is only available in paper mode');
    const token = this.tokens.get(mint);
    if (!token) throw new Error('token is not being tracked');
    const snapshot = token.snapshot(at);
    if (this.tradeManager.positions.has(snapshot.mint)) throw new Error('position already open');
    const score = token.lastScore || scoreToken(snapshot, this.config);
    const blocks = [
      ...blockReasons(snapshot, score, this.config),
      ...this.risk.canOpen({ openPositions: this.tradeManager.positions.size, equitySol: this.broker.equitySol, at })
    ];
    if (blocks.length) throw new Error(`paper buy blocked: ${blocks.join('; ')}`);
    const requestedSize = Number(options.sizeSol || 0);
    const sizeSol = requestedSize > 0 ? Math.min(requestedSize, this.risk.sizePosition(snapshot), this.config.risk.maxPositionSizeSol) : this.risk.sizePosition(snapshot);
    if (sizeSol <= 0) throw new Error('position size resolved to zero');
    const position = await this.tradeManager.open(snapshot, score, explainEntry(snapshot, score), at, sizeSol);
    token.status = 'ENTERED';
    token.statusReason = position.reasons.join(' | ');
    this.stats.bought += 1;
    return { ok: true, position, equitySol: this.broker.equitySol, cashSol: this.broker.cashSol, execution: this.broker.lastExecution };
  }

  async paperSell(mint, options = {}, at = Date.now()) {
    if (this.config.mode !== 'paper') throw new Error('paper execution endpoint is only available in paper mode');
    const position = this.tradeManager.positions.get(mint);
    if (!position) throw new Error('no open paper position for token');
    const token = this.tokens.get(mint);
    const snapshot = token?.snapshot(at) || { mint, price: position.currentPrice || position.entryPrice, drawdownFromHighPct: position.maxDrawdownPct || 0 };
    const pct = Math.max(0, Math.min(1, Number(options.pct ?? 1)));
    if (pct <= 0 || pct >= position.remainingPct - 0.001) {
      await this.tradeManager.close(position, snapshot, options.reason || 'manual paper sell', at, token?.lastScore || null);
    } else {
      await this.tradeManager.sellPartial(position, snapshot, pct, options.reason || 'manual paper partial sell', at);
    }
    return { ok: true, equitySol: this.broker.equitySol, cashSol: this.broker.cashSol, execution: this.broker.lastExecution };
  }

  async liveBuy(mint, options = {}, at = Date.now()) {
    if (this.config.mode !== 'live') throw new Error('set MODE=live before using live endpoints');
    if (!this.config.live?.enabled) throw new Error('set LIVE_TRADING_ENABLED=true before using live endpoints');
    if (!String(options.walletAddress || '').trim()) throw new Error('live wallet address is required');
    const token = this.tokens.get(mint);
    if (!token) throw new Error('token is not being tracked');
    const snapshot = token.snapshot(at);
    if (this.tradeManager.positions.has(snapshot.mint)) throw new Error('position already open');
    const score = token.lastScore || scoreToken(snapshot, this.config);
    const blocks = [
      ...blockReasons(snapshot, score, this.config),
      ...this.risk.canOpen({ openPositions: this.tradeManager.positions.size, equitySol: this.broker.equitySol || this.config.paperStartingSol, at })
    ];
    if (blocks.length) throw new Error(`live buy blocked: ${blocks.join('; ')}`);
    const requestedSize = Number(options.sizeSol || 0);
    const sizeSol = requestedSize > 0 ? Math.min(requestedSize, this.risk.sizePosition(snapshot, score), this.config.risk.maxPositionSizeSol) : this.risk.sizePosition(snapshot, score);
    if (sizeSol <= 0) throw new Error('position size resolved to zero');
    const position = await this.tradeManager.open(snapshot, score, explainEntry(snapshot, score), at, sizeSol, this.config.live?.dryRun ? 'live-dry-run' : 'live', { walletAddress: String(options.walletAddress || '') });
    token.status = 'ENTERED';
    token.statusReason = position.reasons.join(' | ');
    this.stats.bought += 1;
    return { ok: true, dryRun: Boolean(this.config.live?.dryRun), position, execution: this.broker.lastExecution };
  }

  async liveSell(mint, options = {}, at = Date.now()) {
    if (this.config.mode !== 'live') throw new Error('set MODE=live before using live endpoints');
    if (!this.config.live?.enabled) throw new Error('set LIVE_TRADING_ENABLED=true before using live endpoints');
    if (!String(options.walletAddress || '').trim()) throw new Error('live wallet address is required');
    const position = this.tradeManager.positions.get(mint);
    if (!position) throw new Error('no open live position for token');
    const token = this.tokens.get(mint);
    const snapshot = token?.snapshot(at) || { mint, price: position.currentPrice || position.entryPrice, drawdownFromHighPct: position.maxDrawdownPct || 0 };
    const pct = Math.max(0, Math.min(1, Number(options.pct ?? 1)));
    if (pct <= 0 || pct >= position.remainingPct - 0.001) {
      await this.tradeManager.close(position, snapshot, options.reason || 'manual live sell', at, token?.lastScore || null, { walletAddress: String(options.walletAddress || '') });
    } else {
      await this.tradeManager.sellPartial(position, snapshot, pct, options.reason || 'manual live partial sell', at, { walletAddress: String(options.walletAddress || '') });
    }
    return { ok: true, dryRun: Boolean(this.config.live?.dryRun), execution: this.broker.lastExecution };
  }

  updateRiskSettings(settings = {}) {
    const risk = this.config.risk;
    const management = this.config.management;
    assignNumber(risk, settings, 'maxRiskPerTradeSol', 0.001, 100);
    assignNumber(risk, settings, 'maxRiskPerTradePct', 0.0001, 0.1);
    assignNumber(risk, settings, 'maxPositionSizeSol', 0.001, 500);
    assignNumber(risk, settings, 'maxPositionSizePct', 0.001, 0.5);
    assignNumber(risk, settings, 'maxSlippagePct', 0.001, 0.5);
    assignNumber(risk, settings, 'maxDailyLossSol', 0.001, 500);
    assignNumber(risk, settings, 'maxDailyLossPct', 0.001, 0.5);
    assignNumber(risk, settings, 'emergencyStopDrawdownPct', 0.001, 0.6);
    assignNumber(risk, settings, 'maxOpenTrades', 1, 20, true);
    assignNumber(management, settings, 'hardStopLossPct', 0.01, 0.9);
    assignNumber(management, settings, 'trailingStartPct', 0.01, 5);
    assignNumber(management, settings, 'trailingDistancePct', 0.01, 0.9);
    assignNumber(this.config, settings, 'strictScoreThreshold', 1, 100, true);
    return { risk: this.config.risk, management: this.config.management, strictScoreThreshold: this.config.strictScoreThreshold };
  }

  setEmergencyStop(active = true) {
    const enabled = this.risk.setKillSwitch(active);
    this.events.emit('risk:emergencyStop', {
      type: 'risk:emergencyStop',
      at: Date.now(),
      enabled,
      message: enabled ? 'Emergency stop enabled; new paper entries blocked' : 'Emergency stop cleared'
    });
    return { ok: true, emergencyStop: enabled };
  }

  setMode(mode) {
    if (!['paper', 'live'].includes(mode)) throw new Error('mode must be paper or live');
    if (this.tradeManager.positions.size) throw new Error('close open positions before switching mode');
    if (mode === 'live' && !liveBrokerConfigured(this.config)) {
      throw new Error(liveReadinessReason({ ...this.config, mode: 'live' }));
    }
    this.config.mode = mode;
    this.broker = mode === 'live'
      ? new LiveBroker(this.config)
      : new PaperBroker(this.config.paperStartingSol);
    this.tradeManager.broker = this.broker;
    this.events.emit('mode:changed', {
      type: 'mode:changed',
      at: Date.now(),
      mode,
      liveReady: Boolean(this.config.live?.enabled && this.config.live?.tradeApiUrl && this.config.live?.tradeApiKey),
      dryRun: Boolean(this.config.live?.dryRun)
    });
    return {
      ok: true,
      mode,
      live: {
        enabled: Boolean(this.config.live?.enabled),
        dryRun: Boolean(this.config.live?.dryRun),
        tradeApiConfigured: Boolean(this.config.live?.tradeApiUrl && this.config.live?.tradeApiKey)
      }
    };
  }

  status() {
    const sourceHealth = this.sourceHealth || {};
    const effectiveRisk = this.risk.effectiveLimits(this.broker.equitySol);
    return {
      ok: true,
      app: {
        running: true,
        mode: this.config.mode,
        dataMode: this.config.dataMode
      },
      sources: {
        pumpPortal: {
          status: sourceHealth.PumpPortal?.status || (this.config.pumpPortalApiKey ? 'connecting' : 'missing-key'),
          apiKey: this.config.pumpPortalApiKey ? 'present' : 'missing',
          message: sourceHealth.PumpPortal?.message || (this.config.pumpPortalApiKey ? 'waiting for stream health' : 'Missing PUMPPORTAL_API_KEY; public launch feed may work, token trade subscriptions are unavailable')
        },
        solanaRpc: {
          status: sourceHealth.SolanaRPC?.status || 'connecting',
          urlConfigured: Boolean(this.config.sources?.solanaRpcUrl),
          slot: sourceHealth.SolanaRPC?.slot || null,
          message: sourceHealth.SolanaRPC?.message || 'RPC health pending'
        },
        holders: {
          status: sourceHealth.BirdeyeHolders?.status || sourceHealth.HolderRPC?.status || 'limited',
          birdeyeApiKey: this.config.sources?.birdeyeApiKey ? 'present' : 'missing',
          message: sourceHealth.BirdeyeHolders?.message || sourceHealth.HolderRPC?.message || (this.config.sources?.birdeyeApiKey ? 'Holder enrichment pending' : 'Missing BIRDEYE_API_KEY; holder detection uses limited RPC-derived placeholders where possible')
        },
        devActivity: {
          status: sourceHealth.HeliusDevActivity?.status || 'not-configured',
          heliusApiKey: this.config.sources?.heliusApiKey ? 'present' : 'missing',
          message: sourceHealth.HeliusDevActivity?.message || (this.config.sources?.heliusApiKey ? 'Dev activity monitor pending' : 'Missing HELIUS_API_KEY; dev wallet transaction monitoring unavailable')
        }
      },
      broker: {
        paper: this.config.mode === 'paper',
        emergencyStop: this.risk.killSwitch,
        cashSol: this.broker.cashSol,
        equitySol: this.broker.equitySol,
        openValueSol: this.broker.openValueSol,
        feesSol: this.broker.feesSol,
        effectiveRisk
      },
      liveTrading: {
        enabled: Boolean(this.config.live?.enabled),
        dryRun: Boolean(this.config.live?.dryRun),
        autoTradeEnabled: Boolean(this.config.live?.autoTradeEnabled),
        brokerConfigured: Boolean(this.config.live?.tradeApiUrl && this.config.live?.tradeApiKey),
        ready: Boolean(this.config.mode === 'live' && this.config.live?.enabled && this.config.live?.tradeApiUrl && this.config.live?.tradeApiKey),
        reason: liveReadinessReason(this.config)
      }
    };
  }

  dashboardState() {
    const closed = this.stats.wins + this.stats.losses;
    const effectiveRisk = this.risk.effectiveLimits(this.broker.equitySol);
    const accountPnlSol = Number(this.broker.equitySol || 0) - Number(this.config.paperStartingSol || 0);
    return {
      stats: {
        ...this.stats,
        winRate: closed ? this.stats.wins / closed : 0,
        averagePnlSol: closed ? this.stats.totalPnlSol / closed : 0,
        accountPnlSol
      },
      equitySol: this.broker.equitySol,
      accountPnlSol,
      cashSol: this.broker.cashSol,
      openValueSol: this.broker.openValueSol,
      unrealizedPnlSol: this.broker.unrealizedPnlSol,
      feesSol: this.broker.feesSol,
      config: {
        mode: this.config.mode,
        dataMode: this.config.dataMode,
        paperStartingSol: Number(this.config.paperStartingSol || 0),
        strictScoreThreshold: this.config.strictScoreThreshold,
        pumpPortalApiKey: Boolean(this.config.pumpPortalApiKey),
        heliusApiKey: Boolean(this.config.sources?.heliusApiKey),
        birdeyeApiKey: Boolean(this.config.sources?.birdeyeApiKey),
        emergencyStop: this.risk.killSwitch,
        live: {
          enabled: Boolean(this.config.live?.enabled),
          dryRun: Boolean(this.config.live?.dryRun),
          autoTradeEnabled: Boolean(this.config.live?.autoTradeEnabled),
          tradeApiConfigured: Boolean(this.config.live?.tradeApiUrl && this.config.live?.tradeApiKey)
        },
        risk: this.config.risk,
        effectiveRisk,
        management: this.config.management
      },
      sourceHealth: this.sourceHealth || {},
      intelligence: buildIntelligence({
        tokens: [...this.tokens.values()].map((token) => token.snapshot()),
        positions: [...this.tradeManager.positions.values()],
        sourceHealth: this.sourceHealth || {},
        threshold: this.config.strictScoreThreshold,
        risk: effectiveRisk
      }),
      portfolio: {
        ...(this.portfolio?.stats() || {}),
        equityCurve: this.portfolio?.equityCurve || [],
        tradeHistory: this.portfolio?.tradeHistory() || [],
        alerts: this.portfolio?.alerts || []
      },
      learning: {
        blockedMemory: this.blockedMemory.slice(0, 40),
        missedRuns: this.missedRuns.slice(0, 40),
        reasonReview: [...this.reasonPerformance.values()].filter((item) => item.missedRuns >= 2).slice(0, 12)
      },
      openPositions: [...this.tradeManager.positions.values()].map((position) => {
        const snapshot = this.tokens.get(position.mint)?.snapshot();
        return {
          ...position,
          snapshot,
          takeProfits: this.config.management.takeProfits,
          timeInTradeMs: Date.now() - position.openedAt,
          exitConfidence: snapshot ? exitConfidence(snapshot, position) : 50
        };
      }),
      watchedTokens: [...this.tokens.values()]
        .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
        .slice(0, 80)
        .map((token) => {
        const snapshot = token.snapshot();
        if (this.tradeManager.positions.has(snapshot.mint)) snapshot.status = 'ENTERED';
        return publicSnapshot(snapshot);
      })
    };
  }
}

function assignNumber(target, source, key, min, max, integer = false) {
  if (!(key in source)) return;
  const value = Number(source[key]);
  if (!Number.isFinite(value)) throw new Error(`${key} must be numeric`);
  target[key] = integer ? Math.round(Math.max(min, Math.min(max, value))) : Math.max(min, Math.min(max, value));
}

function liveReadinessReason(config) {
  if (config.mode !== 'live') return 'MODE is not live';
  if (!config.live?.enabled) return 'LIVE_TRADING_ENABLED is not true';
  if (!config.live?.tradeApiUrl) return 'LIVE_TRADE_API_URL is missing';
  if (!config.live?.tradeApiKey) return 'LIVE_TRADE_API_KEY is missing';
  if (config.live?.dryRun) return 'Live broker configured in dry-run mode';
  return 'Live broker configured for real broadcast through external provider';
}

function liveBrokerConfigured(config) {
  return Boolean(config.live?.enabled && config.live?.tradeApiUrl && config.live?.tradeApiKey);
}

function buildIntelligence({ tokens, positions, sourceHealth, threshold, risk }) {
  const publicTokens = tokens.map(publicSnapshot);
  const scored = publicTokens
    .filter((token) => token.lastScore)
    .map((token) => ({
      ...token,
      alphaScore: alphaScore(token, threshold),
      opportunityReasons: opportunityReasons(token, threshold)
    }))
    .sort((a, b) => b.alphaScore - a.alphaScore);
  const nearMisses = scored
    .filter((token) => token.status !== 'ENTERED' && token.alphaScore >= 68 && token.lastScore.score < threshold)
    .slice(0, 6);
  const runCapture = buildRunCapture(scored, threshold);
  const hotQueue = scored
    .filter((token) => token.status !== 'BLOCKED')
    .slice(0, 8);
  const sourceCount = Object.values(sourceHealth).filter((source) => source.status === 'online').length;
  const avgLatency = average(Object.values(sourceHealth).map((source) => source.latencyMs).filter(Number.isFinite));
  const openRisk = positions.reduce((total, position) => total + Number(position.sizeSol || 0) * Number(position.remainingPct || 0), 0);
  const maxRisk = Number(risk.maxPositionSizeSol || 0) * Number(risk.maxOpenTrades || 1);
  const hotCount = scored.filter((token) => token.lastScore.score >= threshold - 8).length;
  const blockedRisk = scored.filter((token) => token.status === 'BLOCKED' && token.rugRiskScore > 55).length;
  return {
    hotQueue,
    nearMisses,
    runCapture,
    marketRegime: marketRegime(hotCount, blockedRisk, avgLatency),
    executionReadiness: {
      score: Math.round(Math.max(35, Math.min(100, 68 + sourceCount * 7 - (avgLatency || 0) / 120 - (openRisk / Math.max(0.01, maxRisk)) * 18))),
      sourceCount,
      avgLatencyMs: Math.round(avgLatency || 0),
      openRiskSol: openRisk,
      maxRiskSol: maxRisk
    }
  };
}

function buildRunCapture(scored, threshold) {
  const candidates = scored
    .filter((token) => token.status !== 'BLOCKED')
    .map((token) => {
      const score = token.lastScore?.score || 0;
      const scoreGap = Math.max(0, threshold - score);
      const acceleration = Math.max(0, token.volumeSpike || 0) + Math.max(0, token.recentBuySellRatio || 0) * 0.35 + Math.max(0, token.holderCount || 0) * 0.04;
      const timeToThresholdSec = acceleration > 0.25 ? Math.round((scoreGap / acceleration) * 8) : null;
      const catchMode = score >= threshold
        ? 'ENTRY READY'
        : score >= threshold - 8 && token.alphaScore >= 72
          ? 'ARMED WATCH'
          : token.alphaScore >= 62
            ? 'EARLY WATCH'
            : 'IGNORE';
      return {
        mint: token.mint,
        name: token.name,
        symbol: token.symbol,
        source: token.source,
        status: token.status,
        score,
        alphaScore: token.alphaScore,
        scoreGap,
        timeToThresholdSec,
        catchMode,
        reasons: opportunityReasons(token, threshold),
        risk: token.rugRiskScore || 0
      };
    })
    .filter((item) => item.catchMode !== 'IGNORE')
    .sort((a, b) => {
      if (a.catchMode === 'ENTRY READY' && b.catchMode !== 'ENTRY READY') return -1;
      if (b.catchMode === 'ENTRY READY' && a.catchMode !== 'ENTRY READY') return 1;
      return b.alphaScore - a.alphaScore;
    })
    .slice(0, 10);
  const ready = candidates.filter((item) => item.catchMode === 'ENTRY READY').length;
  const armed = candidates.filter((item) => item.catchMode === 'ARMED WATCH').length;
  const earliest = candidates.find((item) => item.timeToThresholdSec !== null);
  return {
    ready,
    armed,
    candidates,
    headline: ready
      ? `${ready} entry-ready setup${ready === 1 ? '' : 's'}`
      : armed
        ? `${armed} armed watch setup${armed === 1 ? '' : 's'}`
        : 'No clean run forming',
    detail: earliest ? `${earliest.symbol || earliest.name || 'Token'} may reach threshold in ~${earliest.timeToThresholdSec}s if momentum holds.` : 'Waiting for acceleration with acceptable risk.'
  };
}

function alphaScore(token, threshold) {
  const score = token.lastScore?.score || 0;
  const speed = Math.min(18, Math.max(0, token.volumeSpike || 0) * 2.2);
  const youth = token.ageMs < 45000 ? 8 : token.ageMs < 120000 ? 4 : -6;
  const riskPenalty = Math.max(0, (token.rugRiskScore || 0) - 45) * 0.22;
  const pressure = Math.min(10, Math.max(0, token.recentBuySellRatio || 0) * 1.4);
  return Math.round(Math.max(0, Math.min(100, score * 0.72 + speed + youth + pressure - riskPenalty + (score >= threshold ? 6 : 0))));
}

function opportunityReasons(token, threshold) {
  const reasons = [];
  if ((token.lastScore?.score || 0) >= threshold) reasons.push('strict score passed');
  else reasons.push(`${threshold - (token.lastScore?.score || 0)} pts below entry`);
  if (token.volumeSpike > 2) reasons.push(`${token.volumeSpike.toFixed(1)}x volume acceleration`);
  if (token.recentBuySellRatio > 2) reasons.push('buyers in control');
  if (token.holderCount >= 8) reasons.push('holder growth active');
  if (token.rugRiskScore > 60) reasons.push('risk shield warning');
  if (token.ageMs < 60000) reasons.push('early launch window');
  return reasons.slice(0, 4);
}

function marketRegime(hotCount, blockedRisk, avgLatency) {
  if (avgLatency > 2500) return { label: 'DEGRADED FEED', tone: 'warning', detail: 'Latency is high; reduce execution aggression.' };
  if (blockedRisk > hotCount * 2 && blockedRisk > 8) return { label: 'RUG HEAVY', tone: 'danger', detail: 'High-risk launches dominate. Capital protection first.' };
  if (hotCount >= 4) return { label: 'HOT TRENCHES', tone: 'hot', detail: 'Multiple near-threshold launches. Watch execution queue.' };
  return { label: 'SELECTIVE', tone: 'stable', detail: 'Few clean entries. Missing bad trades is expected.' };
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function publicSnapshot(snapshot) {
  const { raw, ...publicFields } = snapshot;
  publicFields.rugRiskLevel = rugRiskLevel(snapshot);
  if (snapshot.lastScore) publicFields.decisionLabel = snapshot.lastScore.label || '';
  return publicFields;
}

function exitConfidence(snapshot, position) {
  let confidence = 20;
  if (snapshot.recentBuySellRatio < 1) confidence += 28;
  if (snapshot.devSoldPct > 0) confidence += 35;
  if (snapshot.drawdownFromHighPct > 0.14) confidence += 18;
  if (position.unrealizedPct > 0.35 && snapshot.momentumScore < 55) confidence += 16;
  return Math.min(100, confidence);
}

function isHardBlock(reason) {
  return /dev wallet|top holder|top 5|insider|fake volume|sell pressure|overextended|low liquidity|too old|daily loss|cooldown|drawdown|consecutive|open trades/i.test(reason);
}

function explainEntry(snapshot, score) {
  return [
    `${score.label || 'confirmed'} score ${score.score}`,
    `timing ${Math.round(score.categories?.timing || 0)} safety ${Math.round(score.categories?.safety || 0)}`,
    `buy/sell ratio ${snapshot.buySellRatio.toFixed(2)}`,
    `unique buyers ${snapshot.uniqueBuyers}`,
    `volume spike ${snapshot.volumeSpike.toFixed(2)}x`,
    `dev sold ${(snapshot.devSoldPct * 100).toFixed(1)}%`,
    `top holder ${(snapshot.topHolderPct * 100).toFixed(1)}%`
  ];
}
