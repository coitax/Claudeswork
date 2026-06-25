import { describe, it, expect } from 'vitest';
import { makeApp } from './helpers.js';

const PNG_1x1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

function multipartBody(boundary: string, buf: Buffer, filename: string, mime: string): Buffer {
  const head = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mime}\r\n\r\n`;
  const tail = `\r\n--${boundary}--\r\n`;
  return Buffer.concat([Buffer.from(head), buf, Buffer.from(tail)]);
}

describe('activity photo routes', () => {
  it('uploads, fetches, and deletes a PNG on an owned week', async () => {
    const { app, storage, cookie } = await makeApp();
    const now = new Date(0).toISOString();
    await storage.saveActivityWeek({ id: 'w1', user_id: 'u1', week_start_date: '2026-01-04', title: null, notes: null, is_draft: false, days: [], created_at: now, updated_at: now } as any);
    const boundary = 'X-BOUNDARY-1';
    const up = await app.inject({
      method: 'POST', url: '/api/activity-weeks/w1/photos',
      headers: { cookie, 'content-type': `multipart/form-data; boundary=${boundary}` },
      payload: multipartBody(boundary, PNG_1x1, 'journal.png', 'image/png'),
    });
    expect(up.statusCode).toBe(201);
    const photo = up.json();
    expect(photo.mime).toBe('image/png');

    const get = await app.inject({ method: 'GET', url: `/api/activity-weeks/w1/photos/${photo.id}`, headers: { cookie } });
    expect(get.statusCode).toBe(200);
    expect(get.headers['content-type']).toContain('image/png');

    const del = await app.inject({ method: 'DELETE', url: `/api/activity-weeks/w1/photos/${photo.id}`, headers: { cookie } });
    expect(del.statusCode).toBe(204);
    const after = await storage.getActivityWeekById('w1');
    expect(after?.photos ?? []).toEqual([]);
  });

  it('rejects an unsupported mime with 415', async () => {
    const { app, storage, cookie } = await makeApp();
    const now = new Date(0).toISOString();
    await storage.saveActivityWeek({ id: 'w2', user_id: 'u1', week_start_date: '2026-01-11', title: null, notes: null, is_draft: false, days: [], created_at: now, updated_at: now } as any);
    const boundary = 'X-BOUNDARY-2';
    const res = await app.inject({
      method: 'POST', url: '/api/activity-weeks/w2/photos',
      headers: { cookie, 'content-type': `multipart/form-data; boundary=${boundary}` },
      payload: multipartBody(boundary, Buffer.from([0, 1, 2]), 'x.heic', 'image/heic'),
    });
    expect(res.statusCode).toBe(415);
  });
});
