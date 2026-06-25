# CBT Tracker Usability Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three usability features to the CBT tracker — activity-grid bulk fill, delete-any-record, and photo attachments on activity weeks.

**Architecture:** Monorepo (`apps/web` React SPA, `apps/api` Fastify, `packages/shared` types/Zod). Delete adds storage→service→route→UI layers. Bulk fill is pure functions in `packages/shared` wired into the activity editor (no API change). Photos use `@fastify/multipart` with originals on disk under `DATA_DIR/photos/<weekId>/` and metadata on the `ActivityWeek` JSON.

**Tech Stack:** TypeScript, Fastify 4 (run via `tsx`), React 18 + Vite 5, Vitest, pnpm (corepack), Tailwind.

## Global Constraints

- Node `>=20`; pnpm is corepack-provided — run every pnpm command as `corepack pnpm <...>` locally (plain `pnpm` on the server). Work in `/home/coi/cbt-deploy/cbt-app`, branch `claude/cbt-csv-export`.
- Production build is **web-only**: `corepack pnpm --filter @cbt/web build` (root `pnpm build` is broken — `@cbt/api` has no build step; it runs via `tsx`).
- API auth: every protected route group registers `app.addHook('preHandler', requireAuth)`; handlers read `req.currentUser!.id`. Follow the exact pattern in `apps/api/src/routes/activity-routes.ts`.
- Storage adapter is the persistence seam (`packages/shared/src/storage/storage-adapter.ts` + `apps/api/src/storage/file-storage-adapter.ts`). Binary photo files are the one exception — handled by a dedicated `PhotoStorage` keyed on `config.dataDir`.
- File adapter conventions: atomic writes via `writeJsonAtomic`; activity-week and daily-mood filenames embed a date so deletes must locate the file by listing+matching `id`; thought-record file is `thought-record-<id>.json` (deterministic).
- Photos: accept only `image/jpeg`, `image/png`, `image/webp`; reject others (incl. HEIC) with 415; size limit 10 MB; files live under `DATA_DIR/photos/<weekId>/<photoId>.<ext>` (captured by the existing daily backup of `DATA_DIR`).
- Web API calls use the `api` helper in `apps/web/src/lib/api.ts` (`credentials: 'same-origin'`). Reuse `apps/web/src/components/ConfirmDialog.tsx` for confirms. Button classes: `btn-primary`/`btn-secondary`/`btn-ghost`.
- Owner mismatch is collapsed to 404 (single-user app; avoids existence leak) — deviation from the spec's 403, noted intentionally.
- Commit after each task with `git -c user.name='coi' -c user.email='coitax@users.noreply.github.com' commit`.

## File Structure

**Create:**
- `packages/shared/src/activity/fill.ts` — pure `fillSlotRange`, `copyDaySlots`.
- `packages/shared/src/activity/fill.test.ts` — vitest for the helpers.
- `apps/api/src/storage/photo-storage.ts` — `PhotoStorage` class, `photoStorage` singleton, `ALLOWED_PHOTO_MIME`, `extForMime`.
- `apps/api/src/routes/activity-photo-routes.ts` — POST/GET/DELETE photo routes.
- `apps/api/test/helpers.ts` — build app with temp `DATA_DIR`, seed user+session, return `{ app, cookie, dataDir }`.
- `apps/api/test/delete-routes.test.ts`, `apps/api/test/photo-routes.test.ts`, `apps/api/test/storage-delete.test.ts`.

**Modify:**
- `packages/shared/src/storage/storage-adapter.ts` — add `deleteActivityWeek/ThoughtRecord/DailyMood`.
- `packages/shared/src/types/entities.ts` — add `ActivityPhoto`, `ActivityWeek.photos?`.
- `packages/shared/src/index.ts` — export new modules.
- `apps/api/src/storage/file-storage-adapter.ts` — implement the three deletes + private emotion cascade + photo-folder cleanup.
- `apps/api/src/services/activity-service.ts`, `thought-record-service.ts`, `daily-mood-service.ts` — `delete`, plus `addPhoto/removePhoto` on activity.
- `apps/api/src/routes/activity-routes.ts`, `thought-record-routes.ts`, `daily-mood-routes.ts` — `DELETE` handler.
- `apps/api/src/app.ts` — register `@fastify/multipart` + `activityPhotoRoutes`.
- `apps/api/package.json`, `apps/web/package.json`, `packages/shared/package.json` — deps/test scripts as needed.
- `apps/web/src/lib/api.ts` — add `del` + `uploadPhoto`.
- `apps/web/src/features/activity/ActivityDayEditor.tsx` — range-fill + copy-day controls.
- `apps/web/src/features/activity/ActivityDetailPage.tsx` — Delete + photo section.
- `apps/web/src/features/thought-record/ThoughtRecordDetailPage.tsx`, `apps/web/src/features/daily-mood/DailyMoodDetailPage.tsx` — Delete button.

---

## Feature B first (lowest risk, no API): Activity bulk fill

### Task B1: Pure fill helpers in shared

**Files:**
- Create: `packages/shared/src/activity/fill.ts`
- Test: `packages/shared/src/activity/fill.test.ts`
- Modify: `packages/shared/src/index.ts`

**Interfaces:**
- Produces: `fillSlotRange(day, startLabel, endLabel, activityText, pmText?) => day` and `copyDaySlots(source, targets) => targets[]`, typed on `ActivityWeekInput['days'][number]` (the day shape used by the web wizard).

- [ ] **Step 1: Write the failing test**

