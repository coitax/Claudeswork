import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { ActivityWeek } from '@cbt/shared';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/common';
import { WeeklyActivityGrid } from '@/components/WeeklyActivityGrid';

export function ActivityDetailPage() {
  const { weekId } = useParams();
  const [week, setWeek] = useState<ActivityWeek | null>(null);

  useEffect(() => {
    if (weekId) api.get<ActivityWeek>(`/api/activity-weeks/${weekId}`).then(setWeek);
  }, [weekId]);

  if (!week) return <p className="text-ink-faint">Loading…</p>;

  return (
    <div>
      <PageHeader
        title={week.title || `Week of ${week.week_start_date}`}
        description={`Week starting ${week.week_start_date}${week.is_draft ? ' · Draft' : ''}`}
        actions={
          <>
            <Link to={`/app/activity/${week.id}/edit`} className="btn-secondary">
              Edit
            </Link>
            <Link to={`/app/activity/${week.id}/print`} className="btn-primary">
              Print
            </Link>
          </>
        }
      />
      {week.notes && <p className="mb-4 text-sm text-ink-soft">{week.notes}</p>}
      <div className="overflow-x-auto">
        <WeeklyActivityGrid week={week} />
      </div>
    </div>
  );
}
