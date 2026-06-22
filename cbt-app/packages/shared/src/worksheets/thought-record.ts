import type { WorksheetConfig } from '../types/worksheet-config.js';

/**
 * Thought Record worksheet configs (side one + side two) and the Cognitive
 * Distortions reference list.
 *
 * !!! SOURCE TEXT REVIEW REQUIRED !!!
 * The Beck Thought Record source images were NOT available when this config was
 * authored. All prompts, column names, and the cognitive-distortion list below
 * are CANDIDATE text based on a standard Beck-style Thought Record and MUST be
 * confirmed against the real documents. Every uncertain string is listed in
 * `review_needed`.
 */

export const thoughtRecordSideOne: WorksheetConfig = {
  key: 'thought-record-side-one',
  version: 1,
  // CANDIDATE — confirm exact title from source image.
  title: 'Thought Record',
  // CANDIDATE — confirm exact instructions from source image.
  instructions:
    'When you notice your mood getting worse, ask yourself "What is going through my mind right now?" '
    + 'and record the thought(s) and other information below as soon as possible.',
  sections: [
    {
      key: 'date_time',
      fields: [
        {
          field_key: 'date_time',
          field_type: 'datetime',
          label: 'Date/Time',
          // CANDIDATE wording.
          prompt_text: 'Date/Time',
          review_needed: true,
        },
      ],
    },
    {
      key: 'situation',
      title: 'Situation',
      review_needed: true,
      fields: [
        {
          field_key: 'situation_text',
          field_type: 'textarea',
          label: 'Situation',
          // CANDIDATE wording.
          prompt_text:
            'Who? What? When? Where? Describe the actual event leading to the unpleasant emotion.',
          review_needed: true,
        },
      ],
    },
    {
      key: 'automatic_thoughts',
      title: 'Automatic Thought(s)',
      review_needed: true,
      fields: [
        {
          field_key: 'automatic_thoughts_text',
          field_type: 'textarea',
          label: 'Automatic Thought(s)',
          prompt_text:
            'What thought(s) and/or image(s) went through your mind?',
          review_needed: true,
        },
        {
          field_key: 'automatic_thoughts_belief_percent',
          field_type: 'percent',
          label: 'How much did you believe each one at the time? (0-100%)',
          scale: { min: 0, max: 100, label: '0-100%' },
          review_needed: true,
        },
      ],
    },
    {
      key: 'emotions',
      title: 'Emotion(s)',
      review_needed: true,
      fields: [
        {
          field_key: 'emotions_text',
          field_type: 'emotion_picker',
          label: 'Emotion(s)',
          prompt_text: 'What emotion(s) did you feel at the time?',
          helper_reference: 'feelings-wheel-reference',
          review_needed: true,
        },
        {
          field_key: 'emotions_intensity_percent',
          field_type: 'percent',
          label: 'How intense was the emotion? (0-100%)',
          scale: { min: 0, max: 100, label: '0-100%' },
          review_needed: true,
        },
      ],
    },
  ],
  print_layout: { style: 'stacked-sections' },
  review_needed: [
    { field_key: 'title', extracted_text: 'Thought Record', notes: 'Confirm exact title.' },
    {
      field_key: 'instructions',
      extracted_text: 'When you notice your mood getting worse...',
      notes: 'Confirm exact instruction wording from the source worksheet.',
    },
    {
      field_key: 'situation_text',
      extracted_text: 'Who? What? When? Where? ...',
      notes: 'Confirm exact Situation prompt wording.',
    },
    {
      field_key: 'automatic_thoughts_text',
      extracted_text: 'What thought(s) and/or image(s) went through your mind?',
      notes: 'Confirm exact Automatic Thought(s) prompt wording.',
    },
    {
      field_key: 'emotions_text',
      extracted_text: 'What emotion(s) did you feel at the time?',
      notes: 'Confirm exact Emotion(s) prompt wording and the rating scale used.',
    },
  ],
};