```ts
// packages/shared/src/activity/fill.test.ts
import { describe, it, expect } from 'vitest';
import { fillSlotRange, copyDaySlots } from './fill.js';
import type { ActivityWeekInput } from '../index.js';

type Day = ActivityWeekInput['days'][number];

function day(slots: Array<[string, string | null, string | null]>): Day {
  return {
    day_of_week: 'Monday',
    overall_mood_0_10: 5,
    slots: slots.map(([time_label, activity_text, pm_rating_text], i) => ({
      time_label, activity_text, pm_rating_text, sort_order: i,
    })),
  } as Day;
}

describe('fillSlotRange', () => {
  it('fills activity across an inclusive label range, leaving pm untouched when blank', () => {
    const d = day([['08:00', null, 'x'], ['09:00', null, null], ['10:00', null, null], ['11:00', null, null]]);
    const out = fillSlotRange(d, '09:00', '10:00', 'Work');
    expect(out.slots.map((s) => s.activity_text)).toEqual([null, 'Work', 'Work', null]);
    expect(out.slots[0].pm_rating_text).toBe('x'); // outside range untouched
    expect(d.slots[1].activity_text).toBe(null);     // input not mutated
  });

  it('sets pm_rating_text only when pmText is provided', () => {
    const d = day([['08:00', null, 'keep'], ['09:00', null, 'keep']]);
    const out = fillSlotRange(d, '08:00', '09:00', 'Work', 'P3/M2');
    expect(out.slots.every((s) => s.pm_rating_text === 'P3/M2')).toBe(true);
  });
});

describe('copyDaySlots', () => {
  it('deep-copies source slots onto targets without copying mood and without aliasing', () => {
    const src = day([['08:00', 'Run', 'P5'], ['09:00', 'Eat', null]]);
    const t = day([['08:00', null, null], ['09:00', null, null]]);
    t.overall_mood_0_10 = 9;
    const [copied] = copyDaySlots(src, [t]);
    expect(copied.slots.map((s) => s.activity_text)).toEqual(['Run', 'Eat']);
    expect(copied.overall_mood_0_10).toBe(9); // mood preserved, not copied from source
    copied.slots[0].activity_text = 'Mutated';
    expect(src.slots[0].activity_text).toBe('Run'); // no shared references
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `corepack pnpm --filter @cbt/shared test -- fill`
Expected: FAIL — `fill.js` not found / exports missing.

- [ ] **Step 3: Implement the helpers**

```ts
// packages/shared/src/activity/fill.ts
import type { ActivityWeekInput } from '../zod/schemas.js'; // ActivityWeekInput = z.infer<typeof activityWeekInputSchema>

type Day = ActivityWeekInput['days'][number];

/**
 * Return a new day with activity_text set on every slot whose time_label is
 * within [startLabel, endLabel] inclusive (by slot order). pm_rating_text is
 * set only when pmText is a non-empty string; otherwise existing pm is kept.
 * Input is not mutated.
 */
export function fillSlotRange(
  day: Day,
  startLabel: string,
  endLabel: string,
  activityText: string,
  pmText?: string,
): Day {
  const labels = day.slots.map((s) => s.time_label);
  const start = labels.indexOf(startLabel);
  const end = labels.indexOf(endLabel);
  if (start === -1 || end === -1) return { ...day, slots: day.slots.map((s) => ({ ...s })) };
  const lo = Math.min(start, end);
  const hi = Math.max(start, end);
  const slots = day.slots.map((s, i) =>
    i >= lo && i <= hi
      ? { ...s, activity_text: activityText, pm_rating_text: pmText ? pmText : s.pm_rating_text }
      : { ...s },
  );
  return { ...day, slots };
}

/**
 * Deep-copy source.slots onto each target day, replacing target slots.
 * overall_mood_0_10 and day_of_week of each target are preserved.
 * Returns new target day objects; inputs are not mutated.
 */
export function copyDaySlots(source: Day, targets: Day[]): Day[] {
  return targets.map((t) => ({
    ...t,
    slots: source.slots.map((s) => ({ ...s })),
  }));
}
```

Then export from the package index:

```ts
// packages/shared/src/index.ts  (add)
export * from './activity/fill.js';
```

> `ActivityWeekInput` is declared in `packages/shared/src/zod/schemas.ts` and re-exported from the package index. Import it in `fill.ts` from `../zod/schemas.js` (not from `../index.js`, to avoid a barrel cycle — the index re-exports `fill.js`).

- [ ] **Step 4: Run test, verify it passes**

Run: `corepack pnpm --filter @cbt/shared test -- fill`
Expected: PASS (all cases). Then `corepack pnpm --filter @cbt/shared typecheck` → clean.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/activity packages/shared/src/index.ts
git -c user.name='coi' -c user.email='coitax@users.noreply.github.com' commit -m "feat(activity): pure fillSlotRange + copyDaySlots helpers"
```

### Task B2: Range-fill control in the day editor

**Files:**
- Modify: `apps/web/src/features/activity/ActivityDayEditor.tsx`

**Interfaces:**
- Consumes: `fillSlotRange` from `@cbt/shared`; the editor's existing `day` prop and `onChange(day)` callback.

- [ ] **Step 1: Add range-fill UI state + control** above the slot list. Use the day's own `time_label`s for the start/end `<select>` options.

```tsx
// near top of the component body
import { fillSlotRange } from '@cbt/shared';
const [rfActivity, setRfActivity] = useState('');
const [rfPm, setRfPm] = useState('');
const labels = day.slots.map((s) => s.time_label);
const [rfStart, setRfStart] = useState(labels[0] ?? '');
const [rfEnd, setRfEnd] = useState(labels[labels.length - 1] ?? '');

function applyRangeFill() {
  if (!rfActivity.trim()) return;
  onChange(fillSlotRange(day, rfStart, rfEnd, rfActivity.trim(), rfPm.trim() || undefined));
  setRfActivity('');
  setRfPm('');
}
```

```tsx
{/* render above the slot grid */}
<div className="flex flex-wrap items-end gap-2 rounded-md bg-accent-soft/40 p-2 text-sm">
  <input className="input flex-1" placeholder="Activity (e.g. Work)" value={rfActivity}
         onChange={(e) => setRfActivity(e.target.value)} />
  <input className="input w-28" placeholder="P/M (optional)" value={rfPm}
         onChange={(e) => setRfPm(e.target.value)} />
  <select className="input w-28" value={rfStart} onChange={(e) => setRfStart(e.target.value)}>
    {labels.map((l) => <option key={l} value={l}>{l}</option>)}
  </select>
  <span>to</span>
  <select className="input w-28" value={rfEnd} onChange={(e) => setRfEnd(e.target.value)}>
    {labels.map((l) => <option key={l} value={l}>{l}</option>)}
  </select>
  <button type="button" className="btn-secondary" onClick={applyRangeFill}>Fill range</button>
</div>
```

