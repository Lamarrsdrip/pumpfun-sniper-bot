import assert from 'node:assert/strict';
import test from 'node:test';
import { scoreRunner } from '../src/runner.js';

const strongSignals = {
  holderGrowth: 92,
  volumeAcceleration: 96,
  liquidityGrowth: 84,
  buyPressure: 88,
  smartWalletActivity: 82,
  socialVelocity: 75,
  marketCapVelocity: 86,
  whaleAccumulation: 78,
  concentrationRisk: 18,
  tradeFrequency: 90,
  priceMomentum: 87,
  patternSimilarity: 82,
  rugRisk: 12
};

test('strong signals produce a high runner score without bypassing risk penalties', () => {
  const result = scoreRunner(strongSignals);
  assert.ok(result.score >= 76);
  assert.match(result.category, /STRONG_RUNNER|EXPLOSIVE_RUNNER/);
});

test('extreme rug risk forces a high-risk category despite strong momentum', () => {
  const result = scoreRunner({ ...strongSignals, rugRisk: 90 });
  assert.equal(result.category, 'HIGH_RISK_RUNNER');
  assert.ok(result.score < scoreRunner(strongSignals).score);
});
