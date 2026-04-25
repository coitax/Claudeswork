const SRS = (() => {
  function getDefaultCard() {
    return {
      interval: 0,
      repetition: 0,
      ease: 2.5,
      due: null,
      lastReview: null
    };
  }

  function review(card, quality) {
    const now = Date.now();
    const updated = { ...card, lastReview: now };

    if (quality >= 3) {
      if (updated.repetition === 0) {
        updated.interval = 1;
      } else if (updated.repetition === 1) {
        updated.interval = 3;
      } else {
        updated.interval = Math.round(updated.interval * updated.ease);
      }
      updated.repetition += 1;
    } else {
      updated.repetition = 0;
      updated.interval = 1;
    }

    updated.ease += 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
    if (updated.ease < 1.3) updated.ease = 1.3;

    updated.due = now + updated.interval * 86400000;
    return updated;
  }

  function isDue(card) {
    if (!card.due) return true;
    return Date.now() >= card.due;
  }

  function getDueCards(srsData) {
    return Object.entries(srsData)
      .filter(([, card]) => isDue(card))
      .map(([word, card]) => ({ word, ...card }));
  }

  function initWord(srsData, word) {
    if (!srsData[word]) {
      srsData[word] = getDefaultCard();
    }
    return srsData;
  }

  function qualityFromButton(label) {
    switch (label) {
      case 'again': return 1;
      case 'hard': return 2;
      case 'good': return 3;
      case 'easy': return 5;
      default: return 3;
    }
  }

  return { getDefaultCard, review, isDue, getDueCards, initWord, qualityFromButton };
})();
