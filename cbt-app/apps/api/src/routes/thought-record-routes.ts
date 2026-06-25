import type { FastifyInstance } from 'fastify';
import { thoughtRecordInputSchema, worksheetConfigs } from '@cbt/shared';
import { services } from '../services/index.js';
import { requireAuth } from '../auth/session.js';
import { parseBody } from './helpers.js';

export async function thoughtRecordRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth);

  app.get('/api/thought-records', async (req, reply) => {
    return reply.send({ items: await services.thoughtRecord.list(req.currentUser!.id) });
  });

  app.post('/api/thought-records', async (req, reply) => {
    const body = parseBody(thoughtRecordInputSchema, req.body, reply);
    if (!body) return;
    const rec = await services.thoughtRecord.create(req.currentUser!.id, body);
    return reply.code(201).send(rec);
  });

  app.get<{ Params: { id: string } }>('/api/thought-records/:id', async (req, reply) => {
    const rec = await services.thoughtRecord.get(req.currentUser!.id, req.params.id);
    if (!rec) return reply.code(404).send({ error: 'not_found' });
    return reply.send(rec);
  });

  app.put<{ Params: { id: string } }>('/api/thought-records/:id', async (req, reply) => {
    const body = parseBody(thoughtRecordInputSchema, req.body, reply);
    if (!body) return;
    const rec = await services.thoughtRecord.update(req.currentUser!.id, req.params.id, body);
    if (!rec) return reply.code(404).send({ error: 'not_found' });
    return reply.send(rec);
  });

  app.delete<{ Params: { id: string } }>('/api/thought-records/:id', async (req, reply) => {
    const ok = await services.thoughtRecord.delete(req.currentUser!.id, req.params.id);
    if (!ok) return reply.code(404).send({ error: 'not_found' });
    return reply.code(204).send();
  });

  app.get<{ Params: { id: string } }>('/api/thought-records/:id/print-data', async (req, reply) => {
    const rec = await services.thoughtRecord.get(req.currentUser!.id, req.params.id);
    if (!rec) return reply.code(404).send({ error: 'not_found' });
    return reply.send({
      record: rec,
      configSideOne: worksheetConfigs['thought-record-side-one'],
      configSideTwo: worksheetConfigs['thought-record-side-two'],
    });
  });
}
