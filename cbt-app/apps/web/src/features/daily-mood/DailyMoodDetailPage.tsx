import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import type { DailyMood } from '@cbt/shared';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/common';
import { ConfirmDialog } from '@/components/ConfirmDialog';

export function DailyMoodDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [mood, setMood] = useState<DailyMood | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (id) api.get<DailyMood>(`/api/daily-moods/${id}`).then(setMood);
  }, [id]);

  if (!mood) return <p className="text-ink-faint">Loading…</p>;

  async function handleDelete() {
    try {
      await api.del(`/api/daily-moods/${mood!.id}`);
      navigate('/app/daily-mood');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  return (
    <div>
      <PageHeader
        title={`Daily Mood — ${mood.entry_date}`}
        actions={
          <>
            <Link to={`/app/daily-mood/${mood.id}/edit`} className="btn-secondary">
              Edit
            </Link>
            <Link to={`/app/daily-mood/${mood.id}/print`} className="btn-primary">
              Print
            </Link>
            <button className="btn-ghost" onClick={() => setConfirming(true)}>Delete</button>
          </>
        }
      />
      <div className="card space-y-3">
        <p>
          <span className="font-medium">Mood (0-10): </span>
          {mood.mood_0_10 ?? '—'}
        </p>
        <div>
          <p className="font-medium">Notes</p>
          <p className="whitespace-pre-wrap text-sm text-ink-soft">{mood.notes_text || '—'}</p>
        </div>
        {mood.linked_thought_record_id && (
          <p className="text-sm">
            <Link className="text-accent underline" to={`/app/thought-records/${mood.linked_thought_record_id}`}>
              Linked thought record
            </Link>
          </p>
        )}
        {mood.linked_activity_week_id && (
          <p className="text-sm">
            <Link className="text-accent underline" to={`/app/activity/${mood.linked_activity_week_id}`}>
              Linked activity week
            </Link>
          </p>
        )}
      </div>
      <ConfirmDialog
        open={confirming}
        title="Delete this daily mood entry?"
        message="This can't be undone."
        confirmLabel="Delete"
        onConfirm={() => { setConfirming(false); void handleDelete(); }}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}
