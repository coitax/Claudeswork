import type { WorksheetConfig } from '../types/worksheet-config.js';

/**
 * Activity Monitoring Form worksheet config.
 *
 * Source: photographed worksheet "ACTIVITY MONITORING FORM" (transcribed from
 * the user's image via OCR, 2026-06). Wording below is taken verbatim from the
 * source. Per the fidelity rule, do not paraphrase this text.
 */

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Time slots, 8:00 A.M. through 9:00 P.M. (one row each) — verbatim from source. */
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
  version: 2,
  title: 'ACTIVITY MONITORING FORM',
  // Verbatim from the worksheet image.
  instructions:
    'Instructions: Please list the activities you did on each day of the week, whatever it may '
    + 'have been. Below each activity, rate the degree of pleasure (P) and mastery/accomplishment '
    + '(M) on a 0-10 scale for each, where 0 is no pleasure or mastery/accomplishment and 10 is the '
    + 'greatest degree of pleasure or mastery/accomplishment. Please also rate your overall mood for '
    + 'the entire day on a scale of 0-10, where 0 is feeling the worst you could imagine feeling and '
    + '10 is feeling the best you could imagine feeling.',
  sections: [
    {
      key: 'week_meta',
      fields: [
        { field_key: 'week_start_date', field_type: 'date', label: 'Week starting' },
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
        },
        {
          field_key: 'time_slots',
          field_type: 'grid',
          label: 'Time',
          options: [...ACTIVITY_TIME_SLOTS],
        },
        {
          field_key: 'pm_rating_text',
          field_type: 'text',
          label: 'P / M',
          // Verbatim intent from the instructions; combined field for v1.
          prompt_text:
            'Rate the degree of pleasure (P) and mastery/accomplishment (M) on a 0-10 scale for each.',
        },
        {
          field_key: 'overall_mood_0_10',
          field_type: 'scale',
          label: 'Overall Mood (0-10)',
          scale: { min: 0, max: 10, label: 'Overall Mood (0-10)' },
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
  // Source text confirmed from the worksheet image — no items pending review.
  review_needed: [],
};
