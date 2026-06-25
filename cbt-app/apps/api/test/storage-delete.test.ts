import { describe, it, expect, beforeAll } from 'vitest';
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
});
