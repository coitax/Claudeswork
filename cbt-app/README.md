# CBT Tracker (private, single-user MVP)

A private, self-hosted CBT homework tracker for one person. Text-only sensitive
data, stored as JSON files on disk. Runs locally in WSL and can later be moved to
a single Linode VPS. Built for **simplicity, maintainability, and future
adaptability** (notably a clean path to SQLite).

> ⚠️ **Worksheet fidelity notice.** Worksheet wording has been transcribed
> **verbatim from the source images** (Beck Institute Thought Record sides one &
> two, an Activity Monitoring Form, and a 7-core Feelings Wheel) via OCR. Two
> items where the source was not fully legible remain flagged for manual review
> in **Settings → Worksheet text review**. See
> [Worksheet text that needs review](#9-worksheet-text-that-needs-manual-review).

---

## 1. Architecture overview

Four clean layers, with storage decoupled behind an adapter interface:

```
UI (React)  ──▶  API/HTTP (Fastify routes)  ──▶  Services  ──▶  StorageAdapter
                                                                  ├── FileStorageAdapter (v1, JSON files)
                                                                  └── SqliteStorageAdapter (stub / future)
```

- **UI layer** — Vite + React + TypeScript, Tailwind, React Router, React Hook
  Form + Zod. Wizard-based entry, print-friendly views.
- **API/service layer** — Fastify routes do HTTP + Zod validation; services hold
  feature logic and depend **only** on the `StorageAdapter` interface.
- **Storage adapter interface** — `packages/shared/src/storage/storage-adapter.ts`.
- **File adapter** — `apps/api/src/storage/file-storage-adapter.ts` (atomic
  writes, one JSON object per record, human-readable).
- **SQLite adapter placeholder** — `apps/api/src/storage/sqlite-storage-adapter.stub.ts`
  (interface-complete stub; swapping it requires **no** feature changes).

**Worksheet text is config-driven**, never hardcoded in components. Configs live
in `packages/shared/src/worksheets/` and carry `review_needed` flags for any
uncertain wording.

**Auth**: single seeded user, server-side sessions in secure `httpOnly`,
`sameSite=strict` cookies (no JWT, no OAuth, no signup), login rate limiting,
session expiry, route-protection middleware.

---

## 2. Folder structure

```
cbt-app/
├── package.json                 # pnpm workspace root + scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .env.example
├── data/                        # JSON storage (backup-friendly; git-ignored)
│   ├── users/  sessions/  activity-weeks/  thought-records/
│   ├── daily-moods/  emotion-selections/  templates/  meta/
├── packages/shared/             # types, zod, worksheet configs, storage interface
│   └── src/
│       ├── types/               # entities.ts, worksheet-config.ts
│       ├── zod/schemas.ts
│       ├── worksheets/          # activity-monitoring-form, thought-record, ...
│       ├── storage/storage-adapter.ts
│       └── index.ts
├── apps/api/                    # Fastify backend
│   ├── src/
│   │   ├── config.ts  app.ts  server.ts  bootstrap.ts
│   │   ├── auth/                # password, session, rate-limit
│   │   ├── storage/             # file adapter, sqlite stub, factory
│   │   ├── services/            # activity, thought-record, daily-mood, worksheet
│   │   └── routes/              # auth, activity, thought-record, daily-mood, worksheet
│   └── scripts/seed.ts          # create the single user
└── apps/web/                    # Vite + React frontend
    └── src/
        ├── components/          # shell, wizard, grids, dialogs, print, ...
        ├── features/            # auth, home, activity, thought-record, daily-mood, settings
        └── lib/                 # api client, autosave hook, helpers
```

---

## 3. Storage adapter contract

See `packages/shared/src/storage/storage-adapter.ts`. Key methods:

```
init()
getUser / saveUser
getSession / createSession / deleteSession / deleteExpiredSessions
getActivityWeeks / getActivityWeekById / saveActivityWeek
getThoughtRecords / getThoughtRecordById / saveThoughtRecord
getDailyMoods / getDailyMoodById / saveDailyMood
getEmotionSelections / saveEmotionSelection
getWorksheetTemplates / getWorksheetTemplateByKey / saveWorksheetTemplate
getWorksheetReviewItems / saveWorksheetReviewItem
```

All async; all data goes through this seam. The SQLite adapter will implement the
same interface (suggested schema is documented in the stub file).

---

## 4. JSON data model shapes

Defined in `packages/shared/src/types/entities.ts`. Every record has a string
`id` and ISO `created_at` / `updated_at`. Entities: `User`, `Session`,
`ActivityWeek` (with 7 `ActivityDay` → `ActivitySlot[]` + `overall_mood_0_10`),
`ThoughtRecord`, `DailyMood`, `EmotionSelection`, `WorksheetTemplate`,
`WorksheetTextReviewItem`.

File naming on disk:
- `users/user.json`
- `sessions/<id>.json`
- `activity-weeks/activity-week-YYYY-MM-DD-<id>.json`
- `thought-records/thought-record-<id>.json`
- `daily-moods/daily-mood-YYYY-MM-DD-<id>.json`
- `templates/<key>.json`, `meta/review-items.json`

---

## 5. Worksheet config structure

Defined in `packages/shared/src/types/worksheet-config.ts`; configs in
`packages/shared/src/worksheets/`:

- `activity-monitoring-form`
- `thought-record-side-one`, `thought-record-side-two` (+ cognitive distortions)
- `feelings-wheel-reference`
- `daily-mood-entry`

Each `WorksheetConfig` has `key, version, title, instructions, sections[] →
fields[] (field_type, label, prompt_text, scale, options, helper_reference,
review_needed), print_layout, review_needed[]`.

---

## 6. Route list

**Web** (`apps/web/src/App.tsx`): `/login`, `/app`, `/app/activity[/new|/:weekId|
/:weekId/edit|/:weekId/print]`, `/app/thought-records[...]`, `/app/daily-mood[...]`,
`/app/settings`, `/app/settings/worksheet-review`.

**API** (`apps/api/src/routes/`):
```
POST /api/auth/login            POST /api/auth/logout      GET /api/auth/session
GET/POST /api/activity-weeks    GET/PUT /api/activity-weeks/:id    GET .../:id/print-data
GET/POST /api/thought-records   GET/PUT /api/thought-records/:id   GET .../:id/print-data
GET/POST /api/daily-moods       GET/PUT /api/daily-moods/:id       GET .../:id/print-data
GET /api/worksheet-templates    GET/PUT /api/worksheet-review-items[/:id]
GET /api/health
```

---

## 7. Setup (WSL)

```bash
cd cbt-app
cp .env.example .env            # optional: edit values
pnpm install

# create the single user (prompts, or pass CBT_* env vars)
pnpm seed

# dev: runs API (:5174) and web (:5173) together; web proxies /api -> API
pnpm dev
# open http://localhost:5173
```

Run individually: `pnpm dev:api` / `pnpm dev:web`. Type-check: `pnpm typecheck`.

### Testing on your phone

In dev, your phone only needs to reach the **web server on port 5173** — Vite
proxies `/api` to the backend internally, and dev-mode cookies are not `Secure`,
so login works over plain HTTP. Pick one:

**A) Same Wi-Fi (LAN).**
1. Run `pnpm dev` on your computer.
2. Find your machine's LAN IP (`ipconfig` on Windows → IPv4, or `ip addr` on Linux).
3. On your phone (same Wi-Fi), open `http://<your-ip>:5173`.

