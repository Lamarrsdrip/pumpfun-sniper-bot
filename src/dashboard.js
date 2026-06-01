import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { readJsonl } from './logger.js';

export function startDashboard({ config, engine, events }) {
  const clients = new Set();
  const publicDir = path.resolve('public');
  const server = http.createServer((req, res) => {
    if (req.url === '/api/state') {
      sendJson(res, engine.dashboardState());
      return;
    }
    if (req.url === '/api/events') {
      sendJson(res, readJsonl(config.historyPath, 200));
      return;
    }
    if (req.url === '/stream') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive'
      });
      clients.add(res);
      req.on('close', () => clients.delete(res));
      return;
    }
    const filePath = req.url === '/' ? path.join(publicDir, 'index.html') : path.join(publicDir, req.url || '');
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
  for (const name of ['token:seen', 'token:watching', 'token:qualified', 'token:blocked', 'trade:open', 'trade:partialExit', 'trade:close', 'feed:status', 'feed:sourceHealth', 'feed:migration', 'feed:error']) {
    events.on(name, push);
  }

  server.listen(config.port, '127.0.0.1');
  return server;
}

function stripInternal(value) {
  return JSON.parse(JSON.stringify(value, (key, entry) => key === 'raw' ? undefined : entry));
}

function sendJson(res, body) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function contentType(file) {
  if (file.endsWith('.css')) return 'text/css';
  if (file.endsWith('.js')) return 'text/javascript';
  return 'text/html';
}
