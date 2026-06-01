import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TokenState } from '../src/token-state.js';
import { blockReasons, scoreToken } from '../src/scoring.js';
import { RiskManager } from '../src/risk.js';

const config = JSON.parse(readFileSync(new URL('../config/default.json', import.meta.url), 'utf8'));

test('blocks obvious dev sell and concentration risk', () => {
  const token = new TokenState({
    mint: 'RISK',
    name: 'Test Rug Dev',
    symbol: 'RUG',
    priceSol: 0.0001,
    marketCapSol: 30,
    liquiditySol: 10,
    bondingCurveProgress: 0.1,
    devWallet: 'DEV'
  });
  token.ingestTrade({ txType: 'buy', traderPublicKey: 'W1', solAmount: 1, tokenAmount: 10000, priceSol: 0.0001, timestamp: 1 });
  token.ingestTrade({ txType: 'sell', traderPublicKey: 'DEV', solAmount: 0.5, tokenAmount: 5000, priceSol: 0.00008, timestamp: 2 });

  const snapshot = token.snapshot(3);
  const score = scoreToken(snapshot, config);
  const reasons = blockReasons(snapshot, score, config);

  assert.ok(reasons.includes('dev wallet is selling'));
  assert.ok(reasons.includes('top holder concentration too high'));
});

test('risk manager enforces daily loss and cooldown', () => {
  const risk = new RiskManager(config);
  risk.observeClosedTrade(-config.risk.maxDailyLossSol, 1000);
  const reasons = risk.canOpen({ openPositions: 0, equitySol: config.paperStartingSol, at: 1001 });

  assert.ok(reasons.includes('max daily loss reached'));
  assert.ok(reasons.includes('cooldown after loss is active'));
});
