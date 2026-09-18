/*
 * LangPack — language pack loader.
 *
 * A pack bundles everything the game needs for one target language:
 *   manifest   { id, name, nativeName, flag, ttsLocale, sttLocale, files }
 *   curriculum { worlds: [...] }            (optional — auto-generated if absent)
 *   vocabulary { word: { en, category, phonetic, example_es, example_en } }
 *   dialogues  { sceneId: {...} }           (optional)
 *
 * Packs come from two places:
 *   - Bundled:  data/packs/<id>/  (listed in data/packs/index.json), fetched.
 *   - Imported: created by the in-game dictionary importer, stored in
 *     localStorage under Storage key 'pack_<id>' as one object
 *     { manifest, curriculum, vocabulary, dialogues }.
 *
 * Imported packs with no hand-authored curriculum get one auto-generated
 * from their vocabulary (see generateCurriculum).
 */
const LangPack = (() => {
  const DEFAULT_ID = 'es';

  function getActiveId() {
    return Storage.get('lang', DEFAULT_ID);
  }

  function setActiveId(id) {
    Storage.set('lang', id);
  }

  function getImportedIds() {
    return Storage.get('imported_packs', []);
  }

  function saveImportedPack(pack) {
    const ids = getImportedIds();
    if (!ids.includes(pack.manifest.id)) {
      ids.push(pack.manifest.id);
      Storage.set('imported_packs', ids);
    }
    Storage.set('pack_' + pack.manifest.id, pack);
  }

  function removeImportedPack(id) {
    Storage.set('imported_packs', getImportedIds().filter((p) => p !== id));
    Storage.remove('pack_' + id);
  }

  async function list() {
    let bundled = [];
    try {
      const res = await fetch('data/packs/index.json');
      bundled = (await res.json()).packs || [];
    } catch {
      bundled = [{ id: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' }];
    }
    const imported = getImportedIds()
      .map((id) => Storage.get('pack_' + id, null))
      .filter(Boolean)
      .map((p) => ({
        id: p.manifest.id,
        name: p.manifest.name,
        nativeName: p.manifest.nativeName || p.manifest.name,
        flag: p.manifest.flag || '🌍',
        imported: true
      }));
    return bundled.concat(imported.filter((i) => !bundled.some((b) => b.id === i.id)));
  }

  async function load(id) {
    id = id || getActiveId();

    // Imported pack takes priority if it exists under this id.
    const stored = Storage.get('pack_' + id, null);
    if (stored && stored.manifest) {
      const pack = {
        manifest: stored.manifest,
        vocabulary: stored.vocabulary || {},
        dialogues: stored.dialogues || {},
        curriculum: stored.curriculum || null
      };
      if (!pack.curriculum || !pack.curriculum.worlds || !pack.curriculum.worlds.length) {
        pack.curriculum = generateCurriculum(pack.manifest, pack.vocabulary);
      }
      return pack;
    }

    // Bundled pack: fetch manifest, then its files.
    const base = 'data/packs/' + id + '/';
    const manifest = await fetch(base + 'pack.json').then((r) => {
      if (!r.ok) throw new Error('Unknown language pack: ' + id);
      return r.json();
    });
    const files = manifest.files || {};
    const [curriculum, vocabulary, dialogues] = await Promise.all([
      files.curriculum ? fetch(base + files.curriculum).then((r) => r.json()) : null,
      files.vocabulary ? fetch(base + files.vocabulary).then((r) => r.json()) : {},
      files.dialogues ? fetch(base + files.dialogues).then((r) => r.json()) : {}
    ]);
    return {
      manifest,
      curriculum: curriculum || generateCurriculum(manifest, vocabulary),
      vocabulary,
      dialogues
    };
  }

  /*
   * Auto-generate a playable curriculum from a bare vocabulary object.
   * Groups words by category (or chunks of 8), builds worlds of up to 7
   * lesson levels plus a boss. Each lesson: flashcards, matching, and a
   * translate round — the exercise types that need no hand-authored
   * sentences or dialogue scenes.
   */
  function generateCurriculum(manifest, vocabulary) {
    const words = Object.keys(vocabulary);
    const byCategory = {};
    words.forEach((w) => {
      const cat = vocabulary[w].category || 'general';
      (byCategory[cat] = byCategory[cat] || []).push(w);
    });

    // Build level-sized groups of ~8 words, keeping categories together.
    const groups = [];
    Object.entries(byCategory).forEach(([cat, ws]) => {
      for (let i = 0; i < ws.length; i += 8) {
        groups.push({ name: prettify(cat), words: ws.slice(i, i + 8) });
      }
    });

    const worlds = [];
    const WORLD_NAMES = ['The Village', 'The Market', 'The City', 'The Journey', 'The Festival', 'The Kingdom', 'The Mountains', 'The Sea'];
    const WORLD_ICONS = ['🏘', '🏪', '🏙', '✈', '🎉', '🏰', '⛰', '🌊'];
    let g = 0, w = 0;
    while (g < groups.length) {
      const levels = [];
      const worldId = 'gen-' + (w + 1);
      const worldWords = [];
      for (let l = 0; l < 7 && g < groups.length; l++, g++) {
        const grp = groups[g];
        worldWords.push(...grp.words);
        levels.push({
          id: worldId + '-' + (l + 1),
          name: grp.name,
          description: 'Learn: ' + grp.name,
          vocab: grp.words,
          exercises: [
            { type: 'flashcard', items: grp.words },
            { type: 'match', words: grp.words.slice(0, 6) },
            {
              type: 'translate',
              items: grp.words.slice(0, 4).map((word) => {
                const answer = word.replace(/_/g, ' ');
                const answerTokens = answer.split(' ');
                const distractors = grp.words
                  .filter((w) => w !== word)
                  .map((w) => w.replace(/_/g, ' ').split(' ')[0])
                  .filter((t, i, a) => !answerTokens.includes(t) && a.indexOf(t) === i)
                  .slice(0, 3);
                return {
                  direction: 'en-es',
                  source: (vocabulary[word] && vocabulary[word].en) || answer,
                  answer: answer,
                  words: answerTokens.concat(distractors)
                };
              })
            }
          ]
        });
      }
      levels.push({
        id: worldId + '-' + (levels.length + 1),
        name: 'BOSS: ' + (WORLD_NAMES[w % WORLD_NAMES.length]) + ' Challenge',
        isBoss: true,
        timeLimit: 120,
        vocab: worldWords.slice(0, 16),
        exercises: []
      });
      worlds.push({
        id: worldId,
        name: WORLD_NAMES[w % WORLD_NAMES.length],
        description: manifest.name + ' — chapter ' + (w + 1),
        icon: WORLD_ICONS[w % WORLD_ICONS.length],
        cefr: 'A1',
        levels
      });
      w++;
    }
    return { worlds };
  }

  function prettify(s) {
    return s.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  return { getActiveId, setActiveId, list, load, saveImportedPack, removeImportedPack, generateCurriculum };
})();
