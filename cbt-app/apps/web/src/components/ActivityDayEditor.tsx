import type { ActivityWeekInput } from '@cbt/shared';

type DayInput = ActivityWeekInput['days'][number];

/**
 * Editor for a single day's slots (one wizard step). Maps back to the weekly
 * worksheet structure — each row is a worksheet time slot.
 */
export function ActivityDayEditor({
  day,
  onChange,
}: {
  day: DayInput;
  onChange: (day: DayInput) => void;
}) {
  function updateSlot(index: number, patch: Partial<DayInput['slots'][number]>) {
    const slots = day.slots.map((s, i) => (i === index ? { ...s, ...patch } : s));
    onChange({ ...day, slots });
  }

  return (
    <div>
      <div className="space-y-3">
        {day.slots.map((slot, i) => (
          <div key={slot.time_label} className="rounded-md border border-accent-soft p-3">
            <p className="mb-2 text-sm font-medium text-ink">{slot.time_label}</p>
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <input
                className="field-input"
                placeholder="Activity (leave blank if none)"
                aria-label={`Activity at ${slot.time_label}`}
                value={slot.activity_text ?? ''}
                onChange={(e) => updateSlot(i, { activity_text: e.target.value || null })}
              />
              <input
                className="field-input sm:w-28"
                placeholder="P / M"
                aria-label={`P/M rating at ${slot.time_label}`}
                value={slot.pm_rating_text ?? ''}
                onChange={(e) => updateSlot(i, { pm_rating_text: e.target.value || null })}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
