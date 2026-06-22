import { ACTIVITY_TIME_SLOTS, type ActivityWeekInput } from '@cbt/shared';

export const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

/** Build a blank week input (Sunday..Saturday, all configured time slots). */
export function buildEmptyWeek(weekStartDate: string): ActivityWeekInput {
  return {
    week_start_date: weekStartDate,
    title: null,
    notes: null,
    is_draft: true,
    days: DAYS_OF_WEEK.map((day) => ({
      day_of_week: day,
      overall_mood_0_10: null,
      slots: ACTIVITY_TIME_SLOTS.map((label, i) => ({
        time_label: label,
        activity_text: null,
        pm_rating_text: null,
        sort_order: i,
      })),
    })),
  };
}

/** Most recent past Sunday as YYYY-MM-DD (default week start). */
export function defaultWeekStart(): string {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay()); // back to Sunday
  return d.toISOString().slice(0, 10);
}
