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

test('session rotation revokes the old token and returns a new device-bound session', async () => {
  const app = await buildApp();
  const signedIn = await app.inject({
    method: 'POST',
    url: '/v1/auth/demo',
    headers: { 'x-device-id': 'device-one', 'x-device-name': 'Ada iPhone' },
    payload: {}
  });
  const oldToken = signedIn.json().token;
  const rotated = await app.inject({
    method: 'POST',
    url: '/v1/auth/session/rotate',
    headers: { authorization: `Bearer ${oldToken}`, 'x-device-id': 'device-one' }
  });
  assert.equal(rotated.statusCode, 200);
  assert.notEqual(rotated.json().token, oldToken);
  const oldSession = await app.inject({ method: 'GET', url: '/v1/auth/me', headers: { authorization: `Bearer ${oldToken}` } });
  assert.equal(oldSession.statusCode, 401);
  await app.close();
});

test('admin command center exposes infrastructure, queues, treasury, and release gates', async () => {
  const app = await buildApp();
  const response = await app.inject({ method: 'GET', url: '/v1/admin/command-center?mode=DEMO' });
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().system.app, 'RUNNING');
  assert.equal(typeof response.json().system.database.status, 'string');
  assert.equal(typeof response.json().queues.deposits, 'number');
  assert.ok(Array.isArray(response.json().treasury));
  assert.ok(Array.isArray(response.json().system.launchBlockers));
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

test('WhatsApp demo link verifies and prepares payment without moving money', async () => {
  const app = await buildApp();
  const linked = await app.inject({
    method: 'POST',
    url: '/v1/whatsapp/link',
    headers: { 'x-app-mode': 'DEMO' },
    payload: { phone: '+2348012345678' }
  });
  assert.equal(linked.statusCode, 201);
  assert.equal(linked.json().connection.status, 'PENDING_VERIFICATION');
  assert.equal(linked.json().demoVerificationCode, '246810');
  assert.equal(linked.body.includes('+2348012345678'), false);

  const verified = await app.inject({
    method: 'POST',
    url: '/v1/whatsapp/verify',
    headers: { 'x-app-mode': 'DEMO' },
    payload: { connectionId: linked.json().connection.id, code: '246810' }
  });
  assert.equal(verified.statusCode, 200);
  assert.equal(verified.json().connection.status, 'CONNECTED');

  const prepared = await app.inject({
    method: 'POST',
    url: '/v1/whatsapp/command',
    headers: { 'x-app-mode': 'DEMO' },
    payload: {
      connectionId: linked.json().connection.id,
      text: 'Send ₦50,000 to 0123456789 Access Bank for inventory'
    }
  });
  assert.equal(prepared.statusCode, 200);
  assert.equal(prepared.json().command.command, 'PAYMENT');
  assert.equal(prepared.json().approval.status, 'AWAITING_IN_APP_APPROVAL');

  const approvals = await app.inject({ method: 'GET', url: '/v1/whatsapp/approvals', headers: { 'x-app-mode': 'DEMO' } });
  assert.equal(approvals.json().approvals.length, 1);
  const home = await app.inject({ method: 'GET', url: '/v1/mobile/home', headers: { 'x-app-mode': 'DEMO' } });
  assert.equal(home.json().wallet.availableNgn, '500000.00');
  await app.close();
});

test('multi-asset swap quote and Demo execution update both asset balances', async () => {
  const app = await buildApp();
  const quote = await app.inject({
    method: 'POST',
    url: '/v1/swaps/quote',
    headers: { 'x-app-mode': 'DEMO' },
    payload: { fromAsset: 'NGN', toAsset: 'USDT', amount: 50000, slippagePercent: 1 }
  });
  assert.equal(quote.statusCode, 201);
  assert.equal(quote.json().quote.fromAsset, 'NGN');
  assert.ok(Number(quote.json().quote.estimatedReceive) > 0);
  const executed = await app.inject({
    method: 'POST',
    url: '/v1/swaps/execute',
    headers: { 'x-app-mode': 'DEMO' },
    payload: { fromAsset: 'NGN', toAsset: 'USDT', amount: 50000, slippagePercent: 1, pin: '1234', idempotencyKey: 'swap-ngn-usdt-0001' }
  });
  assert.equal(executed.statusCode, 201);
  assert.equal(executed.json().swap.status, 'SUCCESSFUL');
  assert.equal(executed.json().balances.NGN, '450000.000000');
  assert.ok(Number(executed.json().balances.USDT) > 86.42);
  await app.close();
});

test('MemeZo recipient resolution and internal transfer use double-entry accounting', async () => {
  const app = await buildApp();
  const resolved = await app.inject({
    method: 'GET',
    url: '/v1/transfers/recipients?q=%40tobi',
    headers: { 'x-app-mode': 'DEMO' }
  });
  assert.equal(resolved.statusCode, 200);
  assert.equal(resolved.json().recipients.length, 1);
  assert.equal(resolved.json().recipients[0].tag, '@tobi');
  assert.equal(resolved.json().recipients[0].verified, true);

  const sent = await app.inject({
    method: 'POST',
    url: '/v1/transfers/internal',
    headers: { 'x-app-mode': 'DEMO' },
    payload: {
      recipientId: 'demo-user-tobi',
      amountNgn: 25000,
      narration: 'Lunch contribution',
      pin: '1234',
      idempotencyKey: 'internal-transfer-0001'
    }
  });
  assert.equal(sent.statusCode, 201);
  assert.equal(sent.json().transfer.status, 'COMPLETED');
  assert.equal(sent.json().senderBalanceNgn, '475000.00');
  assert.equal(sent.json().recipientBalanceNgn, '25000.00');
  assert.match(sent.json().receipt, /^MZ-/);

  const history = await app.inject({ method: 'GET', url: '/v1/transfers/internal', headers: { 'x-app-mode': 'DEMO' } });
  assert.equal(history.json().transfers.length, 1);
  assert.equal(history.json().transfers[0].recipientName, 'Tobi Adeyemi');
  await app.close();
});

test('internal transfer rejects self transfer and invalid PIN', async () => {
  const app = await buildApp();
  const self = await app.inject({
    method: 'POST',
    url: '/v1/transfers/internal',
    headers: { 'x-app-mode': 'DEMO' },
    payload: {
      recipientId: 'demo-user-ada',
      amountNgn: 1000,
      pin: '1234',
      idempotencyKey: 'internal-transfer-self'
    }
  });
  assert.equal(self.statusCode, 409);
  assert.equal(self.json().code, 'SELF_TRANSFER_NOT_ALLOWED');

  const badPin = await app.inject({
    method: 'POST',
    url: '/v1/transfers/internal',
    headers: { 'x-app-mode': 'DEMO' },
    payload: {
      recipientId: 'demo-user-tobi',
      amountNgn: 1000,
      pin: '0000',
      idempotencyKey: 'internal-transfer-pin'
    }
  });
  assert.equal(badPin.statusCode, 401);
  assert.equal(badPin.json().code, 'INVALID_TRANSACTION_PIN');
  await app.close();
});

test('WhatsApp settings allow bounded PIN approval but force large payments into the app', async () => {
  const app = await buildApp();
  const linked = await app.inject({
    method: 'POST',
    url: '/v1/whatsapp/link',
    headers: { 'x-app-mode': 'DEMO' },
    payload: { phone: '+2348012345678' }
  });
  await app.inject({
    method: 'POST',
    url: '/v1/whatsapp/verify',
    headers: { 'x-app-mode': 'DEMO' },
    payload: { connectionId: linked.json().connection.id, code: '246810' }
  });
  const settings = await app.inject({
    method: 'PUT',
    url: '/v1/whatsapp/settings',
    headers: { 'x-app-mode': 'DEMO' },
    payload: {
      paymentsEnabled: true,
      dailyLimitNgn: 100000,
      perTransactionLimitNgn: 50000,
      requireInAppAboveNgn: 50000,
      trustedRecipients: ['0123456789'],
      p2pAutoPayPaused: false
    }
  });
  assert.equal(settings.statusCode, 200);
  assert.equal(settings.json().settings.perTransactionLimitMinor, '5000000');

  const prepared = await app.inject({
    method: 'POST',
    url: '/v1/whatsapp/command',
    headers: { 'x-app-mode': 'DEMO' },
    payload: {
      connectionId: linked.json().connection.id,
      text: 'Send ₦25,000 to 0123456789 Access Bank for inventory'
    }
  });
  const approved = await app.inject({
    method: 'POST',
    url: `/v1/whatsapp/approvals/${prepared.json().approval.id}/approve`,
    headers: { 'x-app-mode': 'DEMO' },
    payload: {
      pin: '1234',
      approvalChannel: 'WHATSAPP_PIN',
      idempotencyKey: 'whatsapp-approval-0001'
    }
  });
  assert.equal(approved.statusCode, 200);
  assert.equal(approved.json().approval.status, 'APPROVED');
  assert.equal(approved.json().payment.status, 'PAID');
  assert.equal(approved.json().balanceNgn, '475000.00');

  const large = await app.inject({
    method: 'POST',
    url: '/v1/whatsapp/command',
    headers: { 'x-app-mode': 'DEMO' },
    payload: {
      connectionId: linked.json().connection.id,
      text: 'Send ₦60,000 to 0123456789 Access Bank for inventory'
    }
  });
  const blocked = await app.inject({
    method: 'POST',
    url: `/v1/whatsapp/approvals/${large.json().approval.id}/approve`,
    headers: { 'x-app-mode': 'DEMO' },
    payload: {
      pin: '1234',
      approvalChannel: 'WHATSAPP_PIN',
      idempotencyKey: 'whatsapp-approval-large'
    }
  });
  assert.equal(blocked.statusCode, 409);
  assert.equal(blocked.json().code, 'IN_APP_APPROVAL_REQUIRED');
  await app.close();
});
