import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { readJsonl } from './logger.js';

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
    if (req.method === 'POST' && url.pathname === '/api/paper/buy') {
      await handleJsonAction(req, res, (body) => engine.paperBuy(String(body.mint || ''), body));
      return;
    }
    if (req.method === 'POST' && url.pathname === '/api/paper/sell') {
      await handleJsonAction(req, res, (body) => engine.paperSell(String(body.mint || ''), body));
      return;
    }
    if (req.method === 'POST' && url.pathname === '/api/risk/settings') {
      await handleJsonAction(req, res, (body) => engine.updateRiskSettings(body));
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
    const requested = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1));
    const filePath = path.resolve(publicDir, requested);
    if (!filePath.startsWith(publicDir) || !fs.existsSync(filePath)) {
      res.writeHead(404);
      res.end('not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType(filePath) });
    fs.createReadStream(filePath).pipe(res);
  });

  const push = (event) => {
    const data = `data: ${JSON.stringify(stripInternal(event))}\n\n`;
    for (const client of clients) client.write(data);
  };
  for (const name of ['token:seen', 'token:watching', 'token:qualified', 'token:blocked', 'trade:open', 'trade:add', 'trade:partialExit', 'trade:close', 'feed:status', 'feed:sourceHealth', 'feed:migration', 'feed:error']) {
    events.on(name, push);
  }

  server.listen(config.port, '127.0.0.1');
  return server;
}

function stripInternal(value) {
  return JSON.parse(JSON.stringify(value, (key, entry) => key === 'raw' ? undefined : entry));
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
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 100_000) reject(new Error('request body too large'));
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        reject(new Error('invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, body, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function contentType(file) {
  if (file.endsWith('.css')) return 'text/css';
  if (file.endsWith('.js')) return 'text/javascript';
  return 'text/html';
}
