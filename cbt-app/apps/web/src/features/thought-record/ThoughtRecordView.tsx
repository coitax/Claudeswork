import { worksheetConfigs, type ThoughtRecord } from '@cbt/shared';
import { fieldOr } from '@/lib/worksheet-helpers';

const two = worksheetConfigs['thought-record-side-two']!;

function Row({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div className="worksheet-section border-b border-accent-soft py-3 last:border-b-0">
      <p className="text-sm font-medium text-ink">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm text-ink-soft">
        {value === null || value === '' ? '—' : value}
      </p>
    </div>
  );
}

/** Worksheet-faithful read view, used by detail and print. */
export function ThoughtRecordView({ record }: { record: ThoughtRecord }) {
  return (
    <div>
      <Row
        label={fieldOr(two, 'date_time', 'Date/time').label}
        value={record.date_time ? new Date(record.date_time).toLocaleString() : null}
      />
      <Row label={fieldOr(two, 'situation_text', 'Situation').label} value={record.situation_text} />
      <Row
        label={fieldOr(two, 'automatic_thoughts_text', 'Automatic Thought(s)').label}
        value={record.automatic_thoughts_text}
      />
      <Row
        label={fieldOr(two, 'automatic_thoughts_belief_percent', 'Belief %').label}
        value={record.automatic_thoughts_belief_percent}
      />
      <Row label={fieldOr(two, 'emotions_text', 'Emotion(s)').label} value={record.emotions_text} />
      <Row
        label={fieldOr(two, 'emotions_intensity_percent', 'Intensity %').label}
        value={record.emotions_intensity_percent}
      />
      <Row
        label={fieldOr(two, 'cognitive_distortion_text', 'Cognitive Distortions').label}
        value={record.cognitive_distortion_text}
      />
      <Row
        label={fieldOr(two, 'adaptive_response_text', 'Adaptive Response').label}
        value={record.adaptive_response_text}
      />
      <Row
        label={fieldOr(two, 'outcome_belief_now_percent', 'Belief now %').label}
        value={record.outcome_belief_now_percent}
      />
      <Row
        label={fieldOr(two, 'outcome_emotions_now_text', 'Emotion(s) now').label}
        value={record.outcome_emotions_now_text}
      />
      <Row
        label={fieldOr(two, 'outcome_emotions_now_percent', 'Intensity now %').label}
        value={record.outcome_emotions_now_percent}
      />
      <Row
        label={fieldOr(two, 'outcome_what_would_be_good_to_do_text', 'What will you do?').label}
        value={record.outcome_what_would_be_good_to_do_text}
      />
    </div>
  );
}
