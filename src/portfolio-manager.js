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
    this.recordEquity(event.at, equitySol, event.pnlSol);
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
    const wins = this.closedTrades.filter((trade) => trade.pnlSol >= 0);
    const losses = this.closedTrades.filter((trade) => trade.pnlSol < 0);
    const totalPnlSol = this.closedTrades.reduce((total, trade) => total + trade.pnlSol, 0);
    return {
      closedTrades: this.closedTrades.length,
      wins: wins.length,
      losses: losses.length,
      winRate: this.closedTrades.length ? wins.length / this.closedTrades.length : 0,
      averageWinSol: wins.length ? wins.reduce((total, trade) => total + trade.pnlSol, 0) / wins.length : 0,
      averageLossSol: losses.length ? losses.reduce((total, trade) => total + trade.pnlSol, 0) / losses.length : 0,
      totalPnlSol,
      maxDrawdownSol: this.maxDrawdownSol
    };
  }
}
