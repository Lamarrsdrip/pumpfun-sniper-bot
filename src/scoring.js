import { clamp } from './math.js';

export function scoreToken(snapshot, config) {
  const w = config.watch;
  const socialScore = scoreSocial(snapshot, config);
  const tooLatePenalty = tooLateScorePenalty(snapshot, w);
  const components = {
    volume: clamp((snapshot.tradeCount / Math.max(1, w.minTrades)) * 35 + Math.min(snapshot.volumeSpike, 5) * 13),
    holder: clamp((snapshot.uniqueBuyers / Math.max(1, w.minUniqueBuyers)) * 55 + Math.min(snapshot.holderCount, 25) * 1.8),
    devSafety: clamp(100 - snapshot.devSoldPct * 900),
    whaleRisk: clamp(100 - snapshot.topHolderPct * 180 - snapshot.top5HolderPct * 45 - snapshot.insiderWalletPct * 70),
    momentum: clamp(snapshot.buySellRatio * 24 + snapshot.recentBuySellRatio * 12 - snapshot.drawdownFromHighPct * 120),
    sellPressure: clamp(100 - snapshot.sellCount * 3 - snapshot.sellVolumeSol * 18 + snapshot.buyVolumeSol * 3),
    bondingCurve: scoreBondingCurve(snapshot.bondingCurveProgress, w),
    liquidity: clamp(snapshot.liquidityQuality),
    rugRisk: clamp(100 - snapshot.rugRiskScore),
    social: socialScore
  };
  const categories = {
    timing: clamp(components.bondingCurve * 0.34 + components.momentum * 0.28 + components.volume * 0.22 + clamp(100 - tooLatePenalty) * 0.16),
    safety: clamp(components.devSafety * 0.34 + components.whaleRisk * 0.26 + components.rugRisk * 0.24 + components.liquidity * 0.16),
    momentum: components.momentum,
    liquidity: components.liquidity,
    holderRisk: components.whaleRisk,
    devRisk: components.devSafety
  };

  const weights = {
    volume: 0.13,
    holder: 0.11,
    devSafety: 0.16,
    whaleRisk: 0.13,
    momentum: 0.15,
    sellPressure: 0.1,
    bondingCurve: 0.07,
    liquidity: 0.08,
    rugRisk: 0.05,
    social: 0.03
  };

  let score = Object.entries(weights).reduce((total, [key, weight]) => total + components[key] * weight, 0);
  score -= tooLatePenalty;
  const gateCap = Math.min(categories.timing, categories.safety) < 70 ? 84 : 100;
  const label = labelSetup(snapshot, categories, score, config);
  return { score: Math.round(clamp(score, 0, gateCap)), components, categories, label, tooLatePenalty };
}

export function blockReasons(snapshot, score, config) {
  const w = config.watch;
  const reasons = [];
  if (!snapshot.mint) reasons.push('missing mint');
  if (snapshot.ageMs > w.maxTokenAgeMs) reasons.push('token too old for sniper window');
  if (snapshot.marketCapSol && snapshot.marketCapSol < w.minMarketCapSol) reasons.push('market cap too small');
  if (snapshot.marketCapSol && snapshot.marketCapSol > w.maxMarketCapSol) reasons.push('market cap already extended');
  if (snapshot.tradeCount < w.minTrades) reasons.push('not enough trades');
  if (snapshot.uniqueBuyers < w.minUniqueBuyers) reasons.push('weak unique buyer growth');
  if (snapshot.buySellRatio < w.minBuySellRatio) reasons.push('buy pressure too weak');
  if (snapshot.volumeSpike < w.volumeSpikeMin) reasons.push('volume is not accelerating');
  if (snapshot.bondingCurveProgress < w.minBondingCurveProgress) reasons.push('bonding curve momentum too early/weak');
  if (snapshot.bondingCurveProgress > w.maxBondingCurveProgress) reasons.push('bonding curve too late');
  if (snapshot.topHolderPct > w.maxTopHolderPct) reasons.push('top holder concentration too high');
  if (snapshot.top5HolderPct > w.maxTop5HolderPct) reasons.push('top 5 holder concentration too high');
  if (snapshot.devSoldPct > w.maxDevSoldPct) reasons.push('dev wallet is selling');
  if (snapshot.insiderWalletPct > w.maxInsiderWalletPct) reasons.push('early wallet pattern looks insider-heavy');
  if (snapshot.priceFromLaunchPct > w.maxPriceExtensionPct) reasons.push('price is already overextended');
  if (isTooLate(snapshot, w)) reasons.push('too late; likely top-buy risk');
  if (snapshot.liquidityQuality < w.minLiquidityQuality) reasons.push('low liquidity quality');
  if (snapshot.fakeVolumeScore > w.maxFakeVolumeScore) reasons.push('possible fake volume or wallet cycling');
  if (snapshot.recentBuySellRatio < 1) reasons.push('recent sell pressure exceeds buys');
  if (score.score < config.strictScoreThreshold) reasons.push(`score ${score.score} below strict threshold ${config.strictScoreThreshold}`);
  return reasons;
}

