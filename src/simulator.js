import fs from 'node:fs';
import readline from 'node:readline';

export async function runSimulation(file, engine) {
  const stream = fs.createReadStream(file, 'utf8');
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    const event = JSON.parse(line);
    const at = Number(event.timestamp || event.at || Date.now());
    if (event.type === 'newToken') engine.onNewToken(event, at);
    if (event.type === 'trade') await engine.onTrade(event, at);
  }
  return engine.dashboardState();
}
