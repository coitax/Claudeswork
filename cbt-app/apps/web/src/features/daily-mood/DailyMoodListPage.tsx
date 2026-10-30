import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { DailyMood } from '@cbt/shared';
import { api } from '@/lib/api';
import { EmptyState, HistoryList, PageHeader } from '@/components/common';

export function DailyMoodListPage() {
  const [items, setItems] = useState<DailyMood[] | null>(null);

  useEffect(() => {
    api.get<{ items: DailyMood[] }>('/api/daily-moods').then((r) => setItems(r.items));
  }, []);

  return (
    <div>
      <PageHeader
        title="Daily Mood"
        description="A short daily check-in."
        actions={
          <Link to="/app/daily-mood/new" className="btn-primary">
            New entry
          </Link>
        }
      />
      {items === null ? (
        <p className="text-ink-faint">Loading…</p>
      ) : items.length === 0 ? (
        <EmptyState
          title="No mood entries yet"
          action={
            <Link to="/app/daily-mood/new" className="btn-primary">
              New entry
            </Link>
          }
        />
      ) : (
        <HistoryList
          items={items.map((m) => ({
            id: m.id,
            to: `/app/daily-mood/${m.id}`,
            primary: m.entry_date,
            secondary: m.notes_text?.slice(0, 80) ?? undefined,
            badge: m.mood_0_10 != null ? `Mood ${m.mood_0_10}/10` : undefined,
          }))}
        />
      )}
    </div>
  );
}
