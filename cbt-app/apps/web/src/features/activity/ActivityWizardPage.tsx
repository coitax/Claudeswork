import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  activityWeekInputSchema,
  worksheetConfigs,
  type ActivityWeek,
  type ActivityWeekInput,
} from '@cbt/shared';
import { api } from '@/lib/api';
import { WizardLayout, WizardStep, type WizardStepDef } from '@/components/Wizard';
import { ActivityDayEditor } from '@/components/ActivityDayEditor';
import { AutosaveIndicator } from '@/components/AutosaveIndicator';
import { WeeklyActivityGrid } from '@/components/WeeklyActivityGrid';
import { useAutosave } from '@/lib/use-autosave';
import { buildEmptyWeek, defaultWeekStart } from './activity-model';

const cfg = worksheetConfigs['activity-monitoring-form'];

export function ActivityWizardPage() {
  const { weekId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<ActivityWeekInput>(() => buildEmptyWeek(defaultWeekStart()));
  const [id, setId] = useState<string | null>(weekId ?? null);
  const [step, setStep] = useState(0);
  const [loaded, setLoaded] = useState(!weekId);

  // Load existing week for edit.
  useEffect(() => {
    if (!weekId) return;
    api.get<ActivityWeek>(`/api/activity-weeks/${weekId}`).then((w) => {
      setData({
        week_start_date: w.week_start_date,
        title: w.title,
        notes: w.notes,
        is_draft: w.is_draft,
        days: w.days,
      });
      setId(w.id);
      setLoaded(true);
    });
  }, [weekId]);

  const persist = useCallback(
    async (payload: ActivityWeekInput) => {
      const parsed = activityWeekInputSchema.parse(payload);
      if (id) {
        await api.put(`/api/activity-weeks/${id}`, parsed);
      } else {
        const created = await api.post<ActivityWeek>('/api/activity-weeks', parsed);
        setId(created.id);
        // Reflect the id in the URL without losing wizard state.
        window.history.replaceState(null, '', `/app/activity/${created.id}/edit`);
      }
    },
    [id],
  );

  const { status, save } = useAutosave({ data, onSave: persist, enabled: loaded });

  const steps: WizardStepDef[] = [
    { key: 'week', title: 'Week' },
    ...data.days.map((d) => ({ key: d.day_of_week, title: d.day_of_week })),
    { key: 'mood', title: 'Mood' },
    { key: 'review', title: 'Review' },
  ];

  function setDay(index: number, day: ActivityWeekInput['days'][number]) {
    setData((prev) => ({ ...prev, days: prev.days.map((d, i) => (i === index ? day : d)) }));
  }

  async function finish() {
    await persist({ ...data, is_draft: false });
    navigate(id ? `/app/activity/${id}` : '/app/activity');
  }

  if (!loaded) return <p className="text-ink-faint">Loading…</p>;

  const isDayStep = step >= 1 && step <= 7;
  const dayIndex = step - 1;

  return (
    <div>
      <div className="no-print mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink">{cfg?.title}</h1>
        <AutosaveIndicator status={status} />
      </div>
      {cfg?.instructions && <p className="no-print prompt-text mb-4">{cfg.instructions}</p>}

      <WizardLayout
        steps={steps}
        current={step}
        onGoto={setStep}
        footer={
          <>
            <button
              className="btn-ghost"
              disabled={step === 0}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
            >
              ← Back
            </button>
            <div className="flex gap-2">
              <button className="btn-secondary" onClick={() => void save()}>
                Save draft
              </button>
              {step < steps.length - 1 ? (
                <button className="btn-primary" onClick={() => setStep((s) => s + 1)}>
                  Next →
                </button>
              ) : (
                <button className="btn-primary" onClick={() => void finish()}>
                  Save week
                </button>
              )}
            </div>
          </>
        }
      >
        {step === 0 && (
          <WizardStep title="Choose week">
            <label className="field-label" htmlFor="week_start_date">
              Week starting
            </label>
            <input
              id="week_start_date"
              type="date"
              className="field-input mb-4"
              value={data.week_start_date}
              onChange={(e) => setData((p) => ({ ...p, week_start_date: e.target.value }))}
            />
            <label className="field-label" htmlFor="title">
              Title (optional)
            </label>
            <input
              id="title"
              className="field-input mb-4"
              value={data.title ?? ''}
              onChange={(e) => setData((p) => ({ ...p, title: e.target.value || null }))}
            />
            <label className="field-label" htmlFor="notes">
              Notes (optional)
            </label>
            <textarea
              id="notes"
              className="field-input"
              rows={3}
              value={data.notes ?? ''}
              onChange={(e) => setData((p) => ({ ...p, notes: e.target.value || null }))}
            />
          </WizardStep>
        )}

        {isDayStep && (
          <WizardStep title={`${data.days[dayIndex]?.day_of_week} entries`}>
            <ActivityDayEditor day={data.days[dayIndex]!} onChange={(d) => setDay(dayIndex, d)} />
          </WizardStep>
        )}

        {step === 8 && (
          <WizardStep title="Overall Mood (0-10) for each day">
            <div className="space-y-3">
              {data.days.map((d, i) => (
                <div key={d.day_of_week} className="flex items-center gap-3">
                  <span className="w-28 text-sm text-ink">{d.day_of_week}</span>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    className="field-input w-24"
                    aria-label={`Overall mood for ${d.day_of_week}`}
                    value={d.overall_mood_0_10 ?? ''}
                    onChange={(e) =>
                      setDay(i, {
                        ...d,
                        overall_mood_0_10: e.target.value === '' ? null : Number(e.target.value),
                      })
                    }
                  />
                </div>
              ))}
            </div>
          </WizardStep>
        )}

        {step === 9 && (
          <WizardStep title="Review and save">
            <p className="prompt-text mb-4">Review the week below, then save.</p>
            <div className="overflow-x-auto">
              <WeeklyActivityGrid
                week={{
                  id: id ?? 'preview',
                  user_id: '',
                  created_at: '',
                  updated_at: '',
                  ...data,
                }}
              />
            </div>
          </WizardStep>
        )}
      </WizardLayout>
    </div>
  );
}
