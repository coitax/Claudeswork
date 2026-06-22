import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { randomUUID } from 'node:crypto';
import type { User } from '@cbt/shared';
import { storage } from '../src/storage/index.js';
import { hashPassword } from '../src/auth/password.js';

/**
 * Seed / create the single local user.
 *
 * Usage:
 *   pnpm seed                  (interactive prompts)
 *   CBT_USERNAME=me CBT_PASSWORD=secret [CBT_EMAIL=me@x] pnpm seed
 *
 * Re-running with an existing user requires CBT_FORCE=1 to overwrite the password.
 */
async function prompt(question: string, opts?: { hidden?: boolean }): Promise<string> {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    if (opts?.hidden) {
      // Best-effort hidden input: mute echo.
      const mutableOut = stdout as unknown as { write: (s: string) => boolean };
      const orig = mutableOut.write.bind(mutableOut);
      // @ts-expect-error override for masking
      rl.output.write = (s: string) => (s.includes('\n') ? orig(s) : orig(''));
      const ans = await rl.question(question);
      // @ts-expect-error restore
      rl.output.write = orig;
      stdout.write('\n');
      return ans;
    }
    return await rl.question(question);
  } finally {
    rl.close();
  }
}

async function main(): Promise<void> {
  await storage.init();

  const username = process.env.CBT_USERNAME ?? (await prompt('Username: '));
  const emailRaw = process.env.CBT_EMAIL ?? (await prompt('Email (optional, blank to skip): '));
  const email = emailRaw.trim() ? emailRaw.trim() : null;
  const password = process.env.CBT_PASSWORD ?? (await prompt('Password: ', { hidden: true }));

  if (!username.trim() || !password) {
    console.error('Username and password are required.');
    process.exit(1);
  }

  // Detect an already-seeded user (single-user app stores one user.json).
  const existing = await storage.getUser(username.trim());
  if (existing && process.env.CBT_FORCE !== '1') {
    console.error(
      'A user already exists. Re-run with CBT_FORCE=1 to overwrite the credentials.',
    );
    process.exit(1);
  }

  const now = new Date().toISOString();
  const user: User = {
    id: existing?.id ?? randomUUID(),
    username: username.trim(),
    email,
    password_hash: await hashPassword(password),
    created_at: existing?.created_at ?? now,
    updated_at: now,
  };

  await storage.saveUser(user);
  console.log(`\nUser "${user.username}" saved. You can now log in.`);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
