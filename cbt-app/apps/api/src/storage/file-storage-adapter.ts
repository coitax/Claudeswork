import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type {
  ActivityWeek,
  DailyMood,
  EmotionSelection,
  ListOptions,
  Session,
  StorageAdapter,
  ThoughtRecord,
  User,
  WorksheetTemplate,
  WorksheetTextReviewItem,
} from '@cbt/shared';

/**
 * File-based storage adapter (v1).
 *
 * Layout under <dataDir>:
 *   users/user.json            (single user)
 *   sessions/<id>.json
 *   activity-weeks/<file>.json
 *   thought-records/<file>.json
 *   daily-moods/<file>.json
 *   emotion-selections/<file>.json
 *   templates/<key>.json
 *   meta/review-items.json     (single index file of review items)
 *
 * Implementation notes (per spec):
 * - Atomic writes: write to a temp file then rename (rename is atomic on the
 *   same filesystem), avoiding partial/corrupt files.
 * - One JSON object per file for primary records.
 * - Lists are derived by reading directory contents (no separate index needed).
 * - Human-readable (pretty-printed) JSON.
 */
export class FileStorageAdapter implements StorageAdapter {
  constructor(private readonly dataDir: string) {}

  private dir(...parts: string[]): string {
    return path.join(this.dataDir, ...parts);
  }

  async init(): Promise<void> {
    const subdirs = [
      'users',
      'sessions',
      'activity-weeks',
      'thought-records',
      'daily-moods',
      'emotion-selections',
      'templates',
      'meta',
    ];
    await Promise.all(subdirs.map((d) => fs.mkdir(this.dir(d), { recursive: true })));
  }

  // --- low-level helpers ---

  private async readJson<T>(file: string): Promise<T | null> {
    try {
      const raw = await fs.readFile(file, 'utf8');
      return JSON.parse(raw) as T;
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw err;
    }
  }

  /** Atomic write: temp file in same dir, fsync, rename over target. */
  private async writeJsonAtomic(file: string, value: unknown): Promise<void> {
    await fs.mkdir(path.dirname(file), { recursive: true });
    const tmp = `${file}.${randomUUID()}.tmp`;
    const data = JSON.stringify(value, null, 2);
    const handle = await fs.open(tmp, 'w');
    try {
      await handle.writeFile(data, 'utf8');
      await handle.sync();
    } finally {
      await handle.close();
    }
    await fs.rename(tmp, file);
  }

  private async listJson<T>(subdir: string): Promise<T[]> {
    let names: string[];
    try {
      names = await fs.readdir(this.dir(subdir));
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw err;
    }
    const files = names.filter((n) => n.endsWith('.json') && !n.endsWith('.tmp'));
    const items = await Promise.all(files.map((n) => this.readJson<T>(this.dir(subdir, n))));
    return items.filter((x) => x != null) as T[];
  }

  private applyList<T extends { user_id?: string }>(items: T[], opts?: ListOptions): T[] {
    let out = items;
    if (opts?.userId) out = out.filter((i) => i.user_id === opts.userId);
    if (opts?.offset) out = out.slice(opts.offset);
    if (opts?.limit != null) out = out.slice(0, opts.limit);
    return out;
  }

  // --- users ---

  async getUser(idOrUsernameOrEmail: string): Promise<User | null> {
    const user = await this.readJson<User>(this.dir('users', 'user.json'));
    if (!user) return null;
    const q = idOrUsernameOrEmail;
    if (user.id === q || user.username === q || (user.email && user.email === q)) {
      return user;
    }
    // Case-insensitive match for username/email convenience.
    const lc = q.toLowerCase();
    if (
      user.username.toLowerCase() === lc ||
      (user.email && user.email.toLowerCase() === lc)
    ) {
      return user;
    }
    return null;
  }

  async saveUser(user: User): Promise<User> {
    await this.writeJsonAtomic(this.dir('users', 'user.json'), user);
    return user;
  }

  // --- sessions ---

  async getSession(sessionId: string): Promise<Session | null> {
    if (!/^[A-Za-z0-9_-]+$/.test(sessionId)) return null;
    return this.readJson<Session>(this.dir('sessions', `${sessionId}.json`));
  }

  async createSession(session: Session): Promise<Session> {
    await this.writeJsonAtomic(this.dir('sessions', `${session.id}.json`), session);
    return session;
  }

  async deleteSession(sessionId: string): Promise<void> {
    if (!/^[A-Za-z0-9_-]+$/.test(sessionId)) return;
    await fs.rm(this.dir('sessions', `${sessionId}.json`), { force: true });
  }

