import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  thoughtRecordInputSchema,
  worksheetConfigs,
  type ThoughtRecord,
  type ThoughtRecordInput,
} from '@cbt/shared';
import { api } from '@/lib/api';
import { WizardLayout, WizardStep, type WizardStepDef } from '@/components/Wizard';
import { WorksheetField } from '@/components/WorksheetField';
import { AutosaveIndicator } from '@/components/AutosaveIndicator';
import { FeelingsWheelPicker } from '@/components/FeelingsWheelPicker';
import { ThoughtRecordReviewPanel } from '@/components/ThoughtRecordReviewPanel';
import { useAutosave } from '@/lib/use-autosave';
import { fieldOr } from '@/lib/worksheet-helpers';
import { buildEmptyThoughtRecord } from './thought-record-model';

const one = worksheetConfigs['thought-record-side-one']!;
const two = worksheetConfigs['thought-record-side-two']!;

const STEPS: WizardStepDef[] = [
  { key: 'datetime', title: 'Date/Time' },
  { key: 'situation', title: 'Situation' },
  { key: 'thoughts', title: 'Automatic Thought(s)' },
  { key: 'emotions', title: 'Emotion(s)' },
  { key: 'distortions', title: 'Cognitive Distortions' },
  { key: 'adaptive', title: 'Adaptive Response' },
  { key: 'outcome', title: 'Outcome' },
  { key: 'review', title: 'Review' },
];

