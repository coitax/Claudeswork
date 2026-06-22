import type { WorksheetConfig } from '../types/worksheet-config.js';

/**
 * Activity Monitoring Form worksheet config.
 *
 * !!! SOURCE TEXT REVIEW REQUIRED !!!
 * The source worksheet image was NOT available when this config was authored.
 * All title / instruction / column / scale wording below is CANDIDATE text based
 * on a standard CBT Activity Monitoring (Activity Schedule) worksheet and MUST
 * be confirmed against the real document before relying on it. Every uncertain
 * string is also listed in `review_needed` and seeded into the review screen.
 */

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Time slots, 8:00 A.M. through 9:00 P.M. (one row each). */
export const ACTIVITY_TIME_SLOTS = [
  '8:00 A.M.',
  '9:00 A.M.',
  '10:00 A.M.',
  '11:00 A.M.',
  '12:00 P.M.',
  '1:00 P.M.',
  '2:00 P.M.',
  '3:00 P.M.',
  '4:00 P.M.',
  '5:00 P.M.',
  '6:00 P.M.',
  '7:00 P.M.',
  '8:00 P.M.',
  '9:00 P.M.',
] as const;

export const activityMonitoringForm: WorksheetConfig = {
  key: 'activity-monitoring-form',
  version: 1,
  // CANDIDATE — confirm exact title from source image.
  title: 'Activity Monitoring Form',
  // CANDIDATE — confirm exact instructions from source image.
  instructions:
    'Record what you do during each time period for each day of the week. '
    + 'For each activity, rate it for P (Pleasure) and M (Mastery). '
    + 'At the end of each day, rate your Overall Mood (0-10).',
  sections: [
    {
      key: 'week_meta',
      fields: [
        {
          field_key: 'week_start_date',
          field_type: 'date',
          label: 'Week starting',
        },
        { field_key: 'title', field_type: 'text', label: 'Title (optional)' },
        { field_key: 'notes', field_type: 'textarea', label: 'Notes (optional)' },
      ],
    },
    {
      key: 'grid',
      title: 'Weekly schedule',
      fields: [
        {
          field_key: 'days',
          field_type: 'grid',
          label: 'Days',
          options: DAYS,
          review_needed: true,
        },
        {
          field_key: 'time_slots',
          field_type: 'grid',
          label: 'Time',
          options: [...ACTIVITY_TIME_SLOTS],
          review_needed: true,
        },
        {
          field_key: 'pm_rating_text',
          field_type: 'text',
          label: 'P / M',
          // CANDIDATE — exact meaning/wording of the P/M column unconfirmed.
          prompt_text: 'P / M',
          review_needed: true,
        },
        {
          field_key: 'overall_mood_0_10',
          field_type: 'scale',
          label: 'Overall Mood (0-10)',
          scale: { min: 0, max: 10, label: 'Overall Mood (0-10)' },
          review_needed: true,
        },
      ],
    },
  ],
  print_layout: {
    style: 'weekly-grid',
    labels: {
      time_header: 'Time',
      mood_row: 'Overall Mood (0-10)',
    },
  },
  review_needed: [
    {
      field_key: 'title',
      extracted_text: 'Activity Monitoring Form',
      notes: 'Confirm exact worksheet title from source image.',
    },
    {
      field_key: 'instructions',
      extracted_text:
        'Record what you do during each time period... rate P (Pleasure) and M (Mastery)... Overall Mood (0-10).',
      notes: 'Confirm exact instruction wording and whether P/M stands for Pleasure/Mastery.',
    },
    {
      field_key: 'pm_rating_text',
      extracted_text: 'P / M',
      notes: 'Confirm the exact column header and rating scale used for the P/M field.',
    },
    {
      field_key: 'time_slots',
      extracted_text: ACTIVITY_TIME_SLOTS.join(', '),
      notes: 'Confirm the exact time labels and whether the range is 8:00 A.M.-9:00 P.M.',
    },
    {
      field_key: 'overall_mood_0_10',
      extracted_text: 'Overall Mood (0-10)',
      notes: 'Confirm the exact final-row label and scale range.',
    },
  ],
};
