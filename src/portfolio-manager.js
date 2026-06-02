export class PortfolioManager {
  constructor(startingEquitySol) {
    this.startingEquitySol = startingEquitySol;
    this.equityCurve = [{ at: Date.now(), equitySol: startingEquitySol, realizedPnlSol: 0 }];
    this.closedTrades = [];
    this.alerts = [];
    this.highWaterSol = startingEquitySol;
    this.maxDrawdownSol = 0;
  }

  recordTradeClose(event, equitySol) {
    this.closedTrades.push(event);
    if (this.closedTrades.length > 200) this.closedTrades.shift();
    this.recordEquity(event.at, equitySol, netPnl(event));
  }

  recordEquity(at, equitySol, realizedPnlSol = 0) {
    this.highWaterSol = Math.max(this.highWaterSol, equitySol);
    this.maxDrawdownSol = Math.max(this.maxDrawdownSol, this.highWaterSol - equitySol);
    this.equityCurve.push({ at, equitySol, realizedPnlSol });
    if (this.equityCurve.length > 300) this.equityCurve.shift();
  }

  alert(event) {
    this.alerts.unshift(event);
    if (this.alerts.length > 80) this.alerts.pop();
  }

  stats() {
    const wins = this.closedTrades.filter((trade) => netPnl(trade) >= 0);
    const losses = this.closedTrades.filter((trade) => netPnl(trade) < 0);
    const totalPnlSol = this.closedTrades.reduce((total, trade) => total + netPnl(trade), 0);
    return {
      closedTrades: this.closedTrades.length,
      wins: wins.length,
      losses: losses.length,
      winRate: this.closedTrades.length ? wins.length / this.closedTrades.length : 0,
      averageWinSol: wins.length ? wins.reduce((total, trade) => total + netPnl(trade), 0) / wins.length : 0,
      averageLossSol: losses.length ? losses.reduce((total, trade) => total + netPnl(trade), 0) / losses.length : 0,
      totalPnlSol,
      maxDrawdownSol: this.maxDrawdownSol
    };
  }

  tradeHistory(limit = 80) {
    return this.closedTrades.slice(-limit).reverse().map((trade) => ({
      at: trade.at,
      mint: trade.mint,
      name: trade.name || '',
      symbol: trade.symbol || '',
      sizeSol: Number(trade.sizeSol || 0),
      entryPrice: Number(trade.entryPrice || 0),
      exitPrice: Number(trade.exitPrice || 0),
      grossPnlSol: Number(trade.pnlSol || 0),
      netPnlSol: netPnl(trade),
      feesSol: Number(trade.feesSol || 0),
      entryFeesSol: Number(trade.entryFeesSol || 0),
      exitFeesSol: Number(trade.exitFeesSol || 0),
      maxDrawdownPct: Number(trade.maxDrawdownPct || 0),
      entryScore: trade.entryScore,
      exitScore: trade.exitScore,
      reason: trade.reason || '',
      executionId: trade.execution?.id || '',
      txSignature: trade.execution?.txSignature || ''
    }));
  }
}

function netPnl(trade) {
  return Number.isFinite(trade.netPnlSol) ? Number(trade.netPnlSol) : Number(trade.pnlSol || 0) - Number(trade.feesSol || 0);
}
