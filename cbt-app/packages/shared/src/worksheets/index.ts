import type { WorksheetConfig } from '../types/worksheet-config.js';
import { activityMonitoringForm } from './activity-monitoring-form.js';
import { thoughtRecordSideOne, thoughtRecordSideTwo } from './thought-record.js';
import { dailyMoodEntry } from './daily-mood.js';
import { feelingsWheel } from './feelings-wheel.js';

export * from './activity-monitoring-form.js';
export * from './thought-record.js';
export * from './daily-mood.js';
export * from './feelings-wheel.js';

/** All standard WorksheetConfig definitions, keyed by config key. */
export const worksheetConfigs: Record<string, WorksheetConfig> = {
  [activityMonitoringForm.key]: activityMonitoringForm,
  [thoughtRecordSideOne.key]: thoughtRecordSideOne,
  [thoughtRecordSideTwo.key]: thoughtRecordSideTwo,
  [dailyMoodEntry.key]: dailyMoodEntry,
};

export const allWorksheetConfigs: WorksheetConfig[] = Object.values(worksheetConfigs);

export { feelingsWheel };

/**
 * Collect every review-needed flag across all worksheet configs, so they can be
 * seeded into worksheet_text_review_item records on first run.
 */
export function collectReviewFlags(): Array<{
  template_key: string;
  field_key: string;
  extracted_text: string;
  notes: string;
}> {
  const out: Array<{ template_key: string; field_key: string; extracted_text: string; notes: string }> = [];
  for (const cfg of allWorksheetConfigs) {
    for (const flag of cfg.review_needed) {
      out.push({
        template_key: cfg.key,
        field_key: flag.field_key,
        extracted_text: flag.extracted_text,
        notes: flag.notes,
      });
    }
  }
  for (const flag of feelingsWheel.review_needed) {
    out.push({
      template_key: feelingsWheel.key,
      field_key: flag.field_key,
      extracted_text: flag.extracted_text,
      notes: flag.notes,
    });
  }
  return out;
}
