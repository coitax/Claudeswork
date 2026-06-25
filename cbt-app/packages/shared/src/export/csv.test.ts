import { describe, expect, it } from 'vitest';
import type { ActivityWeek, DailyMood, ThoughtRecord } from '../types/entities.js';
import {
  ACTIVITY_WEEKS_HEADER,
  DAILY_MOODS_HEADER,
  THOUGHT_RECORDS_HEADER,
  activityWeeksToCsv,
  csvCell,
  dailyMoodsToCsv,
  thoughtRecordsToCsv,
} from './csv.js';

describe('csvCell', () => {
  it('stringifies null and undefined as empty', () => {
    expect(csvCell(null)).toBe('');
    expect(csvCell(undefined)).toBe('');
  });

  it('passes plain values through unquoted', () => {
    expect(csvCell('hello')).toBe('hello');
    expect(csvCell(7)).toBe('7');
    expect(csvCell(0)).toBe('0');
  });

  it('quotes values containing a comma', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
  });

  it('quotes and doubles internal double-quotes', () => {
    expect(csvCell('she said "hi"')).toBe('"she said ""hi"""');
  });

  it('quotes values containing CR or LF', () => {
    expect(csvCell('line1\nline2')).toBe('"line1\nline2"');
    expect(csvCell('line1\r\nline2')).toBe('"line1\r\nline2"');
  });
});

function makeDay(overrides: Partial<ActivityWeek['days'][number]> = {}): ActivityWeek['days'][number] {
  return {
    day_of_week: 'Sunday',
    overall_mood_0_10: null,
    slots: [],
    ...overrides,
  };
}

const baseWeek: ActivityWeek = {
  id: 'w1',
  user_id: 'u1',
  week_start_date: '2026-06-21',
  title: 'My week',
  notes: 'note line',
  is_draft: false,
  days: [
    makeDay({
      day_of_week: 'Sunday',
      overall_mood_0_10: 6,
      slots: [
        { time_label: '8:00 A.M.', activity_text: 'Breakfast', pm_rating_text: 'P5', sort_order: 0 },
        { time_label: '9:00 A.M.', activity_text: 'Walk', pm_rating_text: null, sort_order: 1 },
        { time_label: '10:00 A.M.', activity_text: null, pm_rating_text: null, sort_order: 2 },
      ],
    }),
  ],
  created_at: '2026-06-21T10:00:00.000Z',
  updated_at: '2026-06-21T10:00:00.000Z',
};

describe('activityWeeksToCsv', () => {
  it('emits the exact header row', () => {
    const csv = activityWeeksToCsv([]);
    expect(csv).toBe(ACTIVITY_WEEKS_HEADER.join(',') + '\r\n');
  });

  it('emits one row per day with CRLF line endings', () => {
    const csv = activityWeeksToCsv([baseWeek]);
    const lines = csv.split('\r\n');
    // header + 1 day + trailing empty from final CRLF
    expect(lines[0]).toBe(ACTIVITY_WEEKS_HEADER.join(','));
    expect(lines[1]).toBe('2026-06-21,Sunday,,6,My week,note line,8:00 A.M. Breakfast (P5); 9:00 A.M. Walk');
    expect(lines[2]).toBe('');
    expect(lines).toHaveLength(3);
  });

  it('quotes a notes field that contains a comma', () => {
    const week = { ...baseWeek, notes: 'tired, then better', days: [makeDay()] };
    const csv = activityWeeksToCsv([week]);
    expect(csv).toContain('"tired, then better"');
  });

  it('quotes a multiline notes field', () => {
    const week = { ...baseWeek, notes: 'first\nsecond', days: [makeDay()] };
    const csv = activityWeeksToCsv([week]);
    expect(csv).toContain('"first\nsecond"');
  });

  it('renders null overall_mood and title as empty cells', () => {
    const week = { ...baseWeek, title: null, days: [makeDay({ overall_mood_0_10: null })] };
    const csv = activityWeeksToCsv([week]);
    const row = csv.split('\r\n')[1];
    // week_start_date,weekday,date,overall_mood,title,notes,activities
    expect(row).toBe('2026-06-21,Sunday,,,,note line,');
  });
});

