import type { FeelingsWheelConfig } from '../types/worksheet-config.js';

/**
 * Feelings Wheel reference (OPTIONAL helper content only).
 *
 * Source: photographed feelings wheel (transcribed from the user's image via
 * OCR, 2026-06). This is the widely-distributed 7-core "Feeling Wheel" (Geoffrey
 * Roberts). The center ring holds 7 core emotions; each expands into secondary
 * and then tertiary feelings.
 *
 * OCR confirmed the large majority of terms (center, secondary, and most
 * tertiary). A few tertiary pairs were not fully legible and are flagged in
 * review_needed. This is reference/support content ONLY: it must NOT replace
 * worksheet wording; the user may always type free-text emotions instead.
 */
export const feelingsWheel: FeelingsWheelConfig = {
  key: 'feelings-wheel-reference',
  version: 2,
  title: 'Feelings Wheel',
  primary: [
    {
      label: 'Happy',
      children: [
        { label: 'Playful', children: [{ label: 'Aroused' }, { label: 'Cheeky' }] },
        { label: 'Content', children: [{ label: 'Free' }, { label: 'Joyful' }] },
        { label: 'Interested', children: [{ label: 'Curious' }, { label: 'Inquisitive' }] },
        { label: 'Proud', children: [{ label: 'Successful' }, { label: 'Confident' }] },
        { label: 'Accepted', children: [{ label: 'Respected' }, { label: 'Valued' }] },
        { label: 'Powerful', children: [{ label: 'Courageous' }, { label: 'Creative' }] },
        { label: 'Peaceful', children: [{ label: 'Loving' }, { label: 'Thankful' }] },
        { label: 'Trusting', children: [{ label: 'Sensitive' }, { label: 'Intimate' }] },
        { label: 'Optimistic', children: [{ label: 'Hopeful' }, { label: 'Inspired' }] },
      ],
    },
    {
      label: 'Sad',
      children: [
        { label: 'Lonely', children: [{ label: 'Isolated' }, { label: 'Abandoned' }] },
        { label: 'Vulnerable', children: [{ label: 'Victimized' }, { label: 'Fragile' }] },
        { label: 'Despair', children: [{ label: 'Grief' }, { label: 'Powerless' }] },
        { label: 'Guilty', children: [{ label: 'Ashamed' }, { label: 'Remorseful' }] },
        { label: 'Depressed', children: [{ label: 'Inferior' }, { label: 'Empty' }] },
        { label: 'Hurt', children: [{ label: 'Embarrassed' }, { label: 'Disappointed' }] },
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
    {
      label: 'Angry',
      children: [
        { label: 'Let down', children: [{ label: 'Betrayed' }, { label: 'Resentful' }] },
        { label: 'Humiliated', children: [{ label: 'Disrespected' }, { label: 'Ridiculed' }] },
        { label: 'Bitter', children: [{ label: 'Indignant' }, { label: 'Violated' }] },
        { label: 'Mad', children: [{ label: 'Furious' }, { label: 'Jealous' }] },
        { label: 'Aggressive', children: [{ label: 'Provoked' }, { label: 'Hostile' }] },
        { label: 'Frustrated', children: [{ label: 'Infuriated' }, { label: 'Annoyed' }] },
        { label: 'Distant', children: [{ label: 'Withdrawn' }, { label: 'Numb' }] },
        { label: 'Critical', children: [{ label: 'Skeptical' }, { label: 'Dismissive' }] },
      ],
    },
    {
      label: 'Fearful',
      children: [
        { label: 'Scared', children: [{ label: 'Helpless' }, { label: 'Frightened' }] },
        { label: 'Anxious', children: [{ label: 'Overwhelmed' }, { label: 'Worried' }] },
        { label: 'Insecure', children: [{ label: 'Inadequate' }, { label: 'Inferior' }] },
        { label: 'Weak', children: [{ label: 'Worthless' }, { label: 'Insignificant' }] },
        { label: 'Rejected', children: [{ label: 'Excluded' }, { label: 'Persecuted' }] },
        { label: 'Threatened', children: [{ label: 'Nervous' }, { label: 'Exposed' }] },
      ],
    },
    {
      label: 'Bad',
      children: [
        { label: 'Bored', children: [{ label: 'Indifferent' }, { label: 'Apathetic' }] },
        { label: 'Busy', children: [{ label: 'Pressured' }, { label: 'Rushed' }] },
        { label: 'Stressed', children: [{ label: 'Overwhelmed' }, { label: 'Out of control' }] },
        { label: 'Tired', children: [{ label: 'Sleepy' }, { label: 'Unfocussed' }] },
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
  ],
  review_needed: [
    {
      field_key: 'bad_tertiary',
      extracted_text:
        'Under "Bad": Bored→(Indifferent, Apathetic), Busy→(Pressured, Rushed), '
        + 'Stressed→(Overwhelmed, Out of control), Tired→(Sleepy, Unfocussed)',
      notes:
        'Some tertiary terms in the "Bad" segment were not fully legible via OCR (only "Bored", '
        + '"Tired", and "Unfocussed" were clearly read). Confirm the full set against the image.',
    },
  ],
};