> If `.input` is not an existing class, copy the className used by the existing slot `<input>` elements in this file.

- [ ] **Step 2: Verify in dev**

Run: `corepack pnpm --filter @cbt/web dev`, open a week's editor, type "Work", pick 09:00→12:00, click Fill range → those rows populate; autosave persists. Confirm `corepack pnpm --filter @cbt/web typecheck` is clean.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/activity/ActivityDayEditor.tsx
git -c user.name='coi' -c user.email='coitax@users.noreply.github.com' commit -m "feat(activity): range-fill control in day editor"
```

### Task B3: Copy-day-to-days control

**Files:**
- Modify: `apps/web/src/features/activity/ActivityWizardPage.tsx` (owns all 7 days) — add a copy control per day, since copying needs sibling days.

**Interfaces:**
- Consumes: `copyDaySlots` from `@cbt/shared`; the wizard's `data: ActivityWeekInput` + `setData`.

- [ ] **Step 1: Add a copy handler in the wizard** that, given a source day index and target indexes, applies `copyDaySlots` and writes back into `data.days`.

```tsx
import { copyDaySlots } from '@cbt/shared';

function copyDayToDays(sourceIdx: number, targetIdxs: number[]) {
  setData((prev) => {
    const source = prev.days[sourceIdx];
    const copied = copyDaySlots(source, targetIdxs.map((i) => prev.days[i]));
    const days = prev.days.map((d, i) => {
      const pos = targetIdxs.indexOf(i);
      return pos === -1 ? d : copied[pos];
    });
    return { ...prev, days };
  });
}
```

- [ ] **Step 2: Render a "Copy this day to…" control** for the currently-edited day (the wizard already renders one day per step via `ActivityDayEditor`). Add, beside that editor, a small multiselect of the other day names + an Apply button that calls `copyDayToDays`. Confirm before overwriting:

```tsx
const [copyTargets, setCopyTargets] = useState<number[]>([]);
// currentDayIdx is the index the wizard is editing (derive from existing step/day state in this file)
function applyCopy() {
  if (copyTargets.length === 0) return;
  const hasContent = copyTargets.some((i) => data.days[i].slots.some((s) => s.activity_text));
  if (hasContent && !window.confirm('Overwrite the selected days’ activities?')) return;
  copyDayToDays(currentDayIdx, copyTargets);
  setCopyTargets([]);
}
```

```tsx
<div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
  <span>Copy this day to:</span>
  {data.days.map((d, i) => i === currentDayIdx ? null : (
    <label key={d.day_of_week} className="flex items-center gap-1">
      <input type="checkbox" checked={copyTargets.includes(i)}
        onChange={(e) => setCopyTargets((p) => e.target.checked ? [...p, i] : p.filter((x) => x !== i))} />
      {d.day_of_week.slice(0, 3)}
    </label>
  ))}
  <button type="button" className="btn-secondary" onClick={applyCopy}>Apply</button>
</div>
```

> `currentDayIdx`: reuse the wizard's existing per-day step variable (the file already maps `step` to a day). If the wizard shows all days at once instead, render this control inside each `ActivityDayEditor` via a new `onCopyToDays` prop and pass the index down.

- [ ] **Step 3: Verify in dev** — fill Monday, copy to Tue/Wed, confirm slots replicate and moods are untouched; typecheck clean.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/activity/ActivityWizardPage.tsx
git -c user.name='coi' -c user.email='coitax@users.noreply.github.com' commit -m "feat(activity): copy one day's slots to other days"
```

---

## Feature A: Delete any record

### Task A1: Storage delete methods + emotion cascade

**Files:**
- Modify: `packages/shared/src/storage/storage-adapter.ts`
- Modify: `apps/api/src/storage/file-storage-adapter.ts`
- Create: `apps/api/test/storage-delete.test.ts`
- Modify: `apps/api/package.json` (add vitest devDep + `"test": "vitest run"` if absent)

**Interfaces:**
- Produces: `deleteActivityWeek(id)`, `deleteThoughtRecord(id)`, `deleteDailyMood(id)` on `StorageAdapter`, all `Promise<void>`, idempotent.

- [ ] **Step 1: Add to the interface**

```ts
// packages/shared/src/storage/storage-adapter.ts — under each section
deleteActivityWeek(id: string): Promise<void>;
deleteThoughtRecord(id: string): Promise<void>;
deleteDailyMood(id: string): Promise<void>;
```

- [ ] **Step 2: Write the failing adapter test**

```ts
// apps/api/test/storage-delete.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FileStorageAdapter } from '../src/storage/file-storage-adapter.js';

describe('FileStorageAdapter deletes', () => {
  it('removes an activity week and its emotion selections, idempotently', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cbt-'));
    const s = new FileStorageAdapter(dir);
    await s.init();
    const now = new Date(0).toISOString();
    await s.saveActivityWeek({ id: 'w1', user_id: 'u1', week_start_date: '2026-01-04', title: null, notes: null, is_draft: true, days: [], created_at: now, updated_at: now } as any);
    await s.saveEmotionSelection({ id: 'e1', parent_type: 'activity_week', parent_id: 'w1', source_type: 'free_text', primary_emotion: null, secondary_emotion: null, tertiary_emotion: null, free_text: 'x', created_at: now, updated_at: now } as any);
    await s.deleteActivityWeek('w1');
    expect(await s.getActivityWeekById('w1')).toBeNull();
    expect(await s.getEmotionSelections('activity_week', 'w1')).toEqual([]);
    await s.deleteActivityWeek('w1'); // no throw second time
  });
});
```

- [ ] **Step 3: Run test, verify it fails**

Run: `corepack pnpm --filter @cbt/api test -- storage-delete`
Expected: FAIL — `deleteActivityWeek` is not a function (and/or vitest missing → first add `vitest` devDep to `apps/api` and `"test": "vitest run"`, then re-run).

