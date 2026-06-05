import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { readJsonl } from './logger.js';
import { buildPerformanceReview } from './performance-review.js';

export function startDashboard({ config, engine, events }) {
  const clients = new Set();
  const publicDir = path.resolve('public');
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://${req.headers.host || '127.0.0.1'}`);
    if (req.method === 'GET' && url.pathname === '/api/state') {
      sendJson(res, engine.dashboardState());
      return;
    }
    if (req.method === 'GET' && (url.pathname === '/health' || url.pathname === '/api/status')) {
      sendJson(res, engine.status());
      return;
    }
    if (req.method === 'GET' && url.pathname === '/api/events') {
      sendJson(res, readJsonl(config.historyPath, 200));
      return;
    }
    if (req.method === 'GET' && url.pathname === '/api/trades') {
      sendJson(res, mergedTradeHistory(engine.dashboardState().portfolio.tradeHistory || [], config.historyPath));
      return;
    }
    if (req.method === 'GET' && url.pathname === '/api/review') {
      const state = engine.dashboardState();
      const trades = mergedTradeHistory(state.portfolio.tradeHistory || [], config.historyPath);
      sendJson(res, buildPerformanceReview({ trades, state, status: engine.status() }));
      return;
    }
    if (req.method === 'POST' && url.pathname === '/api/paper/buy') {
      await handleJsonAction(req, res, (body) => engine.paperBuy(String(body.mint || ''), body));
      return;
    }
    if (req.method === 'POST' && url.pathname === '/api/paper/sell') {
      await handleJsonAction(req, res, (body) => engine.paperSell(String(body.mint || ''), body));
      return;
    }
    if (req.method === 'POST' && url.pathname === '/api/live/buy') {
      await handleJsonAction(req, res, (body) => engine.liveBuy(String(body.mint || ''), body));
      return;
    }
    if (req.method === 'POST' && url.pathname === '/api/live/sell') {
      await handleJsonAction(req, res, (body) => engine.liveSell(String(body.mint || ''), body));
      return;
    }
    if (req.method === 'POST' && url.pathname === '/api/risk/settings') {
      await handleJsonAction(req, res, (body) => engine.updateRiskSettings(body));
      return;
    }
    if (req.method === 'POST' && url.pathname === '/api/emergency-stop') {
      await handleJsonAction(req, res, (body) => engine.setEmergencyStop(body.active !== false));
      return;
    }
    if (req.method === 'POST' && url.pathname === '/api/mode') {
      await handleJsonAction(req, res, (body) => engine.setMode(String(body.mode || '')));
      return;
    }
    if (req.method === 'GET' && url.pathname === '/stream') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive'
      });
      clients.add(res);
      req.on('close', () => clients.delete(res));
      return;
    }
    const requested = url.pathname === '/' ? 'index.html' : decodeRequestedPath(url.pathname);
    if (!requested) {
      res.writeHead(400, securityHeaders({ 'Content-Type': 'text/plain; charset=utf-8' }));
      res.end('invalid path');
      return;
    }
    const filePath = resolvePublicFile(publicDir, requested);
    if (!filePath || !fs.existsSync(filePath)) {
      res.writeHead(404, securityHeaders({ 'Content-Type': 'text/plain; charset=utf-8' }));
      res.end('not found');
      return;
    }
    res.writeHead(200, securityHeaders({ 'Content-Type': contentType(filePath) }));
    fs.createReadStream(filePath).pipe(res);
  });

  const push = (event) => {
    const data = `data: ${JSON.stringify(stripInternal(event))}\n\n`;
    for (const client of clients) client.write(data);
  };
  for (const name of ['token:seen', 'token:watching', 'token:qualified', 'token:blocked', 'trade:open', 'trade:add', 'trade:partialExit', 'trade:close', 'risk:emergencyStop', 'mode:changed', 'feed:status', 'feed:sourceHealth', 'feed:migration', 'feed:error']) {
    events.on(name, push);
  }

  server.listen(config.port, '127.0.0.1');
  return server;
}

export function resolvePublicFile(publicDir, requested) {
  const root = path.resolve(publicDir);
  const candidate = path.resolve(root, requested);
  const relative = path.relative(root, candidate);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) return relative ? null : candidate;
  return candidate;
}

export function decodeRequestedPath(urlPath) {
  try {
    return decodeURIComponent(String(urlPath || '').replace(/^\/+/, ''));
  } catch {
    return null;
  }
}

function stripInternal(value) {
  return JSON.parse(JSON.stringify(value, (key, entry) => key === 'raw' ? undefined : entry));
}

export function mergedTradeHistory(memoryTrades = [], historyPath) {
  const persisted = readJsonl(historyPath, 800)
    .filter((event) => event.type === 'trade:close')
    .map(normalizeClosedTrade)
    .filter((trade) => trade.mint);
  const byKey = new Map();
  for (const trade of [...persisted, ...memoryTrades.map(normalizeClosedTrade)]) {
    const key = trade.executionId || trade.txSignature || `${trade.mint}:${trade.at}:${trade.exitPrice}:${trade.netPnlSol}`;
    byKey.set(key, trade);
  }
  return [...byKey.values()]
    .sort((a, b) => Number(b.at || 0) - Number(a.at || 0))
    .slice(0, 120);
}

function normalizeClosedTrade(trade = {}) {
  const feesSol = Number(trade.feesSol || 0);
  const grossPnlSol = Number(trade.grossPnlSol ?? trade.pnlSol ?? 0);
  const netPnlSol = Number(trade.netPnlSol ?? (grossPnlSol - feesSol));
  return {
    at: trade.at || Date.parse(trade.ts || '') || Date.now(),
    mint: String(trade.mint || ''),
    name: String(trade.name || ''),
    symbol: String(trade.symbol || ''),
    sizeSol: Number(trade.sizeSol || 0),
    entryPrice: Number(trade.entryPrice || 0),
    exitPrice: Number(trade.exitPrice || 0),
    grossPnlSol,
    netPnlSol,
    feesSol,
    entryFeesSol: Number(trade.entryFeesSol || 0),
    exitFeesSol: Number(trade.exitFeesSol || 0),
    maxDrawdownPct: Number(trade.maxDrawdownPct || 0),
    entryScore: trade.entryScore,
    exitScore: trade.exitScore,
    reason: String(trade.reason || ''),
    executionId: String(trade.executionId || trade.execution?.id || ''),
    txSignature: String(trade.txSignature || trade.execution?.txSignature || '')
  };
}

async function handleJsonAction(req, res, action) {
  try {
    const body = await readBody(req);
    const result = await action(body);
    sendJson(res, result);
  } catch (error) {
    sendJson(res, { ok: false, error: error.message }, 400);
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    let settled = false;
    req.on('data', (chunk) => {
      if (settled) return;
      data += chunk;
      if (data.length > 100_000) {
        settled = true;
        reject(new Error('request body too large'));
      }
    });
    req.on('end', () => {
      if (settled) return;
      try {
        settled = true;
        resolve(data ? JSON.parse(data) : {});
      } catch {
        settled = true;
        reject(new Error('invalid JSON body'));
      }
    });
    req.on('error', (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    });
  });
}

function sendJson(res, body, status = 200) {
  res.writeHead(status, securityHeaders({ 'Content-Type': 'application/json; charset=utf-8' }));
  res.end(JSON.stringify(body));
}

function securityHeaders(headers = {}) {
  return {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'X-Frame-Options': 'DENY',
    ...headers
  };
}

function contentType(file) {
  if (file.endsWith('.css')) return 'text/css';
  if (file.endsWith('.js')) return 'text/javascript';
  return 'text/html';
}
