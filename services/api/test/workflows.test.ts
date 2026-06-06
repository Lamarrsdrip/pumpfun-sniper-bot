import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from '../src/server.js';

test('demo session returns funded Naira-first home without leaking into live mode', async () => {
  const app = await buildApp();
  const demo = await app.inject({ method: 'POST', url: '/v1/auth/demo', payload: {} });
  const token = demo.json().token;
  const home = await app.inject({ method: 'GET', url: '/v1/mobile/home', headers: { authorization: `Bearer ${token}` } });
  assert.equal(home.json().mode, 'DEMO');
  assert.equal(home.json().wallet.availableNgn, '500000.00');
  const live = await app.inject({ method: 'GET', url: '/v1/tokens', headers: { 'x-app-mode': 'LIVE' } });
  assert.deepEqual(live.json().tokens, []);
  await app.close();
});

test('demo deposit approval credits exactly once and produces an audit record', async () => {
  const app = await buildApp();
  const created = await app.inject({ method: 'POST', url: '/v1/deposits', headers: { 'x-app-mode': 'DEMO' }, payload: { amountNgn: 10000 } });
  const id = created.json().request.id;
  const decision = { decision: 'CONFIRMED', reason: 'Verified demo reference' };
  await app.inject({ method: 'POST', url: `/v1/admin/money-requests/${id}/decision`, payload: decision });
  await app.inject({ method: 'POST', url: `/v1/admin/money-requests/${id}/decision`, payload: decision });
  const home = await app.inject({ method: 'GET', url: '/v1/mobile/home' });
  assert.equal(home.json().wallet.availableNgn, '510000.00');
  const audit = await app.inject({ method: 'GET', url: '/v1/admin/audit' });
  assert.ok(audit.json().events.some((event: { targetId: string }) => event.targetId === id));
  await app.close();
});

test('demo trade charges fees and creates a visible position and history', async () => {
  const app = await buildApp();
  const tokenResponse = await app.inject({ method: 'GET', url: '/v1/tokens' });
  const mint = tokenResponse.json().tokens[0].mint;
  const trade = await app.inject({
    method: 'POST',
    url: '/v1/trades/execute',
    headers: { 'x-app-mode': 'DEMO' },
    payload: { mint, side: 'BUY', amountNgn: 10000, idempotencyKey: 'workflow-buy-0001' }
  });
  assert.equal(trade.statusCode, 201);
  assert.equal(trade.json().trade.feeMinor, '10000');
  assert.equal(trade.json().balanceNgn, '490000.00');
  const portfolio = await app.inject({ method: 'GET', url: '/v1/portfolio' });
  assert.equal(portfolio.json().positions.length, 1);
  assert.equal(portfolio.json().trades.length, 1);
  await app.close();
});
