import type { FastifyInstance, FastifyReply } from 'fastify';
import {
  activityWeeksToCsv,
  dailyMoodsToCsv,
  thoughtRecordsToCsv,
} from '@cbt/shared';
import { services } from '../services/index.js';
import { requireAuth } from '../auth/session.js';

/** Set CSV download headers with a date-stamped filename. */
function sendCsv(reply: FastifyReply, csv: string, baseName: string): FastifyReply {
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return reply
    .header('Content-Type', 'text/csv; charset=utf-8')
    .header('Content-Disposition', `attachment; filename="${baseName}-${date}.csv"`)
    .send(csv);
}

export async function exportRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth);

  app.get('/api/export/activity-weeks.csv', async (req, reply) => {
    const weeks = await services.activity.list(req.currentUser!.id);
    return sendCsv(reply, activityWeeksToCsv(weeks), 'activity-weeks');
  });

  app.get('/api/export/thought-records.csv', async (req, reply) => {
    const records = await services.thoughtRecord.list(req.currentUser!.id);
    return sendCsv(reply, thoughtRecordsToCsv(records), 'thought-records');
  });

  app.get('/api/export/daily-moods.csv', async (req, reply) => {
    const moods = await services.dailyMood.list(req.currentUser!.id);
    return sendCsv(reply, dailyMoodsToCsv(moods), 'daily-moods');
  });
}
