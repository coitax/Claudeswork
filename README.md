# Spanish Quest RPG

A retro 8-bit RPG that teaches you conversational Spanish — built entirely with
vanilla HTML/CSS/JavaScript. No frameworks, no build step, no dependencies.
Works on desktop and mobile, installable as a PWA, fully playable offline.

## Play

Serve the folder with any static file server and open it in a browser:

```bash
git clone https://github.com/coitax/Claudeswork.git
cd Claudeswork
python3 -m http.server 8080
# open http://localhost:8080
```

Or enable GitHub Pages (Settings → Pages → Deploy from branch → main, root)
and play at your `github.io` URL. Voice features need HTTPS or localhost.

## Game modes

- **Quest Mode** — the core RPG: 5 worlds × 8 levels following a CEFR-aligned
  curriculum (A1 → B1), with flashcards, matching, fill-in-the-blank,
  branching NPC dialogues, translation challenges, and timed boss battles.
- **Street Mode** — a Contra-style pixel side-scroller. Walk down a procedural
  Spanish street, press TALK when you reach an NPC, and hold a real
  conversation to pass. Works with keyboard (←→ + Space) or touch buttons.
- **Word Blocks (Palabra Drop)** — a falling-block arcade puzzle. Spanish
  words drop; tap the matching English before the stack tops out. Combos,
  adaptive speed, and missed words gently return until you know them.
- **Daily Review** — SM-2 spaced repetition keeps every word you've learned
  on an optimal review schedule.

## Voice mode

Powered by the browser's built-in Web Speech API — nothing to install:

- Every Spanish word and dialogue line can be spoken aloud (🔊), with a
  slow-replay button (🐢) for tricky phrases.
- In dialogues, tap 🎤 **SAY IT** and speak your answer in Spanish. A
  client-side pronunciation scorer (accent-stripped matching with Spanish
  phonetic folding) grades your attempt — no audio ever needs to leave the
  page except via your browser's own recognition service.
- Browsers without speech recognition (e.g. Firefox) automatically fall back
  to tap-to-answer; text-to-speech works everywhere.

## RPG progression

XP and 50 levels, four skills (Vocabulario, Gramática, Conversación,
Escucha), unlockable abilities, hearts, daily streaks, and 29 achievements.
All progress is saved locally in your browser.

## Add a new language

Spanish ships built-in, but the whole engine is language-agnostic:

1. Tap **🌍 LANGUAGE → + IMPORT DICTIONARY**.
2. Paste (or upload) a plain word list — CSV/TSV with `english,target`
   columns, or JSON. Example for French:
   ```csv
   english,target,category
   hello,bonjour,greetings
   thank you,merci,greetings
   bread,le pain,food
   ```
3. Preview, import, and play — a full curriculum (worlds, levels, matching,
   flashcards, word blocks, bosses) is generated automatically from your
   list, and text-to-speech switches to the right voice. Progress is tracked
   separately per language.

Packs can also be bundled in `data/packs/<code>/` with an optional
hand-authored curriculum and dialogues — see `data/packs/es/` for the format.

## Art

Character portraits, world icons, and medals are CC0 pixel art from
[Kenney](https://kenney.nl) (RPG Urban Pack, Emote Pack, Medals) — see
`assets/sprites/CREDITS.md`. Street Mode's parallax city is drawn
procedurally in code.

## Project layout

```
index.html          app shell (all screens)
js/                 IIFE modules: app, game, exercises, adventure (street),
                    wordblocks, voice, srs, langpack, importer, ui, storage, audio
css/                retro pixel theme + per-mode styles
data/achievements.json
data/packs/es/      Spanish content: curriculum, vocabulary, dialogues
docs/PLAN.md        architecture and design notes
sw.js               service worker (offline support)
```