- [ ] **Step 4: Implement in the file adapter**

```ts
// apps/api/src/storage/file-storage-adapter.ts — add private cascade + 3 deletes
private async deleteEmotionSelectionsForParent(parentType: string, parentId: string): Promise<void> {
  const items = await this.listJson<EmotionSelection>('emotion-selections');
  await Promise.all(
    items
      .filter((e) => e.parent_type === parentType && e.parent_id === parentId)
      .map((e) => fs.rm(this.dir('emotion-selections', `emotion-${e.id}.json`), { force: true })),
  );
}

private async rmByIdInDir(subdir: string, id: string): Promise<void> {
  let names: string[];
  try { names = await fs.readdir(this.dir(subdir)); }
  catch (err) { if ((err as NodeJS.ErrnoException).code === 'ENOENT') return; throw err; }
  for (const n of names.filter((n) => n.endsWith('.json') && !n.endsWith('.tmp'))) {
    const rec = await this.readJson<{ id: string }>(this.dir(subdir, n));
    if (rec?.id === id) await fs.rm(this.dir(subdir, n), { force: true });
  }
}

async deleteActivityWeek(id: string): Promise<void> {
  await this.rmByIdInDir('activity-weeks', id);
  await this.deleteEmotionSelectionsForParent('activity_week', id);
  await fs.rm(this.dir('photos', id), { recursive: true, force: true });
}

async deleteThoughtRecord(id: string): Promise<void> {
  await fs.rm(this.dir('thought-records', `thought-record-${id}.json`), { force: true });
  await this.deleteEmotionSelectionsForParent('thought_record', id);
}

async deleteDailyMood(id: string): Promise<void> {
  await this.rmByIdInDir('daily-moods', id);
  await this.deleteEmotionSelectionsForParent('daily_mood', id);
}
```

- [ ] **Step 5: Run test, verify it passes**

Run: `corepack pnpm --filter @cbt/api test -- storage-delete` → PASS. `corepack pnpm --filter @cbt/api typecheck` → clean.

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/storage/storage-adapter.ts apps/api/src/storage/file-storage-adapter.ts apps/api/test/storage-delete.test.ts apps/api/package.json
git -c user.name='coi' -c user.email='coitax@users.noreply.github.com' commit -m "feat(storage): delete methods with emotion + photo cascade"
```

### Task A2: Service delete methods

**Files:**
- Modify: `apps/api/src/services/activity-service.ts`, `thought-record-service.ts`, `daily-mood-service.ts`

**Interfaces:**
- Produces: `ActivityService.delete(userId, id)`, `ThoughtRecordService.delete(userId, id)`, `DailyMoodService.delete(userId, id)`, each `Promise<boolean>` (true = deleted, false = missing/not-owner).

- [ ] **Step 1: Implement** (self-contained owner check, mirrors `get`):

```ts
// activity-service.ts
async delete(userId: string, id: string): Promise<boolean> {
  const week = await this.storage.getActivityWeekById(id);
  if (!week || week.user_id !== userId) return false;
  await this.storage.deleteActivityWeek(id);
  return true;
}
```

```ts
// thought-record-service.ts
async delete(userId: string, id: string): Promise<boolean> {
  const rec = await this.storage.getThoughtRecordById(id);
  if (!rec || rec.user_id !== userId) return false;
  await this.storage.deleteThoughtRecord(id);
  return true;
}
```

```ts
// daily-mood-service.ts
async delete(userId: string, id: string): Promise<boolean> {
  const mood = await this.storage.getDailyMoodById(id);
  if (!mood || mood.user_id !== userId) return false;
  await this.storage.deleteDailyMood(id);
  return true;
}
```

- [ ] **Step 2: Typecheck**

Run: `corepack pnpm --filter @cbt/api typecheck` → clean. (Route test in A3 exercises these end-to-end.)

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/services
git -c user.name='coi' -c user.email='coitax@users.noreply.github.com' commit -m "feat(services): delete with owner check on all three records"
```

### Task A3: DELETE routes + test harness + api.del

**Files:**
- Create: `apps/api/test/helpers.ts`, `apps/api/test/delete-routes.test.ts`
- Modify: `apps/api/src/routes/activity-routes.ts`, `thought-record-routes.ts`, `daily-mood-routes.ts`
- Modify: `apps/web/src/lib/api.ts`

**Interfaces:**
- Consumes: `services.*.delete` (A2). Produces: `DELETE /api/activity-weeks/:id` (+ thought-records, daily-moods) → 204 / 404; web `api.del<T>(path)`.

- [ ] **Step 1: Write the test harness**

```ts
// apps/api/test/helpers.ts
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export async function makeApp() {
  const dataDir = await mkdtemp(join(tmpdir(), 'cbt-api-'));
  process.env.DATA_DIR = dataDir;
  process.env.NODE_ENV = 'test';
  const { buildApp } = await import('../src/app.js');
  const { storage } = await import('../src/storage/index.js');
  await storage.init();
  const now = new Date(0).toISOString();
  const user = { id: 'u1', username: 'tester', email: null, password_hash: 'x', created_at: now, updated_at: now };
  await storage.saveUser(user as any);
  const sessionId = 'testsession_0001';
  await storage.createSession({ id: sessionId, user_id: 'u1', created_at: now, expires_at: new Date(Date.now() + 3600_000).toISOString() } as any);
  const app = await buildApp();
  return { app, storage, dataDir, cookie: `cbt_session=${sessionId}` };
}
```

> `config.session.cookieName` is `cbt_session` (see `apps/api/src/config.ts`). `getSession` requires the id to match `^[A-Za-z0-9_-]+$` — `testsession_0001` complies.

- [ ] **Step 2: Write the failing route test**