export function rugRiskLevel(snapshot) {
  const value = Number(snapshot.rugRiskScore || 0);
  if (value >= 82) return 'Extreme';
  if (value >= 62) return 'High';
  if (value >= 38) return 'Medium';
  return 'Low';
}

export function isEarlyButRisky(snapshot, score, config) {
  return snapshot.ageMs < 90000
    && score.categories?.momentum >= (config.runCatcher?.minMomentumScore || 70)
    && score.categories?.safety < (config.runCatcher?.minSafetyScore || 62);
}

export function isTooLate(snapshot, watch) {
  return snapshot.priceFromLaunchPct > watch.maxPriceExtensionPct * 0.82
    || snapshot.bondingCurveProgress > watch.maxBondingCurveProgress
    || snapshot.drawdownFromHighPct > 0.18 && snapshot.priceFromLaunchPct > 0.6;
}

function tooLateScorePenalty(snapshot, watch) {
  let penalty = 0;
  if (snapshot.priceFromLaunchPct > watch.maxPriceExtensionPct * 0.7) penalty += 10;
  if (snapshot.priceFromLaunchPct > watch.maxPriceExtensionPct) penalty += 25;
  if (snapshot.bondingCurveProgress > watch.maxBondingCurveProgress * 0.92) penalty += 12;
  if (snapshot.drawdownFromHighPct > 0.18 && snapshot.priceFromLaunchPct > 0.6) penalty += 18;
  return penalty;
}

function labelSetup(snapshot, categories, score, config) {
  if (isTooLate(snapshot, config.watch)) return 'Too late';
  if (categories.momentum >= (config.runCatcher?.minMomentumScore || 70) && categories.safety < (config.runCatcher?.minSafetyScore || 62)) return 'Early but risky';
  if (score >= config.strictScoreThreshold && categories.timing >= 70 && categories.safety >= 70) return 'Confirmed';
  if (score >= (config.runCatcher?.scoutScoreThreshold || 68) && categories.momentum >= (config.runCatcher?.minMomentumScore || 70)) return 'Scout watch';
  return 'Watching';
}

function scoreBondingCurve(progress, watch) {
  if (!Number.isFinite(progress)) return 35;
  if (progress < watch.minBondingCurveProgress || progress > watch.maxBondingCurveProgress) return 15;
  const ideal = 0.32;
  return clamp(100 - Math.abs(progress - ideal) * 180);
}

function scoreSocial(snapshot, config) {
  const text = `${snapshot.name} ${snapshot.symbol} ${snapshot.social.twitter} ${snapshot.social.telegram} ${snapshot.social.website}`.toLowerCase();
  let score = 45;
  for (const word of config.socialKeywords.positive) {
    if (text.includes(word)) score += 9;
  }
  for (const word of config.socialKeywords.negative) {
    if (text.includes(word)) score -= 18;
  }
  if (snapshot.social.twitter) score += 10;
  if (snapshot.social.telegram) score += 8;
  if (snapshot.social.website) score += 5;
  return clamp(score);
}
