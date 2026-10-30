import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  dailyMoodInputSchema,
  type ActivityWeek,
  type DailyMood,
  type DailyMoodInput,
  type ThoughtRecord,
} from '@cbt/shared';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/common';
import { AutosaveIndicator } from '@/components/AutosaveIndicator';
import { FeelingsWheelPicker } from '@/components/FeelingsWheelPicker';
import { useAutosave } from '@/lib/use-autosave';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function DailyMoodFormPage() {
  const { id: routeId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<DailyMoodInput>({
    entry_date: today(),
    mood_0_10: null,
    notes_text: null,
    linked_thought_record_id: null,
    linked_activity_week_id: null,
  });
  const [id, setId] = useState<string | null>(routeId ?? null);
  const [loaded, setLoaded] = useState(!routeId);
  const [trs, setTrs] = useState<ThoughtRecord[]>([]);
  const [weeks, setWeeks] = useState<ActivityWeek[]>([]);

  useEffect(() => {
    api.get<{ items: ThoughtRecord[] }>('/api/thought-records').then((r) => setTrs(r.items));
    api.get<{ items: ActivityWeek[] }>('/api/activity-weeks').then((r) => setWeeks(r.items));
  }, []);

  useEffect(() => {
    if (!routeId) return;
    api.get<DailyMood>(`/api/daily-moods/${routeId}`).then((m) => {
      setData({
        entry_date: m.entry_date,
        mood_0_10: m.mood_0_10,
        notes_text: m.notes_text,
        linked_thought_record_id: m.linked_thought_record_id,
        linked_activity_week_id: m.linked_activity_week_id,
      });
      setId(m.id);
      setLoaded(true);
    });
  }, [routeId]);

  const persist = useCallback(
    async (payload: DailyMoodInput) => {
      const parsed = dailyMoodInputSchema.parse(payload);
      if (id) {
        await api.put(`/api/daily-moods/${id}`, parsed);
      } else {
        const created = await api.post<DailyMood>('/api/daily-moods', parsed);
        setId(created.id);
        window.history.replaceState(null, '', `/app/daily-mood/${created.id}/edit`);
      }
    },
    [id],
  );

  const { status, save } = useAutosave({ data, onSave: persist, enabled: loaded });

  function set<K extends keyof DailyMoodInput>(key: K, value: DailyMoodInput[K]) {
    setData((p) => ({ ...p, [key]: value }));
  }

  async function done() {
    await persist(data);
    navigate(id ? `/app/daily-mood/${id}` : '/app/daily-mood');
  }

  if (!loaded) return <p className="text-ink-faint">Loading…</p>;

  return (
    <div>
      <PageHeader title="Daily Mood" actions={<AutosaveIndicator status={status} />} />
      <div className="card space-y-5">
        <div>
          <label className="field-label" htmlFor="entry_date">
            Date
          </label>
          <input
            id="entry_date"
            type="date"
            className="field-input"
            value={data.entry_date}
            onChange={(e) => set('entry_date', e.target.value)}
          />
        </div>

        <div>
          <label className="field-label" htmlFor="mood">
            Mood (0-10)
          </label>
          <input
            id="mood"
            type="number"
            min={0}
            max={10}
            className="field-input w-28"
            value={data.mood_0_10 ?? ''}
            onChange={(e) => set('mood_0_10', e.target.value === '' ? null : Number(e.target.value))}
          />
        </div>

        <div>
          <label className="field-label" htmlFor="notes">
            Notes
          </label>
          <textarea
            id="notes"
            rows={4}
            className="field-input"
            value={data.notes_text ?? ''}
            onChange={(e) => set('notes_text', e.target.value || null)}
          />
          <div className="mt-2">
            <FeelingsWheelPicker
              onPick={(t) =>
                set('notes_text', data.notes_text ? `${data.notes_text} ${t}` : t)
              }
            />
          </div>
        </div>

        <div>
          <label className="field-label" htmlFor="link_tr">
            Link a Thought Record (optional)
          </label>
          <select
            id="link_tr"
            className="field-input"
            value={data.linked_thought_record_id ?? ''}
            onChange={(e) => set('linked_thought_record_id', e.target.value || null)}
          >
            <option value="">None</option>
            {trs.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title || r.situation_text?.slice(0, 40) || r.created_at.slice(0, 10)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="field-label" htmlFor="link_week">
            Link an Activity week (optional)
          </label>
          <select
            id="link_week"
            className="field-input"
            value={data.linked_activity_week_id ?? ''}
            onChange={(e) => set('linked_activity_week_id', e.target.value || null)}
          >
            <option value="">None</option>
            {weeks.map((w) => (
              <option key={w.id} value={w.id}>
                {w.title || `Week of ${w.week_start_date}`}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-2">
          <button className="btn-secondary" onClick={() => void save()}>
            Save draft
          </button>
          <button className="btn-primary" onClick={() => void done()}>
            Save entry
          </button>
        </div>
      </div>
    </div>
  );
}