```ts
// apps/api/test/delete-routes.test.ts
import { describe, it, expect } from 'vitest';
import { makeApp } from './helpers.js';

describe('DELETE record routes', () => {
  it('deletes an owned activity week (204) and 404s afterward', async () => {
    const { app, storage, cookie } = await makeApp();
    const now = new Date(0).toISOString();
    await storage.saveActivityWeek({ id: 'w1', user_id: 'u1', week_start_date: '2026-01-04', title: null, notes: null, is_draft: true, days: [], created_at: now, updated_at: now } as any);
    const del = await app.inject({ method: 'DELETE', url: '/api/activity-weeks/w1', headers: { cookie } });
    expect(del.statusCode).toBe(204);
    const again = await app.inject({ method: 'DELETE', url: '/api/activity-weeks/w1', headers: { cookie } });
    expect(again.statusCode).toBe(404);
  });

  it('401 without a session cookie', async () => {
    const { app } = await makeApp();
    const res = await app.inject({ method: 'DELETE', url: '/api/activity-weeks/anything' });
    expect(res.statusCode).toBe(401);
  });
});
```

- [ ] **Step 3: Run test, verify it fails**

Run: `corepack pnpm --filter @cbt/api test -- delete-routes`
Expected: FAIL — route returns 404→but delete handler missing returns Fastify 404 for unknown route on the *first* call too; assertion `204` fails.

- [ ] **Step 4: Add the DELETE handlers** (one per route file, same shape):

```ts
// activity-routes.ts (inside activityRoutes, after the PUT handler)
app.delete<{ Params: { id: string } }>('/api/activity-weeks/:id', async (req, reply) => {
  const ok = await services.activity.delete(req.currentUser!.id, req.params.id);
  if (!ok) return reply.code(404).send({ error: 'not_found' });
  return reply.code(204).send();
});
```

```ts
// thought-record-routes.ts
app.delete<{ Params: { id: string } }>('/api/thought-records/:id', async (req, reply) => {
  const ok = await services.thoughtRecord.delete(req.currentUser!.id, req.params.id);
  if (!ok) return reply.code(404).send({ error: 'not_found' });
  return reply.code(204).send();
});
```

```ts
// daily-mood-routes.ts
app.delete<{ Params: { id: string } }>('/api/daily-moods/:id', async (req, reply) => {
  const ok = await services.dailyMood.delete(req.currentUser!.id, req.params.id);
  if (!ok) return reply.code(404).send({ error: 'not_found' });
  return reply.code(204).send();
});
```

- [ ] **Step 5: Run test, verify it passes**

Run: `corepack pnpm --filter @cbt/api test -- delete-routes` → PASS.

- [ ] **Step 6: Add `del` to the web API client**

```ts
// apps/web/src/lib/api.ts — add to the `api` object
del: <T>(path: string) => request<T>('DELETE', path),
```

Run: `corepack pnpm --filter @cbt/web typecheck` → clean.

- [ ] **Step 7: Commit**

```bash
git add apps/api/test apps/api/src/routes apps/web/src/lib/api.ts
git -c user.name='coi' -c user.email='coitax@users.noreply.github.com' commit -m "feat(api): DELETE routes for all records + web api.del + test harness"
```

### Task A4: Delete buttons on the three detail pages

**Files:**
- Modify: `apps/web/src/features/activity/ActivityDetailPage.tsx`, `apps/web/src/features/thought-record/ThoughtRecordDetailPage.tsx`, `apps/web/src/features/daily-mood/DailyMoodDetailPage.tsx`

**Interfaces:**
- Consumes: `api.del`, `ConfirmDialog`, `useNavigate`.

- [ ] **Step 1: Add Delete to ActivityDetailPage** — a `btn-ghost` button in the `PageHeader` actions, a `ConfirmDialog`, and navigation back to the list on success:

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '../../components/ConfirmDialog';
// ...
const navigate = useNavigate();
const [confirming, setConfirming] = useState(false);
async function handleDelete() {
  await api.del(`/api/activity-weeks/${week.id}`);
  navigate('/app/activity');
}
```

```tsx
actions={
  <>
    <Link to={`/app/activity/${week.id}/edit`} className="btn-secondary">Edit</Link>
    <Link to={`/app/activity/${week.id}/print`} className="btn-primary">Print</Link>
    <button className="btn-ghost" onClick={() => setConfirming(true)}>Delete</button>
  </>
}
```

```tsx
{/* before the closing fragment/wrapper */}
<ConfirmDialog
  open={confirming}
  title="Delete this activity week?"
  message="This can't be undone."
  confirmLabel="Delete"
  onConfirm={() => { setConfirming(false); void handleDelete(); }}
  onCancel={() => setConfirming(false)}
/>
```

- [ ] **Step 2: Repeat for ThoughtRecordDetailPage** (`api.del(`/api/thought-records/${record.id}`)`, navigate `'/app/thought-records'`, title "Delete this thought record?").

- [ ] **Step 3: Repeat for DailyMoodDetailPage** (`api.del(`/api/daily-moods/${mood.id}`)`, navigate `'/app/daily-mood'`, title "Delete this daily mood entry?").

- [ ] **Step 4: Verify in dev** — `corepack pnpm --filter @cbt/web dev`; on each detail page, Delete → confirm → record gone, list refreshes. `corepack pnpm --filter @cbt/web typecheck` clean.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/activity/ActivityDetailPage.tsx apps/web/src/features/thought-record/ThoughtRecordDetailPage.tsx apps/web/src/features/daily-mood/DailyMoodDetailPage.tsx
git -c user.name='coi' -c user.email='coitax@users.noreply.github.com' commit -m "feat(web): delete buttons with confirm on all detail pages"
```

---

## Feature C: Photo attachments on activity weeks

### Task C1: ActivityPhoto type + PhotoStorage

**Files:**
- Modify: `packages/shared/src/types/entities.ts`, `packages/shared/src/index.ts`
- Create: `apps/api/src/storage/photo-storage.ts`, `apps/api/test/storage-delete.test.ts` (extend) or a new `apps/api/test/photo-storage.test.ts`

**Interfaces:**
- Produces: `ActivityPhoto` type; `ActivityWeek.photos?: ActivityPhoto[]`; `PhotoStorage` with `save/filePath/delete`; `ALLOWED_PHOTO_MIME`, `extForMime`.

- [ ] **Step 1: Add types**

