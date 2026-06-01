export class RiskManager {
  constructor(config) {
    this.config = config;
    this.dailyLossSol = 0;
    this.consecutiveLosses = 0;
    this.cooldownUntil = 0;
    this.equityHigh = config.paperStartingSol || 0;
    this.killSwitch = false;
  }

  canOpen({ openPositions, equitySol, at = Date.now() }) {
    const r = this.config.risk;
    const reasons = [];
    if (this.killSwitch) reasons.push('manual/emergency kill switch is active');
    if (openPositions >= r.maxOpenTrades) reasons.push('max open trades reached');
    if (this.dailyLossSol >= r.maxDailyLossSol) reasons.push('max daily loss reached');
    if (this.consecutiveLosses >= r.stopAfterConsecutiveLosses) reasons.push('too many consecutive losses');
    if (at < this.cooldownUntil) reasons.push('cooldown after loss is active');
    this.equityHigh = Math.max(this.equityHigh, equitySol);
    if (this.equityHigh - equitySol >= r.emergencyStopDrawdownSol) reasons.push('emergency account drawdown stop reached');
    return reasons;
  }

  sizePosition(snapshot) {
    const r = this.config.risk;
    const stopLossPct = this.config.management.hardStopLossPct;
    const riskBased = r.maxRiskPerTradeSol / Math.max(stopLossPct, 0.01);
    const liquidityBased = Math.max(0.01, snapshot.liquiditySol * 0.015);
    return Math.max(0, Math.min(r.maxPositionSizeSol, riskBased, liquidityBased));
  }

  observeClosedTrade(pnlSol, at = Date.now()) {
    if (pnlSol < 0) {
      this.dailyLossSol += Math.abs(pnlSol);
      this.consecutiveLosses += 1;
      this.cooldownUntil = at + this.config.risk.cooldownAfterLossMs;
    } else {
      this.consecutiveLosses = 0;
    }
  }
}
