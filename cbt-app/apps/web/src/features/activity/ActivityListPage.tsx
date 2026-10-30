import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ActivityWeek } from '@cbt/shared';
import { api } from '@/lib/api';
import { EmptyState, HistoryList, PageHeader } from '@/components/common';

export function ActivityListPage() {
  const [items, setItems] = useState<ActivityWeek[] | null>(null);

  useEffect(() => {
    api.get<{ items: ActivityWeek[] }>('/api/activity-weeks').then((r) => setItems(r.items));
  }, []);

  return (
    <div>
      <PageHeader
        title="Activity Monitoring"
        description="Weekly activity sheets."
        actions={
          <Link to="/app/activity/new" className="btn-primary">
            New week
          </Link>
        }
      />
      {items === null ? (
        <p className="text-ink-faint">Loading…</p>
      ) : items.length === 0 ? (
        <EmptyState
          title="No activity weeks yet"
          description="Start a weekly activity monitoring sheet."
          action={
            <Link to="/app/activity/new" className="btn-primary">
              New week
            </Link>
          }
        />
      ) : (
        <HistoryList
          items={items.map((w) => ({
            id: w.id,
            to: `/app/activity/${w.id}`,
            primary: w.title || `Week of ${w.week_start_date}`,
            secondary: `Week starting ${w.week_start_date}`,
            badge: w.is_draft ? 'Draft' : undefined,
          }))}
        />
      )}
    </div>
  );
}
