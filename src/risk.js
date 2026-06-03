export class RiskManager {
  constructor(config) {
    this.config = config;
    this.dailyLossSol = 0;
    this.dailyPnlSol = 0;
    this.dailyHighPnlSol = 0;
    this.consecutiveLosses = 0;
    this.cooldownUntil = 0;
    this.equityHigh = config.paperStartingSol || 0;
    this.killSwitch = false;
    this.lastEquitySol = config.paperStartingSol || 0;
    this.dailyLossDay = dayKey(Date.now());
  }

  canOpen({ openPositions, equitySol, at = Date.now() }) {
    this.resetDailyIfNeeded(at);
    this.lastEquitySol = Number(equitySol || this.lastEquitySol || this.config.paperStartingSol || 0);
    const limits = this.effectiveLimits(this.lastEquitySol);
    const reasons = [];
    if (this.killSwitch) reasons.push('manual/emergency kill switch is active');
    if (openPositions >= limits.maxOpenTrades) reasons.push('max open trades reached');
    if (this.dailyLossSol >= limits.maxDailyLossSol) reasons.push('max daily loss reached');
    if (this.profitLockTriggered(limits)) reasons.push('daily profit lock is protecting gains');
    if (this.consecutiveLosses >= this.config.risk.stopAfterConsecutiveLosses) reasons.push('too many consecutive losses');
    if (at < this.cooldownUntil) reasons.push('cooldown after loss is active');
    this.equityHigh = Math.max(this.equityHigh, equitySol);
    if (this.equityHigh - equitySol >= limits.emergencyStopDrawdownSol) reasons.push('emergency account drawdown stop reached');
    return reasons;
  }

  sizePosition(snapshot, score = null, equitySol = this.lastEquitySol) {
    const limits = this.effectiveLimits(equitySol);
    const stopLossPct = this.config.management.hardStopLossPct;
    const riskBased = limits.maxRiskPerTradeSol / Math.max(stopLossPct, 0.01);
    const liquidityBased = Math.max(0.01, snapshot.liquiditySol * 0.015);
    const signalQuality = score?.score ? Math.max(0.35, Math.min(1, score.score / 100)) : 0.75;
    const volatilityPenalty = Math.max(0.35, 1 - Number(snapshot.drawdownFromHighPct || 0) * 1.8);
    const slippagePenalty = Math.max(0.25, Math.min(1, Number(snapshot.liquidityQuality || 0) / 100));
    const size = Math.min(limits.maxPositionSizeSol, riskBased, liquidityBased) * signalQuality * volatilityPenalty * slippagePenalty;
    return Math.max(0, size);
  }

  observeClosedTrade(pnlSol, at = Date.now()) {
    this.resetDailyIfNeeded(at);
    this.dailyPnlSol += Number(pnlSol || 0);
    this.dailyHighPnlSol = Math.max(this.dailyHighPnlSol, this.dailyPnlSol);
    if (pnlSol < 0) {
      this.dailyLossSol += Math.abs(pnlSol);
      this.consecutiveLosses += 1;
      this.cooldownUntil = at + this.config.risk.cooldownAfterLossMs;
    } else {
      this.consecutiveLosses = 0;
    }
  }

  setKillSwitch(active) {
    this.killSwitch = Boolean(active);
    return this.killSwitch;
  }

  resetDailyIfNeeded(at = Date.now()) {
    const key = dayKey(at);
    if (key !== this.dailyLossDay) {
      this.dailyLossDay = key;
      this.dailyLossSol = 0;
      this.dailyPnlSol = 0;
      this.dailyHighPnlSol = 0;
      this.consecutiveLosses = 0;
      this.cooldownUntil = 0;
      this.equityHigh = Math.max(this.equityHigh, this.lastEquitySol);
    }
  }

  effectiveLimits(equitySol = this.lastEquitySol) {
    const r = this.config.risk;
    const equity = Math.max(0, Number(equitySol || this.config.paperStartingSol || 0));
    const profileName = accountProfileName(r, equity);
    const profile = r.accountProfiles?.[profileName] || {};
    const maxRiskPerTradePct = Number(profile.maxRiskPerTradePct ?? r.maxRiskPerTradePct ?? 0.006);
    const maxPositionSizePct = Number(profile.maxPositionSizePct ?? r.maxPositionSizePct ?? 0.03);
    const maxDailyLossPct = Number(profile.maxDailyLossPct ?? r.maxDailyLossPct ?? 0.06);
    const emergencyStopDrawdownPct = Number(profile.emergencyStopDrawdownPct ?? r.emergencyStopDrawdownPct ?? 0.1);
    const dailyProfitLockSol = bounded(equity * Number(r.dailyProfitLockPct || 0), 0, Number.POSITIVE_INFINITY);
    const dailyProfitGivebackSol = bounded(dailyProfitLockSol * Number(r.dailyProfitGivebackPct || 0.35), 0, Number.POSITIVE_INFINITY);
    return {
      accountType: profileName,
      equitySol: equity,
      maxRiskPerTradeSol: bounded(equity * maxRiskPerTradePct, r.minRiskPerTradeSol ?? 0.001, r.maxRiskPerTradeSol ?? Number.POSITIVE_INFINITY),
      maxPositionSizeSol: bounded(equity * maxPositionSizePct, r.minPositionSizeSol ?? 0.001, r.maxPositionSizeSol ?? Number.POSITIVE_INFINITY),
      maxDailyLossSol: bounded(equity * maxDailyLossPct, r.minDailyLossSol ?? 0.001, r.maxDailyLossSol ?? Number.POSITIVE_INFINITY),
      dailyProfitLockSol,
      dailyProfitGivebackSol,
      emergencyStopDrawdownSol: bounded(equity * emergencyStopDrawdownPct, r.minEmergencyDrawdownSol ?? 0.001, r.emergencyStopDrawdownSol ?? Number.POSITIVE_INFINITY),
      maxOpenTrades: Number(profile.maxOpenTrades || r.maxOpenTrades || 1),
      maxRiskPerTradePct,
      maxPositionSizePct,
      maxDailyLossPct,
      emergencyStopDrawdownPct,
      dailyLossSol: this.dailyLossSol,
      dailyPnlSol: this.dailyPnlSol,
      dailyHighPnlSol: this.dailyHighPnlSol,
      dailyProfitLockActive: this.profitLockTriggered({ dailyProfitLockSol, dailyProfitGivebackSol }),
      dailyLossRemainingSol: Math.max(0, bounded(equity * maxDailyLossPct, r.minDailyLossSol ?? 0.001, r.maxDailyLossSol ?? Number.POSITIVE_INFINITY) - this.dailyLossSol)
    };
  }

  profitLockTriggered(limits = {}) {
    const r = this.config.risk;
    const lockSol = Number(limits.dailyProfitLockSol ?? (this.lastEquitySol * Number(r.dailyProfitLockPct || 0)));
    const givebackSol = Number(limits.dailyProfitGivebackSol ?? (lockSol * Number(r.dailyProfitGivebackPct || 0.35)));
    return lockSol > 0
      && this.dailyHighPnlSol >= lockSol
      && this.dailyHighPnlSol - this.dailyPnlSol >= givebackSol;
  }
}

function accountProfileName(r, equitySol) {
  if (r.accountType && r.accountType !== 'auto') return r.accountType;
  const profiles = r.accountProfiles || {};
  if (profiles.small && equitySol <= Number(profiles.small.maxEquitySol || 25)) return 'small';
  if (profiles.growth && equitySol <= Number(profiles.growth.maxEquitySol || 200)) return 'growth';
  return profiles.whale ? 'whale' : 'auto';
}

function bounded(value, min, max) {
  return Math.max(Number(min || 0), Math.min(Number(max || Number.POSITIVE_INFINITY), Number(value || 0)));
}

function dayKey(at) {
  return new Date(at).toISOString().slice(0, 10);
}
