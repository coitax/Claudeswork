import type { WorksheetConfig } from '../types/worksheet-config.js';

/**
 * Thought Record worksheet configs (side one + side two) and the Cognitive
 * Distortions reference list.
 *
 * Source: photographed Beck Institute worksheets "THOUGHT RECORD SIDE ONE:
 * WORKSHEET" and "THOUGHT RECORD: SIDE TWO WORKSHEET" (transcribed from the
 * user's images via OCR, 2026-06). © 2018, adapted from J. Beck (2020),
 * Cognitive Behavior Therapy: Basics and Beyond, 3rd edition. Beck Institute
 * for Cognitive Behavior Therapy, beckinstitute.org.
 *
 * Wording below is taken verbatim from the source. Per the fidelity rule, do
 * not paraphrase. Items still uncertain after OCR are flagged in review_needed.
 */

export const thoughtRecordSideOne: WorksheetConfig = {
  key: 'thought-record-side-one',
  version: 2,
  title: 'THOUGHT RECORD SIDE ONE: WORKSHEET',
  // Verbatim banner + instructions from the worksheet image.
  instructions:
    'Remember, thoughts may be 100% true, 0% true or somewhere in the middle. JUST BECAUSE YOU '
    + 'THINK SOMETHING, DOESN’T NECESSARILY MEAN IT’S TRUE.\n\n'
    + 'Spend just 5-10 minutes to complete the Thought Record. Note that not all questions will '
    + 'apply to every automatic thought. Here’s what to do:\n'
    + '1. When you notice your mood getting worse, or you find yourself engaging in unhelpful '
    + 'behavior, ask yourself, “What’s going through my mind right now?” and as soon as '
    + 'possible, jot down the thought or mental image in the Automatic Thought(s) column. The '
    + 'situation may be external (something that just happened or something you just did) or internal '
    + '(an intense emotion, a painful sensation, an image, daydream, flashback or stream of '
    + 'thoughts—e.g., thinking about your future).\n'
    + '2. Then fill in the rest of the columns. You can try to identify cognitive distortions from '
    + 'the list below. More than one distortion may apply. Make sure to use the questions at the '
    + 'bottom of the worksheet to compose the adaptive response.\n'
    + '3. Spelling, handwriting and grammar don’t count.\n'
    + '4. It was worth doing this worksheet if your mood improves by 10% or more.',
  sections: [
    {
      key: 'distortions_reference',
      title: 'Cognitive Distortions',
      fields: [
        {
          field_key: 'cognitive_distortions_list',
          field_type: 'reference_list',
          label: 'Cognitive Distortions',
          helper_reference: 'cognitive-distortions-list',
        },
      ],
    },
  ],
  print_layout: { style: 'reference' },
  review_needed: [
    {
      field_key: 'instructions_numbering',
      extracted_text:
        'Instruction step numbering in the source image was partly obscured; the steps are '
        + 'transcribed in source order but the exact numbering should be confirmed.',
      notes: 'Confirm the instruction step numbers/order against the printed worksheet.',
    },
  ],
};

