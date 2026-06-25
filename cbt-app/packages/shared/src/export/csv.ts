/**
 * CSV serializers for exporting CBT records.
 *
 * Pure functions: given arrays of domain entities, produce RFC-4180-ish CSV
 * strings (CRLF line endings, header row, double-quote escaping). No I/O.
 */

import type { ActivityWeek, DailyMood, ThoughtRecord } from '../types/entities.js';

const CRLF = '\r\n';

/**
 * Escape a single CSV cell value.
 *
 * - null / undefined become an empty string.
 * - Numbers / other primitives are stringified.
 * - A value is quoted (and internal double-quotes doubled) when it contains a
 *   comma, double-quote, carriage return, or line feed.
 */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Build a CSV string from a header row and data rows. */
function toCsv(header: string[], rows: unknown[][]): string {
  const lines = [header, ...rows].map((row) => row.map(csvCell).join(','));
  return lines.join(CRLF) + CRLF;
}

/** Flatten a single activity day's time slots into a readable one-cell string. */
function formatActivities(slots: ActivityWeek['days'][number]['slots']): string {
  return slots
    .filter((slot) => (slot.activity_text ?? '').trim() !== '' || (slot.pm_rating_text ?? '').trim() !== '')
    .map((slot) => {
      const parts = [slot.time_label];
      if ((slot.activity_text ?? '').trim() !== '') parts.push(slot.activity_text as string);
      const text = parts.join(' ');
      const pm = (slot.pm_rating_text ?? '').trim();
      return pm !== '' ? `${text} (${pm})` : text;
    })
    .join('; ');
}

/**
 * One row per DAY across all weeks.
 * Columns: week_start_date, weekday, date, overall_mood, title, notes, activities
 *
 * `date` is left blank: the worksheet stores only a weekday label per day, not a
 * concrete calendar date, so there is no per-day date to emit.
 */
export const ACTIVITY_WEEKS_HEADER = [
  'week_start_date',
  'weekday',
  'date',
  'overall_mood',
  'title',
  'notes',
  'activities',
] as const;

export function activityWeeksToCsv(weeks: ActivityWeek[]): string {
  const rows: unknown[][] = [];
  for (const week of weeks) {
    for (const day of week.days) {
      rows.push([
        week.week_start_date,
        day.day_of_week,
        '',
        day.overall_mood_0_10,
        week.title,
        week.notes,
        formatActivities(day.slots),
      ]);
    }
  }
  return toCsv([...ACTIVITY_WEEKS_HEADER], rows);
}

/**
 * One row per thought record.
 * Columns: date_time, situation, automatic_thoughts, belief_pct, emotions,
 * cognitive_distortion, adaptive_response, outcome, created_at
 */
export const THOUGHT_RECORDS_HEADER = [
  'date_time',
  'situation',
  'automatic_thoughts',
  'belief_pct',
  'emotions',
  'cognitive_distortion',
  'adaptive_response',
  'outcome',
  'created_at',
] as const;

function formatThoughtEmotions(rec: ThoughtRecord): string {
  const text = (rec.emotions_text ?? '').trim();
  if (text === '') return '';
  return rec.emotions_intensity_percent !== null && rec.emotions_intensity_percent !== undefined
    ? `${text} (${rec.emotions_intensity_percent}%)`
    : text;
}

function formatOutcome(rec: ThoughtRecord): string {
  const parts: string[] = [];
  if ((rec.outcome_emotions_now_text ?? '').trim() !== '') {
    const pct =
      rec.outcome_emotions_now_percent !== null && rec.outcome_emotions_now_percent !== undefined
        ? ` (${rec.outcome_emotions_now_percent}%)`
        : '';
    parts.push(`Emotions now: ${rec.outcome_emotions_now_text}${pct}`);
  }
  if (rec.outcome_belief_now_percent !== null && rec.outcome_belief_now_percent !== undefined) {
    parts.push(`Belief now: ${rec.outcome_belief_now_percent}%`);
  }
  if ((rec.outcome_what_would_be_good_to_do_text ?? '').trim() !== '') {
    parts.push(`Next: ${rec.outcome_what_would_be_good_to_do_text}`);
  }
  return parts.join('; ');
}

export function thoughtRecordsToCsv(records: ThoughtRecord[]): string {
  const rows = records.map((rec) => [
    rec.date_time,
    rec.situation_text,
    rec.automatic_thoughts_text,
    rec.automatic_thoughts_belief_percent,
    formatThoughtEmotions(rec),
    rec.cognitive_distortion_text,
    rec.adaptive_response_text,
    formatOutcome(rec),
    rec.created_at,
  ]);
  return toCsv([...THOUGHT_RECORDS_HEADER], rows);
}

/**
 * One row per daily mood entry.
 * Columns: entry_date, mood_0_10, notes_text, linked_thought_record_id,
 * linked_activity_week_id, created_at
 */
export const DAILY_MOODS_HEADER = [
  'entry_date',
  'mood_0_10',
  'notes_text',
  'linked_thought_record_id',
  'linked_activity_week_id',
  'created_at',
] as const;

export function dailyMoodsToCsv(moods: DailyMood[]): string {
  const rows = moods.map((mood) => [
    mood.entry_date,
    mood.mood_0_10,
    mood.notes_text,
    mood.linked_thought_record_id,
    mood.linked_activity_week_id,
    mood.created_at,
  ]);
  return toCsv([...DAILY_MOODS_HEADER], rows);
}
