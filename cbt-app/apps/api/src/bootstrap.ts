import {
  allWorksheetConfigs,
  collectReviewFlags,
  feelingsWheel,
  type WorksheetTemplate,
  type WorksheetTextReviewItem,
} from '@cbt/shared';
import { storage } from './storage/index.js';
import { newId, nowIso } from './services/util.js';

/**
 * One-time-ish startup bootstrap:
 * - ensure storage folders exist
 * - seed worksheet templates from the shared configs (idempotent by key)
 * - seed worksheet text review items from `review_needed` flags (only if empty)
 * - clear expired sessions
 *
 * Safe to run on every boot.
 */
export async function bootstrap(): Promise<void> {
  await storage.init();

  // Seed worksheet templates (config snapshots) keyed by config key.
  const existingTemplates = await storage.getWorksheetTemplates();
  const existingKeys = new Set(existingTemplates.map((t) => t.key));
  for (const cfg of [...allWorksheetConfigs, feelingsWheel]) {
    if (existingKeys.has(cfg.key)) continue;
    const ts = nowIso();
    const template: WorksheetTemplate = {
      id: newId(),
      key: cfg.key,
      version: cfg.version,
      title: cfg.title,
      template_json: cfg,
      created_at: ts,
      updated_at: ts,
    };
    await storage.saveWorksheetTemplate(template);
  }

  // Seed review items only if none exist (avoid clobbering user-confirmed status).
  const existingReview = await storage.getWorksheetReviewItems();
  if (existingReview.length === 0) {
    for (const flag of collectReviewFlags()) {
      const ts = nowIso();
      const item: WorksheetTextReviewItem = {
        id: newId(),
        template_key: flag.template_key,
        field_key: flag.field_key,
        extracted_text: flag.extracted_text,
        status: 'review_needed',
        notes: flag.notes,
        created_at: ts,
        updated_at: ts,
      };
      await storage.saveWorksheetReviewItem(item);
    }
  }

  await storage.deleteExpiredSessions(nowIso());
}
