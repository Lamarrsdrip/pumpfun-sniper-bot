import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TokenState } from '../src/token-state.js';
import { blockReasons, scoreToken } from '../src/scoring.js';
import { RiskManager } from '../src/risk.js';
import { PaperBroker } from '../src/broker.js';
import { TradeManager } from '../src/trade-manager.js';
import { BotEvents } from '../src/events.js';
import { SniperEngine } from '../src/engine.js';
import { PortfolioManager } from '../src/portfolio-manager.js';

const config = JSON.parse(readFileSync(new URL('../config/default.json', import.meta.url), 'utf8'));
const cloneConfig = () => JSON.parse(JSON.stringify(config));

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

test('paper broker buy/sell/equity includes open market value and fees', async () => {
  const broker = new PaperBroker(10);
  const position = { entryPrice: 1, currentPrice: 1, sizeSol: 1, remainingPct: 1, unrealizedPnlSol: 0 };
  await broker.buy(position, { maxSlippagePct: 0.08 });
  assert.ok(broker.cashSol < 9);
  assert.ok(broker.equitySol > broker.cashSol);
  position.currentPrice = 1.5;
  position.unrealizedPnlSol = 0.5;
  broker.markToMarket([position]);
  assert.ok(broker.equitySol > 10.45);
  await broker.sell(position, 1, { exitValueSol: 1.5 });
  position.remainingPct = 0;
  broker.markToMarket([]);
  assert.equal(broker.openValueSol, 0);
  assert.ok(broker.cashSol > 10.45);
  assert.ok(broker.feesSol > 0);
});

test('hard stop loss closes position', async () => {
  const { tradeManager, events } = testTradeManager();
  const closes = [];
  events.on('trade:close', (event) => closes.push(event));
  const position = await openTestPosition(tradeManager);
  await tradeManager.update({ mint: position.mint, price: 0.75, recentBuySellRatio: 2, devSoldPct: 0, drawdownFromHighPct: 0.25, lastTradeAgeMs: 1000 }, { score: 80 }, 2000);
  assert.equal(tradeManager.positions.size, 0);
  assert.equal(closes[0].reason, 'emergency stop loss');
});

test('trailing stop closes after profitable reversal', async () => {
  const { tradeManager, events } = testTradeManager();
  const closes = [];
  events.on('trade:close', (event) => closes.push(event));
  const position = await openTestPosition(tradeManager);
  await tradeManager.update({ mint: position.mint, price: 1.4, recentBuySellRatio: 3, devSoldPct: 0, drawdownFromHighPct: 0, lastTradeAgeMs: 1000 }, { score: 84 }, 2000);
  await tradeManager.update({ mint: position.mint, price: 1.12, recentBuySellRatio: 1.2, devSoldPct: 0, drawdownFromHighPct: 0.2, lastTradeAgeMs: 1000 }, { score: 72 }, 3000);
  assert.equal(closes.at(-1).reason, 'winner losing momentum');
});

test('take profit partials reduce remaining position', async () => {
  const { tradeManager, events } = testTradeManager();
  const partials = [];
  events.on('trade:partialExit', (event) => partials.push(event));
  const position = await openTestPosition(tradeManager);
  await tradeManager.update({ mint: position.mint, price: 1.26, recentBuySellRatio: 3, devSoldPct: 0, drawdownFromHighPct: 0, lastTradeAgeMs: 1000 }, { score: 85 }, 2000);
  assert.ok(partials.length >= 1);
  assert.ok(position.remainingPct < 1);
});

test('fake volume and dev sell blocks trigger', () => {
  const token = healthyToken();
  for (let i = 0; i < 18; i += 1) {
    token.ingestTrade({ txType: 'buy', traderPublicKey: 'WASH', solAmount: 0.2, tokenAmount: 2000, priceSol: 0.00011, timestamp: 1000 + i });
  }
  token.ingestTrade({ txType: 'sell', traderPublicKey: token.devWallet, solAmount: 0.3, tokenAmount: 3000, priceSol: 0.0001, timestamp: 2000 });
  const snapshot = token.snapshot(3000);
  const score = scoreToken(snapshot, config);
  const reasons = blockReasons(snapshot, score, config);
  assert.ok(reasons.includes('possible fake volume or wallet cycling'));
  assert.ok(reasons.includes('dev wallet is selling'));
});

