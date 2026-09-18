const App = (() => {
  let curriculum = null;
  let vocabData = null;
  let dialogueData = null;
  let achievementDefs = null;
  let activePack = null;
  let player = null;

  let currentWorldId = null;
  let currentLevelIdx = null;
  let currentExerciseIdx = 0;
  let exerciseResults = { correct: 0, total: 0 };
  let streetResults = { correct: 0, total: 0 };
  let previousScreen = 'screen-world-map';

  const NPC_NAMES = ['María', 'Diego', 'Lucía', 'Carlos', 'Sofía', 'Miguel', 'Elena', 'Pablo'];

  function primeVoice() {
    if (typeof Voice !== 'undefined') Voice.prime();
  }

  async function init() {
    try {
      const [pack, achRes] = await Promise.all([
        LangPack.load(LangPack.getActiveId()),
        fetch('data/achievements.json').then((r) => r.json())
      ]);
      activePack = pack;
      curriculum = pack.curriculum;
      vocabData = pack.vocabulary;
      dialogueData = pack.dialogues;
      achievementDefs = achRes.achievements;
      Storage.setNamespace(pack.manifest.id);
      Exercises.setData(vocabData, dialogueData);
      if (typeof Voice !== 'undefined') {
        Voice.setLocales(pack.manifest.sttLocale, pack.manifest.ttsLocale);
      }
    } catch (e) {
      console.error('Failed to load game data:', e);
      return;
    }

    player = Storage.getPlayer();
    bindEvents();

    if (player) {
      UI.el('btn-continue').style.display = 'block';
      UI.el('btn-street').style.display = 'block';
      UI.el('btn-charla').style.display = 'block';
      UI.el('btn-arcade').style.display = 'block';
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
      primeVoice();
      UI.show('screen-new-game', 'anim-slide-in');
    });

    UI.el('btn-continue').addEventListener('click', () => {
      Audio8Bit.select();
      primeVoice();
      enterWorldMap();
    });

    UI.el('btn-street').addEventListener('click', () => {
      Audio8Bit.select();
      primeVoice();
      startStreetMode();
    });

    UI.el('btn-arcade').addEventListener('click', () => {
      Audio8Bit.select();
      primeVoice();
      startArcade();
    });

    UI.el('btn-charla').addEventListener('click', () => {
      Audio8Bit.select();
      primeVoice();
      showCharlaSelect();
    });

    UI.el('btn-back-from-charla-select').addEventListener('click', () => {
      Audio8Bit.select();
      UI.show('screen-title', 'anim-slide-back');
    });

    UI.el('btn-exit-charla').addEventListener('click', () => {
      Audio8Bit.select();
      Exercises.cancelActive();
      if (typeof Voice !== 'undefined') Voice.stop();
      showCharlaSelect();
    });

    UI.el('btn-language').addEventListener('click', () => {
      Audio8Bit.select();
      showLanguageScreen();
    });

    UI.el('language-back-btn').addEventListener('click', () => {
      Audio8Bit.select();
      UI.show('screen-title', 'anim-slide-back');
    });

    UI.el('language-import-btn').addEventListener('click', () => {
      Audio8Bit.select();
      UI.show('screen-import', 'anim-slide-in');
      Importer.render(UI.el('import-container'), {
        onDone: (packId) => {
          LangPack.setActiveId(packId);
          location.reload();
        },
        onCancel: () => showLanguageScreen()
      });
    });

    UI.el('btn-exit-street').addEventListener('click', () => {
      Audio8Bit.select();
      Exercises.cancelActive();
      Adventure.stop();
      if (typeof Voice !== 'undefined') Voice.stop();
      UI.el('street-encounter').classList.remove('active');
      enterWorldMap();
    });

    UI.el('btn-exit-arcade').addEventListener('click', () => {
      Audio8Bit.select();
      WordBlocks.stop();
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
      Exercises.cancelActive();
      enterLevelSelect(currentWorldId);
    });

    UI.el('btn-exit-review').addEventListener('click', () => {
      Audio8Bit.select();
      Exercises.cancelActive();
      enterWorldMap();
    });

    UI.el('btn-results-continue').addEventListener('click', () => {
      Audio8Bit.select();
      if (currentWorldId) enterLevelSelect(currentWorldId);
      else enterWorldMap();
    });

    UI.el('btn-results-retry').addEventListener('click', () => {
      Audio8Bit.select();
      if (currentWorldId !== null && currentLevelIdx !== null) {
        startLevel(currentWorldId, currentLevelIdx);
      } else {
        enterWorldMap();
      }
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

      const iconWrap = UI.create('div', 'world-icon');
      if (['plaza', 'mercado', 'ciudad', 'viaje', 'fiesta'].includes(world.id)) {
        const img = document.createElement('img');
        img.className = 'world-icon-img';
        img.alt = '';
        img.src = 'assets/sprites/world/' + world.id + '.png';
        img.addEventListener('error', () => { img.remove(); iconWrap.textContent = world.icon || '🌍'; });
        iconWrap.appendChild(img);
      } else {
        iconWrap.textContent = world.icon || '🌍';
      }
      node.appendChild(iconWrap);
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
    let stars = Game.calculateStars(exerciseResults.correct, exerciseResults.total);
    if (!isBoss && player.hearts <= 0) stars = 0;

    let xp = 0;
    let xpResult = { leveledUp: false, newLevel: player.level, oldLevel: player.level };

    // Failed runs (0 stars) earn nothing — no completion, XP, stats or SRS
    if (stars > 0) {
      xp = Game.calculateXP(exerciseResults.correct, exerciseResults.total, isBoss);

      Game.completeLevel(player, currentWorldId, level.id, stars);
      xpResult = Game.awardXP(player, xp);

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

      // Only successful runs count toward the daily streak
      Game.updateStreak();
    }

    // Check achievements
    checkAchievements(isBoss);

    showResults(stars, xp, xpResult);
  }

  function showResults(stars, xp, xpResult) {
    UI.show('screen-results', 'anim-fade-in');

    const title = UI.el('results-title');
    if (exerciseResults.total === 0 || stars === 0) {
      title.textContent = player && player.hearts <= 0 ? 'OUT OF HEARTS!' : 'TRY AGAIN!';
    } else if (stars === 3) {
      title.textContent = 'PERFECT!';
    } else {
      title.textContent = 'LEVEL COMPLETE!';
    }

    UI.el('results-stars').textContent = renderStarString(stars);
    UI.el('results-medal').style.display = stars === 3 ? 'inline-block' : 'none';

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

    // Count defeated bosses from the curriculum, not from level-id shape
    let bossCount = 0;
    curriculum.worlds.forEach((w) => {
      w.levels.forEach((lv) => {
        if (lv.isBoss && (player.completedLevels[w.id + ':' + lv.id] || 0) > 0) bossCount++;
      });
    });

    const reviewCount = Storage.get(Storage.nsKey('review_count'), 0);

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
        case 'world_complete': {
          const targetWorld = curriculum.worlds.find((w) => w.id === c.world);
          earned = !!targetWorld && (player.worldProgress[c.world] || 0) >= targetWorld.levels.length;
          break;
        }
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
      const count = Storage.get(Storage.nsKey('review_count'), 0);
      Storage.set(Storage.nsKey('review_count'), count + 1);
      Game.updateStreak();
      Game.awardXP(player, words.length * 5);
      checkAchievements(false);
      enterWorldMap();
    });
  }

  document.addEventListener('DOMContentLoaded', init);

  // ---------- Street Mode (Adventure) ----------

  function getStreetWorld() {
    let target = curriculum.worlds[0];
    curriculum.worlds.forEach((w) => {
      if (Game.isWorldUnlocked(player, w.id, curriculum.worlds)) target = w;
    });
    return target;
  }

  function startStreetMode() {
    if (!player) {
      UI.show('screen-new-game', 'anim-slide-in');
      return;
    }
    const world = getStreetWorld();
    currentWorldId = world.id;
    currentLevelIdx = null;
    streetResults = { correct: 0, total: 0 };
    Game.restoreHearts(player);
    UI.el('street-encounter').classList.remove('active');
    UI.show('screen-street', 'anim-fade-in');

    const npcs = world.levels
      .filter((lv) => !lv.isBoss)
      .map((lv, i) => ({
        id: lv.id,
        name: NPC_NAMES[i % NPC_NAMES.length],
        spriteSeed: i + 1,
        level: lv
      }));

    requestAnimationFrame(() => {
      Adventure.start(UI.el('street-canvas'), {
        npcs,
        onEncounter: onStreetEncounter,
        onComplete: onStreetComplete,
        getHearts: () => ({ current: player.hearts, max: player.maxHearts })
      });
    });
  }

  function onStreetEncounter(npc, done) {
    const overlay = UI.el('street-encounter');
    const content = UI.el('street-encounter-content');
    UI.clear(content);
    overlay.classList.add('active');

    const level = npc.level;
    const dlgEx = (level.exercises || []).find((ex) => ex.type === 'dialogue' && dialogueData[ex.scene]);

    const finish = (results) => {
      streetResults.correct += results.correct;
      streetResults.total += results.total;
      const missed = results.total - results.correct;
      for (let i = 0; i < missed; i++) Game.loseHeart(player);

      overlay.classList.remove('active');
      if (typeof Voice !== 'undefined') Voice.stop();

      if (player.hearts <= 0) {
        Adventure.stop();
        finishStreet(false);
        return;
      }
      const success = results.total === 0 || results.correct / results.total >= 0.5;
      done(success);
    };

    if (dlgEx) {
      Exercises.renderDialogue(content, dlgEx.scene, finish);
    } else {
      Exercises.renderMatch(content, (level.vocab || []).slice(0, 5), finish);
    }
  }

  function onStreetComplete() {
    Adventure.stop();
    finishStreet(true);
  }

  function finishStreet(finished) {
    const stars = finished ? Game.calculateStars(streetResults.correct, streetResults.total) : 0;
    const xp = stars > 0 ? Game.calculateXP(streetResults.correct, streetResults.total, false) + 25 : 0;
    let xpResult = { leveledUp: false, newLevel: player.level, oldLevel: player.level };
    if (stars > 0) {
      xpResult = Game.awardXP(player, xp);
      Game.awardStat(player, 'conversacion', Math.ceil(streetResults.correct / 2));
      Game.awardStat(player, 'escucha', Math.ceil(streetResults.correct / 3));
      Game.updateStreak();
      checkAchievements(false);
    }
    Storage.savePlayer(player);
    exerciseResults = streetResults;
    showResults(stars, xp, xpResult);
  }

  // ---------- Word Blocks (Arcade) ----------

  function buildArcadePool() {
    const seen = {};
    const pool = [];
    const push = (w) => {
      if (!w || seen[w]) return;
      seen[w] = true;
      const entry = vocabData[w];
      if (entry) pool.push({ word: w.replace(/_/g, ' '), en: entry.en });
    };

    SRS.getDueCards(Storage.getSRS()).forEach((c) => push(c.word));

    if (pool.length < 12) {
      outer:
      for (const world of curriculum.worlds) {
        if (!Game.isWorldUnlocked(player, world.id, curriculum.worlds)) break;
        for (const lv of world.levels) {
          for (const w of lv.vocab || []) {
            push(w);
            if (pool.length >= 20) break outer;
          }
        }
      }
    }
    return pool.slice(0, 20);
  }

  function startArcade() {
    if (!player) {
      UI.show('screen-new-game', 'anim-slide-in');
      return;
    }
    const pool = buildArcadePool();
    if (pool.length < 4) {
      enterWorldMap();
      return;
    }
    currentWorldId = null;
    currentLevelIdx = null;
    UI.show('screen-arcade', 'anim-slide-in');
    WordBlocks.start(UI.el('wb-arena'), { words: pool, onComplete: onArcadeComplete });
  }

  function onArcadeComplete(results) {
    WordBlocks.stop();
    const xp = results.cleared * 5 + Math.max(0, results.maxCombo - 1) * 10;
    let xpResult = { leveledUp: false, newLevel: player.level, oldLevel: player.level };
    if (xp > 0) {
      xpResult = Game.awardXP(player, xp);
      Game.awardStat(player, 'vocabulario', Math.ceil(results.cleared / 4));
      Game.updateStreak();
      checkAchievements(false);
    }
    Storage.savePlayer(player);
    exerciseResults = { correct: results.correct, total: Math.max(results.total, 1) };
    const stars = results.cleared >= 20 ? 3 : results.cleared >= 12 ? 2 : results.cleared > 0 ? 1 : 0;
    showResults(stars, xp, xpResult);
  }

  // ---------- Charla (conversation practice) ----------

  function showCharlaSelect() {
    UI.show('screen-charla-select', 'anim-slide-in');
    const list = UI.el('charla-list');
    UI.clear(list);

    const sceneIds = Object.keys(dialogueData);
    if (!sceneIds.length) {
      list.appendChild(UI.create('div', 'charla-empty', 'No conversations in this language pack yet.'));
      return;
    }

    sceneIds.forEach((id) => {
      const scene = dialogueData[id];
      const row = UI.create('div', 'charla-option');
      row.setAttribute('role', 'button');
      row.setAttribute('tabindex', '0');
      const head = UI.create('div', 'charla-option-head');
      head.appendChild(Exercises.npcPortrait(scene.npc));
      head.appendChild(UI.create('div', 'charla-option-npc', scene.npc || '???'));
      row.appendChild(head);
      row.appendChild(UI.create('div', 'charla-option-setting', scene.setting || id));
      const go = () => {
        Audio8Bit.select();
        startCharla(id);
      };
      row.addEventListener('click', go);
      row.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); }
      });
      list.appendChild(row);
    });
  }

  function startCharla(sceneId) {
    const scene = dialogueData[sceneId];
    if (!scene) return;
    currentWorldId = null;
    currentLevelIdx = null;
    UI.el('charla-npc-name').textContent = scene.npc || '';
    UI.show('screen-charla', 'anim-slide-in');
    Exercises.renderDialogue(UI.el('charla-area'), sceneId, (results) => {
      const xp = results.correct * 15 + (results.total > 0 && results.correct === results.total ? 20 : 0);
      let xpResult = { leveledUp: false, newLevel: player.level, oldLevel: player.level };
      if (xp > 0) {
        xpResult = Game.awardXP(player, xp);
        Game.awardStat(player, 'conversacion', results.correct);
        Game.awardStat(player, 'escucha', Math.ceil(results.correct / 2));
        Game.updateStreak();
        checkAchievements(false);
      }
      Storage.savePlayer(player);
      exerciseResults = { correct: results.correct, total: Math.max(results.total, 1) };
      showResults(Game.calculateStars(results.correct, results.total), xp, xpResult);
    });
  }

  // ---------- Language selection ----------

  async function showLanguageScreen() {
    UI.show('screen-language', 'anim-slide-in');
    const listEl = UI.el('language-list');
    UI.clear(listEl);
    const packs = await LangPack.list();
    const activeId = LangPack.getActiveId();

    packs.forEach((p) => {
      const row = UI.create('div', 'lang-option' + (p.id === activeId ? ' active' : ''));
      row.setAttribute('role', 'button');
      row.setAttribute('tabindex', '0');
      row.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          row.click();
        }
      });
      row.appendChild(UI.create('span', 'lang-option-flag', p.flag || '🌍'));
      const name = UI.create('span', 'lang-option-name', p.name);
      name.appendChild(UI.create('span', 'lang-option-native', ' ' + (p.nativeName || '')));
      row.appendChild(name);

      if (p.id === activeId) {
        row.appendChild(UI.create('span', 'lang-option-badge active', 'ACTIVE'));
      } else if (p.imported) {
        row.appendChild(UI.create('span', 'lang-option-badge', 'IMPORTED'));
      }

      if (p.imported) {
        const del = UI.create('button', 'icon-btn small lang-option-delete', '✕');
        del.addEventListener('click', (e) => {
          e.stopPropagation();
          if (!confirm('Delete language pack "' + p.name + '"?')) return;
          LangPack.removeImportedPack(p.id);
          if (LangPack.getActiveId() === p.id) LangPack.setActiveId('es');
          showLanguageScreen();
        });
        row.appendChild(del);
      }

      row.addEventListener('click', () => {
        Audio8Bit.select();
        if (p.id !== activeId) {
          LangPack.setActiveId(p.id);
          location.reload();
        }
      });

      listEl.appendChild(row);
    });
  }

  function getPack() {
    return activePack;
  }

  function getPlayerState() {
    return player;
  }

  return { init, getPack, getPlayerState };
})();
