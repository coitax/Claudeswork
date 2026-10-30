import type { ThoughtRecordInput } from '@cbt/shared';

export function buildEmptyThoughtRecord(): ThoughtRecordInput {
  return {
    title: null,
    date_time: null,
    situation_text: null,
    automatic_thoughts_text: null,
    automatic_thoughts_belief_percent: null,
    emotions_text: null,
    emotions_intensity_percent: null,
    adaptive_response_text: null,
    cognitive_distortion_text: null,
    outcome_belief_now_percent: null,
    outcome_emotions_now_text: null,
    outcome_emotions_now_percent: null,
    outcome_what_would_be_good_to_do_text: null,
    is_draft: true,
  };
}