```ts
// packages/shared/src/types/entities.ts
export interface ActivityPhoto {
  id: string;
  filename: string;   // original upload name
  mime: string;       // image/jpeg | image/png | image/webp
  size: number;       // bytes
  created_at: IsoTimestamp;
}
```
Add to `ActivityWeek`:
```ts
  /** Attached handwritten-journal photos (optional; defaults to [] for legacy records). */
  photos?: ActivityPhoto[];
```

- [ ] **Step 2: Write the failing PhotoStorage test**

```ts
// apps/api/test/photo-storage.test.ts
import { describe, it, expect } from 'vitest';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PhotoStorage, extForMime, ALLOWED_PHOTO_MIME } from '../src/storage/photo-storage.js';

describe('PhotoStorage', () => {
  it('saves, locates, and deletes a photo file', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cbt-ph-'));
    const ps = new PhotoStorage(dir);
    const buf = Buffer.from([1, 2, 3]);
    await ps.save('w1', 'p1', 'jpg', buf);
    const fp = ps.filePath('w1', 'p1', 'jpg');
    expect(await readFile(fp)).toEqual(buf);
    await ps.delete('w1', 'p1', 'jpg');
    await expect(readFile(fp)).rejects.toThrow();
  });
  it('maps mimes to extensions and rejects others', () => {
    expect(extForMime('image/jpeg')).toBe('jpg');
    expect(extForMime('image/png')).toBe('png');
    expect(extForMime('image/webp')).toBe('webp');
    expect(extForMime('image/heic')).toBeNull();
    expect(ALLOWED_PHOTO_MIME.has('image/heic')).toBe(false);
  });
});
```

- [ ] **Step 3: Run, verify fail** → `corepack pnpm --filter @cbt/api test -- photo-storage` FAIL (module missing).

- [ ] **Step 4: Implement PhotoStorage**

```ts
// apps/api/src/storage/photo-storage.ts
import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.js';

export const ALLOWED_PHOTO_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function extForMime(mime: string): string | null {
  switch (mime) {
    case 'image/jpeg': return 'jpg';
    case 'image/png': return 'png';
    case 'image/webp': return 'webp';
    default: return null;
  }
}

export class PhotoStorage {
  constructor(private readonly dataDir: string) {}
  private weekDir(weekId: string): string { return path.join(this.dataDir, 'photos', weekId); }
  filePath(weekId: string, photoId: string, ext: string): string {
    return path.join(this.weekDir(weekId), `${photoId}.${ext}`);
  }
  async save(weekId: string, photoId: string, ext: string, buf: Buffer): Promise<void> {
    await fs.mkdir(this.weekDir(weekId), { recursive: true });
    await fs.writeFile(this.filePath(weekId, photoId, ext), buf);
  }
  async delete(weekId: string, photoId: string, ext: string): Promise<void> {
    await fs.rm(this.filePath(weekId, photoId, ext), { force: true });
  }
}

export const photoStorage = new PhotoStorage(config.dataDir);
```

- [ ] **Step 5: Run, verify pass** → test PASS; `corepack pnpm --filter @cbt/api typecheck` + `corepack pnpm --filter @cbt/shared typecheck` clean.

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/types/entities.ts packages/shared/src/index.ts apps/api/src/storage/photo-storage.ts apps/api/test/photo-storage.test.ts
git -c user.name='coi' -c user.email='coitax@users.noreply.github.com' commit -m "feat(photos): ActivityPhoto type + PhotoStorage"
```

### Task C2: multipart dep + activity photo service methods

**Files:**
- Modify: `apps/api/package.json` (add `@fastify/multipart`), `apps/api/src/app.ts`, `apps/api/src/services/activity-service.ts`

**Interfaces:**
- Produces: `ActivityService.addPhoto(userId, weekId, photo)` → `Promise<ActivityWeek | null>`; `ActivityService.removePhoto(userId, weekId, photoId)` → `Promise<ActivityPhoto | null>` (returns the removed metadata so the route can delete the file).

- [ ] **Step 1: Add the dependency**

```bash
corepack pnpm --filter @cbt/api add @fastify/multipart
```

- [ ] **Step 2: Register multipart in app.ts** (before route registration):

```ts
import multipart from '@fastify/multipart';
// ... inside buildApp, after `await app.register(cookie);`
await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024, files: 1 } });
```

- [ ] **Step 3: Add service methods** (import `ActivityPhoto`, reuse `nowIso`):

```ts
// activity-service.ts
import type { ActivityWeek, ActivityWeekInput, ActivityPhoto, StorageAdapter } from '@cbt/shared';

async addPhoto(userId: string, weekId: string, photo: ActivityPhoto): Promise<ActivityWeek | null> {
  const week = await this.get(userId, weekId);
  if (!week) return null;
  const updated: ActivityWeek = { ...week, photos: [...(week.photos ?? []), photo], updated_at: nowIso() };
  return this.storage.saveActivityWeek(updated);
}

async removePhoto(userId: string, weekId: string, photoId: string): Promise<ActivityPhoto | null> {
  const week = await this.get(userId, weekId);
  if (!week) return null;
  const photo = (week.photos ?? []).find((p) => p.id === photoId);
  if (!photo) return null;
  const updated: ActivityWeek = { ...week, photos: (week.photos ?? []).filter((p) => p.id !== photoId), updated_at: nowIso() };
  await this.storage.saveActivityWeek(updated);
  return photo;
}
```

- [ ] **Step 4: Typecheck** → `corepack pnpm --filter @cbt/api typecheck` clean.

- [ ] **Step 5: Commit**

```bash
git add apps/api/package.json apps/api/src/app.ts apps/api/src/services/activity-service.ts pnpm-lock.yaml
git -c user.name='coi' -c user.email='coitax@users.noreply.github.com' commit -m "feat(photos): multipart + activity addPhoto/removePhoto"
```

### Task C3: Photo routes

**Files:**
- Create: `apps/api/src/routes/activity-photo-routes.ts`, `apps/api/test/photo-routes.test.ts`
- Modify: `apps/api/src/app.ts` (register the router)

**Interfaces:**
- Consumes: `services.activity.addPhoto/removePhoto`, `photoStorage`, `extForMime`, `ALLOWED_PHOTO_MIME`, `requireAuth`. Produces: `POST/GET/DELETE /api/activity-weeks/:id/photos[/:photoId]`.

- [ ] **Step 1: Write the failing route test** (inline 1×1 PNG):

```ts
// apps/api/test/photo-routes.test.ts
import { describe, it, expect } from 'vitest';
import { makeApp } from './helpers.js';

