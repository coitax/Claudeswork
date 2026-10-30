import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { ActivityWeek, WorksheetConfig } from '@cbt/shared';
import { api } from '@/lib/api';
import { PrintLayout } from '@/components/PrintLayout';
import { WeeklyActivityGrid } from '@/components/WeeklyActivityGrid';

export function ActivityPrintPage() {
  const { weekId } = useParams();
  const [data, setData] = useState<{ week: ActivityWeek; config: WorksheetConfig } | null>(null);

  useEffect(() => {
    if (weekId) {
      api
        .get<{ week: ActivityWeek; config: WorksheetConfig }>(`/api/activity-weeks/${weekId}/print-data`)
        .then(setData);
    }
  }, [weekId]);

  if (!data) return <p className="p-6 text-ink-faint">Loading…</p>;
  const { week, config } = data;

  return (
    <PrintLayout>
      <header className="mb-4">
        <h1 className="text-xl font-bold">{config.title}</h1>
        {config.instructions && <p className="mt-1 text-sm">{config.instructions}</p>}
        <p className="mt-2 text-sm">
          {week.title ? `${week.title} — ` : ''}Week starting {week.week_start_date}
        </p>
      </header>
      <WeeklyActivityGrid week={week} />
      {week.notes && (
        <div className="mt-4">
          <p className="font-medium">Notes</p>
          <p className="text-sm">{week.notes}</p>
        </div>
      )}
    </PrintLayout>
  );
}
