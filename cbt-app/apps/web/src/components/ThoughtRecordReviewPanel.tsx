import { cognitiveDistortions } from '@cbt/shared';

/**
 * Cognitive Distortions reference list (helper for the Thought Record wizard).
 * Reference content only — names/descriptions come from config and are flagged
 * review_needed until confirmed against the source worksheet.
 */
export function ThoughtRecordReviewPanel({ onInsert }: { onInsert?: (name: string) => void }) {
  return (
    <div className="rounded-md border border-accent-soft bg-paper p-3">
      <p className="mb-2 text-xs text-ink-faint">
        Reference list — candidate wording pending source review.
      </p>
      <ul className="space-y-2">
        {cognitiveDistortions.map((d) => (
          <li key={d.name} className="text-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="font-medium text-ink">{d.name}</span>
                <span className="text-ink-soft"> — {d.description}</span>
              </div>
              {onInsert && (
                <button
                  type="button"
                  className="btn-ghost no-print shrink-0 text-xs"
                  onClick={() => onInsert(d.name)}
                >
                  Add
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
