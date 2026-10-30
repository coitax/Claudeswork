import type { FastifyInstance } from 'fastify';
import { reviewItemUpdateSchema } from '@cbt/shared';
import { services } from '../services/index.js';
import { requireAuth } from '../auth/session.js';
import { parseBody } from './helpers.js';

export async function worksheetRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth);

  app.get('/api/worksheet-templates', async (_req, reply) => {
    return reply.send(services.worksheet.getConfigs());
  });

  app.get('/api/worksheet-review-items', async (_req, reply) => {
    return reply.send({ items: await services.worksheet.getReviewItems() });
  });

  app.put<{ Params: { id: string } }>('/api/worksheet-review-items/:id', async (req, reply) => {
    const body = parseBody(reviewItemUpdateSchema, req.body, reply);
    if (!body) return;
    const item = await services.worksheet.updateReviewItem(req.params.id, body);
    if (!item) return reply.code(404).send({ error: 'not_found' });
    return reply.send(item);
  });
}
