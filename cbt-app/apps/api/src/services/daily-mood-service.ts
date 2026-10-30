import type { DailyMood, DailyMoodInput, StorageAdapter } from '@cbt/shared';
import { newId, nowIso } from './util.js';

export class DailyMoodService {
  constructor(private readonly storage: StorageAdapter) {}

  list(userId: string): Promise<DailyMood[]> {
    return this.storage.getDailyMoods({ userId });
  }

  async get(userId: string, id: string): Promise<DailyMood | null> {
    const mood = await this.storage.getDailyMoodById(id);
    if (!mood || mood.user_id !== userId) return null;
    return mood;
  }

  async create(userId: string, input: DailyMoodInput): Promise<DailyMood> {
    const ts = nowIso();
    const mood: DailyMood = {
      id: newId(),
      user_id: userId,
      entry_date: input.entry_date,
      mood_0_10: input.mood_0_10 ?? null,
      notes_text: input.notes_text ?? null,
      linked_thought_record_id: input.linked_thought_record_id ?? null,
      linked_activity_week_id: input.linked_activity_week_id ?? null,
      created_at: ts,
      updated_at: ts,
    };
    return this.storage.saveDailyMood(mood);
  }

  async update(userId: string, id: string, input: DailyMoodInput): Promise<DailyMood | null> {
    const existing = await this.get(userId, id);
    if (!existing) return null;
    const updated: DailyMood = {
      ...existing,
      entry_date: input.entry_date,
      mood_0_10: input.mood_0_10 ?? null,
      notes_text: input.notes_text ?? null,
      linked_thought_record_id: input.linked_thought_record_id ?? null,
      linked_activity_week_id: input.linked_activity_week_id ?? null,
      updated_at: nowIso(),
    };
    return this.storage.saveDailyMood(updated);
  }
}
