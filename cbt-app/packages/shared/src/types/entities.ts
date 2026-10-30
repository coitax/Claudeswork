/**
 * Core domain entity types for the CBT tracking app.
 *
 * These mirror the JSON shapes persisted on disk (one JSON object per primary
 * record). They are storage-agnostic: feature services depend on these types,
 * not on the filesystem. A future SQLite adapter must map rows to these same
 * shapes.
 *
 * Conventions:
 * - Every stored object has a string `id`.
 * - Timestamps are ISO-8601 strings (`created_at`, `updated_at`).
 * - Fields the worksheet allows to be blank are nullable.
 */

/** ISO-8601 timestamp string, e.g. "2026-06-22T14:03:00.000Z". */
export type IsoTimestamp = string;
/** Calendar date string, "YYYY-MM-DD". */
export type IsoDate = string;

export interface User {
  id: string;
  username: string;
  email: string | null;
  password_hash: string;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
}

export interface Session {
  id: string;
  user_id: string;
  expires_at: IsoTimestamp;
  created_at: IsoTimestamp;
}

/** A single time-slot cell in an activity day (e.g. the "8:00 A.M." row). */
export interface ActivitySlot {
  /** Worksheet time label, preserved verbatim (e.g. "8:00 A.M."). */
  time_label: string;
  /** What the user did during this slot. */
  activity_text: string | null;
  /**
   * Combined P/M ("Pleasure / Mastery") rating field for v1.
   * The original worksheet wording for this column is in review_needed config.
   */
  pm_rating_text: string | null;
  sort_order: number;
}

export interface ActivityDay {
  /** "Sunday" .. "Saturday", preserved from the worksheet column headers. */
  day_of_week: string;
  slots: ActivitySlot[];
  /** Final "Overall Mood (0-10)" row value for this day. */
  overall_mood_0_10: number | null;
}

export interface ActivityWeek {
  id: string;
  user_id: string;
  /** Monday/Sunday start date of the week, "YYYY-MM-DD". */
  week_start_date: IsoDate;
  title: string | null;
  notes: string | null;
  is_draft: boolean;
  /** Always 7 day objects, Sunday .. Saturday. */
  days: ActivityDay[];
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
}

export interface ThoughtRecord {
  id: string;
  user_id: string;
  title: string | null;
  date_time: IsoTimestamp | null;
  situation_text: string | null;
  automatic_thoughts_text: string | null;
  automatic_thoughts_belief_percent: number | null;
  emotions_text: string | null;
  emotions_intensity_percent: number | null;
  adaptive_response_text: string | null;
  cognitive_distortion_text: string | null;
  outcome_belief_now_percent: number | null;
  outcome_emotions_now_text: string | null;
  outcome_emotions_now_percent: number | null;
  outcome_what_would_be_good_to_do_text: string | null;
  is_draft: boolean;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
}

export interface DailyMood {
  id: string;
  user_id: string;
  entry_date: IsoDate;
  mood_0_10: number | null;
  notes_text: string | null;
  linked_thought_record_id: string | null;
  linked_activity_week_id: string | null;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
}

export type EmotionParentType = 'thought_record' | 'daily_mood' | 'activity_week';
export type EmotionSourceType = 'feelings_wheel' | 'free_text';

export interface EmotionSelection {
  id: string;
  parent_type: EmotionParentType;
  parent_id: string;
  source_type: EmotionSourceType;
  primary_emotion: string | null;
  secondary_emotion: string | null;
  tertiary_emotion: string | null;
  free_text: string | null;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
}

export interface WorksheetTemplate {
  id: string;
  key: string;
  version: number;
  title: string;
  /** The full worksheet config blob (see WorksheetConfig). */
  template_json: unknown;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
}

export type ReviewStatus = 'review_needed' | 'confirmed' | 'corrected';

export interface WorksheetTextReviewItem {
  id: string;
  template_key: string;
  field_key: string;
  extracted_text: string;
  status: ReviewStatus;
  notes: string | null;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
}
