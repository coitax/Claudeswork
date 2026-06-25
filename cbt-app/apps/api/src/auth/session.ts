import { randomBytes } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Session, User } from '@cbt/shared';
import { config } from '../config.js';
import { storage } from '../storage/index.js';

/** Generate a cryptographically-random, URL-safe session id. */
export function generateSessionId(): string {
  return randomBytes(32).toString('base64url');
}

export async function createSessionForUser(user: User): Promise<Session> {
  const now = Date.now();
  const session: Session = {
    id: generateSessionId(),
    user_id: user.id,
    created_at: new Date(now).toISOString(),
    expires_at: new Date(now + config.session.ttlMs).toISOString(),
  };
  return storage.createSession(session);
}

export function setSessionCookie(reply: FastifyReply, session: Session): void {
  reply.setCookie(config.session.cookieName, session.id, {
    path: '/',
    httpOnly: true,
    sameSite: 'strict',
    secure: config.isProd, // requires HTTPS in production
    expires: new Date(session.expires_at),
  });
}

export function clearSessionCookie(reply: FastifyReply): void {
  reply.clearCookie(config.session.cookieName, { path: '/' });
}

/**
 * Resolve the current session/user from the request cookie.
 * Returns null if missing, invalid, or expired (expired sessions are deleted).
 */
export async function getCurrentUser(req: FastifyRequest): Promise<User | null> {
  const sid = req.cookies?.[config.session.cookieName];
  if (!sid) return null;
  const session = await storage.getSession(sid);
  if (!session) return null;
  if (new Date(session.expires_at).getTime() <= Date.now()) {
    await storage.deleteSession(session.id);
    return null;
  }
  const user = await storage.getUser(session.user_id);
  return user ?? null;
}

declare module 'fastify' {
  interface FastifyRequest {
    currentUser?: User;
  }
}

/**
 * Route protection preHandler. Attaches req.currentUser or replies 401.
 * Register on protected route groups.
 */
export async function requireAuth(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const user = await getCurrentUser(req);
  if (!user) {
    await reply.code(401).send({ error: 'unauthorized' });
    return;
  }
  req.currentUser = user;
}
