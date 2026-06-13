import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export type WebhookInboxEvent = {
  provider: string;
  eventId: string;
  payloadHash: string;
  attempts: number;
  status: 'RECEIVED' | 'PROCESSED' | 'FAILED';
  receivedAt: string;
  updatedAt: string;
};

export function verifyHmacSignature(payload: string | Buffer, signature: string, secret: string, algorithm = 'sha256') {
  if (!signature || !secret) return false;
  const normalized = signature.replace(/^sha256=/i, '').trim().toLowerCase();
  if (!/^[a-f0-9]+$/.test(normalized)) return false;
  const supplied = Buffer.from(normalized, 'hex');
  const expected = createHmac(algorithm, secret).update(payload).digest();
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export function webhookPayloadHash(payload: string | Buffer) {
  return createHash('sha256').update(payload).digest('hex');
}

export function createWebhookInbox(options: { now?: () => Date } = {}) {
  const now = options.now || (() => new Date());
  const events = new Map<string, WebhookInboxEvent>();

  return {
    accept(input: { provider: string; eventId: string; payloadHash: string }) {
      const key = `${input.provider}:${input.eventId}`;
      const existing = events.get(key);
      if (existing) {
        existing.attempts += 1;
        existing.updatedAt = now().toISOString();
        return { accepted: false, event: structuredClone(existing) };
      }
      const timestamp = now().toISOString();
      const event: WebhookInboxEvent = {
        ...input,
        attempts: 1,
        status: 'RECEIVED',
        receivedAt: timestamp,
        updatedAt: timestamp
      };
      events.set(key, event);
      return { accepted: true, event: structuredClone(event) };
    },
    markProcessed(provider: string, eventId: string) {
      return updateStatus(events, provider, eventId, 'PROCESSED', now());
    },
    markFailed(provider: string, eventId: string) {
      return updateStatus(events, provider, eventId, 'FAILED', now());
    },
    list() {
      return [...events.values()]
        .sort((left, right) => right.receivedAt.localeCompare(left.receivedAt))
        .map((event) => structuredClone(event));
    }
  };
}

function updateStatus(
  events: Map<string, WebhookInboxEvent>,
  provider: string,
  eventId: string,
  status: WebhookInboxEvent['status'],
  now: Date
) {
  const event = events.get(`${provider}:${eventId}`);
  if (!event) throw new Error('Webhook event was not found.');
  event.status = status;
  event.updatedAt = now.toISOString();
  return structuredClone(event);
}