export function ThoughtRecordWizardPage() {
  const params = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<ThoughtRecordInput>(buildEmptyThoughtRecord);
  const [id, setId] = useState<string | null>(params.id ?? null);
  const [step, setStep] = useState(0);
  const [loaded, setLoaded] = useState(!params.id);

  useEffect(() => {
    if (!params.id) return;
    api.get<ThoughtRecord>(`/api/thought-records/${params.id}`).then((r) => {
      const { id: _id, user_id: _u, created_at: _c, updated_at: _up, ...rest } = r;
      setData(rest);
      setId(r.id);
      setLoaded(true);
    });
  }, [params.id]);

  const persist = useCallback(
    async (payload: ThoughtRecordInput) => {
      const parsed = thoughtRecordInputSchema.parse(payload);
      if (id) {
        await api.put(`/api/thought-records/${id}`, parsed);
      } else {
        const created = await api.post<ThoughtRecord>('/api/thought-records', parsed);
        setId(created.id);
        window.history.replaceState(null, '', `/app/thought-records/${created.id}/edit`);
      }
    },
    [id],
  );

  const { status, save } = useAutosave({ data, onSave: persist, enabled: loaded });

  function set<K extends keyof ThoughtRecordInput>(key: K, value: ThoughtRecordInput[K]) {
    setData((p) => ({ ...p, [key]: value }));
  }

  function appendEmotion(field: 'emotions_text' | 'outcome_emotions_now_text', term: string) {
    setData((p) => {
      const cur = p[field];
      return { ...p, [field]: cur ? `${cur}, ${term}` : term };
    });
  }

  async function finish() {
    await persist({ ...data, is_draft: false });
    navigate(id ? `/app/thought-records/${id}` : '/app/thought-records');
  }

  if (!loaded) return <p className="text-ink-faint">Loading…</p>;

  return (
    <div>
      <div className="no-print mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink">{one.title}</h1>
        <AutosaveIndicator status={status} />
      </div>
      {one.instructions && <p className="no-print prompt-text mb-4">{one.instructions}</p>}

      <WizardLayout
        steps={STEPS}
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
              {step < STEPS.length - 1 ? (
                <button className="btn-primary" onClick={() => setStep((s) => s + 1)}>
                  Next →
                </button>
              ) : (
                <button className="btn-primary" onClick={() => void finish()}>
                  Save record
                </button>
              )}
            </div>
          </>
        }
      >
        {step === 0 && (
          <WizardStep title="Date/Time">
            <WorksheetField field={fieldOr(one, 'date_time', 'Date/Time')} htmlFor="date_time">
              <input
                id="date_time"
                type="datetime-local"
                className="field-input"
                value={data.date_time ? data.date_time.slice(0, 16) : ''}
                onChange={(e) =>
                  set('date_time', e.target.value ? new Date(e.target.value).toISOString() : null)
                }
              />
            </WorksheetField>
            <WorksheetField field={{ field_key: 'title', field_type: 'text', label: 'Title (optional)' }} htmlFor="title">
              <input
                id="title"
                className="field-input"
                value={data.title ?? ''}
                onChange={(e) => set('title', e.target.value || null)}
              />
            </WorksheetField>
          </WizardStep>
        )}

        {step === 1 && (
          <WizardStep title="Situation">
            <WorksheetField field={fieldOr(one, 'situation_text', 'Situation')} htmlFor="situation">
              <textarea
                id="situation"
                rows={5}
                className="field-input"
                value={data.situation_text ?? ''}
                onChange={(e) => set('situation_text', e.target.value || null)}
              />
            </WorksheetField>
          </WizardStep>
        )}

        {step === 2 && (
          <WizardStep title="Automatic Thought(s)">
            <WorksheetField field={fieldOr(one, 'automatic_thoughts_text', 'Automatic Thought(s)')} htmlFor="at">
              <textarea
                id="at"
                rows={5}
                className="field-input"
                value={data.automatic_thoughts_text ?? ''}
                onChange={(e) => set('automatic_thoughts_text', e.target.value || null)}
              />
            </WorksheetField>
            <PercentField
              field={fieldOr(one, 'automatic_thoughts_belief_percent', 'Belief (0-100%)')}
              value={data.automatic_thoughts_belief_percent}
              onChange={(v) => set('automatic_thoughts_belief_percent', v)}
            />
          </WizardStep>
        )}

        {step === 3 && (
          <WizardStep title="Emotion(s)">
            <WorksheetField field={fieldOr(one, 'emotions_text', 'Emotion(s)')} htmlFor="emo">
              <textarea
                id="emo"
                rows={3}
                className="field-input"
                value={data.emotions_text ?? ''}
                onChange={(e) => set('emotions_text', e.target.value || null)}
              />
              <div className="mt-2">
                <FeelingsWheelPicker onPick={(t) => appendEmotion('emotions_text', t)} />
              </div>
            </WorksheetField>
            <PercentField
              field={fieldOr(one, 'emotions_intensity_percent', 'Intensity (0-100%)')}
              value={data.emotions_intensity_percent}
              onChange={(v) => set('emotions_intensity_percent', v)}
            />
          </WizardStep>
        )}

        {step === 4 && (
          <WizardStep title="Cognitive Distortions">
            <WorksheetField field={fieldOr(two, 'cognitive_distortion_text', 'Cognitive Distortions')} htmlFor="cd">
              <textarea
                id="cd"
                rows={3}
                className="field-input"
                value={data.cognitive_distortion_text ?? ''}
                onChange={(e) => set('cognitive_distortion_text', e.target.value || null)}
              />
            </WorksheetField>
            <ThoughtRecordReviewPanel
              onInsert={(name) =>
                set(
                  'cognitive_distortion_text',
                  data.cognitive_distortion_text
                    ? `${data.cognitive_distortion_text}, ${name}`
                    : name,
                )
              }
            />
          </WizardStep>
        )}

        {step === 5 && (
          <WizardStep title="Adaptive Response">
            <WorksheetField field={fieldOr(two, 'adaptive_response_text', 'Adaptive Response')} htmlFor="ar">
              <textarea
                id="ar"
                rows={6}
                className="field-input"
                value={data.adaptive_response_text ?? ''}
                onChange={(e) => set('adaptive_response_text', e.target.value || null)}
              />
            </WorksheetField>
          </WizardStep>
        )}

        {step === 6 && (
          <WizardStep title="Outcome">
            <PercentField
              field={fieldOr(two, 'outcome_belief_now_percent', 'Belief now (0-100%)')}
              value={data.outcome_belief_now_percent}
              onChange={(v) => set('outcome_belief_now_percent', v)}
            />
            <WorksheetField field={fieldOr(two, 'outcome_emotions_now_text', 'Emotion(s) now')} htmlFor="oe">
              <textarea
                id="oe"
                rows={3}
                className="field-input"
                value={data.outcome_emotions_now_text ?? ''}
                onChange={(e) => set('outcome_emotions_now_text', e.target.value || null)}
              />
              <div className="mt-2">
                <FeelingsWheelPicker onPick={(t) => appendEmotion('outcome_emotions_now_text', t)} />
              </div>
            </WorksheetField>
            <PercentField
              field={fieldOr(two, 'outcome_emotions_now_percent', 'Intensity now (0-100%)')}
              value={data.outcome_emotions_now_percent}
              onChange={(v) => set('outcome_emotions_now_percent', v)}
            />
            <WorksheetField
              field={fieldOr(two, 'outcome_what_would_be_good_to_do_text', 'What will you do?')}
              htmlFor="od"
            >
              <textarea
                id="od"
                rows={3}
                className="field-input"
                value={data.outcome_what_would_be_good_to_do_text ?? ''}
                onChange={(e) => set('outcome_what_would_be_good_to_do_text', e.target.value || null)}
              />
            </WorksheetField>
          </WizardStep>
        )}

        {step === 7 && (
          <WizardStep title="Review and save">
            <p className="prompt-text">Review your entries using the step tabs above, then save.</p>
          </WizardStep>
        )}
      </WizardLayout>
    </div>
  );
}

function PercentField({
  field,
  value,
  onChange,
}: {
  field: import('@cbt/shared').WorksheetField;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <WorksheetField field={field} htmlFor={field.field_key}>
      <input
        id={field.field_key}
        type="number"
        min={0}
        max={100}
        className="field-input w-28"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
      />
    </WorksheetField>
  );
}
