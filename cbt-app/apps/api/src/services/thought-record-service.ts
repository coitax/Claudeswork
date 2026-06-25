import type { StorageAdapter, ThoughtRecord, ThoughtRecordInput } from '@cbt/shared';
import { newId, nowIso } from './util.js';

export class ThoughtRecordService {
  constructor(private readonly storage: StorageAdapter) {}

  list(userId: string): Promise<ThoughtRecord[]> {
    return this.storage.getThoughtRecords({ userId });
  }

  async get(userId: string, id: string): Promise<ThoughtRecord | null> {
    const rec = await this.storage.getThoughtRecordById(id);
    if (!rec || rec.user_id !== userId) return null;
    return rec;
  }

  async create(userId: string, input: ThoughtRecordInput): Promise<ThoughtRecord> {
    const ts = nowIso();
    const record: ThoughtRecord = {
      id: newId(),
      user_id: userId,
      title: input.title ?? null,
      date_time: input.date_time ?? null,
      situation_text: input.situation_text ?? null,
      automatic_thoughts_text: input.automatic_thoughts_text ?? null,
      automatic_thoughts_belief_percent: input.automatic_thoughts_belief_percent ?? null,
      emotions_text: input.emotions_text ?? null,
      emotions_intensity_percent: input.emotions_intensity_percent ?? null,
      adaptive_response_text: input.adaptive_response_text ?? null,
      cognitive_distortion_text: input.cognitive_distortion_text ?? null,
      outcome_belief_now_percent: input.outcome_belief_now_percent ?? null,
      outcome_emotions_now_text: input.outcome_emotions_now_text ?? null,
      outcome_emotions_now_percent: input.outcome_emotions_now_percent ?? null,
      outcome_what_would_be_good_to_do_text: input.outcome_what_would_be_good_to_do_text ?? null,
      is_draft: input.is_draft,
      created_at: ts,
      updated_at: ts,
    };
    return this.storage.saveThoughtRecord(record);
  }

  async update(userId: string, id: string, input: ThoughtRecordInput): Promise<ThoughtRecord | null> {
    const existing = await this.get(userId, id);
    if (!existing) return null;
    const updated: ThoughtRecord = {
      ...existing,
      title: input.title ?? null,
      date_time: input.date_time ?? null,
      situation_text: input.situation_text ?? null,
      automatic_thoughts_text: input.automatic_thoughts_text ?? null,
      automatic_thoughts_belief_percent: input.automatic_thoughts_belief_percent ?? null,
      emotions_text: input.emotions_text ?? null,
      emotions_intensity_percent: input.emotions_intensity_percent ?? null,
      adaptive_response_text: input.adaptive_response_text ?? null,
      cognitive_distortion_text: input.cognitive_distortion_text ?? null,
      outcome_belief_now_percent: input.outcome_belief_now_percent ?? null,
      outcome_emotions_now_text: input.outcome_emotions_now_text ?? null,
      outcome_emotions_now_percent: input.outcome_emotions_now_percent ?? null,
      outcome_what_would_be_good_to_do_text: input.outcome_what_would_be_good_to_do_text ?? null,
      is_draft: input.is_draft,
      updated_at: nowIso(),
    };
    return this.storage.saveThoughtRecord(updated);
  }
}
