const Storage = (() => {
  const PREFIX = 'sq_';

  // Per-language namespace for progress data (player, SRS, review count).
  // Spanish ('es') keeps un-prefixed keys so existing saves keep working.
  let ns = '';

  function setNamespace(packId) {
    ns = !packId || packId === 'es' ? '' : packId + '_';
  }

  function nsKey(key) {
    return ns + key;
  }

  function get(key, fallback) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw !== null ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      // storage full or unavailable
    }
  }

  function remove(key) {
    localStorage.removeItem(PREFIX + key);
  }

  function getPlayer() {
    return get(ns + 'player', null);
  }

  function savePlayer(player) {
    set(ns + 'player', player);
  }

  function getSRS() {
    return get(ns + 'srs', {});
  }

  function saveSRS(srsData) {
    set(ns + 'srs', srsData);
  }

  function getStreak() {
    return get('streak', { count: 0, lastDate: null });
  }

  function saveStreak(streak) {
    set('streak', streak);
  }

  function getAchievements() {
    return get('achievements', []);
  }

  function saveAchievements(ids) {
    set('achievements', ids);
  }

  function clearAll() {
    Object.keys(localStorage).forEach((k) => {
      if (k.startsWith(PREFIX)) localStorage.removeItem(k);
    });
  }

  return { get, set, remove, setNamespace, nsKey, getPlayer, savePlayer, getSRS, saveSRS, getStreak, saveStreak, getAchievements, saveAchievements, clearAll };
})();
