# CBT Tracker — v1 Handoff (`cbtv1`)

A complete record of what was built, why, how it works, how to run it, and a
step-by-step guide to building a **simpler** version from scratch.

- **Project location:** `cbt-app/` (a pnpm monorepo inside this repo)
- **Branch:** `claude/cbt-tracking-mvp-vr53df`
- **PR:** #2 (draft)
- **Status:** working MVP — typechecks, builds, and passes end-to-end auth + CRUD smoke tests.

---

## 1. What this app is

A **private, single-user, self-hosted CBT homework tracker**. Text-only sensitive
data stored as JSON files on disk. Runs locally in WSL and can later move to a
single Linode VPS. Digitizes three paper worksheets:

1. **Activity Monitoring Form** (weekly activity + pleasure/mastery + daily mood)
2. **Beck Thought Record** (sides one & two, with the cognitive-distortions list)
3. **Daily Mood / diary** (lightweight app-native check-in)

Plus a **Feelings Wheel** as an optional emotion-picking helper.

Design priorities (in order): **simplicity, maintainability, future adaptability**
— most notably a clean path to swap JSON storage for SQLite later **without
touching feature code**.

---

## 2. Tech stack & why

| Layer | Choice | Why |
|---|---|---|
| Web | Vite + React + TypeScript | Fast dev, typed, simple SPA |
| Styling | Tailwind CSS | Calm custom palette, fast iteration, print CSS |
| Routing | React Router | Standard SPA routing |
| Forms | React Hook Form + Zod | Typed validation shared with the API |
| API | Node + Fastify | Small, fast, easy validation hooks |
| Storage | JSON files on disk (v1) | Simple, human-readable, backup = copy a folder |
| Auth | bcrypt + server-side cookie sessions | No JWT/OAuth/signup; single user |
| Monorepo | pnpm workspaces | Shared types/configs across web + api |

**Notable decision:** passwords use **bcrypt (`bcryptjs`, pure-JS)** instead of
Argon2, to avoid native build steps on WSL/VPS. Swappable in one file
(`apps/api/src/auth/password.ts`).

---

## 3. Repository layout

```
cbt-app/
├── package.json                 # workspace root + scripts (dev, build, seed, typecheck)
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .env.example
├── README.md                    # full setup + phone testing + backup docs
├── cbtv1.md                     # THIS handoff
├── data/                        # JSON storage (git-ignored contents, folders kept)
│   ├── users/ sessions/ activity-weeks/ thought-records/
│   ├── daily-moods/ emotion-selections/ templates/ meta/
├── packages/shared/             # the contract layer (imported by web + api)
│   └── src/
│       ├── types/entities.ts            # all entity TypeScript types
│       ├── types/worksheet-config.ts    # worksheet config types
│       ├── zod/schemas.ts               # validation (shared web ↔ api)
│       ├── worksheets/                  # the actual worksheet text (config-driven)
│       │   ├── activity-monitoring-form.ts
│       │   ├── thought-record.ts        # side one + two + cognitive distortions
│       │   ├── feelings-wheel.ts
│       │   ├── daily-mood.ts
│       │   └── index.ts                 # registry + collectReviewFlags()
│       ├── storage/storage-adapter.ts   # THE storage interface
│       └── index.ts
├── apps/api/
│   ├── src/
│   │   ├── config.ts            # env config (ports, data dir, session TTL, rate limit)
│   │   ├── app.ts               # Fastify assembly + static SPA serving (prod)
│   │   ├── server.ts            # entrypoint
│   │   ├── bootstrap.ts         # seeds templates + review items, clears old sessions
│   │   ├── auth/               # password.ts, session.ts, rate-limit.ts
│   │   ├── storage/            # file-storage-adapter.ts, sqlite-storage-adapter.stub.ts, index.ts (factory)
│   │   ├── services/          # activity, thought-record, daily-mood, worksheet (depend only on adapter)
│   │   └── routes/            # auth, activity, thought-record, daily-mood, worksheet
│   └── scripts/seed.ts         # create the single user
└── apps/web/
    └── src/
        ├── components/         # AppShell, ProtectedRoute, Wizard, WorksheetField,
        │                       # WeeklyActivityGrid, ActivityDayEditor, FeelingsWheelPicker,
        │                       # ThoughtRecordReviewPanel, AutosaveIndicator, PrintLayout,
        │                       # ConfirmDialog, HistoryList/EmptyState/PageHeader (common.tsx)
        ├── features/
        │   ├── auth/           # auth-context.tsx, LoginPage.tsx
        │   ├── home/           # HomePage.tsx
        │   ├── activity/       # list, wizard, detail, print, activity-model.ts
        │   ├── thought-record/ # list, wizard, detail, print, view
        │   ├── daily-mood/     # list, form, detail, print
        │   └── settings/       # SettingsPage.tsx, WorksheetReviewPage.tsx
        ├── lib/                # api.ts (fetch wrapper), use-autosave.ts, worksheet-helpers.ts
        ├── App.tsx             # all routes
        └── main.tsx
```

