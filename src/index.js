import { loadConfig } from './config.js';
import { BotEvents } from './events.js';
import { JsonlLogger } from './logger.js';
import { PaperBroker, LiveBroker } from './broker.js';
import { RiskManager } from './risk.js';
import { TradeManager } from './trade-manager.js';
import { SniperEngine } from './engine.js';
import { runSimulation } from './simulator.js';
import { startDashboard } from './dashboard.js';
import { ScannerService } from './scanner-service.js';
import { PortfolioManager } from './portfolio-manager.js';

const config = loadConfig();
if (config.mode === 'live' && !liveBrokerConfigured(config)) {
  console.warn(`Live mode requested but not ready: ${liveReadinessReason(config)}. Starting in paper mode.`);
  config.mode = 'paper';
}
const events = new BotEvents();
const logger = new JsonlLogger(config.historyPath);
const broker = config.mode === 'live'
  ? new LiveBroker(config)
  : new PaperBroker(config.paperStartingSol);
const risk = new RiskManager(config);
const tradeManager = new TradeManager(config, broker, events);
const portfolio = new PortfolioManager(config.paperStartingSol);
const engine = new SniperEngine({ config, events, risk, tradeManager, broker, portfolio });

for (const name of ['token:seen', 'token:watching', 'token:qualified', 'token:blocked', 'trade:open', 'trade:add', 'trade:partialExit', 'trade:close', 'risk:emergencyStop', 'mode:changed', 'feed:status', 'feed:sourceHealth', 'feed:migration', 'feed:error']) {
  events.on(name, (event) => logger.write(sanitizeEvent(event)));
}

const command = process.argv[2] || 'scan';

if (command === 'simulate') {
  const file = process.argv[3] || 'data/sample-history.jsonl';
  const result = await runSimulation(file, engine);
  console.log(JSON.stringify(result.stats, null, 2));
  process.exit(0);
}

startDashboard({ config, engine, events });
console.log(`Dashboard: http://localhost:${config.port}`);
console.log(`Mode: ${config.mode}. Data: ${config.dataMode}. Live enabled: ${Boolean(config.live?.enabled)}. Dry run: ${Boolean(config.live?.dryRun)}.`);

events.on('feed:newToken', (token) => {
  engine.onNewToken(token);
});
events.on('feed:trade', (trade) => engine.onTrade(trade).catch((error) => events.emit('feed:error', { message: error.message })));
events.on('feed:marketSnapshot', (snapshot) => engine.onMarketSnapshot(snapshot).catch((error) => events.emit('feed:error', { message: error.message })));
events.on('feed:sourceHealth', (health) => {
  engine.sourceHealth = { ...(engine.sourceHealth || {}), [health.source]: health };
});
events.on('feed:status', (status) => {
  if (!status.source) return;
  const source = status.source === 'pumpportal' ? 'PumpPortal' : status.source;
  engine.sourceHealth = { ...(engine.sourceHealth || {}), [source]: { ...status, updatedAt: Date.now() } };
});
const scanner = new ScannerService({ config, events });
scanner.start();

function sanitizeEvent(event) {
  return JSON.parse(JSON.stringify(event, (key, value) => {
    if (key === 'raw') return undefined;
    if (key === 'events') return undefined;
    return value;
  }));
}

function liveBrokerConfigured(config) {
  return Boolean(config.live?.enabled && config.live?.tradeApiUrl && config.live?.tradeApiKey);
}

function liveReadinessReason(config) {
  if (!config.live?.enabled) return 'LIVE_TRADING_ENABLED is not true';
  if (!config.live?.tradeApiUrl) return 'LIVE_TRADE_API_URL is missing';
  if (!config.live?.tradeApiKey) return 'LIVE_TRADE_API_KEY is missing';
  return config.live?.dryRun ? 'Live broker configured in dry-run mode' : 'Live broker configured';
}
