const App = (() => {
  let curriculum = null;
  let vocabData = null;
  let dialogueData = null;
  let achievementDefs = null;
  let player = null;

  let currentWorldId = null;
  let currentLevelIdx = null;
  let currentExerciseIdx = 0;
  let exerciseResults = { correct: 0, total: 0 };
  let previousScreen = 'screen-world-map';

  async function init() {
    try {
      const [curRes, vocRes, diaRes, achRes] = await Promise.all([
        fetch('data/curriculum.json').then((r) => r.json()),
        fetch('data/vocabulary.json').then((r) => r.json()),
        fetch('data/dialogues.json').then((r) => r.json()),
        fetch('data/achievements.json').then((r) => r.json())
      ]);
      curriculum = curRes;
      vocabData = vocRes;
      dialogueData = diaRes;
      achievementDefs = achRes.achievements;
      Exercises.setData(vocabData, dialogueData);
    } catch (e) {
      console.error('Failed to load game data:', e);
      return;
    }

    player = Storage.getPlayer();
    bindEvents();

    if (player) {
      UI.el('btn-continue').style.display = 'block';
      const dueCards = SRS.getDueCards(Storage.getSRS());
      if (dueCards.length > 0) UI.el('btn-daily-review').style.display = 'block';
    }

    UI.show('screen-title', 'anim-fade-in');

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  function bindEvents() {
    UI.el('btn-new-game').addEventListener('click', () => {
      Audio8Bit.select();
      UI.show('screen-new-game', 'anim-slide-in');
    });

    UI.el('btn-continue').addEventListener('click', () => {
      Audio8Bit.select();
      enterWorldMap();
    });

    UI.el('btn-daily-review').addEventListener('click', () => {
      Audio8Bit.select();
      startDailyReview();
    });

    UI.el('btn-start-adventure').addEventListener('click', () => {
      const name = UI.el('player-name').value.trim();
      if (!name) return;
      Audio8Bit.select();
      player = Game.createPlayer(name);
      Storage.savePlayer(player);
      enterWorldMap();
    });

    UI.el('player-name').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') UI.el('btn-start-adventure').click();
    });

    UI.el('btn-character').addEventListener('click', () => {
      Audio8Bit.select();
      previousScreen = 'screen-world-map';
      showCharacterScreen();
    });

    UI.el('btn-achievements').addEventListener('click', () => {
      Audio8Bit.select();
      previousScreen = 'screen-world-map';
      showAchievementsScreen();
    });

    UI.el('btn-sound-toggle').addEventListener('click', () => {
      const muted = Audio8Bit.toggleMute();
      UI.el('btn-sound-toggle').textContent = muted ? '♪' : '♫';
      UI.el('btn-sound-toggle').style.opacity = muted ? '0.5' : '1';
    });

    UI.el('btn-back-map').addEventListener('click', () => {
      Audio8Bit.select();
      enterWorldMap();
    });

    UI.el('btn-back-from-char').addEventListener('click', () => {
      Audio8Bit.select();
      UI.show(previousScreen, 'anim-slide-back');
    });

    UI.el('btn-back-from-achievements').addEventListener('click', () => {
      Audio8Bit.select();
      UI.show(previousScreen, 'anim-slide-back');
    });

    UI.el('btn-exit-exercise').addEventListener('click', () => {
      Audio8Bit.select();
      enterLevelSelect(currentWorldId);
    });

    UI.el('btn-exit-review').addEventListener('click', () => {
      Audio8Bit.select();
      enterWorldMap();
    });

    UI.el('btn-results-continue').addEventListener('click', () => {
      Audio8Bit.select();
      enterLevelSelect(currentWorldId);
    });

    UI.el('btn-results-retry').addEventListener('click', () => {
      Audio8Bit.select();
      startLevel(currentWorldId, currentLevelIdx);
    });
  }

  function enterWorldMap() {
    UI.show('screen-world-map', 'anim-slide-in');
    UI.updateHUD(player);
    renderWorldMap();
    const streak = Game.getStreak();
    UI.showStreak(streak);
  }

  function renderWorldMap() {
    const container = UI.el('world-map');
    UI.clear(container);

    curriculum.worlds.forEach((world) => {
      const unlocked = Game.isWorldUnlocked(player, world.id, curriculum.worlds);
      const progress = player.worldProgress[world.id] || 0;
      const totalLevels = world.levels.length;
      const completed = progress >= totalLevels;

      const node = UI.create('div', 'world-node' + (unlocked ? '' : ' locked') + (completed ? ' completed' : '') + (!completed && unlocked ? ' current' : ''));

      if (!unlocked) {
        const lock = UI.create('span', 'world-lock-label', '🔒');
        node.appendChild(lock);
      }

      node.appendChild(UI.create('div', 'world-icon', world.icon || '🌍'));
      node.appendChild(UI.create('div', 'world-name', world.name));
      node.appendChild(UI.create('div', 'world-desc', world.description));
      node.appendChild(UI.create('div', 'world-progress', progress + '/' + totalLevels + ' complete'));

      if (unlocked) {
        node.addEventListener('click', () => {
          Audio8Bit.select();
          enterLevelSelect(world.id);
        });
      }

      container.appendChild(node);
    });
  }

  function enterLevelSelect(worldId) {
    currentWorldId = worldId;
    const world = curriculum.worlds.find((w) => w.id === worldId);
    if (!world) return;

    UI.el('hud-world-name').textContent = world.name;
    UI.el('hud-hearts').textContent = UI.renderHearts(player.hearts, player.maxHearts);
    UI.show('screen-level-select', 'anim-slide-in');

    const grid = UI.el('level-grid');
    UI.clear(grid);

    world.levels.forEach((level, idx) => {
      const unlocked = Game.isLevelUnlocked(player, worldId, idx, world.levels);
      const completed = Game.isLevelCompleted(player, worldId, level.id);
      const stars = Game.getLevelStars(player, worldId, level.id);
      const isBoss = level.isBoss;
      const isCurrent = unlocked && !completed;

      const node = UI.create('div', 'level-node' +
        (isBoss ? ' boss' : '') +
        (unlocked ? '' : ' locked') +
        (completed ? ' completed' : '') +
        (isCurrent ? ' current' : ''));

      if (isBoss) {
        node.appendChild(UI.create('span', 'boss-icon', '⚔'));
        const info = UI.create('div');
        info.appendChild(UI.create('div', 'boss-name', level.name));
        if (completed) {
          info.appendChild(UI.create('div', 'level-stars', renderStarString(stars)));
        }
        node.appendChild(info);
      } else {
        node.appendChild(UI.create('div', 'level-number', String(idx + 1)));
        if (completed) {
          node.appendChild(UI.create('div', 'level-stars', renderStarString(stars)));
        } else {
          node.appendChild(UI.create('div', 'level-name', level.name));
        }
      }

      if (unlocked) {
        node.addEventListener('click', () => {
          Audio8Bit.select();
          startLevel(worldId, idx);
        });
      }

      grid.appendChild(node);
    });
  }

  function renderStarString(count) {
    let s = '';
    for (let i = 0; i < 3; i++) s += i < count ? '★' : '☆';
    return s;
  }

  function startLevel(worldId, levelIdx) {
    currentWorldId = worldId;
    currentLevelIdx = levelIdx;
    currentExerciseIdx = 0;
    exerciseResults = { correct: 0, total: 0 };

    const world = curriculum.worlds.find((w) => w.id === worldId);
    const level = world.levels[levelIdx];

    Game.restoreHearts(player);
    UI.show('screen-exercise', 'anim-slide-in');
    UI.updateExerciseHearts(player);
    UI.updateExerciseProgress(0, level.isBoss ? 1 : level.exercises.length);

    if (level.isBoss) {
      startBossLevel(world, level);
    } else {
      runNextExercise(world, level);
    }
  }

  function startBossLevel(world, level) {
    const allVocab = level.vocab || [];
    const bossWords = allVocab.slice(0, 8);

    const fillSentences = [];
    const translateItems = [];

    world.levels.forEach((lv) => {
      if (lv.isBoss) return;
      (lv.exercises || []).forEach((ex) => {
        if (ex.type === 'fill-blank' && ex.sentences) {
          fillSentences.push(...ex.sentences);
        }
        if (ex.type === 'translate' && ex.items) {
          translateItems.push(...ex.items);
        }
      });
    });

    const shuffledFill = fillSentences.sort(() => Math.random() - 0.5).slice(0, 3);
    const shuffledTranslate = translateItems.sort(() => Math.random() - 0.5).slice(0, 2);

    Exercises.renderBoss(
      UI.el('exercise-area'),
      bossWords,
      {},
      { sentences: shuffledFill },
      { items: shuffledTranslate },
      level.timeLimit || 120,
      (results) => {
        exerciseResults.correct += results.correct;
        exerciseResults.total += results.total;
        finishLevel(true);
      }
    );
  }

  function runNextExercise(world, level) {
    if (currentExerciseIdx >= level.exercises.length) {
      finishLevel(false);
      return;
    }

    if (player.hearts <= 0) {
      finishLevel(false);
      return;
    }

    UI.updateExerciseProgress(currentExerciseIdx, level.exercises.length);
    const ex = level.exercises[currentExerciseIdx];
    const area = UI.el('exercise-area');

    const onExComplete = (results) => {
      exerciseResults.correct += results.correct;
      exerciseResults.total += results.total;

      const missed = results.total - results.correct;
      for (let i = 0; i < missed; i++) {
        Game.loseHeart(player);
      }
      UI.updateExerciseHearts(player);

      currentExerciseIdx++;
      runNextExercise(world, level);
    };

    switch (ex.type) {
      case 'flashcard':
        Exercises.renderFlashcard(area, ex.items || ex.words || [], onExComplete);
        break;
      case 'match':
        Exercises.renderMatch(area, ex.words || [], onExComplete);
        break;
      case 'fill-blank':
        Exercises.renderFillBlank(area, ex, level.vocab || [], onExComplete);
        break;
      case 'dialogue':
        Exercises.renderDialogue(area, ex.scene, onExComplete);
        break;
      case 'translate':
        Exercises.renderTranslate(area, ex, onExComplete);
        break;
      default:
        currentExerciseIdx++;
        runNextExercise(world, level);
    }
  }

  function finishLevel(isBoss) {
    const world = curriculum.worlds.find((w) => w.id === currentWorldId);
    const level = world.levels[currentLevelIdx];
    const stars = Game.calculateStars(exerciseResults.correct, exerciseResults.total);
    const xp = Game.calculateXP(exerciseResults.correct, exerciseResults.total, isBoss);

    Game.completeLevel(player, currentWorldId, level.id, stars);
    const xpResult = Game.awardXP(player, xp);

    // Award stats based on exercise types
    const statAmount = Math.ceil(exerciseResults.correct / 2);
    Game.awardStat(player, 'vocabulario', statAmount);
    Game.awardStat(player, 'gramatica', Math.ceil(statAmount * 0.8));
    Game.awardStat(player, 'conversacion', Math.ceil(statAmount * 0.6));
    Game.awardStat(player, 'escucha', Math.ceil(statAmount * 0.4));

    // Add vocab to SRS
    const srsData = Storage.getSRS();
    (level.vocab || []).forEach((word) => SRS.initWord(srsData, word));
    Storage.saveSRS(srsData);

    // Update streak
    Game.updateStreak();

    // Check achievements
    checkAchievements(isBoss);

    showResults(stars, xp, xpResult);
  }

  function showResults(stars, xp, xpResult) {
    UI.show('screen-results', 'anim-fade-in');

    const title = UI.el('results-title');
    if (exerciseResults.total === 0 || stars === 0) {
      title.textContent = 'TIME\'S UP!';
    } else if (stars === 3) {
      title.textContent = 'PERFECT!';
    } else {
      title.textContent = 'LEVEL COMPLETE!';
    }

    UI.el('results-stars').textContent = renderStarString(stars);

    const stats = UI.el('results-stats');
    stats.innerHTML =
      'Correct: ' + exerciseResults.correct + '/' + exerciseResults.total + '<br>' +
      'Accuracy: ' + (exerciseResults.total > 0 ? Math.round(exerciseResults.correct / exerciseResults.total * 100) : 0) + '%';

    UI.animateXP(UI.el('results-xp'), xp);

    if (xpResult.leveledUp) {
      Audio8Bit.levelUp();
      setTimeout(() => {
        const lvlUp = UI.create('div', 'exercise-feedback correct anim-pop-in');
        lvlUp.textContent = '⬆ LEVEL UP! You are now level ' + xpResult.newLevel + '!';
        UI.el('results-stats').after(lvlUp);
      }, 600);
    } else {
      Audio8Bit.correct();
    }
  }

  function checkAchievements(wasBoss) {
    if (!achievementDefs) return;
    const unlocked = Storage.getAchievements();
    const newUnlocks = [];
    const streak = Game.getStreak();
    const srsData = Storage.getSRS();
    const masteredCount = Object.values(srsData).filter((c) => c.repetition >= 3).length;
    const completedLevels = Object.keys(player.completedLevels).length;
    const threeStarCount = Object.values(player.completedLevels).filter((s) => s >= 3).length;
    const bossCount = Object.keys(player.completedLevels).filter((k) => k.endsWith('-8')).length;
    const reviewCount = Storage.get('review_count', 0);

    achievementDefs.forEach((ach) => {
      if (unlocked.includes(ach.id)) return;
      let earned = false;
      const c = ach.condition;

      switch (c.type) {
        case 'levels_completed': earned = completedLevels >= c.count; break;
        case 'three_stars': earned = threeStarCount >= c.count; break;
        case 'streak': earned = streak.count >= c.count; break;
        case 'vocab_mastered': earned = masteredCount >= c.count; break;
        case 'bosses_defeated': earned = bossCount >= c.count; break;
        case 'world_complete':
          earned = (player.worldProgress[c.world] || 0) >= 8;
          break;
        case 'player_level': earned = player.level >= c.count; break;
        case 'total_xp': earned = player.xp >= c.count; break;
        case 'reviews_completed': earned = reviewCount >= c.count; break;
      }

      if (earned) {
        unlocked.push(ach.id);
        newUnlocks.push(ach);
      }
    });

    if (newUnlocks.length > 0) {
      Storage.saveAchievements(unlocked);
      newUnlocks.forEach((ach) => {
        Audio8Bit.achievement();
        setTimeout(() => {
          showAchievementPopup(ach);
        }, 300);
      });
    }
  }

  function showAchievementPopup(ach) {
    const popup = UI.create('div', 'exercise-feedback correct anim-pop-in');
    popup.style.position = 'fixed';
    popup.style.bottom = '2rem';
    popup.style.left = '50%';
    popup.style.transform = 'translateX(-50%)';
    popup.style.zIndex = '1000';
    popup.style.padding = '1rem 1.5rem';
    popup.textContent = ach.icon + ' Achievement: ' + ach.name + '!';
    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), 3000);
  }

  function showCharacterScreen() {
    UI.show('screen-character', 'anim-slide-in');
    UI.el('char-name').textContent = player.name;
    UI.el('char-level').textContent = 'LEVEL ' + player.level;
    UI.el('char-xp-fill').style.width = (Game.getXPProgress(player) * 100) + '%';

    const currentXP = player.xp - Game.getXPForLevel(player.level);
    const needed = Game.getXPForNextLevel(player.level) - Game.getXPForLevel(player.level);
    UI.el('char-xp-text').textContent = currentXP + ' / ' + needed + ' XP';

    const grid = UI.el('stats-grid');
    UI.clear(grid);

    const statColors = {
      vocabulario: 'var(--gold)',
      gramatica: 'var(--blue)',
      conversacion: 'var(--green)',
      escucha: 'var(--purple)'
    };

    const statLabels = {
      vocabulario: 'Vocabulario',
      gramatica: 'Gramática',
      conversacion: 'Conversación',
      escucha: 'Escucha'
    };

    Object.entries(player.stats).forEach(([key, val]) => {
      const box = UI.create('div', 'stat-box');
      box.appendChild(UI.create('div', 'stat-name', statLabels[key] || key));
      box.appendChild(UI.create('div', 'stat-value', String(val)));
      const bar = UI.create('div', 'stat-bar');
      const fill = UI.create('div', 'stat-bar-fill');
      fill.style.width = Math.min(val / 5, 100) + '%';
      fill.style.background = statColors[key] || 'var(--white)';
      bar.appendChild(fill);
      box.appendChild(bar);
      grid.appendChild(box);
    });

    const abilitiesList = UI.el('abilities-list');
    const heading = abilitiesList.querySelector('.retro-subheading');
    UI.clear(abilitiesList);
    abilitiesList.appendChild(heading || UI.create('h3', 'retro-subheading', 'ABILITIES'));

    Game.getAllAbilities().forEach((ab) => {
      const unlocked = player.level >= ab.level;
      const item = UI.create('div', 'ability-item' + (unlocked ? '' : ' locked'));
      item.appendChild(UI.create('span', 'ability-icon', ab.icon));
      const info = UI.create('div', 'ability-info');
      info.appendChild(UI.create('div', 'ability-name', ab.name + (unlocked ? '' : ' (Lv ' + ab.level + ')')));
      info.appendChild(UI.create('div', 'ability-desc', ab.desc));
      item.appendChild(info);
      abilitiesList.appendChild(item);
    });
  }

  function showAchievementsScreen() {
    UI.show('screen-achievements', 'anim-slide-in');
    const trophyCase = UI.el('trophy-case');
    UI.clear(trophyCase);

    if (!achievementDefs) return;
    const unlockedIds = Storage.getAchievements();

    achievementDefs.forEach((ach) => {
      const isUnlocked = unlockedIds.includes(ach.id);
      const item = UI.create('div', 'trophy-item' + (isUnlocked ? ' unlocked' : ''));
      item.appendChild(UI.create('div', 'trophy-icon', isUnlocked ? ach.icon : '🔒'));
      item.appendChild(UI.create('div', 'trophy-name', ach.name));
      item.appendChild(UI.create('div', 'trophy-desc', isUnlocked ? ach.desc : '???'));
      trophyCase.appendChild(item);
    });
  }

  function startDailyReview() {
    const srsData = Storage.getSRS();
    const dueCards = SRS.getDueCards(srsData);

    if (dueCards.length === 0) {
      enterWorldMap();
      return;
    }

    UI.show('screen-review', 'anim-slide-in');
    UI.el('review-count').textContent = dueCards.length + ' cards due';

    const words = dueCards.map((c) => c.word);
    Exercises.renderFlashcard(UI.el('review-area'), words, () => {
      const count = Storage.get('review_count', 0);
      Storage.set('review_count', count + 1);
      Game.updateStreak();
      Game.awardXP(player, words.length * 5);
      checkAchievements(false);
      enterWorldMap();
    });
  }

  document.addEventListener('DOMContentLoaded', init);

  return { init };
})();
