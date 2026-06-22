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

/** Time grid settings for a week (the user can adjust these per week). */
export interface TimeGridConfig {
  /** Start time, 24h "HH:MM" (e.g. "04:30"). */
  startTime: string;
  /** Interval between slots in minutes (default 60 = 1 hour). */
  intervalMinutes: number;
  /** Number of slots to generate. */
  slotCount: number;
}

/** Worksheet default: 8:00 A.M. start, 1-hour interval, 14 slots (8 A.M.–9 P.M.). */
export const DEFAULT_TIME_GRID: TimeGridConfig = {
  startTime: '08:00',
  intervalMinutes: 60,
  slotCount: ACTIVITY_TIME_SLOTS.length,
};

/** Format minutes-since-midnight as a worksheet-style label, e.g. "4:30 A.M.". */
export function formatTimeLabel(minutesSinceMidnight: number): string {
  const mins = ((minutesSinceMidnight % 1440) + 1440) % 1440;
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const period = h24 < 12 ? 'A.M.' : 'P.M.';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

/** Generate slot labels from a TimeGridConfig. */
export function buildTimeSlotLabels(grid: TimeGridConfig): string[] {
  const [hh, mm] = grid.startTime.split(':').map((n) => Number.parseInt(n, 10));
  const start = (hh || 0) * 60 + (mm || 0);
  return Array.from({ length: Math.max(0, grid.slotCount) }, (_, i) =>
    formatTimeLabel(start + i * grid.intervalMinutes),
  );
}

/** Build a blank week input using the given (or default) time grid. */
export function buildEmptyWeek(
  weekStartDate: string,
  grid: TimeGridConfig = DEFAULT_TIME_GRID,
): ActivityWeekInput {
  const labels = buildTimeSlotLabels(grid);
  return {
    week_start_date: weekStartDate,
    title: null,
    notes: null,
    is_draft: true,
    days: DAYS_OF_WEEK.map((day) => ({
      day_of_week: day,
      overall_mood_0_10: null,
      slots: labels.map((label, i) => ({
        time_label: label,
        activity_text: null,
        pm_rating_text: null,
        sort_order: i,
      })),
    })),
  };
}

/**
 * Re-label / resize the time slots of an existing week to a new grid while
 * preserving already-entered activity/rating text by row index. Adds blank
 * slots when growing, drops trailing slots when shrinking.
 */
export function applyTimeGrid(
  days: ActivityWeekInput['days'],
  grid: TimeGridConfig,
): ActivityWeekInput['days'] {
  const labels = buildTimeSlotLabels(grid);
  return days.map((day) => ({
    ...day,
    slots: labels.map((label, i) => {
      const existing = day.slots[i];
      return {
        time_label: label,
        activity_text: existing?.activity_text ?? null,
        pm_rating_text: existing?.pm_rating_text ?? null,
        sort_order: i,
      };
    }),
  }));
}

/** Infer a TimeGridConfig from already-stored slots (for editing existing weeks). */
export function inferTimeGrid(days: ActivityWeekInput['days']): TimeGridConfig {
  const slots = days[0]?.slots ?? [];
  const parse = (label: string | undefined): number | null => {
    if (!label) return null;
    const m = label.match(/^(\d{1,2}):(\d{2})\s*(A\.M\.|P\.M\.)$/i);
    if (!m) return null;
    let h = Number.parseInt(m[1]!, 10) % 12;
    if (/p\.m\./i.test(m[3]!)) h += 12;
    return h * 60 + Number.parseInt(m[2]!, 10);
  };
  const first = parse(slots[0]?.time_label);
  const second = parse(slots[1]?.time_label);
  const startMins = first ?? 8 * 60;
  const interval = first != null && second != null ? second - first : 60;
  return {
    startTime: `${String(Math.floor(startMins / 60)).padStart(2, '0')}:${String(startMins % 60).padStart(2, '0')}`,
    intervalMinutes: interval > 0 ? interval : 60,
    slotCount: slots.length || DEFAULT_TIME_GRID.slotCount,
  };
}

/** Most recent past Sunday as YYYY-MM-DD (default week start). */
export function defaultWeekStart(): string {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay()); // back to Sunday
  return d.toISOString().slice(0, 10);
}