const PNG_1x1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

function multipartBody(boundary: string, buf: Buffer, filename: string, mime: string): Buffer {
  const head = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mime}\r\n\r\n`;
  const tail = `\r\n--${boundary}--\r\n`;
  return Buffer.concat([Buffer.from(head), buf, Buffer.from(tail)]);
}

describe('activity photo routes', () => {
  it('uploads, fetches, and deletes a PNG on an owned week', async () => {
    const { app, storage, cookie } = await makeApp();
    const now = new Date(0).toISOString();
    await storage.saveActivityWeek({ id: 'w1', user_id: 'u1', week_start_date: '2026-01-04', title: null, notes: null, is_draft: false, days: [], created_at: now, updated_at: now } as any);
    const boundary = 'X-BOUNDARY-1';
    const up = await app.inject({
      method: 'POST', url: '/api/activity-weeks/w1/photos',
      headers: { cookie, 'content-type': `multipart/form-data; boundary=${boundary}` },
      payload: multipartBody(boundary, PNG_1x1, 'journal.png', 'image/png'),
    });
    expect(up.statusCode).toBe(201);
    const photo = up.json();
    expect(photo.mime).toBe('image/png');

    const get = await app.inject({ method: 'GET', url: `/api/activity-weeks/w1/photos/${photo.id}`, headers: { cookie } });
    expect(get.statusCode).toBe(200);
    expect(get.headers['content-type']).toContain('image/png');

    const del = await app.inject({ method: 'DELETE', url: `/api/activity-weeks/w1/photos/${photo.id}`, headers: { cookie } });
    expect(del.statusCode).toBe(204);
    const after = await storage.getActivityWeekById('w1');
    expect(after?.photos ?? []).toEqual([]);
  });

  it('rejects an unsupported mime with 415', async () => {
    const { app, storage, cookie } = await makeApp();
    const now = new Date(0).toISOString();
    await storage.saveActivityWeek({ id: 'w2', user_id: 'u1', week_start_date: '2026-01-11', title: null, notes: null, is_draft: false, days: [], created_at: now, updated_at: now } as any);
    const boundary = 'X-BOUNDARY-2';
    const res = await app.inject({
      method: 'POST', url: '/api/activity-weeks/w2/photos',
      headers: { cookie, 'content-type': `multipart/form-data; boundary=${boundary}` },
      payload: multipartBody(boundary, Buffer.from([0, 1, 2]), 'x.heic', 'image/heic'),
    });
    expect(res.statusCode).toBe(415);
  });
});
```

- [ ] **Step 2: Run, verify fail** → `corepack pnpm --filter @cbt/api test -- photo-routes` FAIL (routes 404).

- [ ] **Step 3: Implement the router**

```ts
// apps/api/src/routes/activity-photo-routes.ts
import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import type { FastifyInstance } from 'fastify';
import type { ActivityPhoto } from '@cbt/shared';
import { services } from '../services/index.js';
import { requireAuth } from '../auth/session.js';
import { photoStorage, extForMime, ALLOWED_PHOTO_MIME } from '../storage/photo-storage.js';

export async function activityPhotoRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth);

  app.post<{ Params: { id: string } }>('/api/activity-weeks/:id/photos', async (req, reply) => {
    const week = await services.activity.get(req.currentUser!.id, req.params.id);
    if (!week) return reply.code(404).send({ error: 'not_found' });
    const data = await req.file();
    if (!data) return reply.code(400).send({ error: 'no_file' });
    if (!ALLOWED_PHOTO_MIME.has(data.mimetype)) {
      return reply.code(415).send({ error: 'unsupported_media_type', message: 'Only JPEG, PNG, or WEBP are allowed (HEIC is not supported).' });
    }
    const buf = await data.toBuffer(); // @fastify/multipart enforces the 10MB fileSize limit
    const ext = extForMime(data.mimetype)!;
    const photo: ActivityPhoto = {
      id: randomUUID(), filename: data.filename, mime: data.mimetype, size: buf.length,
      created_at: new Date().toISOString(),
    };
    await photoStorage.save(week.id, photo.id, ext, buf);
    const updated = await services.activity.addPhoto(req.currentUser!.id, week.id, photo);
    if (!updated) { await photoStorage.delete(week.id, photo.id, ext); return reply.code(404).send({ error: 'not_found' }); }
    return reply.code(201).send(photo);
  });

  app.get<{ Params: { id: string; photoId: string } }>('/api/activity-weeks/:id/photos/:photoId', async (req, reply) => {
    const week = await services.activity.get(req.currentUser!.id, req.params.id);
    if (!week) return reply.code(404).send({ error: 'not_found' });
    const photo = (week.photos ?? []).find((p) => p.id === req.params.photoId);
    if (!photo) return reply.code(404).send({ error: 'not_found' });
    const ext = extForMime(photo.mime)!;
    return reply.type(photo.mime).send(createReadStream(photoStorage.filePath(week.id, photo.id, ext)));
  });

  app.delete<{ Params: { id: string; photoId: string } }>('/api/activity-weeks/:id/photos/:photoId', async (req, reply) => {
    const removed = await services.activity.removePhoto(req.currentUser!.id, req.params.id, req.params.photoId);
    if (!removed) return reply.code(404).send({ error: 'not_found' });
    const ext = extForMime(removed.mime)!;
    await photoStorage.delete(req.params.id, removed.id, ext);
    return reply.code(204).send();
  });
}
```

Register it in `app.ts`:
```ts
import { activityPhotoRoutes } from './routes/activity-photo-routes.js';
// after activityRoutes registration:
await app.register(activityPhotoRoutes);
```

