import type { WorksheetConfig } from '../types/worksheet-config.js';

/**
 * Daily Mood / diary entry config.
 *
 * This is a lightweight app-native feature (NOT a digitized worksheet), so its
 * wording is app copy rather than source-document text. No fidelity constraint
 * applies here, but it follows the same config-driven shape for consistency.
 */
export const dailyMoodEntry: WorksheetConfig = {
  key: 'daily-mood-entry',
  version: 1,
  title: 'Daily Mood',
  instructions: 'A short daily check-in. Record your mood and any notes.',
  sections: [
    {
      key: 'entry',
      fields: [
        { field_key: 'entry_date', field_type: 'date', label: 'Date' },
        {
          field_key: 'mood_0_10',
          field_type: 'scale',
          label: 'Mood (0-10)',
          scale: { min: 0, max: 10, label: 'Mood (0-10)' },
        },
        { field_key: 'notes_text', field_type: 'textarea', label: 'Notes' },
        {
          field_key: 'emotions',
          field_type: 'emotion_picker',
          label: 'Emotions (optional)',
          helper_reference: 'feelings-wheel-reference',
        },
        {
          field_key: 'linked_thought_record_id',
          field_type: 'reference_list',
          label: 'Link a Thought Record (optional)',
        },
        {
          field_key: 'linked_activity_week_id',
          field_type: 'reference_list',
          label: 'Link an Activity week (optional)',
        },
      ],
    },
  ],
  print_layout: { style: 'stacked-sections' },
  review_needed: [],
};