export const thoughtRecordSideTwo: WorksheetConfig = {
  key: 'thought-record-side-two',
  version: 1,
  title: 'Thought Record',
  instructions:
    'Use the questions below to compose a response to the automatic thought(s), then re-rate.',
  sections: [
    {
      key: 'cognitive_distortions',
      title: 'Cognitive Distortions',
      review_needed: true,
      fields: [
        {
          field_key: 'cognitive_distortion_text',
          field_type: 'reference_list',
          label: 'Cognitive Distortions',
          prompt_text: 'Which cognitive distortion(s), if any, are present?',
          helper_reference: 'cognitive-distortions-list',
          review_needed: true,
        },
      ],
    },
    {
      key: 'adaptive_response',
      title: 'Adaptive Response',
      review_needed: true,
      fields: [
        {
          field_key: 'adaptive_response_text',
          field_type: 'textarea',
          label: 'Adaptive Response',
          prompt_text:
            'What is the evidence? Is there an alternative explanation? What is the worst/best/most realistic outcome? '
            + 'What is the effect of believing the automatic thought and of changing my thinking?',
          review_needed: true,
        },
      ],
    },
    {
      key: 'outcome',
      title: 'Outcome',
      review_needed: true,
      fields: [
        {
          field_key: 'outcome_belief_now_percent',
          field_type: 'percent',
          label: 'Now, how much do you believe the automatic thought(s)? (0-100%)',
          scale: { min: 0, max: 100, label: '0-100%' },
          review_needed: true,
        },
        {
          field_key: 'outcome_emotions_now_text',
          field_type: 'emotion_picker',
          label: 'What emotion(s) do you feel now?',
          helper_reference: 'feelings-wheel-reference',
          review_needed: true,
        },
        {
          field_key: 'outcome_emotions_now_percent',
          field_type: 'percent',
          label: 'How intense is the emotion now? (0-100%)',
          scale: { min: 0, max: 100, label: '0-100%' },
          review_needed: true,
        },
        {
          field_key: 'outcome_what_would_be_good_to_do_text',
          field_type: 'textarea',
          label: 'What will you do (or did you do)?',
          prompt_text: 'What would be good to do next?',
          review_needed: true,
        },
      ],
    },
  ],
  print_layout: { style: 'stacked-sections' },
  review_needed: [
    {
      field_key: 'adaptive_response_text',
      extracted_text: 'What is the evidence? Is there an alternative explanation? ...',
      notes: 'Confirm exact Adaptive Response question wording (Beck questions list).',
    },
    {
      field_key: 'outcome_belief_now_percent',
      extracted_text: 'Now, how much do you believe the automatic thought(s)? (0-100%)',
      notes: 'Confirm exact Outcome wording and scale.',
    },
    {
      field_key: 'outcome_what_would_be_good_to_do_text',
      extracted_text: 'What would be good to do next?',
      notes: 'Confirm exact wording for the final outcome prompt.',
    },
  ],
};

/**
 * Cognitive Distortions reference list.
 * CANDIDATE list (Beck / Burns style). Confirm exact names and descriptions
 * against the source worksheet before treating as authoritative.
 */
export interface CognitiveDistortion {
  name: string;
  description: string;
  review_needed: boolean;
}

export const cognitiveDistortions: CognitiveDistortion[] = [
  {
    name: 'All-or-Nothing Thinking',
    description: 'You see things in black-and-white categories.',
    review_needed: true,
  },
  {
    name: 'Overgeneralization',
    description: 'You see a single negative event as a never-ending pattern of defeat.',
    review_needed: true,
  },
  {
    name: 'Mental Filter',
    description: 'You pick out a single negative detail and dwell on it exclusively.',
    review_needed: true,
  },
  {
    name: 'Disqualifying the Positive',
    description: 'You reject positive experiences by insisting they "don\'t count."',
    review_needed: true,
  },
  {
    name: 'Jumping to Conclusions',
    description: 'You make a negative interpretation without supporting facts (mind reading / fortune telling).',
    review_needed: true,
  },
  {
    name: 'Magnification or Minimization',
    description: 'You exaggerate the importance of things, or shrink things until they appear tiny.',
    review_needed: true,
  },
  {
    name: 'Emotional Reasoning',
    description: 'You assume that your negative emotions reflect the way things really are.',
    review_needed: true,
  },
  {
    name: 'Should Statements',
    description: 'You try to motivate yourself with shoulds and shouldn\'ts.',
    review_needed: true,
  },
  {
    name: 'Labeling and Mislabeling',
    description: 'Instead of describing an error, you attach a negative label to yourself.',
    review_needed: true,
  },
  {
    name: 'Personalization',
    description: 'You see yourself as the cause of some negative external event for which you were not responsible.',
    review_needed: true,
  },
];