- [ ] **Step 4: Run, verify pass** → `corepack pnpm --filter @cbt/api test` (all api tests) PASS. Typecheck clean.

> If the 415 test fails because `req.file()` throws on the limit/`files` cap rather than returning, wrap `req.file()` in try/catch and map a thrown `FST_REQ_FILE_TOO_LARGE`/`FST_FILES_LIMIT` to 413/415 respectively; keep the mime check returning 415.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/routes/activity-photo-routes.ts apps/api/src/app.ts apps/api/test/photo-routes.test.ts
git -c user.name='coi' -c user.email='coitax@users.noreply.github.com' commit -m "feat(photos): upload/fetch/delete routes for activity-week photos"
```

### Task C4: Photo UI on the activity detail page

**Files:**
- Modify: `apps/web/src/lib/api.ts` (add `uploadPhoto`), `apps/web/src/features/activity/ActivityDetailPage.tsx`

**Interfaces:**
- Consumes: photo routes (C3), `api.del`. Produces: `uploadPhoto(weekId, file) => Promise<ActivityPhoto>`.

- [ ] **Step 1: Add the upload helper** (FormData — let the browser set the multipart boundary):

```ts
// apps/web/src/lib/api.ts
import type { ActivityPhoto } from '@cbt/shared';
export async function uploadPhoto(weekId: string, file: File): Promise<ActivityPhoto> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`/api/activity-weeks/${weekId}/photos`, { method: 'POST', body: form, credentials: 'same-origin' });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new ApiError(res.status, (data as { error?: string })?.error ?? res.statusText);
  }
  return res.json() as Promise<ActivityPhoto>;
}
```

- [ ] **Step 2: Add the photo section to ActivityDetailPage** — load already gives `week.photos`; render thumbnails (the `<img>` GET sends the cookie via same-origin), an upload input, and per-photo delete:

```tsx
import { useState } from 'react';
import { api, uploadPhoto } from '../../lib/api';
import type { ActivityWeek, ActivityPhoto } from '@cbt/shared';
// ...
const [photos, setPhotos] = useState<ActivityPhoto[]>(week.photos ?? []);
// keep in sync when week loads: in the existing setWeek path, also setPhotos(w.photos ?? [])

async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const p = await uploadPhoto(week.id, file);
    setPhotos((prev) => [...prev, p]);
  } catch (err) {
    alert(err instanceof Error ? err.message : 'Upload failed');
  } finally {
    e.target.value = '';
  }
}

async function onDeletePhoto(id: string) {
  await api.del(`/api/activity-weeks/${week.id}/photos/${id}`);
  setPhotos((prev) => prev.filter((p) => p.id !== id));
}
```

```tsx
<section className="mt-6">
  <h2 className="text-lg font-semibold text-ink">Journal photos</h2>
  <p className="mt-1 text-sm text-ink-soft">JPEG, PNG, or WEBP only — iPhone HEIC isn’t supported; your phone’s photo picker usually uploads JPEG.</p>
  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onUpload} className="mt-2 text-sm" />
  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
    {photos.map((p) => (
      <figure key={p.id} className="relative">
        <a href={`/api/activity-weeks/${week.id}/photos/${p.id}`} target="_blank" rel="noreferrer">
          <img src={`/api/activity-weeks/${week.id}/photos/${p.id}`} alt={p.filename}
               className="h-32 w-full rounded-md object-cover" />
        </a>
        <button className="btn-ghost absolute right-1 top-1 bg-card/80 px-2 py-0.5 text-xs"
                onClick={() => void onDeletePhoto(p.id)}>Delete</button>
      </figure>
    ))}
  </div>
</section>
```

- [ ] **Step 3: Verify in dev** — upload a JPEG/PNG, thumbnail appears, click opens full image, Delete removes it; try a `.heic` → alert shows the 415 message. Typecheck clean.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/api.ts apps/web/src/features/activity/ActivityDetailPage.tsx
git -c user.name='coi' -c user.email='coitax@users.noreply.github.com' commit -m "feat(web): activity-week photo upload, view, delete"
```

---

## Final verification & deploy

- [ ] **Build + full tests**

```bash
cd /home/coi/cbt-deploy/cbt-app
corepack pnpm -r typecheck
corepack pnpm --filter @cbt/shared test
corepack pnpm --filter @cbt/api test
corepack pnpm --filter @cbt/web build   # produces apps/web/dist
```
Expected: all green; `apps/web/dist/index.html` exists.

- [ ] **Push**

```bash
GIT_SSH_COMMAND='ssh -o BatchMode=yes -i ~/.ssh/id_ed25519' git push -u origin claude/cbt-csv-export
```

- [ ] **Deploy to Linode** (`@fastify/multipart` is new → `pnpm install` required):

```bash
ssh art-critic 'cd /var/www/cbet.brokenbeat.ca/app && git pull && cd cbt-app && pnpm install && pnpm --filter @cbt/web build && systemctl restart cbt && systemctl is-active cbt'
curl -sIL https://cbet.brokenbeat.ca/ | head -3   # expect 200
```

- [ ] **Live smoke** — log in, create an activity week, range-fill + copy-day, attach a photo, delete a record. Confirm a photo file lands under `/var/lib/cbt/data/photos/<weekId>/` and is included by `/usr/local/bin/cbt-backup.sh`.

- [ ] **Update memory** — append the three features to `~/.claude/projects/-home-coi/memory/project_cbet.md` (per coi's auto-update rule).

---

## Self-review notes (spec coverage)
- Activity bulk fill (range + copy-day): Tasks B1–B3. ✅ Defaults preserved (range-fill leaves pm blank untouched; copy-day doesn't copy mood; confirm before overwrite).
- Delete any record, all three types, with confirm: Tasks A1–A4. Owner check enforced; 403→404 collapse noted intentionally.
- Photos on activity weeks, view-only, disk storage, JPEG/PNG/WEBP, HEIC rejected, in backups: Tasks C1–C4. ✅
- Out-of-scope honored: no print/CSV/HEIC-conversion/thumbnails; photos only on activity weeks.
- New dependency `@fastify/multipart` flagged for the deploy `pnpm install`.
```
