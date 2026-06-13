import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';
import {
  createApprovalRequest,
  evaluateTransferRisk,
  hashTransactionPin,
  recordApproval,
  verifyTransactionPin
} from '../src/domain/security.js';
import { createDurableJobQueue } from '../src/infrastructure/jobs.js';
import { redactSensitive } from '../src/infrastructure/observability.js';
import { createWebhookInbox, verifyHmacSignature } from '../src/infrastructure/webhooks.js';

test('transaction PINs are salted, hashed, and verified in constant-time compatible form', () => {
  const first = hashTransactionPin('1234');
  const second = hashTransactionPin('1234');

  assert.notEqual(first, second);
  assert.equal(first.includes('1234'), false);
  assert.equal(verifyTransactionPin('1234', first), true);
  assert.equal(verifyTransactionPin('0000', first), false);
  assert.equal(verifyTransactionPin('1234', 'broken'), false);
});

test('transfer risk detects duplicates, velocity, amount, and untrusted devices', () => {
  const decision = evaluateTransferRisk({
    amountMinor: 2_500_000n,
    duplicateDetected: true,
    transfersLastTenMinutes: 5,
    deviceTrusted: false,
    highValueThresholdMinor: 2_000_000n
  });

  assert.equal(decision.allow, false);
  assert.equal(decision.reviewRequired, true);
  assert.deepEqual(decision.flags, [
    'POSSIBLE_DUPLICATE',
    'TRANSFER_VELOCITY_HIGH',
    'HIGH_VALUE_TRANSFER',
    'UNTRUSTED_DEVICE'
  ]);
});

test('critical actions require two different eligible administrators', () => {
  const request = createApprovalRequest({
    action: 'ENABLE_LIVE_TRANSFERS',
    requestedBy: 'admin-a',
    payload: { provider: 'monnify' }
  });

  const first = recordApproval(request, 'admin-a');
  assert.equal(first.status, 'PENDING_SECOND_APPROVAL');
  assert.throws(() => recordApproval(first, 'admin-a'), /different administrator/);

  const completed = recordApproval(first, 'admin-b');
  assert.equal(completed.status, 'APPROVED');
  assert.deepEqual(completed.approvedBy, ['admin-a', 'admin-b']);
});

test('webhook signatures are verified and provider events are idempotent', () => {
  const payload = JSON.stringify({ reference: 'deposit-42', amount: 5000 });
  const secret = 'provider-secret';
  const signature = createHmac('sha256', secret).update(payload).digest('hex');

  assert.equal(verifyHmacSignature(payload, signature, secret), true);
  assert.equal(verifyHmacSignature(payload, 'invalid', secret), false);

  const inbox = createWebhookInbox();
  assert.equal(inbox.accept({ provider: 'monnify', eventId: 'evt-42', payloadHash: 'hash-42' }).accepted, true);
  assert.equal(inbox.accept({ provider: 'monnify', eventId: 'evt-42', payloadHash: 'hash-42' }).accepted, false);
  assert.equal(inbox.list()[0]?.attempts, 2);
});

test('durable job queue retries with bounded backoff and dead-letters exhausted jobs', () => {
  let now = Date.parse('2026-06-13T08:00:00.000Z');
  const queue = createDurableJobQueue({ now: () => new Date(now), maxAttempts: 3, baseDelayMs: 1_000, maxDelayMs: 10_000 });
  const job = queue.enqueue('RECONCILE_DEPOSIT', { reference: 'deposit-42' });

  const first = queue.claim('worker-a');
  assert.equal(first?.id, job.id);
  queue.fail(job.id, 'provider timeout');
  assert.equal(queue.claim('worker-a'), undefined);

  now += 1_000;
  queue.claim('worker-a');
  queue.fail(job.id, 'provider timeout');
  now += 2_000;
  queue.claim('worker-a');
  queue.fail(job.id, 'provider timeout');

  assert.equal(queue.list({ status: 'DEAD_LETTER' }).length, 1);
  assert.equal(queue.list({ status: 'DEAD_LETTER' })[0]?.attempts, 3);
});

test('structured logging removes financial credentials and account details', () => {
  const redacted = redactSensitive({
    authorization: 'Bearer live-token',
    pin: '1234',
    accountNumber: '0123456789',
    nested: { apiKey: 'provider-secret', safe: 'deposit-created' }
  });

  assert.deepEqual(redacted, {
    authorization: '[REDACTED]',
    pin: '[REDACTED]',
    accountNumber: '******6789',
    nested: { apiKey: '[REDACTED]', safe: 'deposit-created' }
  });
});
