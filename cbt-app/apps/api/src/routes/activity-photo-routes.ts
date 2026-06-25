import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import type { FastifyInstance } from 'fastify';
import type { ActivityPhoto } from '@cbt/shared';
import { services } from '../services/index.js';
import { requireAuth } from '../auth/session.js';
import { photoStorage, extForMime, ALLOWED_PHOTO_MIME } from '../storage/photo-storage.js';

export async function activityPhotoRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth);

  app.post<{ Params: { id: string } }>('/api/activity-weeks/:id/photos', async (req, reply) => {
    const week = await services.activity.get(req.currentUser!.id, req.params.id);
    if (!week) return reply.code(404).send({ error: 'not_found' });
    let data;
    try {
      data = await req.file();
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === 'FST_REQ_FILE_TOO_LARGE') return reply.code(413).send({ error: 'file_too_large' });
      if (code === 'FST_FILES_LIMIT') return reply.code(415).send({ error: 'too_many_files' });
      throw err;
    }
    if (!data) return reply.code(400).send({ error: 'no_file' });
    if (!ALLOWED_PHOTO_MIME.has(data.mimetype)) {
      return reply.code(415).send({ error: 'unsupported_media_type', message: 'Only JPEG, PNG, or WEBP are allowed (HEIC is not supported).' });
    }
    const buf = await data.toBuffer();
    const ext = extForMime(data.mimetype)!;
    const photo: ActivityPhoto = {
      id: randomUUID(), filename: data.filename, mime: data.mimetype, size: buf.length,
      created_at: new Date().toISOString(),
    };
    await photoStorage.save(week.id, photo.id, ext, buf);
    const updated = await services.activity.addPhoto(req.currentUser!.id, week.id, photo);
    if (!updated) { await photoStorage.delete(week.id, photo.id, ext); return reply.code(404).send({ error: 'not_found' }); }
    return reply.code(201).send(photo);
  });

  app.get<{ Params: { id: string; photoId: string } }>('/api/activity-weeks/:id/photos/:photoId', async (req, reply) => {
    const week = await services.activity.get(req.currentUser!.id, req.params.id);
    if (!week) return reply.code(404).send({ error: 'not_found' });
    const photo = (week.photos ?? []).find((p) => p.id === req.params.photoId);
    if (!photo) return reply.code(404).send({ error: 'not_found' });
    const ext = extForMime(photo.mime)!;
    return reply.type(photo.mime).send(createReadStream(photoStorage.filePath(week.id, photo.id, ext)));
  });

  app.delete<{ Params: { id: string; photoId: string } }>('/api/activity-weeks/:id/photos/:photoId', async (req, reply) => {
    const removed = await services.activity.removePhoto(req.currentUser!.id, req.params.id, req.params.photoId);
    if (!removed) return reply.code(404).send({ error: 'not_found' });
    const ext = extForMime(removed.mime)!;
    await photoStorage.delete(req.params.id, removed.id, ext);
    return reply.code(204).send();
  });
}
