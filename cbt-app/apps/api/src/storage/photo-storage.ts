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
