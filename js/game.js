const Game = (() => {
  const XP_PER_LEVEL = [
    0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200,
    4000, 5000, 6200, 7600, 9200, 11000, 13000, 15500, 18500, 22000,
    26000, 30500, 35500, 41000, 47000, 54000, 62000, 71000, 81000, 92000,
    104000, 117000, 131000, 146000, 163000, 182000, 203000, 226000, 251000, 278000,
    308000, 341000, 377000, 416000, 458000, 504000, 554000, 608000, 666000, 730000
  ];

  const ABILITIES = [
    { level: 5, id: 'hint', name: 'Hint Power', icon: '💡', desc: 'Reveal a hint once per level' },
    { level: 10, id: 'slow_audio', name: 'Slow Audio', icon: '🐢', desc: 'Slow down audio playback' },
    { level: 15, id: 'skip', name: 'Skip Token', icon: '⏭', desc: 'Skip one exercise per level' },
    { level: 20, id: 'double_xp', name: 'Double XP', icon: '✨', desc: 'Earn 2x XP for one level' },
    { level: 30, id: 'shield', name: 'Heart Shield', icon: '🛡', desc: 'Block one heart loss per level' },
    { level: 40, id: 'bonus', name: 'Bonus Round', icon: '🎁', desc: 'Unlock bonus rounds for extra XP' }
  ];

  function createPlayer(name) {
    return {
      name,
      xp: 0,
      level: 1,
      hearts: 5,
      maxHearts: 5,
      stats: { vocabulario: 0, gramatica: 0, conversacion: 0, escucha: 0 },
      worldProgress: {},
      completedLevels: {},
      currentWorld: 'plaza'
    };
  }

  function getLevel(xp) {
    for (let i = XP_PER_LEVEL.length - 1; i >= 0; i--) {
      if (xp >= XP_PER_LEVEL[i]) return i + 1;
    }
    return 1;
  }

  function getXPForLevel(level) {
    return XP_PER_LEVEL[Math.min(level - 1, XP_PER_LEVEL.length - 1)];
  }

  function getXPForNextLevel(level) {
    if (level >= XP_PER_LEVEL.length) return XP_PER_LEVEL[XP_PER_LEVEL.length - 1] + 100000;
    return XP_PER_LEVEL[level];
  }

  function getXPProgress(player) {
    const currentLevelXP = getXPForLevel(player.level);
    const nextLevelXP = getXPForNextLevel(player.level);
    const range = nextLevelXP - currentLevelXP;
    const progress = player.xp - currentLevelXP;
    return range > 0 ? Math.min(progress / range, 1) : 1;
  }

  function awardXP(player, amount) {
    const oldLevel = player.level;
    player.xp += amount;
    player.level = getLevel(player.xp);
    const leveledUp = player.level > oldLevel;
    Storage.savePlayer(player);
    return { leveledUp, newLevel: player.level, oldLevel };
  }

  function awardStat(player, stat, amount) {
    if (player.stats[stat] !== undefined) {
      player.stats[stat] += amount;
    }
    Storage.savePlayer(player);
  }

  function loseHeart(player) {
    player.hearts = Math.max(0, player.hearts - 1);
    Storage.savePlayer(player);
    return player.hearts;
  }

  function restoreHearts(player) {
    player.hearts = player.maxHearts;
    Storage.savePlayer(player);
  }

  function completeLevel(player, worldId, levelId, stars) {
    const key = worldId + ':' + levelId;
    const existing = player.completedLevels[key] || 0;
    player.completedLevels[key] = Math.max(existing, stars);

    if (!player.worldProgress[worldId]) player.worldProgress[worldId] = 0;
    const completedInWorld = Object.keys(player.completedLevels)
      .filter((k) => k.startsWith(worldId + ':')).length;
    player.worldProgress[worldId] = completedInWorld;

    Storage.savePlayer(player);
  }

  function isLevelCompleted(player, worldId, levelId) {
    return (player.completedLevels[worldId + ':' + levelId] || 0) > 0;
  }

  function getLevelStars(player, worldId, levelId) {
    return player.completedLevels[worldId + ':' + levelId] || 0;
  }

  function isWorldUnlocked(player, worldId, worlds) {
    const idx = worlds.findIndex((w) => w.id === worldId);
    if (idx === 0) return true;
    const prevWorld = worlds[idx - 1];
    return (player.worldProgress[prevWorld.id] || 0) >= 7;
  }

  function isLevelUnlocked(player, worldId, levelIndex, levels) {
    if (levelIndex === 0) return true;
    const prevLevel = levels[levelIndex - 1];
    return isLevelCompleted(player, worldId, prevLevel.id);
  }

  function getUnlockedAbilities(player) {
    return ABILITIES.filter((a) => player.level >= a.level);
  }

  function getAllAbilities() {
    return ABILITIES;
  }

  function updateStreak() {
    const streak = Storage.getStreak();
    const today = new Date().toISOString().split('T')[0];

    if (streak.lastDate === today) return streak;

    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (streak.lastDate === yesterday) {
      streak.count += 1;
    } else if (streak.lastDate !== today) {
      streak.count = 1;
    }
    streak.lastDate = today;
    Storage.saveStreak(streak);
    return streak;
  }

  function getStreak() {
    return Storage.getStreak();
  }

  function calculateStars(correctCount, totalCount) {
    const ratio = totalCount > 0 ? correctCount / totalCount : 0;
    if (ratio >= 0.95) return 3;
    if (ratio >= 0.7) return 2;
    if (ratio > 0) return 1;
    return 0;
  }

  function calculateXP(correctCount, totalCount, isBoss) {
    const base = correctCount * 10;
    const bonus = correctCount === totalCount ? 20 : 0;
    const bossMultiplier = isBoss ? 2 : 1;
    return (base + bonus) * bossMultiplier;
  }

  return {
    createPlayer, getLevel, getXPProgress, getXPForLevel, getXPForNextLevel,
    awardXP, awardStat, loseHeart, restoreHearts,
    completeLevel, isLevelCompleted, getLevelStars,
    isWorldUnlocked, isLevelUnlocked,
    getUnlockedAbilities, getAllAbilities,
    updateStreak, getStreak, calculateStars, calculateXP
  };
})();
