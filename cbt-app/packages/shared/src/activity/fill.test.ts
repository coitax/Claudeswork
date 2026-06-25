import { describe, it, expect } from 'vitest';
import { fillSlotRange, copyDaySlots } from './fill.js';
import type { ActivityWeekInput } from '../index.js';

type Day = ActivityWeekInput['days'][number];

function day(slots: Array<[string, string | null, string | null]>): Day {
  return {
    day_of_week: 'Monday',
    overall_mood_0_10: 5,
    slots: slots.map(([time_label, activity_text, pm_rating_text], i) => ({
      time_label, activity_text, pm_rating_text, sort_order: i,
    })),
  } as Day;
}

describe('fillSlotRange', () => {
  it('fills activity across an inclusive label range, leaving pm untouched when blank', () => {
    const d = day([['08:00', null, 'x'], ['09:00', null, null], ['10:00', null, null], ['11:00', null, null]]);
    const out = fillSlotRange(d, '09:00', '10:00', 'Work');
    expect(out.slots.map((s) => s.activity_text)).toEqual([null, 'Work', 'Work', null]);
    expect(out.slots[0].pm_rating_text).toBe('x'); // outside range untouched
    expect(d.slots[1].activity_text).toBe(null);     // input not mutated
  });

  it('sets pm_rating_text only when pmText is provided', () => {
    const d = day([['08:00', null, 'keep'], ['09:00', null, 'keep']]);
    const out = fillSlotRange(d, '08:00', '09:00', 'Work', 'P3/M2');
    expect(out.slots.every((s) => s.pm_rating_text === 'P3/M2')).toBe(true);
  });
});

describe('copyDaySlots', () => {
  it('deep-copies source slots onto targets without copying mood and without aliasing', () => {
    const src = day([['08:00', 'Run', 'P5'], ['09:00', 'Eat', null]]);
    const t = day([['08:00', null, null], ['09:00', null, null]]);
    t.overall_mood_0_10 = 9;
    const [copied] = copyDaySlots(src, [t]);
    expect(copied.slots.map((s) => s.activity_text)).toEqual(['Run', 'Eat']);
    expect(copied.overall_mood_0_10).toBe(9); // mood preserved, not copied from source
    copied.slots[0].activity_text = 'Mutated';
    expect(src.slots[0].activity_text).toBe('Run'); // no shared references
  });
});
