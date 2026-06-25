import { useState } from 'react';
import { fillSlotRange } from '@cbt/shared';
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

  const labels = day.slots.map((s) => s.time_label);
  const [rfActivity, setRfActivity] = useState('');
  const [rfPm, setRfPm] = useState('');
  const [rfStart, setRfStart] = useState(labels[0] ?? '');
  const [rfEnd, setRfEnd] = useState(labels[labels.length - 1] ?? '');

  function applyRangeFill() {
    if (!rfActivity.trim()) return;
    onChange(fillSlotRange(day, rfStart, rfEnd, rfActivity.trim(), rfPm.trim() || undefined));
    setRfActivity('');
    setRfPm('');
  }

  return (
    <div>
      <div className="flex flex-wrap items-end gap-2 rounded-md bg-accent-soft/40 p-2 text-sm mb-4">
        <input className="field-input flex-1" placeholder="Activity (e.g. Work)" value={rfActivity}
               onChange={(e) => setRfActivity(e.target.value)} />
        <input className="field-input w-28" placeholder="P/M (optional)" value={rfPm}
               onChange={(e) => setRfPm(e.target.value)} />
        <select className="field-input w-28" value={rfStart} onChange={(e) => setRfStart(e.target.value)}>
          {labels.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <span>to</span>
        <select className="field-input w-28" value={rfEnd} onChange={(e) => setRfEnd(e.target.value)}>
          {labels.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <button type="button" className="btn-secondary" onClick={applyRangeFill}>Fill range</button>
      </div>
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
