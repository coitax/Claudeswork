import type { FastifyInstance } from 'fastify';
import { loginSchema } from '@cbt/shared';
import { storage } from '../storage/index.js';
import { verifyPassword } from '../auth/password.js';
import { clearAttempts, isRateLimited, recordFailure } from '../auth/rate-limit.js';
import {
  clearSessionCookie,
  createSessionForUser,
  getCurrentUser,
  setSessionCookie,
} from '../auth/session.js';
import { config } from '../config.js';
import { parseBody } from './helpers.js';

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/auth/login', async (req, reply) => {
    const rlKey = req.ip;
    if (isRateLimited(rlKey)) {
      return reply.code(429).send({ error: 'too_many_attempts' });
    }

    const body = parseBody(loginSchema, req.body, reply);
    if (!body) return;

    const user = await storage.getUser(body.identifier);
    // Always run a verify-ish path to reduce timing signal; bcrypt.compare on a
    // dummy hash if no user.
    const ok = user
      ? await verifyPassword(body.password, user.password_hash)
      : await verifyPassword(body.password, '$2a$12$............................................');

    if (!user || !ok) {
      recordFailure(rlKey);
      return reply.code(401).send({ error: 'invalid_credentials' });
    }

    clearAttempts(rlKey);
    const session = await createSessionForUser(user);
    setSessionCookie(reply, session);
    return reply.send({
      user: { id: user.id, username: user.username, email: user.email },
    });
  });

  app.post('/api/auth/logout', async (req, reply) => {
    const sid = req.cookies?.[config.session.cookieName];
    if (sid) await storage.deleteSession(sid);
    clearSessionCookie(reply);
    return reply.send({ ok: true });
  });

  app.get('/api/auth/session', async (req, reply) => {
    const user = await getCurrentUser(req);
    if (!user) return reply.send({ user: null });
    return reply.send({
      user: { id: user.id, username: user.username, email: user.email },
    });
  });
}
