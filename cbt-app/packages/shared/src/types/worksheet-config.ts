/**
 * Config-driven worksheet definitions.
 *
 * Worksheet wording (titles, instructions, labels, prompts, scales) lives in
 * these structured configs — NOT inside presentational components. This keeps
 * the source-of-truth text in one editable place and makes manual review of
 * uncertain OCR text straightforward.
 *
 * FIDELITY: text shown here must match the source worksheet exactly. Any text
 * that is uncertain (e.g. unreadable in the source image) must be flagged via
 * the `review_needed` array so it surfaces in the worksheet-review screen.
 */

export type WorksheetFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'scale'
  | 'percent'
  | 'datetime'
  | 'date'
  | 'time'
  | 'emotion_picker'
  | 'reference_list'
  | 'grid';

export interface WorksheetScale {
  min: number;
  max: number;
  /** Exact scale label from the worksheet, e.g. "Overall Mood (0-10)". */
  label: string;
  /** Optional anchor labels, e.g. { "0": "worst", "10": "best" } — only if shown. */
  anchors?: Record<string, string>;
}

export interface WorksheetField {
  /** Stable machine key, maps to an entity field. */
  field_key: string;
  field_type: WorksheetFieldType;
  /** Short UI label. */
  label: string;
  /** Verbatim worksheet prompt text for this field, if any. */
  prompt_text?: string;
  helper_reference?: string;
  scale?: WorksheetScale;
  options?: string[];
  /** True if this field's source text is uncertain and needs manual review. */
  review_needed?: boolean;
}

export interface WorksheetSection {
  key: string;
  /** Verbatim section heading from the worksheet, if present. */
  title?: string;
  /** Verbatim instructional text for the section, if present. */
  instructions?: string;
  fields: WorksheetField[];
  review_needed?: boolean;
}

export interface WorksheetReviewFlag {
  field_key: string;
  /** The best-effort extracted/candidate text (may be empty if illegible). */
  extracted_text: string;
  /** Why this needs review. */
  notes: string;
}

export interface WorksheetPrintLayout {
  /** Hint for the print renderer: "weekly-grid" | "stacked-sections" | "reference". */
  style: 'weekly-grid' | 'stacked-sections' | 'reference';
  /** Optional verbatim print-only labels. */
  labels?: Record<string, string>;
}

export interface WorksheetConfig {
  key: string;
  version: number;
  /** Verbatim worksheet title from the source document. */
  title: string;
  /** Verbatim top-level instructions from the source document. */
  instructions?: string;
  sections: WorksheetSection[];
  print_layout: WorksheetPrintLayout;
  /**
   * Aggregated list of every piece of text in this config whose source wording
   * is uncertain. Seeded into worksheet_text_review_item records.
   */
  review_needed: WorksheetReviewFlag[];
}

/** Hierarchical node for the optional Feelings Wheel reference. */
export interface FeelingsWheelNode {
  label: string;
  children?: FeelingsWheelNode[];
}

export interface FeelingsWheelConfig {
  key: 'feelings-wheel-reference';
  version: number;
  title: string;
  /** Roots are the innermost (primary) emotions. */
  primary: FeelingsWheelNode[];
  review_needed: WorksheetReviewFlag[];
}
