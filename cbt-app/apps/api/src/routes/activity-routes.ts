import type { FastifyInstance } from 'fastify';
import { activityWeekInputSchema, worksheetConfigs } from '@cbt/shared';
import { services } from '../services/index.js';
import { requireAuth } from '../auth/session.js';
import { parseBody } from './helpers.js';

export async function activityRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth);

  app.get('/api/activity-weeks', async (req, reply) => {
    return reply.send({ items: await services.activity.list(req.currentUser!.id) });
  });

  app.post('/api/activity-weeks', async (req, reply) => {
    const body = parseBody(activityWeekInputSchema, req.body, reply);
    if (!body) return;
    const week = await services.activity.create(req.currentUser!.id, body);
    return reply.code(201).send(week);
  });

  app.get<{ Params: { id: string } }>('/api/activity-weeks/:id', async (req, reply) => {
    const week = await services.activity.get(req.currentUser!.id, req.params.id);
    if (!week) return reply.code(404).send({ error: 'not_found' });
    return reply.send(week);
  });

  app.put<{ Params: { id: string } }>('/api/activity-weeks/:id', async (req, reply) => {
    const body = parseBody(activityWeekInputSchema, req.body, reply);
    if (!body) return;
    const week = await services.activity.update(req.currentUser!.id, req.params.id, body);
    if (!week) return reply.code(404).send({ error: 'not_found' });
    return reply.send(week);
  });

  app.delete<{ Params: { id: string } }>('/api/activity-weeks/:id', async (req, reply) => {
    const ok = await services.activity.delete(req.currentUser!.id, req.params.id);
    if (!ok) return reply.code(404).send({ error: 'not_found' });
    return reply.code(204).send();
  });

  app.get<{ Params: { id: string } }>('/api/activity-weeks/:id/print-data', async (req, reply) => {
    const week = await services.activity.get(req.currentUser!.id, req.params.id);
    if (!week) return reply.code(404).send({ error: 'not_found' });
    return reply.send({ week, config: worksheetConfigs['activity-monitoring-form'] });
  });
}
