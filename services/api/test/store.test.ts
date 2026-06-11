import assert from 'node:assert/strict';
import test from 'node:test';
import { seedDemoData } from '../src/domain/seed.js';
import { createMemoryStore } from '../src/domain/store.js';

test('demo and live users remain explicitly isolated', () => {
  const store = createMemoryStore(seedDemoData());
  const demo = store.listUsers({ mode: 'DEMO' });
  const live = store.listUsers({ mode: 'LIVE' });
  assert.ok(demo.length >= 3);
  assert.equal(live.every((user) => user.mode === 'LIVE'), true);
  assert.equal(demo.some((user) => live.some((item) => item.id === user.id)), false);
});

test('seeded demo ecosystem is realistic, deterministic, and newest first', () => {
  const store = createMemoryStore(seedDemoData());
  const tokens = store.listTokens('DEMO');
  assert.deepEqual(tokens.map((token) => token.name), ['Based Pepe', 'Pepe', 'Bonk', 'No Dulling', '1inch Dog']);
  assert.equal(tokens.every((token) => token.mint.length > 20 && token.source.includes('Demo')), true);
  assert.deepEqual([...new Set(tokens.map((token) => token.chain))], ['BASE', 'ETHEREUM', 'SOLANA', 'BNB_CHAIN']);
  assert.equal(tokens.filter((token) => token.sourceMode === 'DEX').length, 4);
  assert.equal(tokens.filter((token) => token.sourceMode === 'EARLY_SOLANA').length, 1);
  assert.equal(store.listAiPaymentDrafts({ mode: 'DEMO' }).length, 0);
  assert.equal(store.listP2pOrders({ mode: 'DEMO' }).length, 2);
  assert.equal(store.listAlerts('DEMO')[0]?.title, 'Runner score jumped to 91');
});

test('search finds users by Nigerian phone, email, name, or id', () => {
  const store = createMemoryStore(seedDemoData());
  assert.equal(store.listUsers({ query: 'Ada' })[0]?.id, 'demo-user-ada');
  assert.equal(store.listUsers({ query: '+2348010001002' })[0]?.name, 'Tobi Adeyemi');
  assert.equal(store.listUsers({ query: 'zainab@demo' })[0]?.id, 'demo-user-zainab');
  assert.equal(store.listUsers({ query: 'live-user-empty' })[0]?.mode, 'LIVE');
});
