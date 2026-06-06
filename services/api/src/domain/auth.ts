import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import type { MemoryStore } from './store.js';

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}

export function verifyPassword(password: string, encoded: string) {
  const [salt, stored] = encoded.split(':');
  if (!salt || !stored) return false;
  const supplied = scryptSync(password, salt, 64);
  const expected = Buffer.from(stored, 'hex');
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export function issueSession(store: MemoryStore, userId: string) {
  const token = randomBytes(32).toString('base64url');
  const session = {
    id: `ses_${randomUUID()}`,
    userId,
    tokenHash: tokenHash(token),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString()
  };
  store.saveSession(session);
  return { token, session };
}

export function resolveSession(store: MemoryStore, token: string) {
  const session = store.findSessionByHash(tokenHash(token));
  if (!session || session.revokedAt || Date.parse(session.expiresAt) <= Date.now()) return undefined;
  return store.getUser(session.userId);
}

function tokenHash(token: string) {
  return createHash('sha256').update(token).digest('hex');
}
