import {
  allWorksheetConfigs,
  feelingsWheel,
  cognitiveDistortions,
  type ReviewItemUpdate,
  type StorageAdapter,
  type WorksheetTextReviewItem,
} from '@cbt/shared';
import { nowIso } from './util.js';

/**
 * Worksheet service: exposes the config-driven worksheet definitions and the
 * text-review items (for the OCR/uncertainty review screen). Configs are static
 * (from the shared package); review item *status* is persisted via storage.
 */
export class WorksheetService {
  constructor(private readonly storage: StorageAdapter) {}

  getConfigs() {
    return {
      worksheets: allWorksheetConfigs,
      feelingsWheel,
      cognitiveDistortions,
    };
  }

  getReviewItems(): Promise<WorksheetTextReviewItem[]> {
    return this.storage.getWorksheetReviewItems();
  }

  async updateReviewItem(id: string, update: ReviewItemUpdate): Promise<WorksheetTextReviewItem | null> {
    const items = await this.storage.getWorksheetReviewItems();
    const item = items.find((i) => i.id === id);
    if (!item) return null;
    const updated: WorksheetTextReviewItem = {
      ...item,
      status: update.status,
      notes: update.notes ?? item.notes,
      extracted_text: update.extracted_text ?? item.extracted_text,
      updated_at: nowIso(),
    };
    return this.storage.saveWorksheetReviewItem(updated);
  }
}
