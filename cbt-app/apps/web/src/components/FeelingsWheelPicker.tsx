import { useState } from 'react';
import { feelingsWheel, type FeelingsWheelNode } from '@cbt/shared';

/**
 * Optional Feelings Wheel helper. This is reference/support ONLY — it appends
 * picked terms to a free-text field; the user can always type their own words.
 * It does not replace worksheet wording.
 */
export function FeelingsWheelPicker({ onPick }: { onPick: (term: string) => void }) {
  const [open, setOpen] = useState(false);
  const [primary, setPrimary] = useState<FeelingsWheelNode | null>(null);
  const [secondary, setSecondary] = useState<FeelingsWheelNode | null>(null);

  if (!open) {
    return (
      <button type="button" className="btn-secondary no-print text-xs" onClick={() => setOpen(true)}>
        Feelings wheel (optional helper)
      </button>
    );
  }

  return (
    <div className="no-print mt-2 rounded-md border border-accent-soft bg-paper p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs text-ink-faint">
          Optional reference only — pick to insert, or just type your own words.
        </p>
        <button type="button" className="btn-ghost text-xs" onClick={() => setOpen(false)}>
          Close
        </button>
      </div>

      <Level
        title="Primary"
        nodes={feelingsWheel.primary}
        selected={primary}
        onSelect={(n) => {
          setPrimary(n);
          setSecondary(null);
          onPick(n.label);
        }}
      />
      {primary?.children && (
        <Level
          title="More specific"
          nodes={primary.children}
          selected={secondary}
          onSelect={(n) => {
            setSecondary(n);
            onPick(n.label);
          }}
        />
      )}
      {secondary?.children && (
        <Level title="Most specific" nodes={secondary.children} onSelect={(n) => onPick(n.label)} />
      )}
    </div>
  );
}

function Level({
  title,
  nodes,
  selected,
  onSelect,
}: {
  title: string;
  nodes: FeelingsWheelNode[];
  selected?: FeelingsWheelNode | null;
  onSelect: (n: FeelingsWheelNode) => void;
}) {
  return (
    <div className="mb-2">
      <p className="mb-1 text-[10px] uppercase tracking-wide text-ink-faint">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {nodes.map((n) => (
          <button
            key={n.label}
            type="button"
            onClick={() => onSelect(n)}
            className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
              selected?.label === n.label
                ? 'bg-accent text-white'
                : 'bg-accent-soft text-ink hover:bg-accent/20'
            }`}
          >
            {n.label}
          </button>
        ))}
      </div>
    </div>
  );
}