---

## 4. Architecture (the important part)

Four layers, with storage decoupled behind one interface:

```
UI (React)  →  API/HTTP (Fastify + Zod)  →  Services  →  StorageAdapter
                                                          ├── FileStorageAdapter (v1, JSON files)
                                                          └── SqliteStorageAdapter (stub, future)
```

- **Services depend ONLY on the `StorageAdapter` interface** (`packages/shared/src/storage/storage-adapter.ts`). They never touch the filesystem. This is the seam that makes the future SQLite migration a drop-in.
- **`createStorage()` factory** (`apps/api/src/storage/index.ts`) picks the adapter from `STORAGE_DRIVER` (only `file` implemented; `sqlite` throws with a TODO).
- **File adapter details:** atomic writes (temp file + `fsync` + `rename`), one JSON object per record, pretty-printed (human-readable), lists derived by reading the directory (no separate index). The SQLite stub documents the suggested table schema for later.
- **Worksheet text is config-driven** — never hardcoded in components. The `WorksheetField` component renders verbatim `prompt_text` from the config; the wizard step *headings* are UI labels but the prompts inside are source wording.

---

## 5. Data model (entities)

Defined in `packages/shared/src/types/entities.ts`. Every record has a string
`id` and ISO `created_at`/`updated_at`.

- **User** — id, username, email (nullable), password_hash, timestamps
- **Session** — id, user_id, expires_at, created_at
- **ActivityWeek** — id, user_id, week_start_date, title, notes, is_draft, `days[7]`, timestamps
  - **ActivityDay** — day_of_week, `slots[]`, overall_mood_0_10
  - **ActivitySlot** — time_label, activity_text, pm_rating_text (combined P/M for v1), sort_order
- **ThoughtRecord** — situation, automatic thoughts (+ belief %), emotions (+ intensity %), cognitive distortion, adaptive response, outcome (belief now %, emotions now + %, what to do), is_draft, timestamps
- **DailyMood** — entry_date, mood_0_10, notes_text, linked_thought_record_id, linked_activity_week_id, timestamps
- **EmotionSelection** — parent_type/id, source_type, primary/secondary/tertiary, free_text (entity + storage methods exist; v1 wires the wheel as a text helper rather than persisting separate rows)
- **WorksheetTemplate** — key, version, title, template_json, timestamps
- **WorksheetTextReviewItem** — template_key, field_key, extracted_text, status (review_needed/confirmed/corrected), notes

**On-disk file naming:** `users/user.json`, `sessions/<id>.json`,
`activity-weeks/activity-week-YYYY-MM-DD-<id>.json`,
`thought-records/thought-record-<id>.json`,
`daily-moods/daily-mood-YYYY-MM-DD-<id>.json`, `templates/<key>.json`,
`meta/review-items.json`.

---

## 6. Worksheet fidelity (source of truth)

The worksheet wording was **transcribed verbatim from photographed source
images** the user provided via Google Drive (folder "CBT files"), read with OCR:

- **Activity Monitoring Form** — exact title + instructions; confirmed **P = pleasure, M = mastery/accomplishment** (0-10 each), time slots 8:00 A.M.–9:00 P.M., Overall Mood (0-10).
- **Beck Thought Record Side One** — banner, instructions, and the **12-item Cognitive Distortions list** with verbatim examples (All-or-nothing thinking, Catastrophizing, Disqualifying/discounting the positive, Emotional reasoning, Labeling, Magnification/minimization, Mental filter, Mind reading, Overgeneralization, Personalization, "Should"/"must" statements, Tunnel vision).
- **Beck Thought Record Side Two** — verbatim column prompts for Date/time, Situation, Automatic Thought(s), Emotion(s), Adaptive Response (incl. the six alternative-response questions), Outcome.
- **Feelings Wheel** — the 7-core Geoffrey Roberts wheel (Happy, Sad, Disgusted, Angry, Fearful, Bad, Surprised) with secondary/tertiary terms.

**Still flagged for manual confirmation** (surfaced in the in-app review screen,
because the photo was not fully legible):
1. `thought-record-side-one / instructions_numbering` — exact step numbering
2. `feelings-wheel-reference / bad_tertiary` — some "Bad" tertiary terms
3. One OCR-ambiguous phrase in the "Magnification/minimization" example

