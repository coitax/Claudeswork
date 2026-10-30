import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ThoughtRecord } from '@cbt/shared';
import { api } from '@/lib/api';
import { EmptyState, HistoryList, PageHeader } from '@/components/common';

export function ThoughtRecordListPage() {
  const [items, setItems] = useState<ThoughtRecord[] | null>(null);

  useEffect(() => {
    api.get<{ items: ThoughtRecord[] }>('/api/thought-records').then((r) => setItems(r.items));
  }, []);

  return (
    <div>
      <PageHeader
        title="Thought Records"
        actions={
          <Link to="/app/thought-records/new" className="btn-primary">
            New record
          </Link>
        }
      />
      {items === null ? (
        <p className="text-ink-faint">Loading…</p>
      ) : items.length === 0 ? (
        <EmptyState
          title="No thought records yet"
          description="Capture a situation, your thoughts, and an adaptive response."
          action={
            <Link to="/app/thought-records/new" className="btn-primary">
              New record
            </Link>
          }
        />
      ) : (
        <HistoryList
          items={items.map((r) => ({
            id: r.id,
            to: `/app/thought-records/${r.id}`,
            primary: r.title || (r.situation_text?.slice(0, 60) ?? 'Untitled record'),
            secondary: r.date_time
              ? new Date(r.date_time).toLocaleString()
              : new Date(r.created_at).toLocaleDateString(),
            badge: r.is_draft ? 'Draft' : undefined,
          }))}
        />
      )}
    </div>
  );
}