> **WSL2 note:** other devices can't reach a WSL2 service by default. Easiest fix
> (Windows 11): add to `C:\Users\<you>\.wslconfig`
> ```
> [wsl2]
> networkingMode=mirrored
> ```
> then `wsl --shutdown` and reopen. Alternatively forward the port from Windows:
> `netsh interface portproxy add v4tov4 listenport=5173 listenaddress=0.0.0.0 connectport=5173 connectaddress=$(wsl hostname -I)`
> and allow port 5173 through Windows Firewall.

**B) From anywhere (HTTPS tunnel) — most reliable, also works on cellular.**
Install [cloudflared](https://developers.cloudflare.com/cloudflare-tunnel/) (or ngrok), then:
```bash
pnpm dev                                   # in one terminal
VITE_ALLOWED_HOSTS=true pnpm dev:web        # OR restart web with this so the tunnel host is allowed
cloudflared tunnel --url http://localhost:5173
```
Open the printed `https://<random>.trycloudflare.com` URL on your phone. (Set
`VITE_ALLOWED_HOSTS` to the exact tunnel hostname for a tighter allowlist.)

### Production (single VPS)

```bash
pnpm build                      # builds the web SPA (apps/web/dist)
NODE_ENV=production PORT=5174 pnpm start
# API serves the SPA + API on one port; put nginx/HTTPS in front (cookies are
# Secure in production, so TLS is required).
```

---

## 8. Implementation plan (status)

- **Phase 1 — scaffold, auth/session, seeded user, storage interface + file
  adapter, protected routes, base layout** ✅
- **Phase 2 — worksheet config system, activity CRUD, wizard, history/detail,
  print** ✅
- **Phase 3 — thought record CRUD, wizard, cognitive distortions helper,
  history/detail, print** ✅
- **Phase 4 — daily mood CRUD, history/detail, print** ✅
- **Phase 5 — worksheet review screen, sqlite stub, backup notes, polish** ✅
  (ongoing: confirm worksheet text, optional full `emotion_selection` persistence)

---

## 9. Worksheet text that needs manual review

Worksheet wording was transcribed **verbatim from the source images** (provided
via Google Drive) into the configs in `packages/shared/src/worksheets/`:

- **Activity Monitoring Form** — title, full instructions, P = pleasure /
  M = mastery/accomplishment (0-10 each), time slots 8:00 A.M.–9:00 P.M., and the
  *Overall Mood (0-10)* row. Fully transcribed.
- **Thought Record Side One** — banner + instructions + the 12-item Cognitive
  Distortions list with verbatim examples.
- **Thought Record Side Two** — Date/time, Situation, Automatic Thought(s),
  Emotion(s), Adaptive Response (incl. the alternative-response questions), and
  Outcome prompts, verbatim.
- **Feelings Wheel** — 7-core Geoffrey Roberts wheel (Happy, Sad, Disgusted,
  Angry, Fearful, Bad, Surprised) with secondary/tertiary terms (helper only).

**Two items remain flagged** (seeded into the in-app review screen) where the
photo was not fully legible:

1. `thought-record-side-one / instructions_numbering` — instruction step
   numbering was partly obscured; confirm the exact numbers/order.
2. `feelings-wheel-reference / bad_tertiary` — some tertiary terms in the "Bad"
   segment were not clearly readable; confirm against the image.

The "Magnification/minimization" distortion example also carries a
`review_needed` flag (one phrase was OCR-ambiguous). To finalize: re-check those
against the originals, then **Confirm**/**Correct** in the review screen and/or
edit the config wording directly.

---

## 10. Backup & export

- All data lives under `cbt-app/data/` as plain JSON. **Back up by copying that
  folder** (e.g. `cp -r data ~/cbt-backup-$(date +%F)` or a cron `rsync`).
- Files are human-readable and one-object-per-record, so partial restores are
  easy.
- Future export/import + SQLite migration: read each JSON file via the file
  adapter and write through the SQLite adapter (see the stub's schema notes).

## Security notes

- Passwords hashed with bcrypt (`bcryptjs`, no native build). Swap to Argon2
  later by replacing `apps/api/src/auth/password.ts` only.
- Sessions are server-side; cookies are `httpOnly`, `sameSite=strict`, and
  `Secure` in production. No JWT, no third-party auth, no public signup.
- `data/` is git-ignored. **Never commit real entries.**
