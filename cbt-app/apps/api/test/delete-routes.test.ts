import { describe, it, expect } from 'vitest';
import { makeApp } from './helpers.js';

describe('DELETE record routes', () => {
  it('deletes an owned activity week (204) and 404s afterward', async () => {
    const { app, storage, cookie } = await makeApp();
    const now = new Date(0).toISOString();
    await storage.saveActivityWeek({ id: 'w1', user_id: 'u1', week_start_date: '2026-01-04', title: null, notes: null, is_draft: true, days: [], created_at: now, updated_at: now } as any);
    const del = await app.inject({ method: 'DELETE', url: '/api/activity-weeks/w1', headers: { cookie } });
    expect(del.statusCode).toBe(204);
    const again = await app.inject({ method: 'DELETE', url: '/api/activity-weeks/w1', headers: { cookie } });
    expect(again.statusCode).toBe(404);
  });

  it('deletes an owned thought record (204) and 404s afterward', async () => {
    const { app, storage, cookie } = await makeApp();
    const now = new Date(0).toISOString();
    await storage.saveThoughtRecord({ id: 'tr1', user_id: 'u1', title: null, date_time: null, situation_text: null, automatic_thoughts_text: null, automatic_thoughts_belief_percent: null, emotions_text: null, emotions_intensity_percent: null, adaptive_response_text: null, cognitive_distortion_text: null, outcome_belief_now_percent: null, outcome_emotions_now_text: null, outcome_emotions_now_percent: null, outcome_what_would_be_good_to_do_text: null, is_draft: false, created_at: now, updated_at: now } as any);
    const del = await app.inject({ method: 'DELETE', url: '/api/thought-records/tr1', headers: { cookie } });
    expect(del.statusCode).toBe(204);
    const again = await app.inject({ method: 'DELETE', url: '/api/thought-records/tr1', headers: { cookie } });
    expect(again.statusCode).toBe(404);
  });

  it('deletes an owned daily mood (204) and 404s afterward', async () => {
    const { app, storage, cookie } = await makeApp();
    const now = new Date(0).toISOString();
    await storage.saveDailyMood({ id: 'dm1', user_id: 'u1', entry_date: '2026-01-05', mood_0_10: 5, notes_text: null, linked_thought_record_id: null, linked_activity_week_id: null, created_at: now, updated_at: now } as any);
    const del = await app.inject({ method: 'DELETE', url: '/api/daily-moods/dm1', headers: { cookie } });
    expect(del.statusCode).toBe(204);
    const again = await app.inject({ method: 'DELETE', url: '/api/daily-moods/dm1', headers: { cookie } });
    expect(again.statusCode).toBe(404);
  });

  it('401 without a session cookie', async () => {
    const { app } = await makeApp();
    const res = await app.inject({ method: 'DELETE', url: '/api/activity-weeks/anything' });
    expect(res.statusCode).toBe(401);
  });
});
