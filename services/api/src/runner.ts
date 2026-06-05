type RunnerFeatures = {
  holderGrowth: number;
  volumeAcceleration: number;
  liquidityGrowth: number;
  buyPressure: number;
  smartWalletActivity: number;
  socialVelocity: number;
  marketCapVelocity: number;
  whaleAccumulation: number;
  concentrationRisk: number;
  tradeFrequency: number;
  priceMomentum: number;
  patternSimilarity: number;
  rugRisk: number;
};

export function scoreRunner(features: RunnerFeatures) {
  const positive =
    features.holderGrowth * 0.12 +
    features.volumeAcceleration * 0.13 +
    features.liquidityGrowth * 0.1 +
    features.buyPressure * 0.1 +
    features.smartWalletActivity * 0.1 +
    features.socialVelocity * 0.07 +
    features.marketCapVelocity * 0.08 +
    features.whaleAccumulation * 0.07 +
    features.tradeFrequency * 0.08 +
    features.priceMomentum * 0.08 +
    features.patternSimilarity * 0.07;
  const riskPenalty = features.concentrationRisk * 0.12 + features.rugRisk * 0.2;
  const score = Math.max(0, Math.min(100, Math.round(positive - riskPenalty)));
  const category =
    features.rugRisk >= 75 || features.concentrationRisk >= 80 ? 'HIGH_RISK_RUNNER' :
    score >= 88 ? 'EXPLOSIVE_RUNNER' :
    score >= 76 ? 'STRONG_RUNNER' :
    score >= 62 ? 'POTENTIAL_RUNNER' :
    'AVOID';
  return { score, category };
}
