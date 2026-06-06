import assert from 'node:assert/strict';
import test from 'node:test';
import { accountBalanceMinor, ensureSufficientBalance, postLedgerTransaction } from '../src/domain/ledger.js';
import { seedDemoData } from '../src/domain/seed.js';
import { createMemoryStore } from '../src/domain/store.js';

test('ledger calculates seeded wallet balance from entries', () => {
  const store = createMemoryStore(seedDemoData());
  assert.equal(accountBalanceMinor(store, 'demo-user-ada-ngn'), 50_000_000n);
});

test('ledger rejects unbalanced entries and deduplicates idempotency keys', () => {
  const store = createMemoryStore(seedDemoData());
  assert.throws(() => postLedgerTransaction(store, {
    mode: 'DEMO',
    idempotencyKey: 'bad',
    description: 'bad',
    entries: [{ accountId: 'demo-user-ada-ngn', side: 'DEBIT', amountMinor: '100' }]
  }));
  const input = {
    mode: 'DEMO' as const,
    idempotencyKey: 'withdrawal-1',
    description: 'Demo withdrawal',
    entries: [
      { accountId: 'demo-user-ada-ngn', side: 'DEBIT' as const, amountMinor: '10000' },
      { accountId: 'platform-demo-funding-ngn', side: 'CREDIT' as const, amountMinor: '10000' }
    ]
  };
  const first = postLedgerTransaction(store, input);
  const second = postLedgerTransaction(store, input);
  assert.equal(first.id, second.id);
  assert.equal(accountBalanceMinor(store, 'demo-user-ada-ngn'), 49_990_000n);
  assert.throws(() => postLedgerTransaction(store, {
    ...input,
    description: 'Different financial command'
  }), /already used/);
});

test('balance guard blocks overspending', () => {
  const store = createMemoryStore(seedDemoData());
  assert.throws(() => ensureSufficientBalance(store, 'demo-user-ada-ngn', 50_000_001n), /Insufficient/);
});