export const thoughtRecordSideTwo: WorksheetConfig = {
  key: 'thought-record-side-two',
  version: 2,
  title: 'THOUGHT RECORD: SIDE TWO WORKSHEET',
  instructions:
    '© 2018 Adapted from J. Beck (2020) Cognitive Behavior Therapy: Basics and Beyond, 3rd '
    + 'edition. Beck Institute for Cognitive Behavior Therapy.',
  sections: [
    {
      key: 'date_time',
      title: 'Date/time',
      fields: [{ field_key: 'date_time', field_type: 'datetime', label: 'Date/time' }],
    },
    {
      key: 'situation',
      title: 'Situation',
      fields: [
        {
          field_key: 'situation_text',
          field_type: 'textarea',
          label: 'Situation',
          // Verbatim column prompt.
          prompt_text:
            '1. What event (external or internal) is associated with the unpleasant emotion? Or what '
            + 'unhelpful behavior did you engage in?',
        },
      ],
    },
    {
      key: 'automatic_thoughts',
      title: 'Automatic Thought(s)',
      fields: [
        {
          field_key: 'automatic_thoughts_text',
          field_type: 'textarea',
          label: 'Automatic Thought(s)',
          prompt_text:
            '1. What thought(s) and/or image(s) went through your mind (before, during or after the '
            + 'event or unhelpful behavior)?',
        },
        {
          field_key: 'automatic_thoughts_belief_percent',
          field_type: 'percent',
          label: '2. How much did you believe the thought(s)?',
          scale: { min: 0, max: 100, label: '0-100%' },
        },
      ],
    },
    {
      key: 'emotions',
      title: 'Emotion(s)',
      fields: [
        {
          field_key: 'emotions_text',
          field_type: 'emotion_picker',
          label: 'Emotion(s)',
          prompt_text:
            '1. What emotion(s) (sad/ anxious/ angry/ etc.) did you feel (before, during or after the '
            + 'event or unhelpful behavior)?',
          helper_reference: 'feelings-wheel-reference',
        },
        {
          field_key: 'emotions_intensity_percent',
          field_type: 'percent',
          label: '2. How intense (0-100%) was the emotion?',
          scale: { min: 0, max: 100, label: '0-100%' },
        },
      ],
    },
    {
      key: 'adaptive_response',
      title: 'Adaptive Response',
      fields: [
        {
          field_key: 'cognitive_distortion_text',
          field_type: 'reference_list',
          label: 'Cognitive distortion',
          prompt_text: '1. (optional) What cognitive distortion did you make?',
          helper_reference: 'cognitive-distortions-list',
        },
        {
          field_key: 'adaptive_response_text',
          field_type: 'textarea',
          label: 'Adaptive Response',
          prompt_text:
            '2. Use questions below to compose a response to the automatic thought(s). Indicate how '
            + 'much you believe each response.\n\n'
            + 'Questions to help compose an alternative response: (1) What is the evidence that the '
            + 'automatic thought is true? Not true? (2) Is there an alternative explanation? (3) If '
            + 'the worst happened, how could I cope? What’s the best that could happen? What’s '
            + 'the most realistic outcome? (4) What’s the effect of my believing the automatic '
            + 'thought? What could be the effect of my changing my thinking? (5) If [person’s name] '
            + 'was in this situation and had this thought, what would I tell them? (6) What would be '
            + 'good to do?',
        },
      ],
    },
    {
      key: 'outcome',
      title: 'Outcome',
      fields: [
        {
          field_key: 'outcome_belief_now_percent',
          field_type: 'percent',
          label: '1. How much do you now believe each automatic thought?',
          scale: { min: 0, max: 100, label: '0-100%' },
        },
        {
          field_key: 'outcome_emotions_now_text',
          field_type: 'emotion_picker',
          label: '2. What emotion(s) do you feel now?',
          helper_reference: 'feelings-wheel-reference',
        },
        {
          field_key: 'outcome_emotions_now_percent',
          field_type: 'percent',
          label: 'How intense (0-100%) is the emotion?',
          scale: { min: 0, max: 100, label: '0-100%' },
        },
        {
          field_key: 'outcome_what_would_be_good_to_do_text',
          field_type: 'textarea',
          label: '3. What would be good to do?',
        },
      ],
    },
  ],
  print_layout: { style: 'stacked-sections' },
  review_needed: [],
};

/**
 * Cognitive Distortions reference list — verbatim names and examples from the
 * Thought Record Side One worksheet image.
 */
export interface CognitiveDistortion {
  name: string;
  /** Verbatim example text from the worksheet (the worksheet lists examples, not definitions). */
  description: string;
  review_needed: boolean;
}

export const cognitiveDistortions: CognitiveDistortion[] = [
  {
    name: 'All-or-nothing thinking',
    description: 'Example: “If I’m not a total success, I’m a failure.”',
    review_needed: false,
  },
  {
    name: 'Catastrophizing (fortune telling)',
    description:
      'Example: “I’ll be so upset, I won’t be able to function at all.”',
    review_needed: false,
  },
  {
    name: 'Disqualifying or discounting the positive',
    description:
      'Example: “I did that project well, but that doesn’t mean I’m competent, I just '
      + 'got lucky.”',
    review_needed: false,
  },
  {
    name: 'Emotional reasoning',
    description:
      'Example: “I know I do a lot of things okay at work, but I still feel like I’m a '
      + 'failure.”',
    review_needed: false,
  },
  {
    name: 'Labeling',
    description: 'Examples: “I’m a loser.” “He’s no good.”',
    review_needed: false,
  },
  {
    name: 'Magnification/minimization',
    description:
      'Example: “Getting a mediocre evaluation proves how inadequate I am. Getting high marks '
      + 'doesn’t mean I’m smart.”',
    review_needed: true,
  },
  {
    name: 'Mental filter (selective abstraction)',
    description:
      'Example: “Because I got one low rating on my evaluation (which also contained several '
      + 'high ratings), it means I’m doing a lousy job.”',
    review_needed: false,
  },
  {
    name: 'Mind reading',
    description:
      'Example: “He’s thinking that I don’t know the first thing about this '
      + 'project.”',
    review_needed: false,
  },
  {
    name: 'Overgeneralization',
    description:
      'Example: “Because I felt uncomfortable at the get-together, I don’t have what it '
      + 'takes to make friends.”',
    review_needed: false,
  },
  {
    name: 'Personalization',
    description:
      'Example: “The repairman was curt to me because I did something wrong.”',
    review_needed: false,
  },
  {
    name: '“Should” and “must” statements',
    description:
      'Example: “It’s terrible that I made a mistake. I should always do my best.”',
    review_needed: false,
  },
  {
    name: 'Tunnel vision',
    description:
      'Example: “My son’s teacher can’t do anything right. He’s critical and '
      + 'insensitive and lousy at teaching.”',
    review_needed: false,
  },
];