test('late-entry top buying is blocked', () => {
  const token = healthyToken();
  token.ingestMarketSnapshot({ price: 0.0004, marketCapSol: 210, liquiditySol: 12, bondingCurveProgress: 0.9, timestamp: 2000 });
  const snapshot = token.snapshot(3000);
  const score = scoreToken(snapshot, config);
  const reasons = blockReasons(snapshot, score, config);
  assert.ok(reasons.includes('too late; likely top-buy risk'));
});

test('blocked and missed-run outcome memory records later run', async () => {
  const cfg = cloneConfig();
  const engine = testEngine(cfg).engine;
  const token = healthyToken();
  engine.onNewToken({ mint: token.mint, name: token.name, symbol: token.symbol, devWallet: token.devWallet, priceSol: 0.0001, marketCapSol: 40, liquiditySol: 10, bondingCurveProgress: 0.1, timestamp: 0 });
  await engine.onMarketSnapshot({ mint: token.mint, price: 0.0001, marketCapSol: 40, liquiditySol: 1, bondingCurveProgress: 0.1, timestamp: 1000 }, 1000);
  await engine.onMarketSnapshot({ mint: token.mint, price: 0.0002, marketCapSol: 80, liquiditySol: 12, bondingCurveProgress: 0.3, timestamp: 301000 }, 301000);
  assert.ok(engine.blockedMemory.length > 0);
  assert.ok(engine.blockedMemory[0].maxRunPct >= 0.6);
});

test('dashboard state API shape', () => {
  const cfg = cloneConfig();
  const { engine } = testEngine(cfg);
  const state = engine.dashboardState();
  assert.ok('stats' in state);
  assert.ok('openPositions' in state);
  assert.ok('learning' in state);
  assert.ok('sourceHealth' in state);
});

test('status API shape keeps live trading disabled and key state explicit', () => {
  const cfg = cloneConfig();
  cfg.pumpPortalApiKey = '';
  cfg.sources.heliusApiKey = '';
  cfg.sources.birdeyeApiKey = '';
  const { engine } = testEngine(cfg);
  const status = engine.status();
  assert.equal(status.ok, true);
  assert.equal(status.app.running, true);
  assert.equal(status.sources.pumpPortal.apiKey, 'missing');
  assert.equal(status.sources.devActivity.heliusApiKey, 'missing');
  assert.equal(status.sources.holders.birdeyeApiKey, 'missing');
  assert.equal(status.broker.paper, true);
  assert.equal(status.liveTrading.enabled, false);
});

test('emergency stop blocks new paper entries', () => {
  const cfg = cloneConfig();
  const { engine, risk } = testEngine(cfg);
  const result = engine.setEmergencyStop(true);
  assert.equal(result.emergencyStop, true);
  assert.ok(risk.canOpen({ openPositions: 0, equitySol: cfg.paperStartingSol, at: 1 }).includes('manual/emergency kill switch is active'));
  engine.setEmergencyStop(false);
  assert.equal(risk.killSwitch, false);
});

function testTradeManager() {
  const cfg = cloneConfig();
  const events = new BotEvents();
  const broker = new PaperBroker(10);
  const tradeManager = new TradeManager(cfg, broker, events);
  return { cfg, events, broker, tradeManager };
}

async function openTestPosition(tradeManager) {
  return tradeManager.open(
    { mint: 'TEST', name: 'Test', symbol: 'TEST', price: 1 },
    { score: 82 },
    ['test entry'],
    1000,
    1,
    'confirmed'
  );
}

function testEngine(cfg = cloneConfig()) {
  const events = new BotEvents();
  const broker = new PaperBroker(cfg.paperStartingSol);
  const risk = new RiskManager(cfg);
  const tradeManager = new TradeManager(cfg, broker, events);
  const portfolio = new PortfolioManager(cfg.paperStartingSol);
  const engine = new SniperEngine({ config: cfg, events, risk, tradeManager, broker, portfolio });
  return { engine, events, broker, risk, tradeManager, portfolio };
}

function healthyToken() {
  const token = new TokenState({
    mint: 'GOOD111111111111111111111111111111111111111',
    name: 'Good Runner',
    symbol: 'GOOD',
    priceSol: 0.0001,
    marketCapSol: 40,
    liquiditySol: 12,
    bondingCurveProgress: 0.14,
    devWallet: 'DEV'
  });
  for (let i = 0; i < 14; i += 1) {
    token.ingestTrade({ txType: 'buy', traderPublicKey: `W${i}`, solAmount: 0.2, tokenAmount: 2000, priceSol: 0.0001 + i * 0.000001, timestamp: 1000 + i * 100 });
  }
  return token;
}
