import type { FastifyInstance } from 'fastify';
import { dailyMoodInputSchema, worksheetConfigs } from '@cbt/shared';
import { services } from '../services/index.js';
import { requireAuth } from '../auth/session.js';
import { parseBody } from './helpers.js';

export async function dailyMoodRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth);

  app.get('/api/daily-moods', async (req, reply) => {
    return reply.send({ items: await services.dailyMood.list(req.currentUser!.id) });
  });

  app.post('/api/daily-moods', async (req, reply) => {
    const body = parseBody(dailyMoodInputSchema, req.body, reply);
    if (!body) return;
    const mood = await services.dailyMood.create(req.currentUser!.id, body);
    return reply.code(201).send(mood);
  });

  app.get<{ Params: { id: string } }>('/api/daily-moods/:id', async (req, reply) => {
    const mood = await services.dailyMood.get(req.currentUser!.id, req.params.id);
    if (!mood) return reply.code(404).send({ error: 'not_found' });
    return reply.send(mood);
  });

  app.put<{ Params: { id: string } }>('/api/daily-moods/:id', async (req, reply) => {
    const body = parseBody(dailyMoodInputSchema, req.body, reply);
    if (!body) return;
    const mood = await services.dailyMood.update(req.currentUser!.id, req.params.id, body);
    if (!mood) return reply.code(404).send({ error: 'not_found' });
    return reply.send(mood);
  });

  app.get<{ Params: { id: string } }>('/api/daily-moods/:id/print-data', async (req, reply) => {
    const mood = await services.dailyMood.get(req.currentUser!.id, req.params.id);
    if (!mood) return reply.code(404).send({ error: 'not_found' });
    return reply.send({ mood, config: worksheetConfigs['daily-mood-entry'] });
  });
}