To finalize: re-check against the originals, then **Confirm/Correct** in
**Settings → Worksheet text review**, and/or edit the config in
`packages/shared/src/worksheets/`.

---

## 7. Auth & security

- Single seeded user (no public signup). Create via `pnpm seed` (interactive) or
  `CBT_USERNAME=… CBT_PASSWORD=… [CBT_EMAIL=…] pnpm seed` (non-interactive).
- Passwords hashed with **bcrypt**.
- **Server-side sessions** stored as files; the cookie holds only the session id.
- Cookies are **`httpOnly`, `SameSite=Strict`**, and **`Secure` in production**.
- **Login rate limiting** (in-memory, per-IP), **session expiry**, and a
  **`requireAuth` preHandler** protecting all data routes.
- No JWT, no OAuth, no third-party auth (by design).

> Dev (non-production) cookies are **not** `Secure`, so login works over plain
> HTTP on a LAN — important for phone testing. Production forces HTTPS-only cookies.

---

## 8. Features

- **Activity Monitoring**: weekly grid, day-by-day wizard (Sunday→Saturday →
  overall mood → review), draft + autosave, history, detail, print.
  - **Adjustable time slots**: per-week **start time, interval, and slot count**
    (e.g. 4:30 A.M. in 1-hour steps). New weeks **default to your last-used
    schedule** (inferred from your most recently edited week); falls back to the
    worksheet default (8:00 A.M., 1-hour, 14 slots).
- **Thought Record**: config-driven wizard (Date/time → Situation → Automatic
  Thoughts → Emotions → Cognitive Distortions helper → Adaptive Response →
  Outcome → Review), draft + autosave, history, detail, print.
- **Daily Mood**: single form (date, mood 0-10, notes, optional links to a
  thought record / activity week, feelings-wheel helper), history, detail, print.
- **Feelings Wheel**: optional hierarchical picker; appends terms to free text —
  never replaces worksheet wording.
- **Worksheet review screen**: confirm/correct uncertain source text.
- **Print**: browser print CSS only (no PDF lib). Print routes render outside the
  app shell; `.no-print` hides chrome; weekly sheet prints as a real table;
  high-contrast, sensible page breaks.

---

## 9. API endpoints

```
POST /api/auth/login            POST /api/auth/logout      GET /api/auth/session
GET/POST /api/activity-weeks    GET/PUT /api/activity-weeks/:id    GET .../:id/print-data
GET/POST /api/thought-records   GET/PUT /api/thought-records/:id   GET .../:id/print-data
GET/POST /api/daily-moods       GET/PUT /api/daily-moods/:id       GET .../:id/print-data
GET /api/worksheet-templates    GET/PUT /api/worksheet-review-items[/:id]
GET /api/health
```
All bodies validated server-side with the shared Zod schemas.

---

## 10. How to run

```bash
cd cbt-app
cp .env.example .env            # optional
pnpm install
pnpm seed                       # create the single user
pnpm dev                        # API :5174, web :5173 (web proxies /api → API)
# open http://localhost:5173
```
**Production (single VPS):** `pnpm build` then
`NODE_ENV=production PORT=5174 pnpm start` (API serves the SPA + API on one port;
put nginx/HTTPS in front — Secure cookies require TLS).

**Phone testing:** see README → "Testing on your phone" (same-Wi-Fi LAN with the
WSL2 mirrored-networking note, or a Cloudflare HTTPS tunnel). Only port **5173**
needs to be reachable in dev.

**Backup:** copy the `cbt-app/data/` folder. Plain JSON, one object per record.

---

## 11. What was done, in order (commit history)

1. `3be7078` — **Initial MVP**: monorepo scaffold; shared types/zod/worksheet-config/storage interface; file storage adapter (atomic writes) + SQLite stub; Fastify API (auth, activity, thought-record, daily-mood, worksheet routes); services; bcrypt + cookie sessions + rate limit; seed script; full React app (shell, protected routes, login, all feature wizards/lists/details/prints, settings + worksheet review); Tailwind + print CSS; README. Verified typecheck + build + end-to-end smoke test.
2. `a82873d` — **Worksheet transcription**: replaced candidate text with verbatim wording from the user's photographed worksheets (read via Google Drive OCR); fixed thought-record field placement to side two; reduced review flags to the genuinely illegible items; made the seed non-interactive.
3. `f3aeef6` — **Adjustable time slots**: per-week start time/interval/count for the activity grid (data model already stored per-slot labels).
4. `ab7d737` — **Last-used schedule default**: new weeks pre-fill the time grid from the most recently edited week (derived from server data; no new storage).
5. `0b32b86` — **Phone/LAN testing**: Vite dev server listens on all interfaces + `VITE_ALLOWED_HOSTS` for tunnels; README "Testing on your phone" section.

