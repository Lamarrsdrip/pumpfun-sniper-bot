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

test('authenticated role controls admin visibility', async () => {
  const app = await buildApp();
  const admin = await app.inject({ method: 'POST', url: '/v1/auth/demo', payload: { userId: 'demo-user-ada' } });
  const adminMe = await app.inject({ method: 'GET', url: '/v1/me', headers: { authorization: `Bearer ${admin.json().token}` } });
  assert.equal(adminMe.json().isAdmin, true);
  const user = await app.inject({ method: 'POST', url: '/v1/auth/demo', payload: { userId: 'demo-user-tobi' } });
  const userMe = await app.inject({ method: 'GET', url: '/v1/me', headers: { authorization: `Bearer ${user.json().token}` } });
  assert.equal(userMe.json().isAdmin, false);
  await app.close();
});

test('production user routes reject mode-header impersonation without a session', async () => {
  const app = await buildApp({ environment: 'production', adminApiToken: 'admin-test-token' });
  const response = await app.inject({ method: 'GET', url: '/v1/mobile/home', headers: { 'x-app-mode': 'LIVE' } });
  assert.equal(response.statusCode, 401);
  assert.equal(response.json().code, 'UNAUTHORIZED');
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
  assert.equal(home.json().wallet.availableNgn, '509950.00');
  const audit = await app.inject({ method: 'GET', url: '/v1/admin/audit' });
  assert.ok(audit.json().events.some((event: { targetId: string }) => event.targetId === id));
  await app.close();
});

test('AI Pay prepares a review and only debits after PIN approval', async () => {
  const app = await buildApp();
  const prepared = await app.inject({
    method: 'POST',
    url: '/v1/ai-pay/prepare',
    headers: { 'x-app-mode': 'DEMO' },
    payload: { instruction: 'Send ₦50,000 to 0123456789 Access Bank for inventory' }
  });
  assert.equal(prepared.statusCode, 201);
  assert.equal(prepared.json().payment.status, 'REVIEW');
  assert.equal(prepared.json().payment.amountMinor, '5000000');
  const approved = await app.inject({
    method: 'POST',
    url: `/v1/ai-pay/${prepared.json().payment.id}/approve`,
    headers: { 'x-app-mode': 'DEMO' },
    payload: { pin: '1234', idempotencyKey: 'ai-pay-workflow-0001', confirmDuplicate: false }
  });
  assert.equal(approved.statusCode, 200);
  assert.equal(approved.json().payment.status, 'PAID');
  assert.equal(approved.json().balanceNgn, '450000.00');
  await app.close();
});

test('P2P payout enforces risk review and pays a clean demo order', async () => {
  const app = await buildApp();
  const orders = await app.inject({ method: 'GET', url: '/v1/p2p/orders', headers: { 'x-app-mode': 'DEMO' } });
  const clean = orders.json().orders.find((item: { riskFlags: string[] }) => item.riskFlags.length === 0);
  const risky = orders.json().orders.find((item: { riskFlags: string[] }) => item.riskFlags.length > 0);
  const blocked = await app.inject({ method: 'POST', url: `/v1/p2p/orders/${risky.id}/approve`, headers: { 'x-app-mode': 'DEMO' }, payload: { pin: '1234', idempotencyKey: 'p2p-risky-order-01' } });
  assert.equal(blocked.statusCode, 409);
  const paid = await app.inject({ method: 'POST', url: `/v1/p2p/orders/${clean.id}/approve`, headers: { 'x-app-mode': 'DEMO' }, payload: { pin: '1234', idempotencyKey: 'p2p-clean-order-01' } });
  assert.equal(paid.statusCode, 200);
  assert.equal(paid.json().order.status, 'PAID');
  await app.close();
});

test('bill payment posts through the demo ledger with a receipt', async () => {
  const app = await buildApp();
  const result = await app.inject({
    method: 'POST',
    url: '/v1/bills/pay',
    headers: { 'x-app-mode': 'DEMO' },
    payload: { service: 'AIRTIME', customerReference: '08030000000', amountNgn: 2000, pin: '1234', idempotencyKey: 'bill-airtime-0001' }
  });
  assert.equal(result.statusCode, 201);
  assert.equal(result.json().payment.status, 'PAID');
  assert.match(result.json().receipt, /^MZ-/);
  assert.equal(result.json().balanceNgn, '497950.00');
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
