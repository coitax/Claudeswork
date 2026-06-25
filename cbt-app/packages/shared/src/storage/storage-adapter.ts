/**
 * Storage Adapter Contract.
 *
 * This is the single seam between feature/service logic and persistence.
 * Feature services depend ONLY on this interface. The v1 implementation is a
 * file-based adapter (JSON files on disk). A future SQLite adapter implements
 * the same interface, so swapping storage requires no feature changes.
 *
 * All methods are async so a synchronous file adapter and an async DB adapter
 * share one shape. Adapters are responsible for assigning ids/timestamps only
 * where noted; callers generally pass fully-formed records.
 */

import type {
  ActivityWeek,
  DailyMood,
  EmotionSelection,
  Session,
  ThoughtRecord,
  User,
  WorksheetTemplate,
  WorksheetTextReviewItem,
} from '../types/entities.js';

/** Common list query options. */
export interface ListOptions {
  /** Restrict to a given user (single-user app, but kept explicit). */
  userId?: string;
  limit?: number;
  offset?: number;
}

export interface StorageAdapter {
  /** Called once at startup so adapters can create folders / open the DB. */
  init(): Promise<void>;

  // --- Auth / users / sessions ---
  getUser(idOrUsernameOrEmail: string): Promise<User | null>;
  saveUser(user: User): Promise<User>;

  getSession(sessionId: string): Promise<Session | null>;
  createSession(session: Session): Promise<Session>;
  deleteSession(sessionId: string): Promise<void>;
  /** Housekeeping: remove sessions whose expires_at has passed. */
  deleteExpiredSessions(nowIso: string): Promise<void>;

  // --- Activity weeks ---
  getActivityWeeks(opts?: ListOptions): Promise<ActivityWeek[]>;
  getActivityWeekById(id: string): Promise<ActivityWeek | null>;
  saveActivityWeek(week: ActivityWeek): Promise<ActivityWeek>;
  deleteActivityWeek(id: string): Promise<void>;

  // --- Thought records ---
  getThoughtRecords(opts?: ListOptions): Promise<ThoughtRecord[]>;
  getThoughtRecordById(id: string): Promise<ThoughtRecord | null>;
  saveThoughtRecord(record: ThoughtRecord): Promise<ThoughtRecord>;
  deleteThoughtRecord(id: string): Promise<void>;

  // --- Daily moods ---
  getDailyMoods(opts?: ListOptions): Promise<DailyMood[]>;
  getDailyMoodById(id: string): Promise<DailyMood | null>;
  saveDailyMood(mood: DailyMood): Promise<DailyMood>;
  deleteDailyMood(id: string): Promise<void>;

  // --- Emotion selections (attached to a parent record) ---
  getEmotionSelections(parentType: string, parentId: string): Promise<EmotionSelection[]>;
  saveEmotionSelection(selection: EmotionSelection): Promise<EmotionSelection>;

  // --- Worksheet templates & review items (mostly read-only at runtime) ---
  getWorksheetTemplates(): Promise<WorksheetTemplate[]>;
  getWorksheetTemplateByKey(key: string): Promise<WorksheetTemplate | null>;
  saveWorksheetTemplate(template: WorksheetTemplate): Promise<WorksheetTemplate>;

  getWorksheetReviewItems(): Promise<WorksheetTextReviewItem[]>;
  saveWorksheetReviewItem(item: WorksheetTextReviewItem): Promise<WorksheetTextReviewItem>;
}
