# Spanish Quest — Project Handoff

_Last updated: 2026-09-18_

## What this is

**Spanish Quest** is a retro 8-bit game that teaches conversational Spanish,
built with **vanilla HTML/CSS/JS** — zero frameworks, zero build step, zero
runtime dependencies. It is a PWA (installable, works offline) and runs on
desktop and mobile.

- **Repo:** https://github.com/coitax/Claudeswork (default branch `main`)
- **Working branch convention:** `claude/spanish-learning-game-plan-MXfWb`
  — after a PR merges, the branch is restarted from the new `main`
  (`git checkout -B <branch> origin/main`) rather than stacked.
- **Production target:** https://learn.brokenbeat.ca on a Linode
  (see "Linode deployment" below).

## Current state — everything below is merged to `main`

| PR | What it delivered |
|----|-------------------|
| #1 | Core RPG: 5 worlds × 8 levels (CEFR A1→B1), 369-word vocabulary, 13 dialogue scenes, 5 exercise types, XP/levels/stats/hearts/streaks, 29 achievements, SM-2 spaced repetition, 8-bit Web-Audio SFX, PWA shell |
| #3 | Phase 2: Street Mode side-scroller, Word Blocks arcade, voice engine, language-pack system + dictionary importer, verification bug-fix pass |
| #4 | One-command Linode deployment (`deploy/setup.sh` + `deploy/nginx.conf`) |

### Game modes

- **Quest Mode** — the original lesson RPG (world map → level select → exercises → results).
- **Street Mode** (`js/adventure.js`) — Contra-style canvas side-scroller. 320×180
  backbuffer, integer-scaled, fully procedural pixel art (no image assets).
  Walk to NPCs, press TALK, complete a real dialogue to pass. Touch buttons on
  mobile, arrows/space on desktop.
- **Word Blocks / Palabra Drop** (`js/wordblocks.js`) — falling Spanish word
  blocks, tap the English match in a 4-option tray before the stack tops out.
  Combos, adaptive fall speed keyed to the player's median answer time, missed
  words re-queue (gentle Leitner).
- **Daily Review** — SRS queue of due vocabulary.

### Voice (`js/voice.js`)

Web Speech API only. TTS everywhere (🔊 + 🐢 slow replay, voice ranking,
chunking, iOS gesture unlock via `Voice.prime()`); one-shot speech recognition
(`maxAlternatives: 5`) with client-side pronunciation scoring — accent-stripped
Levenshtein blended with token overlap, Spanish phonetic folding (v→b, ll→y,
qu→k, silent h). Thresholds in `Voice.THRESHOLDS`. Firefox/denied-mic falls
back to tap-to-answer automatically; **STT requires HTTPS**.

### Language packs

- Spanish lives in `data/packs/es/` (`pack.json` manifest + curriculum,
  vocabulary, dialogues). Registry: `data/packs/index.json`.
- **Import a new language in-game:** 🌍 LANGUAGE → + IMPORT DICTIONARY → paste
  or upload `english,target[,category,phonetic,example]` CSV/TSV, or JSON.
  Stored in localStorage; a playable curriculum is auto-generated from the word
  list (`LangPack.generateCurriculum`). Progress/SRS is namespaced per language
  (`Storage.setNamespace`); Spanish keeps legacy un-prefixed keys.
- To bundle a pack instead: add `data/packs/<code>/`, list it in
  `data/packs/index.json`, add files to `sw.js` ASSETS, bump `CACHE_NAME`.

## Architecture map

IIFE globals, loaded in this order (order matters — plain script tags):
`storage → langpack → audio → voice → srs → game → ui → exercises →
adventure → wordblocks → importer → app`.

- `js/app.js` — controller: screen routing, level flow, mode wiring
  (`startStreetMode`, `startArcade`, `showLanguageScreen`), results, achievements.
- `js/exercises.js` — the 5 exercise renderers; all share the contract
  `render*(container, data, onComplete({correct, total}))`. `Exercises.cancelActive()`
  must be called when abandoning an exercise (clears boss timer + pending timeouts + voice).
- `js/game.js` — XP table (50 levels), stats, hearts, streaks, world/level unlock logic
  (derived from `world.levels.length`, not hardcoded).
- Full design docs: `docs/PLAN.md`.

**When adding ANY file:** three touch points — `index.html` (tag, order-sensitive),
`sw.js` ASSETS list, `sw.js` `CACHE_NAME` bump. A missing ASSETS entry breaks
offline; a listed-but-missing file breaks the whole service-worker install.

## Run locally

```bash
git clone https://github.com/coitax/Claudeswork.git
cd Claudeswork
python3 -m http.server 8080   # any static server works
# open http://localhost:8080  (voice works on localhost; otherwise needs HTTPS)
```

## Linode deployment (learn.brokenbeat.ca)

The domain is managed in **Cloudflare** (it currently resolves to Cloudflare's
edge). Deployment is designed to be one command, then fully automatic.

1. **DNS:** In Cloudflare → brokenbeat.ca → DNS, create/edit the **A record
   `learn`** pointing at the **Linode's public IPv4**.
2. **On the Linode (Debian/Ubuntu), run:**
   ```bash
   curl -fsSL https://raw.githubusercontent.com/coitax/Claudeswork/main/deploy/setup.sh | sudo bash -s -- you@email.com
   ```
   The script (idempotent, safe to re-run): installs nginx/git/certbot, clones
   the repo to `/var/www/learn.brokenbeat.ca`, enables the nginx site, obtains
   a Let's Encrypt cert (**HTTPS is required for the mic**), opens ufw if
   active, and installs `/etc/cron.d/spanish-quest-deploy` — a `git pull`
   every 5 minutes.
3. **Cloudflare TLS:** if the `learn` record is proxied (orange cloud) and
   certbot's HTTP challenge fails: set the record to "DNS only" (grey cloud),
   re-run the command, then re-enable the proxy and set SSL/TLS mode to
   **Full (strict)**.

**Auto-deploy:** after setup, anything merged to `main` is live within
5 minutes — no manual deploys. To force an immediate update:
`sudo git -C /var/www/learn.brokenbeat.ca pull --ff-only`.

**Logs / troubleshooting on the server:** `sudo nginx -t`,
`sudo systemctl status nginx`, `sudo certbot renew --dry-run`,
`ls -la /var/www/learn.brokenbeat.ca`.

## Known gaps / backlog (all minor)

- iOS safe-area insets: street touch buttons and the Word Blocks tray sit at
  the raw bottom edge on notched iPhones (`env(safe-area-inset-bottom)` TODO).
- Daily streak compares **UTC** dates; players far west of UTC playing late
  evening can miss a day.
- Exiting Word Blocks during the end-of-round banner skips the XP award for
  that round (results timeout is cleared by `stop()`).
- Two dialogue scenes from the original plan were never authored
  (`travel-story`, `restaurant-order`) — nothing references them; World 4
  levels use other exercises.
- Ideas: more dialogue scenes per world, listening-comprehension exercise type,
  Street Mode bosses, leaderboards, more bundled packs (fr/de/it via WikDict).

## Testing checklist (manual)

Quest level end-to-end · Street Mode full run + mid-encounter exit ·
Word Blocks clear + top-out · voice in Chrome (HTTPS) · Firefox fallback ·
import a 20-line French CSV and play it · 320px viewport · offline reload ·
old Spanish saves still load.
