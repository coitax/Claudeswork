import { useEffect, useState } from 'react';
import type { ReviewStatus, WorksheetTextReviewItem } from '@cbt/shared';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/common';

const STATUS_LABELS: Record<ReviewStatus, string> = {
  review_needed: 'Review needed',
  confirmed: 'Confirmed',
  corrected: 'Corrected',
};

export function WorksheetReviewPage() {
  const [items, setItems] = useState<WorksheetTextReviewItem[] | null>(null);

  useEffect(() => {
    api.get<{ items: WorksheetTextReviewItem[] }>('/api/worksheet-review-items').then((r) => setItems(r.items));
  }, []);

  async function update(item: WorksheetTextReviewItem, patch: Partial<WorksheetTextReviewItem>) {
    const updated = await api.put<WorksheetTextReviewItem>(`/api/worksheet-review-items/${item.id}`, {
      status: patch.status ?? item.status,
      notes: patch.notes ?? item.notes,
      extracted_text: patch.extracted_text ?? item.extracted_text,
    });
    setItems((prev) => prev?.map((i) => (i.id === updated.id ? updated : i)) ?? null);
  }

  if (items === null) return <p className="text-ink-faint">Loading…</p>;

  return (
    <div>
      <PageHeader
        title="Worksheet text review"
        description="These worksheet strings were uncertain when the app was built (the source images were not available). Confirm each against the original document, or correct the text."
      />
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="card">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wide text-ink-faint">
                  {item.template_key} · {item.field_key}
                </p>
                <p className="mt-1 text-sm text-ink-soft">{item.notes}</p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                  item.status === 'review_needed'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-green-100 text-green-800'
                }`}
              >
                {STATUS_LABELS[item.status]}
              </span>
            </div>

            <label className="field-label mt-3">Worksheet text</label>
            <textarea
              className="field-input"
              rows={2}
              defaultValue={item.extracted_text}
              onBlur={(e) => {
                if (e.target.value !== item.extracted_text) {
                  void update(item, { extracted_text: e.target.value, status: 'corrected' });
                }
              }}
            />

            <div className="mt-3 flex gap-2">
              <button className="btn-secondary" onClick={() => void update(item, { status: 'confirmed' })}>
                Confirm
              </button>
              <button className="btn-ghost" onClick={() => void update(item, { status: 'review_needed' })}>
                Mark for review
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
