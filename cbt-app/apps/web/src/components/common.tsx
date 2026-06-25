import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-accent-soft bg-card/50 p-10 text-center">
      <p className="text-ink font-medium">{title}</p>
      {description && <p className="mt-1 text-sm text-ink-faint">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export interface HistoryItem {
  id: string;
  to: string;
  primary: string;
  secondary?: string;
  badge?: string;
}

export function HistoryList({ items }: { items: HistoryItem[] }) {
  return (
    <ul className="divide-y divide-accent-soft rounded-lg border border-accent-soft bg-card">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            to={item.to}
            className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-accent-soft/50"
          >
            <span className="min-w-0">
              <span className="block truncate font-medium text-ink">{item.primary}</span>
              {item.secondary && (
                <span className="block truncate text-sm text-ink-faint">{item.secondary}</span>
              )}
            </span>
            {item.badge && (
              <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-xs text-ink-soft">
                {item.badge}
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="no-print mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold text-ink">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-faint">{description}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}
