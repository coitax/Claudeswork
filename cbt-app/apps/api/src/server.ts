import { buildApp } from './app.js';
import { bootstrap } from './bootstrap.js';
import { config } from './config.js';

async function main(): Promise<void> {
  await bootstrap();
  const app = await buildApp();
  await app.listen({ host: config.host, port: config.port });
  app.log.info(`CBT API listening on http://${config.host}:${config.port}`);
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