  async deleteExpiredSessions(nowIso: string): Promise<void> {
    const sessions = await this.listJson<Session>('sessions');
    await Promise.all(
      sessions
        .filter((s) => s.expires_at <= nowIso)
        .map((s) => this.deleteSession(s.id)),
    );
  }

  // --- activity weeks ---

  async getActivityWeeks(opts?: ListOptions): Promise<ActivityWeek[]> {
    const items = await this.listJson<ActivityWeek>('activity-weeks');
    items.sort((a, b) => b.week_start_date.localeCompare(a.week_start_date));
    return this.applyList(items, opts);
  }

  async getActivityWeekById(id: string): Promise<ActivityWeek | null> {
    const items = await this.listJson<ActivityWeek>('activity-weeks');
    return items.find((w) => w.id === id) ?? null;
  }

  async saveActivityWeek(week: ActivityWeek): Promise<ActivityWeek> {
    const file = this.dir('activity-weeks', `activity-week-${week.week_start_date}-${week.id}.json`);
    await this.writeJsonAtomic(file, week);
    return week;
  }

  // --- thought records ---

  async getThoughtRecords(opts?: ListOptions): Promise<ThoughtRecord[]> {
    const items = await this.listJson<ThoughtRecord>('thought-records');
    items.sort((a, b) => b.created_at.localeCompare(a.created_at));
    return this.applyList(items, opts);
  }

  async getThoughtRecordById(id: string): Promise<ThoughtRecord | null> {
    return this.readJson<ThoughtRecord>(this.dir('thought-records', `thought-record-${id}.json`));
  }

  async saveThoughtRecord(record: ThoughtRecord): Promise<ThoughtRecord> {
    await this.writeJsonAtomic(
      this.dir('thought-records', `thought-record-${record.id}.json`),
      record,
    );
    return record;
  }

  // --- daily moods ---

  async getDailyMoods(opts?: ListOptions): Promise<DailyMood[]> {
    const items = await this.listJson<DailyMood>('daily-moods');
    items.sort((a, b) => b.entry_date.localeCompare(a.entry_date));
    return this.applyList(items, opts);
  }

  async getDailyMoodById(id: string): Promise<DailyMood | null> {
    const items = await this.listJson<DailyMood>('daily-moods');
    return items.find((m) => m.id === id) ?? null;
  }

  async saveDailyMood(mood: DailyMood): Promise<DailyMood> {
    const file = this.dir('daily-moods', `daily-mood-${mood.entry_date}-${mood.id}.json`);
    await this.writeJsonAtomic(file, mood);
    return mood;
  }

  // --- delete helpers ---

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

  // --- emotion selections ---

  async getEmotionSelections(parentType: string, parentId: string): Promise<EmotionSelection[]> {
    const items = await this.listJson<EmotionSelection>('emotion-selections');
    return items.filter((e) => e.parent_type === parentType && e.parent_id === parentId);
  }

  async saveEmotionSelection(selection: EmotionSelection): Promise<EmotionSelection> {
    await this.writeJsonAtomic(
      this.dir('emotion-selections', `emotion-${selection.id}.json`),
      selection,
    );
    return selection;
  }

  // --- worksheet templates ---

  async getWorksheetTemplates(): Promise<WorksheetTemplate[]> {
    return this.listJson<WorksheetTemplate>('templates');
  }

  async getWorksheetTemplateByKey(key: string): Promise<WorksheetTemplate | null> {
    return this.readJson<WorksheetTemplate>(this.dir('templates', `${key}.json`));
  }

  async saveWorksheetTemplate(template: WorksheetTemplate): Promise<WorksheetTemplate> {
    await this.writeJsonAtomic(this.dir('templates', `${template.key}.json`), template);
    return template;
  }

  // --- worksheet review items (single index file) ---

  async getWorksheetReviewItems(): Promise<WorksheetTextReviewItem[]> {
    return (await this.readJson<WorksheetTextReviewItem[]>(this.dir('meta', 'review-items.json'))) ?? [];
  }

  async saveWorksheetReviewItem(item: WorksheetTextReviewItem): Promise<WorksheetTextReviewItem> {
    const items = await this.getWorksheetReviewItems();
    const idx = items.findIndex((i) => i.id === item.id);
    if (idx >= 0) items[idx] = item;
    else items.push(item);
    await this.writeJsonAtomic(this.dir('meta', 'review-items.json'), items);
    return item;
  }
}
