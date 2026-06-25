import type { ActivityWeek, ActivityWeekInput, ActivityPhoto, StorageAdapter } from '@cbt/shared';
import { newId, nowIso } from './util.js';

/**
 * Activity Monitoring Form service. Pure business logic over the storage
 * adapter — no filesystem knowledge here.
 */
export class ActivityService {
  constructor(private readonly storage: StorageAdapter) {}

  list(userId: string): Promise<ActivityWeek[]> {
    return this.storage.getActivityWeeks({ userId });
  }

  async get(userId: string, id: string): Promise<ActivityWeek | null> {
    const week = await this.storage.getActivityWeekById(id);
    if (!week || week.user_id !== userId) return null;
    return week;
  }

  async create(userId: string, input: ActivityWeekInput): Promise<ActivityWeek> {
    const ts = nowIso();
    const week: ActivityWeek = {
      id: newId(),
      user_id: userId,
      week_start_date: input.week_start_date,
      title: input.title ?? null,
      notes: input.notes ?? null,
      is_draft: input.is_draft,
      days: input.days,
      created_at: ts,
      updated_at: ts,
    };
    return this.storage.saveActivityWeek(week);
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const week = await this.storage.getActivityWeekById(id);
    if (!week || week.user_id !== userId) return false;
    await this.storage.deleteActivityWeek(id);
    return true;
  }

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

  async update(userId: string, id: string, input: ActivityWeekInput): Promise<ActivityWeek | null> {
    const existing = await this.get(userId, id);
    if (!existing) return null;
    const updated: ActivityWeek = {
      ...existing,
      week_start_date: input.week_start_date,
      title: input.title ?? null,
      notes: input.notes ?? null,
      is_draft: input.is_draft,
      days: input.days,
      updated_at: nowIso(),
    };
    return this.storage.saveActivityWeek(updated);
  }
}
