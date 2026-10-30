import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { DailyMood, WorksheetConfig } from '@cbt/shared';
import { api } from '@/lib/api';
import { PrintLayout } from '@/components/PrintLayout';

export function DailyMoodPrintPage() {
  const { id } = useParams();
  const [data, setData] = useState<{ mood: DailyMood; config: WorksheetConfig } | null>(null);

  useEffect(() => {
    if (id) {
      api.get<{ mood: DailyMood; config: WorksheetConfig }>(`/api/daily-moods/${id}/print-data`).then(setData);
    }
  }, [id]);

  if (!data) return <p className="p-6 text-ink-faint">Loading…</p>;
  const { mood, config } = data;

  return (
    <PrintLayout>
      <header className="mb-4">
        <h1 className="text-xl font-bold">{config.title}</h1>
        <p className="mt-1 text-sm">{mood.entry_date}</p>
      </header>
      <div className="space-y-3">
        <p>
          <span className="font-medium">Mood (0-10): </span>
          {mood.mood_0_10 ?? '—'}
        </p>
        <div>
          <p className="font-medium">Notes</p>
          <p className="whitespace-pre-wrap text-sm">{mood.notes_text || '—'}</p>
        </div>
      </div>
    </PrintLayout>
  );
}