---

## 12. Known limitations / future work

- **SQLite adapter is a stub** — implement `SqliteStorageAdapter` against the same
  interface and switch `STORAGE_DRIVER=sqlite`. Schema is documented in the stub.
- **EmotionSelection** rows aren't persisted separately yet (wheel writes into
  free text). Wire `getEmotionSelections`/`saveEmotionSelection` if you want
  structured emotion analytics later.
- **Export/import** path is conceptual (copy the data folder). A formal
  export/import + JSON→SQLite migrator is a natural next step.
- Excluded by design (v1): charts/analytics, therapist portal, multi-user, cloud
  sync, AI summaries, notifications, PDF generation, public signup, external auth.
- Rate limiting is in-memory (resets on restart) — fine for single-user.

---

## 13. Guide: build a *simpler* version from scratch

If you want the absolute minimum CBT journal (one feature, no monorepo, no
adapter abstraction), here's a lean path. Use this when you value "up in an hour"
over "ready to scale."

### Goal
A single-page app: log in, write a thought record, see a list, print one. JSON
file storage, no separate frontend build.

### Stack
- One Node + Express (or Fastify) server
- Plain HTML + a little vanilla JS (or one small React file via CDN) — **no build step**
- One JSON file for all records

### Steps

**1. Project**
```bash
mkdir cbt-lite && cd cbt-lite && npm init -y
npm i express bcryptjs cookie-parser
mkdir data public
```

**2. Storage (one file, ~15 lines)** — `store.js`
```js
import { readFile, writeFile } from 'node:fs/promises';
const FILE = './data/records.json';
export async function all() {
  try { return JSON.parse(await readFile(FILE, 'utf8')); } catch { return []; }
}
export async function save(records) {
  await writeFile(FILE, JSON.stringify(records, null, 2)); // good enough for one user
}
```
*(Skip the adapter interface entirely. You can refactor to one later if needed.)*

**3. Auth (one hardcoded user)** — set `USER` and a bcrypt hash in env; on login,
compare and set a signed/httpOnly cookie with a random session id kept in an
in-memory `Map`. ~30 lines. No sessions-on-disk needed for a toy.

**4. Server** — `server.js`
```js
import express from 'express';
import cookieParser from 'cookie-parser';
import { all, save } from './store.js';
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(express.static('public'));

// const requireAuth = (req,res,next) => { ...check cookie... }
app.get('/api/records', /*requireAuth,*/ async (_q, r) => r.json(await all()));
app.post('/api/records', /*requireAuth,*/ async (q, r) => {
  const records = await all();
  const rec = { id: crypto.randomUUID(), ...q.body, created_at: new Date().toISOString() };
  records.push(rec); await save(records); r.json(rec);
});
app.listen(5174, () => console.log('http://localhost:5174'));
```

**5. Frontend** — `public/index.html`: a `<form>` with the worksheet prompts
(copy them verbatim from `packages/shared/src/worksheets/thought-record.ts` in
this repo so you keep fidelity), a `fetch('/api/records', {method:'POST'})` on
submit, and a list rendered from `GET /api/records`. Add a `@media print` block
to hide buttons. ~80 lines of HTML/JS.

**6. Print** — reuse the print CSS idea: `.no-print { display:none }` in a
`@media print` block, and a "Print" button calling `window.print()`.

### What you deliberately drop vs v1
- The pnpm monorepo and shared package → one folder
- The storage adapter interface + SQLite stub → one `store.js`
- Server-side session files, rate limiting, draft autosave → optional
- The wizard/print component system → one form + one list
- Activity & daily-mood features → start with just the Thought Record

### Keep these even in the simple version
- **Verbatim worksheet wording** (copy from this repo's configs)
- **httpOnly cookie auth** (don't ship an open journal)
- **JSON on disk + back up the file**

### Upgrade path back to v1
When the lite version outgrows itself: introduce the `StorageAdapter` interface
first (wrap `store.js` behind it), then split frontend into Vite, then add the
other two features. The v1 code in `cbt-app/` is the reference for each step.

---

## 14. Links

- **This file:** `cbt-app/cbtv1.md` on branch `claude/cbt-tracking-mvp-vr53df`
- **Full setup/run/phone docs:** `cbt-app/README.md`
- **Worksheet text (edit here to change wording):** `cbt-app/packages/shared/src/worksheets/`
- **Storage contract (the migration seam):** `cbt-app/packages/shared/src/storage/storage-adapter.ts`
