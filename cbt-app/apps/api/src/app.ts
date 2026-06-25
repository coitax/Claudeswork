import path from 'node:path';
import { existsSync } from 'node:fs';
import Fastify, { type FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';
import fastifyStatic from '@fastify/static';
import { config } from './config.js';
import { authRoutes } from './routes/auth-routes.js';
import { activityRoutes } from './routes/activity-routes.js';
import { thoughtRecordRoutes } from './routes/thought-record-routes.js';
import { dailyMoodRoutes } from './routes/daily-mood-routes.js';
import { worksheetRoutes } from './routes/worksheet-routes.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: { level: config.isProd ? 'info' : 'debug' },
    bodyLimit: 2 * 1024 * 1024,
  });

  await app.register(cookie);

  // API routes
  await app.register(authRoutes);
  await app.register(activityRoutes);
  await app.register(thoughtRecordRoutes);
  await app.register(dailyMoodRoutes);
  await app.register(worksheetRoutes);

  app.get('/api/health', async () => ({ ok: true }));

  // In production, serve the built SPA and fall back to index.html for client routes.
  if (config.isProd && existsSync(config.webDistDir)) {
    await app.register(fastifyStatic, { root: config.webDistDir });
    app.setNotFoundHandler((req, reply) => {
      if (req.raw.url?.startsWith('/api/')) {
        return reply.code(404).send({ error: 'not_found' });
      }
      return reply.sendFile('index.html');
    });
  }

  return app;
}

export { path };
