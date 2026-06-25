import bcrypt from 'bcryptjs';

/**
 * Password hashing.
 *
 * The spec prefers Argon2; we use bcrypt (bcryptjs, pure-JS) instead because it
 * has zero native build dependencies and installs reliably in WSL and on a bare
 * Linode VPS. To switch to Argon2 later, swap these two functions for
 * @node-rs/argon2 — call sites only use hashPassword/verifyPassword.
 */
const SALT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}
