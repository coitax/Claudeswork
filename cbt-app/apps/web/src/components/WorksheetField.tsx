import type { ReactNode } from 'react';
import type { WorksheetField as FieldConfig } from '@cbt/shared';

/**
 * Renders the worksheet wording for a field (label + verbatim prompt_text) and
 * wraps the actual input control passed as children. Worksheet text comes from
 * config — never hardcoded here — preserving source wording exactly.
 */
export function WorksheetField({
  field,
  htmlFor,
  children,
  error,
}: {
  field: FieldConfig;
  htmlFor?: string;
  children: ReactNode;
  error?: string;
}) {
  return (
    <div className="mb-5 worksheet-section">
      <label htmlFor={htmlFor} className="field-label">
        {field.label}
        {field.review_needed && (
          <span
            className="no-print ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-normal uppercase tracking-wide text-amber-800"
            title="Source wording needs manual review"
          >
            review
          </span>
        )}
      </label>
      {field.prompt_text && <p className="prompt-text mb-2">{field.prompt_text}</p>}
      {children}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
