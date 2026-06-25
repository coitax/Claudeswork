import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { vi } from 'vitest';

export async function makeApp() {
  const dataDir = await mkdtemp(join(tmpdir(), 'cbt-api-'));
  process.env.DATA_DIR = dataDir;
  process.env.NODE_ENV = 'test';
  vi.resetModules();
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
