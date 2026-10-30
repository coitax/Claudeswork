import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { DailyMood } from '@cbt/shared';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/common';

export function DailyMoodDetailPage() {
  const { id } = useParams();
  const [mood, setMood] = useState<DailyMood | null>(null);

  useEffect(() => {
    if (id) api.get<DailyMood>(`/api/daily-moods/${id}`).then(setMood);
  }, [id]);

  if (!mood) return <p className="text-ink-faint">Loading…</p>;

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
    </div>
  );
}
