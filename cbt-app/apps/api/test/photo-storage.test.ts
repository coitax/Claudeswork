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
