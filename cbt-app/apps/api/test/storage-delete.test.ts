import { describe, it, expect } from 'vitest';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FileStorageAdapter } from '../src/storage/file-storage-adapter.js';

describe('FileStorageAdapter deletes', () => {
  it('removes an activity week and its emotion selections, idempotently', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cbt-'));
    const s = new FileStorageAdapter(dir);
    await s.init();
    const now = new Date(0).toISOString();
    await s.saveActivityWeek({ id: 'w1', user_id: 'u1', week_start_date: '2026-01-04', title: null, notes: null, is_draft: true, days: [], created_at: now, updated_at: now } as any);
    await s.saveEmotionSelection({ id: 'e1', parent_type: 'activity_week', parent_id: 'w1', source_type: 'free_text', primary_emotion: null, secondary_emotion: null, tertiary_emotion: null, free_text: 'x', created_at: now, updated_at: now } as any);
    await s.deleteActivityWeek('w1');
    expect(await s.getActivityWeekById('w1')).toBeNull();
    expect(await s.getEmotionSelections('activity_week', 'w1')).toEqual([]);
    await s.deleteActivityWeek('w1'); // no throw second time
  });

  it('removes a thought record and its emotion selections, idempotently', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cbt-'));
    const s = new FileStorageAdapter(dir);
    await s.init();
    const now = new Date(0).toISOString();
    await s.saveThoughtRecord({ id: 'tr1', user_id: 'u1', title: null, date_time: null, situation_text: null, automatic_thoughts_text: null, automatic_thoughts_belief_percent: null, emotions_text: null, emotions_intensity_percent: null, adaptive_response_text: null, cognitive_distortion_text: null, outcome_belief_now_percent: null, outcome_emotions_now_text: null, outcome_emotions_now_percent: null, outcome_what_would_be_good_to_do_text: null, is_draft: false, created_at: now, updated_at: now } as any);
    await s.saveEmotionSelection({ id: 'e1', parent_type: 'thought_record', parent_id: 'tr1', source_type: 'free_text', primary_emotion: null, secondary_emotion: null, tertiary_emotion: null, free_text: 'x', created_at: now, updated_at: now } as any);
    await s.deleteThoughtRecord('tr1');
    expect(await s.getThoughtRecordById('tr1')).toBeNull();
    expect(await s.getEmotionSelections('thought_record', 'tr1')).toEqual([]);
    await s.deleteThoughtRecord('tr1'); // no throw second time
  });

  it('removes a daily mood and its emotion selections, idempotently', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cbt-'));
    const s = new FileStorageAdapter(dir);
    await s.init();
    const now = new Date(0).toISOString();
    await s.saveDailyMood({ id: 'dm1', user_id: 'u1', entry_date: '2026-01-05', mood_0_10: 5, notes_text: null, linked_thought_record_id: null, linked_activity_week_id: null, created_at: now, updated_at: now } as any);
    await s.saveEmotionSelection({ id: 'e1', parent_type: 'daily_mood', parent_id: 'dm1', source_type: 'free_text', primary_emotion: null, secondary_emotion: null, tertiary_emotion: null, free_text: 'x', created_at: now, updated_at: now } as any);
    await s.deleteDailyMood('dm1');
    expect(await s.getDailyMoodById('dm1')).toBeNull();
    expect(await s.getEmotionSelections('daily_mood', 'dm1')).toEqual([]);
    await s.deleteDailyMood('dm1'); // no throw second time
  });
});
