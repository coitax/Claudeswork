# Spanish Quest — Phase 2 Plan: Arcade Modes, Voice, and Language Packs

## Vision

Spanish Quest v1 is a lesson-driven retro RPG. Phase 2 turns it into a *game
you play* rather than a course you take, adds real speaking practice, and makes
the whole engine language-agnostic so a new language can be added by importing
a plain English→Target dictionary.

Three pillars:

1. **Street Mode (Adventure)** — a Contra-style pixel side-scroller. You walk
   down a Spanish street; when you reach an NPC you must *talk to them* —
   by voice if your browser supports it, by tapping phrases if not. Clearing a
   conversation lets you continue down the street. Each street corresponds to
   a world of the curriculum.
2. **Word Blocks (Arcade)** — a falling-block puzzle. Spanish words drop as
   blocks; tap the matching English tile before the stack tops out. Matched
   pairs clear, missed words come back (spaced re-introduction). Speed ramps.
3. **Voice everywhere** — Web Speech API: Spanish TTS on every word/dialogue
   line (with slow-replay), and speech recognition scoring for dialogue
   responses and pronunciation practice. Zero dependencies, graceful fallback.

Plus: **Language packs** — all Spanish content now lives in `data/packs/es/`.
Any language can be added by dropping a pack folder or importing a dictionary
in-app (stored in localStorage). Progress, SRS, and streaks are namespaced per
language.

## Architecture

```
index.html            app shell: all screens, script tags
js/
  storage.js          localStorage wrapper (+ per-language namespace)   [v1, extended]
  langpack.js         pack registry/loader/curriculum generator         [NEW]
  audio.js            8-bit SFX via Web Audio                           [v1]
  voice.js            TTS + STT + pronunciation scoring                 [NEW]
  srs.js              SM-2 spaced repetition                            [v1]
  game.js             XP/levels/stats/hearts/streaks                    [v1]
  ui.js               screen router + DOM helpers                       [v1]
  exercises.js        5 exercise renderers (+ voice enrichment)         [v1, extended]
  adventure.js        canvas side-scroller engine + NPC encounters      [NEW]
  wordblocks.js       falling-word arcade mode                          [NEW]
  importer.js         dictionary import → language pack                 [NEW]
  app.js              controller: routing, level flow, results          [v1, extended]
data/
  achievements.json   global achievement definitions
  packs/index.json    bundled pack registry
  packs/es/           pack.json, curriculum.json, vocabulary.json, dialogues.json
```

### Module contracts (implementers: these are the interfaces)

**Voice** (`js/voice.js`, IIFE global like all modules)
- `Voice.support()` → `{ tts: bool, stt: bool }`
- `Voice.setLocales(sttLocale, ttsLocale)` — called by app.js on pack load
- `Voice.speak(text, { rate })` → Promise (resolves on end; queues safely;
  iOS-safe: primes voices on first user gesture)
- `Voice.listen({ timeout })` → Promise<{ transcript, confidence, alternatives }>
  (rejects with `{ error }` on no-speech/denied/unsupported)
- `Voice.matchScore(expected, transcript)` → 0..1 — accent-stripped,
  punctuation-stripped normalized similarity; used to grade spoken answers
- `Voice.stop()` — cancel any TTS/STT in flight

**Adventure** (`js/adventure.js`)
- `Adventure.start(canvas, opts)` where opts:
  `{ world, dialogues, vocab, onEncounter(npc, done), onComplete(results) }`
  — engine renders street + player + NPCs procedurally (fillRect pixel art,
  no image assets), handles keyboard (←→/space) + touch buttons, pauses
  during encounters, resumes on `done(success)`.
- `Adventure.stop()` — tear down loop + listeners.
- app.js owns the conversation overlay (reuses dialogue renderer + Voice).

**WordBlocks** (`js/wordblocks.js`)
- `WordBlocks.start(container, { vocab, words, onComplete(results) })`
- `WordBlocks.stop()`
- results: `{ correct, total, maxCombo }` → app.js converts to XP via Game.

**LangPack** (`js/langpack.js`) — done
- `list()`, `load(id)`, `getActiveId()/setActiveId(id)`,
  `saveImportedPack(pack)`, `removeImportedPack(id)`,
  `generateCurriculum(manifest, vocabulary)`

**Importer** (`js/importer.js`)
- Parses pasted/uploaded CSV (`english,target[,category]`), TSV, or JSON
  (`{ "target_word": "english" }` or vocabulary-shaped object)
- Builds `{ manifest, vocabulary }`, saves via `LangPack.saveImportedPack`,
  curriculum auto-generated on load
- Validates size (localStorage ~5MB), reports word count + preview before save

### Screen additions (index.html)
- `screen-street` — canvas + touch controls + encounter overlay
- `screen-arcade` — Word Blocks playfield
- `screen-language` — pack picker + "Import a language" entry
- `screen-import` — paste/upload dictionary UI
- Title screen gains: STREET MODE, WORD BLOCKS, 🌍 language button

### Data flow for grading & progression
All modes report `{ correct, total }` into the existing pipeline:
`Game.calculateStars` → `Game.calculateXP` → `Game.awardXP/awardStat` →
results screen. Street Mode awards `conversacion`/`escucha` heavily; Word
Blocks awards `vocabulario`. Words touched in any mode are pushed into SRS.

## Voice design (from research)

- STT: `webkitSpeechRecognition`, `lang` from pack manifest (`es-ES`),
  one-shot mode, `interimResults: true` for live feedback,
  `maxAlternatives: 5` — scoring takes the best-matching alternative.
- Works in Chrome/Edge/Safari 14.1+ (incl. iOS Safari); Firefox lacks STT →
  automatic fallback to tap-to-answer everywhere, mic button hidden.
- TTS: `speechSynthesis` — voice chosen by exact locale match, then language
  prefix; voices load async (`voiceschanged`); iOS requires first `speak()`
  inside a user gesture, so Voice primes with a silent utterance on first tap.
- Slow replay: rate 0.6 button (🐢) next to normal rate 0.95.
- Scoring: strip diacritics/punctuation/case → token-set + Levenshtein blend;
  ≥0.8 full credit, ≥0.5 partial ("close! try again"), else retry with hint.
  Never hard-block on voice: after 2 failed attempts offer tap-to-answer.

## Rollout order

1. Language pack foundation (done: loader, namespace, pack move)
2. `voice.js` + voice enrichment of dialogue/flashcards exercise renderers
3. `adventure.js` + street screen + encounter overlay wiring
4. `wordblocks.js` + arcade screen
5. `importer.js` + language screens
6. Integration in app.js/index.html/sw.js, CSS for new modes
7. Verification: syntax, JSON validity, manual flows, mobile layout, PR

## Testing checklist

- [ ] `node --check` on every JS file; JSON validity on every data file
- [ ] Title → Street Mode → walk → NPC encounter → tap path completes; XP awarded
- [ ] Voice path (Chrome): TTS speaks Spanish line, mic scores an answer
- [ ] Firefox: mic UI hidden, tap fallback everywhere
- [ ] Word Blocks: blocks fall, match clears, miss stacks, game-over → results
- [ ] Import: paste 20-line English→French CSV → pack appears → playable
      generated curriculum; progress kept separate from Spanish
- [ ] Old saves still load (Spanish keys un-namespaced)
- [ ] 320px-wide viewport: all new screens usable, touch controls reachable
- [ ] sw.js cache bumped; game loads offline after first visit
