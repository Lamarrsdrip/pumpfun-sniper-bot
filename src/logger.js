import fs from 'node:fs';
import path from 'node:path';
import { nowIso } from './math.js';

export class JsonlLogger {
  constructor(file) {
    this.file = path.resolve(file);
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
  }

  write(event) {
    const row = JSON.stringify({ ts: nowIso(), ...event });
    fs.appendFileSync(this.file, `${row}\n`);
  }
}

export function readJsonl(file, limit = 500) {
  const fullPath = path.resolve(file);
  if (!fs.existsSync(fullPath)) return [];
  const stats = fs.statSync(fullPath);
  const maxBytes = Math.min(stats.size, Math.max(512_000, limit * 4096));
  const fd = fs.openSync(fullPath, 'r');
  const buffer = Buffer.alloc(maxBytes);
  try {
    fs.readSync(fd, buffer, 0, maxBytes, stats.size - maxBytes);
  } finally {
    fs.closeSync(fd);
  }
  const text = buffer.toString('utf8');
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (stats.size > maxBytes && lines.length) lines.shift();
  return lines.slice(-limit).map((line) => {
    try {
      return JSON.parse(line);
    } catch {
      return { type: 'parse:error', raw: line };
    }
  });
}
