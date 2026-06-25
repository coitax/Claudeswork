import { config } from '../config.js';

/**
 * Minimal in-memory login rate limiter (single-user, single-process app).
 * Tracks failed attempts per key (IP) within a sliding window. Successful login
 * clears the counter. This is intentionally simple — for a single-user private
 * app it just needs to slow down brute force attempts.
 */
interface Bucket {
  count: number;
  firstAt: number;
}

const buckets = new Map<string, Bucket>();

export function isRateLimited(key: string): boolean {
  const b = buckets.get(key);
  if (!b) return false;
  if (Date.now() - b.firstAt > config.rateLimit.windowMs) {
    buckets.delete(key);
    return false;
  }
  return b.count >= config.rateLimit.maxAttempts;
}

export function recordFailure(key: string): void {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now - b.firstAt > config.rateLimit.windowMs) {
    buckets.set(key, { count: 1, firstAt: now });
  } else {
    b.count += 1;
  }
}

export function clearAttempts(key: string): void {
  buckets.delete(key);
}
