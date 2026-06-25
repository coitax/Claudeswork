import type { ActivityWeekInput } from '../zod/schemas.js'; // ActivityWeekInput = z.infer<typeof activityWeekInputSchema>

type Day = ActivityWeekInput['days'][number];

/**
 * Return a new day with activity_text set on every slot whose time_label is
 * within [startLabel, endLabel] inclusive (by slot order). pm_rating_text is
 * set only when pmText is a non-empty string; otherwise existing pm is kept.
 * Input is not mutated.
 */
export function fillSlotRange(
  day: Day,
  startLabel: string,
  endLabel: string,
  activityText: string,
  pmText?: string,
): Day {
  const labels = day.slots.map((s) => s.time_label);
  const start = labels.indexOf(startLabel);
  const end = labels.indexOf(endLabel);
  if (start === -1 || end === -1) return { ...day, slots: day.slots.map((s) => ({ ...s })) };
  const lo = Math.min(start, end);
  const hi = Math.max(start, end);
  const slots = day.slots.map((s, i) =>
    i >= lo && i <= hi
      ? { ...s, activity_text: activityText, pm_rating_text: pmText ? pmText : s.pm_rating_text }
      : { ...s },
  );
  return { ...day, slots };
}

/**
 * Deep-copy source.slots onto each target day, replacing target slots.
 * overall_mood_0_10 and day_of_week of each target are preserved.
 * Returns new target day objects; inputs are not mutated.
 */
export function copyDaySlots(source: Day, targets: Day[]): Day[] {
  return targets.map((t) => ({
    ...t,
    slots: source.slots.map((s) => ({ ...s })),
  }));
}
