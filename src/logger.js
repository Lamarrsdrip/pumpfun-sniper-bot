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
  const lines = fs.readFileSync(fullPath, 'utf8').trim().split(/\r?\n/).filter(Boolean);
  return lines.slice(-limit).map((line) => {
    try {
      return JSON.parse(line);
    } catch {
      return { type: 'parse:error', raw: line };
    }
  });
}
