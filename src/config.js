import fs from 'node:fs';
import path from 'node:path';

export function loadEnv(file = '.env') {
  if (!fs.existsSync(file)) return;
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

export function loadConfig() {
  loadEnv();
  const configPath = process.env.CONFIG_PATH || 'config/default.json';
  const fullPath = path.resolve(configPath);
  const config = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  config.mode = process.env.MODE || config.mode || 'paper';
  config.dataMode = process.env.DATA_MODE || config.dataMode || 'mock';
  config.port = Number(process.env.PORT || config.port || 8787);
  config.historyPath = process.env.HISTORY_PATH || config.historyPath || 'data/history.jsonl';
  config.pumpPortalApiKey = process.env.PUMPPORTAL_API_KEY || '';
  if (process.env.MOCK_FEED_ENABLED) config.mockFeed.enabled = process.env.MOCK_FEED_ENABLED === 'true';
  config.sources = config.sources || {};
  config.sources.solanaRpcUrl = process.env.SOLANA_RPC_URL || config.sources.solanaRpcUrl;
  config.sources.heliusApiKey = process.env.HELIUS_API_KEY || config.sources.heliusApiKey || '';
  config.sources.birdeyeApiKey = process.env.BIRDEYE_API_KEY || config.sources.birdeyeApiKey || '';
  return config;
}
