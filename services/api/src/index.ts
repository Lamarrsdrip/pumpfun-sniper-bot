import { config } from './config.js';
import { buildApp } from './server.js';

const app = await buildApp();

try {
  await app.listen({ port: config.port, host: config.host });
  console.log(`NairaMeme API listening on http://${config.host}:${config.port}`);
} catch (error) {
  app.log.error(error);
  process.exitCode = 1;
}