const baseThought: ThoughtRecord = {
  id: 't1',
  user_id: 'u1',
  title: 'Meeting',
  date_time: '2026-06-22T14:03:00.000Z',
  situation_text: 'Spoke in a meeting',
  automatic_thoughts_text: 'I sounded foolish',
  automatic_thoughts_belief_percent: 80,
  emotions_text: 'Anxious, Embarrassed',
  emotions_intensity_percent: 70,
  adaptive_response_text: 'People asked follow-ups',
  cognitive_distortion_text: 'Mind reading',
  outcome_belief_now_percent: 30,
  outcome_emotions_now_text: 'Calmer',
  outcome_emotions_now_percent: 25,
  outcome_what_would_be_good_to_do_text: 'Prepare notes',
  is_draft: false,
  created_at: '2026-06-22T14:10:00.000Z',
  updated_at: '2026-06-22T14:10:00.000Z',
};

describe('thoughtRecordsToCsv', () => {
  it('emits the exact header row', () => {
    expect(thoughtRecordsToCsv([])).toBe(THOUGHT_RECORDS_HEADER.join(',') + '\r\n');
  });

  it('emits one row per record, quoting emotions containing a comma', () => {
    const csv = thoughtRecordsToCsv([baseThought]);
    const lines = csv.split('\r\n');
    expect(lines[0]).toBe(THOUGHT_RECORDS_HEADER.join(','));
    expect(lines[1]).toBe(
      '2026-06-22T14:03:00.000Z,Spoke in a meeting,I sounded foolish,80,"Anxious, Embarrassed (70%)",Mind reading,People asked follow-ups,Emotions now: Calmer (25%); Belief now: 30%; Next: Prepare notes,2026-06-22T14:10:00.000Z',
    );
  });

  it('renders null fields as empty cells', () => {
    const rec: ThoughtRecord = {
      ...baseThought,
      situation_text: null,
      automatic_thoughts_belief_percent: null,
      emotions_text: null,
      emotions_intensity_percent: null,
      cognitive_distortion_text: null,
      outcome_emotions_now_text: null,
      outcome_emotions_now_percent: null,
      outcome_belief_now_percent: null,
      outcome_what_would_be_good_to_do_text: null,
    };
    const row = thoughtRecordsToCsv([rec]).split('\r\n')[1];
    expect(row).toBe(
      '2026-06-22T14:03:00.000Z,,I sounded foolish,,,,People asked follow-ups,,2026-06-22T14:10:00.000Z',
    );
  });

  it('escapes a double-quote inside a situation field', () => {
    const rec = { ...baseThought, situation_text: 'He said "no"' };
    const csv = thoughtRecordsToCsv([rec]);
    expect(csv).toContain('"He said ""no"""');
  });
});

const baseMood: DailyMood = {
  id: 'm1',
  user_id: 'u1',
  entry_date: '2026-06-23',
  mood_0_10: 7,
  notes_text: 'Good day',
  linked_thought_record_id: 't1',
  linked_activity_week_id: null,
  created_at: '2026-06-23T20:00:00.000Z',
  updated_at: '2026-06-23T20:00:00.000Z',
};

describe('dailyMoodsToCsv', () => {
  it('emits the exact header row', () => {
    expect(dailyMoodsToCsv([])).toBe(DAILY_MOODS_HEADER.join(',') + '\r\n');
  });

  it('emits one row per mood entry', () => {
    const row = dailyMoodsToCsv([baseMood]).split('\r\n')[1];
    expect(row).toBe('2026-06-23,7,Good day,t1,,2026-06-23T20:00:00.000Z');
  });

  it('quotes a multiline notes field and renders null links empty', () => {
    const mood: DailyMood = {
      ...baseMood,
      notes_text: 'rough\nmorning',
      linked_thought_record_id: null,
    };
    const csv = dailyMoodsToCsv([mood]);
    expect(csv).toContain('"rough\nmorning"');
    const row = csv.split('\r\n')[1];
    expect(row).toBe('2026-06-23,7,"rough\nmorning",,,2026-06-23T20:00:00.000Z');
  });
});
