import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import type { ActivityWeek } from '@cbt/shared';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/common';
import { WeeklyActivityGrid } from '@/components/WeeklyActivityGrid';
import { ConfirmDialog } from '@/components/ConfirmDialog';

export function ActivityDetailPage() {
  const { weekId } = useParams();
  const navigate = useNavigate();
  const [week, setWeek] = useState<ActivityWeek | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (weekId) api.get<ActivityWeek>(`/api/activity-weeks/${weekId}`).then(setWeek);
  }, [weekId]);

  if (!week) return <p className="text-ink-faint">Loading…</p>;

  async function handleDelete() {
    try {
      await api.del(`/api/activity-weeks/${week!.id}`);
      navigate('/app/activity');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  }

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
            <button className="btn-ghost" onClick={() => setConfirming(true)}>Delete</button>
          </>
        }
      />
      {week.notes && <p className="mb-4 text-sm text-ink-soft">{week.notes}</p>}
      <div className="overflow-x-auto">
        <WeeklyActivityGrid week={week} />
      </div>
      <ConfirmDialog
        open={confirming}
        title="Delete this activity week?"
        message="This can't be undone."
        confirmLabel="Delete"
        onConfirm={() => { setConfirming(false); void handleDelete(); }}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}
