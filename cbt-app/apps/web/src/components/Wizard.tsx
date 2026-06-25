import type { ReactNode } from 'react';

export interface WizardStepDef {
  key: string;
  /** UI label for the step (may differ from worksheet wording). */
  title: string;
}

interface WizardLayoutProps {
  steps: WizardStepDef[];
  current: number;
  onGoto?: (index: number) => void;
  children: ReactNode;
  footer?: ReactNode;
}

/** Mobile-friendly multi-step wizard chrome. */
export function WizardLayout({ steps, current, onGoto, children, footer }: WizardLayoutProps) {
  return (
    <div>
      <ol className="no-print mb-6 flex flex-wrap gap-2" aria-label="Steps">
        {steps.map((s, i) => {
          const state = i === current ? 'current' : i < current ? 'done' : 'todo';
          return (
            <li key={s.key}>
              <button
                type="button"
                onClick={() => onGoto?.(i)}
                aria-current={state === 'current' ? 'step' : undefined}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  state === 'current'
                    ? 'bg-accent text-white'
                    : state === 'done'
                      ? 'bg-accent-soft text-ink'
                      : 'bg-transparent text-ink-faint hover:bg-accent-soft'
                }`}
              >
                {i + 1}. {s.title}
              </button>
            </li>
          );
        })}
      </ol>

      <div className="card">{children}</div>

      {footer && <div className="mt-4 flex items-center justify-between">{footer}</div>}
    </div>
  );
}

interface WizardStepProps {
  title: string;
  children: ReactNode;
}

/** A single wizard step body with a UI heading. */
export function WizardStep({ title, children }: WizardStepProps) {
  return (
    <section aria-label={title}>
      <h2 className="mb-4 text-lg font-semibold text-ink">{title}</h2>
      {children}
    </section>
  );
}
