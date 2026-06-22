import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// apps/api/src -> repo root is three levels up.
const repoRoot = path.resolve(__dirname, '..', '..', '..');

function envInt(name: string, fallback: number): number {
  const v = process.env[name];
  if (!v) return fallback;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

export const config = {
  isProd: process.env.NODE_ENV === 'production',
  host: process.env.HOST ?? '127.0.0.1',
  port: envInt('PORT', 5174),

  /** Root folder for all JSON data (backup-friendly tree lives under here). */
  dataDir: process.env.DATA_DIR
    ? path.resolve(process.env.DATA_DIR)
    : path.join(repoRoot, 'data'),

  /** Built web assets served in production (apps/web/dist). */
  webDistDir: path.join(repoRoot, 'apps', 'web', 'dist'),

  session: {
    cookieName: 'cbt_session',
    /** Session lifetime in milliseconds (default 7 days). */
    ttlMs: envInt('SESSION_TTL_HOURS', 24 * 7) * 60 * 60 * 1000,
  },

  rateLimit: {
    /** Max failed login attempts per window before temporary lockout. */
    maxAttempts: envInt('LOGIN_MAX_ATTEMPTS', 5),
    windowMs: envInt('LOGIN_WINDOW_MINUTES', 15) * 60 * 1000,
  },

  /** Storage backend selector. Only "file" is implemented in v1. */
  storageDriver: (process.env.STORAGE_DRIVER ?? 'file') as 'file' | 'sqlite',
} as const;

export { repoRoot };
