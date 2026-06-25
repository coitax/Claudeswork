/* eslint-disable @typescript-eslint/no-unused-vars */
import type {
  ActivityWeek,
  DailyMood,
  EmotionSelection,
  ListOptions,
  Session,
  StorageAdapter,
  ThoughtRecord,
  User,
  WorksheetTemplate,
  WorksheetTextReviewItem,
} from '@cbt/shared';

/**
 * SQLite Storage Adapter — STUB / FUTURE WORK. Not implemented in v1.
 *
 * This file exists to lock in the future migration path. When ready to move off
 * JSON files, implement these methods against SQLite (e.g. better-sqlite3) and
 * register it in storage/index.ts under STORAGE_DRIVER=sqlite. Because all
 * feature services depend only on the StorageAdapter interface, NO feature code
 * needs to change.
 *
 * Suggested schema (one table per entity, mirroring the JSON shapes):
 *   users(id PK, username UNIQUE, email, password_hash, created_at, updated_at)
 *   sessions(id PK, user_id FK, expires_at, created_at)
 *   activity_weeks(id PK, user_id, week_start_date, title, notes, is_draft,
 *                  days_json TEXT, created_at, updated_at)
 *   thought_records(id PK, user_id, ...columns..., is_draft, created_at, updated_at)
 *   daily_moods(id PK, user_id, entry_date, mood_0_10, notes_text,
 *               linked_thought_record_id, linked_activity_week_id, created_at, updated_at)
 *   emotion_selections(id PK, parent_type, parent_id, source_type,
 *                      primary_emotion, secondary_emotion, tertiary_emotion, free_text, ...)
 *   worksheet_templates(id PK, key UNIQUE, version, title, template_json TEXT, ...)
 *   worksheet_text_review_items(id PK, template_key, field_key, extracted_text, status, notes, ...)
 *
 * Migration: read each JSON file via FileStorageAdapter and INSERT into the
 * corresponding table; the export/import path can drive this.
 */
export class SqliteStorageAdapter implements StorageAdapter {
  constructor(_dbPath: string) {
    throw new Error(
      'SqliteStorageAdapter is not implemented yet. Use STORAGE_DRIVER=file (default) for v1.',
    );
  }

  private notImplemented(method: string): never {
    throw new Error(`SqliteStorageAdapter.${method} is not implemented (v1 uses the file adapter).`);
  }

  init(): Promise<void> {
    return this.notImplemented('init');
  }
  getUser(_idOrUsernameOrEmail: string): Promise<User | null> {
    return this.notImplemented('getUser');
  }
  saveUser(_user: User): Promise<User> {
    return this.notImplemented('saveUser');
  }
  getSession(_sessionId: string): Promise<Session | null> {
    return this.notImplemented('getSession');
  }
  createSession(_session: Session): Promise<Session> {
    return this.notImplemented('createSession');
  }
  deleteSession(_sessionId: string): Promise<void> {
    return this.notImplemented('deleteSession');
  }
  deleteExpiredSessions(_nowIso: string): Promise<void> {
    return this.notImplemented('deleteExpiredSessions');
  }
  getActivityWeeks(_opts?: ListOptions): Promise<ActivityWeek[]> {
    return this.notImplemented('getActivityWeeks');
  }
  getActivityWeekById(_id: string): Promise<ActivityWeek | null> {
    return this.notImplemented('getActivityWeekById');
  }
  saveActivityWeek(_week: ActivityWeek): Promise<ActivityWeek> {
    return this.notImplemented('saveActivityWeek');
  }
  deleteActivityWeek(_id: string): Promise<void> {
    return this.notImplemented('deleteActivityWeek');
  }
  getThoughtRecords(_opts?: ListOptions): Promise<ThoughtRecord[]> {
    return this.notImplemented('getThoughtRecords');
  }
  getThoughtRecordById(_id: string): Promise<ThoughtRecord | null> {
    return this.notImplemented('getThoughtRecordById');
  }
  saveThoughtRecord(_record: ThoughtRecord): Promise<ThoughtRecord> {
    return this.notImplemented('saveThoughtRecord');
  }
  deleteThoughtRecord(_id: string): Promise<void> {
    return this.notImplemented('deleteThoughtRecord');
  }
  getDailyMoods(_opts?: ListOptions): Promise<DailyMood[]> {
    return this.notImplemented('getDailyMoods');
  }
  getDailyMoodById(_id: string): Promise<DailyMood | null> {
    return this.notImplemented('getDailyMoodById');
  }
  saveDailyMood(_mood: DailyMood): Promise<DailyMood> {
    return this.notImplemented('saveDailyMood');
  }
  deleteDailyMood(_id: string): Promise<void> {
    return this.notImplemented('deleteDailyMood');
  }
  getEmotionSelections(_parentType: string, _parentId: string): Promise<EmotionSelection[]> {
    return this.notImplemented('getEmotionSelections');
  }
  saveEmotionSelection(_selection: EmotionSelection): Promise<EmotionSelection> {
    return this.notImplemented('saveEmotionSelection');
  }
  getWorksheetTemplates(): Promise<WorksheetTemplate[]> {
    return this.notImplemented('getWorksheetTemplates');
  }
  getWorksheetTemplateByKey(_key: string): Promise<WorksheetTemplate | null> {
    return this.notImplemented('getWorksheetTemplateByKey');
  }
  saveWorksheetTemplate(_template: WorksheetTemplate): Promise<WorksheetTemplate> {
    return this.notImplemented('saveWorksheetTemplate');
  }
  getWorksheetReviewItems(): Promise<WorksheetTextReviewItem[]> {
    return this.notImplemented('getWorksheetReviewItems');
  }
  saveWorksheetReviewItem(_item: WorksheetTextReviewItem): Promise<WorksheetTextReviewItem> {
    return this.notImplemented('saveWorksheetReviewItem');
  }
}
