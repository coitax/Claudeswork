import type { WorksheetConfig, WorksheetField } from '@cbt/shared';

/** Find a field config by key across all sections of a worksheet config. */
export function findField(config: WorksheetConfig, fieldKey: string): WorksheetField | undefined {
  for (const section of config.sections) {
    const f = section.fields.find((x) => x.field_key === fieldKey);
    if (f) return f;
  }
  return undefined;
}

/** Find a field, or a minimal fallback so rendering never crashes. */
export function fieldOr(config: WorksheetConfig, fieldKey: string, label: string): WorksheetField {
  return findField(config, fieldKey) ?? { field_key: fieldKey, field_type: 'text', label };
}
