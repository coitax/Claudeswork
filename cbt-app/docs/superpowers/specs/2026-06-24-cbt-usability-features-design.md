# CBT Tracker — Usability features design (2026-06-24)

Three independent usability improvements to the CBT tracker (live at cbet.brokenbeat.ca),
in one spec because each is small and confined to the same app. Each can be planned and
shipped in sequence.

## Context

The app is a single-user CBT homework tracker: pnpm monorepo, `apps/web` (Vite + React SPA),
`apps/api` (Fastify, runs via `tsx`), `packages/shared` (types/Zod). Storage is JSON files
under `DATA_DIR` (`/var/lib/cbt/data` in prod); records belong to one seeded user; auth is a
`requireAuth` Fastify preHandler that sets `req.currentUser`. Real-world use surfaced three gaps:

1. Entering the activity-monitoring grid is tedious when the same activity (e.g. "Work")
   spans many time slots, or when days repeat.
2. There is **no way to delete a record** (only logout deletes a session) — drafts and
   mistakes accumulate.
3. Handwritten journal pages can't be attached to an activity week.

## Entities (current, relevant fields)

- `ActivityWeek` (`packages/shared/src/types/entities.ts`): `id, user_id, week_start_date,
  title, notes, is_draft, days: ActivityDay[]`.
- `ActivityDay`: `day_of_week, overall_mood_0_10, slots: ActivitySlot[]`.
- `ActivitySlot`: `time_label, activity_text, pm_rating_text`.
- `ThoughtRecord`, `DailyMood`: both owned by the user; `ThoughtRecord` has `is_draft`.

---

## Feature 1 — Activity bulk fill (client-side only, no API change)

Both behaviours live in `apps/web/src/features/activity/` (`ActivityWizardPage.tsx`,
`activity-model.ts`). They mutate the in-memory form state and save through the existing
update path; the API and storage are unchanged.

### 1a. Range-fill within a day
A control above each day's slot grid: **activity text**, **optional pleasure/mastery text**,
**start time**, **end time** (start/end chosen from the day's existing `time_label` list).
On apply, every slot whose `time_label` falls in `[start, end]` (inclusive) for that day gets
`activity_text` set, and `pm_rating_text` set **only if** the pleasure/mastery field was filled
(blank leaves existing pm values untouched).

Pure helper in `activity-model.ts`:
`fillSlotRange(day: ActivityDay, startLabel, endLabel, activityText, pmText?): ActivityDay`
— returns a new day; does not mutate input; range determined by index order of `slots`
(slots are already in chronological order), not string parsing.

### 1b. Copy one day onto other days
A "Copy this day to…" control with a checkbox per other day of the week. On apply, the source
day's `slots` are deep-copied onto each checked day, **replacing** their slots. `overall_mood_0_10`
is **not** copied (mood is per-day). Confirm before overwriting days that already have content.

Pure helper: `copyDaySlots(source: ActivityDay, targets: ActivityDay[]): ActivityDay[]`.

### Tests
Vitest on `fillSlotRange` and `copyDaySlots`: inclusive boundaries, blank-pm preserves existing,
deep-copy independence (mutating a target slot doesn't affect the source), mood not copied.

---

## Feature 2 — Delete any record (all three types)

### API
New owner-checked routes behind `requireAuth`:
- `DELETE /api/activity-weeks/:id`
- `DELETE /api/thought-records/:id`
- `DELETE /api/daily-moods/:id`

Each: load the record, 404 if missing, 403 if `user_id !== req.currentUser.id`, then delete via a
storage method and return 204. Deleting an activity week also removes its photo folder
(`DATA_DIR/photos/<weekId>/`, see Feature 3) and any linked `EmotionSelection` rows for the record,
matching whatever cascade the create/update paths assume.

### Storage
Add `deleteActivityWeek(id)`, `deleteThoughtRecord(id)`, `deleteDailyMood(id)` to the storage-adapter
interface (`packages/shared/src/storage/storage-adapter.ts`) and the file adapter
(`apps/api/src/storage/file-storage-adapter.ts`): remove the entity JSON file (and cascade as above),
idempotent if already gone.

### Web
A **Delete** button on each detail page (`ActivityDetailPage`, thought-record detail, daily-mood
detail) and optionally each list row, opening a confirm dialog ("Delete this entry? This can't be
undone."). On success, navigate back to the relevant list and refresh.

### Tests
Route tests: 204 on owner delete, 404 on missing, 403 on other-user id (single-user app, but keep the
guard). Adapter test: file removed, second delete is a no-op.

---

## Feature 3 — Photo attachments on activity weeks (upload + view)

Approach: **multipart upload, originals on disk, metadata in the week JSON** (chosen over base64-in-JSON
to keep entry files and backups small, and over external object storage as overkill for one user).

### Data
`ActivityWeek` gains `photos: ActivityPhoto[]` (default `[]`):
`ActivityPhoto = { id, filename, mime, size, created_at }`.
Binaries stored at `DATA_DIR/photos/<weekId>/<photoId>.<ext>` — inside `DATA_DIR`, so the existing
daily backup (`/usr/local/bin/cbt-backup.sh`) already captures them. No DB.

### API
Add `@fastify/multipart`. Routes behind `requireAuth`, owner-checked against the parent week:
- `POST /api/activity-weeks/:id/photos` — one file per request (UI may send several sequentially).
  Accept `image/jpeg`, `image/png`, `image/webp`; **reject** others (incl. HEIC) with 415 + a clear
  message. Size limit ~10 MB. Writes the file, appends an `ActivityPhoto` to the week, returns it.
- `GET /api/activity-weeks/:id/photos/:photoId` — streams the binary with its `mime`
  (authed, owner-checked).
- `DELETE /api/activity-weeks/:id/photos/:photoId` — removes the file + the metadata entry, 204.

### Web
`ActivityDetailPage`: an upload control (file input, `accept="image/jpeg,image/png,image/webp"`) and a
thumbnail grid; clicking a thumbnail opens the full image; a delete control per photo. Helper text:
"JPEG/PNG/WEBP only — iPhone HEIC isn't supported; your phone's photo picker usually uploads JPEG."

### Known limitation
HEIC (default iOS camera format) is not browser-displayable and is rejected. No server-side image
conversion (avoids a heavy native dep); iOS share/upload typically transcodes to JPEG, and users can
set the camera to "Most Compatible". Documented in the UI helper text.

### Tests
Route tests: upload a small PNG → 200 + metadata + file on disk; GET returns the bytes with correct
content-type; unsupported type → 415; DELETE removes file + metadata. CSV export is unaffected (photos
are not part of any export).

---

## Out of scope (YAGNI)
- Server-side image processing / thumbnails / HEIC conversion.
- Photos on thought records or daily moods (activity weeks only, per decision).
- Multi-user permissions beyond the existing single-user owner check.
- Including photos in print or CSV export.

## Rollout
Standard redeploy (`git pull && pnpm install && pnpm --filter @cbt/web build && systemctl restart cbt`).
`@fastify/multipart` is a new dependency, so `pnpm install` is required on deploy. Data migration: none
— `photos` defaults to `[]` for existing weeks; delete/fill touch no schema.
