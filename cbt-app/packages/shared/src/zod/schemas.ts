/**
 * Zod validation schemas shared between the API (server-side validation) and
 * the web app (React Hook Form resolvers).
 *
 * These describe the INPUT shapes accepted from clients. Server-managed fields
 * (id, user_id, created_at, updated_at) are assigned by services, not clients.
 */
import { z } from 'zod';

const nullableTrimmed = z
  .string()
  .trim()
  .max(20000)
  .nullable()
  .optional()
  .transform((v) => (v == null || v === '' ? null : v));

const percent = z.number().int().min(0).max(100).nullable().optional().transform((v) => v ?? null);
const mood0to10 = z.number().int().min(0).max(10).nullable().optional().transform((v) => v ?? null);

export const loginSchema = z.object({
  // Accepts username OR email in a single field.
  identifier: z.string().trim().min(1, 'Required').max(320),
  password: z.string().min(1, 'Required').max(1024),
});
export type LoginInput = z.infer<typeof loginSchema>;

// --- Activity week ---
export const activitySlotSchema = z.object({
  time_label: z.string().trim().min(1).max(40),
  activity_text: nullableTrimmed,
  pm_rating_text: nullableTrimmed,
  sort_order: z.number().int().min(0),
});

export const activityDaySchema = z.object({
  day_of_week: z.string().trim().min(1).max(20),
  slots: z.array(activitySlotSchema),
  overall_mood_0_10: mood0to10,
});

export const activityWeekInputSchema = z.object({
  week_start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD'),
  title: nullableTrimmed,
  notes: nullableTrimmed,
  is_draft: z.boolean().default(true),
  days: z.array(activityDaySchema).length(7, 'Expected 7 days (Sunday..Saturday)'),
});
export type ActivityWeekInput = z.infer<typeof activityWeekInputSchema>;

// --- Thought record ---
export const thoughtRecordInputSchema = z.object({
  title: nullableTrimmed,
  date_time: z.string().datetime().nullable().optional().transform((v) => v ?? null),
  situation_text: nullableTrimmed,
  automatic_thoughts_text: nullableTrimmed,
  automatic_thoughts_belief_percent: percent,
  emotions_text: nullableTrimmed,
  emotions_intensity_percent: percent,
  adaptive_response_text: nullableTrimmed,
  cognitive_distortion_text: nullableTrimmed,
  outcome_belief_now_percent: percent,
  outcome_emotions_now_text: nullableTrimmed,
  outcome_emotions_now_percent: percent,
  outcome_what_would_be_good_to_do_text: nullableTrimmed,
  is_draft: z.boolean().default(true),
});
export type ThoughtRecordInput = z.infer<typeof thoughtRecordInputSchema>;

// --- Daily mood ---
export const dailyMoodInputSchema = z.object({
  entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD'),
  mood_0_10: mood0to10,
  notes_text: nullableTrimmed,
  linked_thought_record_id: z.string().nullable().optional().transform((v) => v ?? null),
  linked_activity_week_id: z.string().nullable().optional().transform((v) => v ?? null),
});
export type DailyMoodInput = z.infer<typeof dailyMoodInputSchema>;

// --- Worksheet review item update ---
export const reviewItemUpdateSchema = z.object({
  status: z.enum(['review_needed', 'confirmed', 'corrected']),
  notes: z.string().trim().max(5000).nullable().optional().transform((v) => (v ? v : null)),
  extracted_text: z.string().max(20000).optional(),
});
export type ReviewItemUpdate = z.infer<typeof reviewItemUpdateSchema>;
