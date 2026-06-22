import type { FeelingsWheelConfig } from '../types/worksheet-config.js';

/**
 * Feelings Wheel reference (OPTIONAL helper content only).
 *
 * !!! SOURCE TEXT REVIEW REQUIRED !!!
 * The source feelings-wheel image was NOT available. This is a CANDIDATE
 * hierarchy (Gloria Willcox-style: 6 primary emotions, with secondary and
 * tertiary rings) and MUST be confirmed against the attached wheel.
 *
 * This is reference/support content ONLY. It must NOT replace worksheet wording;
 * the user may always type free-text emotions instead of picking from the wheel.
 */
export const feelingsWheel: FeelingsWheelConfig = {
  key: 'feelings-wheel-reference',
  version: 1,
  title: 'Feelings Wheel',
  primary: [
    {
      label: 'Happy',
      children: [
        { label: 'Playful', children: [{ label: 'Aroused' }, { label: 'Cheeky' }] },
        { label: 'Content', children: [{ label: 'Free' }, { label: 'Joyful' }] },
        { label: 'Proud', children: [{ label: 'Successful' }, { label: 'Confident' }] },
        { label: 'Optimistic', children: [{ label: 'Inspired' }, { label: 'Hopeful' }] },
      ],
    },
    {
      label: 'Sad',
      children: [
        { label: 'Lonely', children: [{ label: 'Isolated' }, { label: 'Abandoned' }] },
        { label: 'Vulnerable', children: [{ label: 'Fragile' }, { label: 'Victimized' }] },
        { label: 'Despair', children: [{ label: 'Grief' }, { label: 'Powerless' }] },
        { label: 'Guilty', children: [{ label: 'Ashamed' }, { label: 'Remorseful' }] },
      ],
    },
    {
      label: 'Angry',
      children: [
        { label: 'Frustrated', children: [{ label: 'Infuriated' }, { label: 'Annoyed' }] },
        { label: 'Critical', children: [{ label: 'Skeptical' }, { label: 'Dismissive' }] },
        { label: 'Distant', children: [{ label: 'Withdrawn' }, { label: 'Numb' }] },
        { label: 'Hurt', children: [{ label: 'Embarrassed' }, { label: 'Disappointed' }] },
      ],
    },
    {
      label: 'Fearful',
      children: [
        { label: 'Scared', children: [{ label: 'Helpless' }, { label: 'Frightened' }] },
        { label: 'Anxious', children: [{ label: 'Overwhelmed' }, { label: 'Worried' }] },
        { label: 'Insecure', children: [{ label: 'Inadequate' }, { label: 'Inferior' }] },
        { label: 'Rejected', children: [{ label: 'Excluded' }, { label: 'Persecuted' }] },
      ],
    },
    {
      label: 'Surprised',
      children: [
        { label: 'Excited', children: [{ label: 'Eager' }, { label: 'Energetic' }] },
        { label: 'Amazed', children: [{ label: 'Awe' }, { label: 'Astonished' }] },
        { label: 'Confused', children: [{ label: 'Perplexed' }, { label: 'Disillusioned' }] },
        { label: 'Startled', children: [{ label: 'Shocked' }, { label: 'Dismayed' }] },
      ],
    },
    {
      label: 'Disgusted',
      children: [
        { label: 'Disapproving', children: [{ label: 'Judgmental' }, { label: 'Embarrassed' }] },
        { label: 'Disappointed', children: [{ label: 'Appalled' }, { label: 'Revolted' }] },
        { label: 'Awful', children: [{ label: 'Nauseated' }, { label: 'Detestable' }] },
        { label: 'Repelled', children: [{ label: 'Horrified' }, { label: 'Hesitant' }] },
      ],
    },
  ],
  review_needed: [
    {
      field_key: 'primary',
      extracted_text: 'Happy, Sad, Angry, Fearful, Surprised, Disgusted (6 primary emotions)',
      notes:
        'Confirm the exact primary/secondary/tertiary emotion terms and structure against the attached feelings wheel. '
        + 'This is candidate data only.',
    },
  ],
};
