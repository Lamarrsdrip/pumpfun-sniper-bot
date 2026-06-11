import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from '../src/server.js';
import { createMemoryProviderVault } from '../src/domain/provider-vault.js';

test('provider configuration fails closed when no secret manager is configured', async () => {
  const app = await buildApp();
  const response = await app.inject({
    method: 'POST',
    url: '/v1/admin/providers/monnify/configure',
    payload: {
      credentials: {
        'API Key': 'must-never-be-returned',
        'Secret Key': 'test-secret',
        'Contract Code': 'contract',
        'Base URL': 'https://sandbox.monnify.com',
        'Webhook Secret': 'webhook-secret'
      },
      publicConfig: {}
    }
  });

  assert.equal(response.statusCode, 503);
  assert.equal(response.json().code, 'CREDENTIAL_VAULT_NOT_CONFIGURED');
  assert.equal(response.body.includes('must-never-be-returned'), false);
  await app.close();
});

test('provider credentials save encrypted through the vault and can be structurally tested', async () => {
  const vault = createMemoryProviderVault();
  const app = await buildApp({ providerVault: vault });
  const configured = await app.inject({
    method: 'POST',
    url: '/v1/admin/providers/monnify/configure',
    payload: {
      credentials: {
        'API Key': 'api-key',
        'Secret Key': 'secret-key',
        'Contract Code': 'contract-code',
        'Base URL': 'https://sandbox.monnify.com',
        'Webhook Secret': 'webhook-secret'
      },
      publicConfig: {}
    }
  });
  assert.equal(configured.statusCode, 201);
  assert.equal(configured.body.includes('secret-key'), false);
  assert.equal(await vault.has('monnify'), true);
  const tested = await app.inject({ method: 'POST', url: '/v1/admin/providers/monnify/test' });
  assert.equal(tested.statusCode, 200);
  assert.equal(tested.json().status, 'DEGRADED');
  await app.close();
});

test('campaign draft is stored but approval fails clearly when email is not configured', async () => {
  const app = await buildApp();
  const created = await app.inject({
    method: 'POST',
    url: '/v1/admin/campaigns',
    payload: {
      name: 'Market safety update',
      channel: 'EMAIL',
      subject: 'Important account notice',
      body: 'We have updated the market-risk controls.',
      audience: 'ALL',
      submitForApproval: true,
      segment: { marketingConsentRequired: true }
    }
  });

  assert.equal(created.statusCode, 201);
  const response = await app.inject({ method: 'POST', url: `/v1/admin/campaigns/${created.json().campaign.id}/approve` });
  assert.equal(response.statusCode, 409);
  assert.equal(response.json().code, 'EMAIL_PROVIDER_MISSING');
  await app.close();
});

test('demo emergency pause activates immediately', async () => {
  const app = await buildApp();
  const response = await app.inject({
    method: 'POST',
    url: '/v1/admin/emergency/trading/pause'
  });

  assert.equal(response.statusCode, 202);
  assert.equal(response.json().component, 'trading');
  assert.equal(response.json().paused, true);
  assert.equal(response.json().status, 'ACTIVE');
  await app.close();
});

test('fees, incidents and token moderation perform real audited state changes', async () => {
  const app = await buildApp();
  const settings = await app.inject({
    method: 'PUT',
    url: '/v1/admin/settings',
    payload: {
      depositFeePercent: 0.5,
      swapFeePercent: 0.8,
      botFeePercent: 4,
      withdrawalFeePercent: 0.4,
      cryptoWithdrawalMarginPercent: 0.1,
      minimumDepositNgn: 1000,
      maximumWithdrawalNgn: 5_000_000,
      dailyUserLimitNgn: 10_000_000,
      proMonthlyNgn: 7500,
      eliteMonthlyNgn: 25000
    }
  });
  assert.equal(settings.statusCode, 200);
  assert.equal(settings.json().settings.swapFeePercent, 0.8);

  const incident = await app.inject({
    method: 'POST',
    url: '/v1/admin/incidents',
    payload: { title: 'Payment webhook delay', severity: 'HIGH', note: 'Monnify callback delayed', affectedRecords: ['deposit-1'] }
  });
  assert.equal(incident.statusCode, 201);
  const resolved = await app.inject({
    method: 'PATCH',
    url: `/v1/admin/incidents/${incident.json().incident.id}`,
    payload: { status: 'RESOLVED', note: 'Provider recovered' }
  });
  assert.equal(resolved.json().incident.status, 'RESOLVED');

  const tokens = await app.inject({ method: 'GET', url: '/v1/admin/tokens' });
  const moderated = await app.inject({
    method: 'PATCH',
    url: `/v1/admin/tokens/${tokens.json().tokens[0].id}`,
    payload: { featured: true, reason: 'Verified demo intelligence review' }
  });
  assert.equal(moderated.json().moderation.featured, true);

  const audit = await app.inject({ method: 'GET', url: '/v1/admin/audit' });
  assert.ok(audit.json().events.some((event: { action: string }) => event.action === 'OPERATIONS_SETTINGS_UPDATED'));
  assert.ok(audit.json().events.some((event: { action: string }) => event.action === 'INCIDENT_UPDATED'));
  assert.ok(audit.json().events.some((event: { action: string }) => event.action === 'TOKEN_MODERATION_UPDATED'));
  await app.close();
});

test('asset availability and reward policy changes are audited', async () => {
  const app = await buildApp();
  const assets = await app.inject({ method: 'GET', url: '/v1/admin/assets' });
  assert.equal(assets.statusCode, 200);
  assert.equal(assets.json().assets.some((asset: { symbol: string }) => asset.symbol === 'BTC'), true);

  const updatedAsset = await app.inject({
    method: 'PATCH',
    url: '/v1/admin/assets/TRX',
    payload: { enabled: true, deposits: true, withdrawals: true, swaps: true, reason: 'Tron custody adapter approved for Demo' }
  });
  assert.equal(updatedAsset.statusCode, 200);
  assert.equal(updatedAsset.json().asset.enabled, true);

  const rewards = await app.inject({
    method: 'PUT',
    url: '/v1/admin/rewards',
    payload: {
      enabled: true,
      referralRewardNgn: 1500,
      refereeRewardNgn: 750,
      billCashbackPercent: 1,
      cardCashbackPercent: 0.5,
      tradingRewardPercent: 0
    }
  });
  assert.equal(rewards.statusCode, 200);
  assert.equal(rewards.json().settings.referralRewardNgn, 1500);

  const audit = await app.inject({ method: 'GET', url: '/v1/admin/audit' });
  assert.ok(audit.json().events.some((event: { action: string }) => event.action === 'ASSET_POLICY_UPDATED'));
  assert.ok(audit.json().events.some((event: { action: string }) => event.action === 'REWARD_POLICY_UPDATED'));
  await app.close();
});

test('WhatsApp template drafts are created and audited without sending messages', async () => {
  const app = await buildApp();
  const created = await app.inject({
    method: 'POST',
    url: '/v1/admin/whatsapp/templates',
    payload: {
      name: 'deposit_received',
      category: 'UTILITY',
      language: 'en',
      body: 'Your MemeZo deposit of {{1}} has been confirmed.'
    }
  });
  assert.equal(created.statusCode, 201);
  assert.equal(created.json().template.status, 'DRAFT');

  const templates = await app.inject({ method: 'GET', url: '/v1/admin/whatsapp/templates' });
  assert.ok(templates.json().templates.some((item: { name: string }) => item.name === 'deposit_received'));

  const audit = await app.inject({ method: 'GET', url: '/v1/admin/audit' });
  assert.ok(audit.json().events.some((event: { action: string }) => event.action === 'WHATSAPP_TEMPLATE_CREATED'));
  await app.close();
});

test('production admin routes reject requests without an admin token', async () => {
  const app = await buildApp({
    environment: 'production',
    adminApiToken: 'a-secure-admin-token',
    adminOrigins: ['https://admin.nairameme.ng']
  });
  const response = await app.inject({
    method: 'GET',
    url: '/v1/admin/overview'
  });

  assert.equal(response.statusCode, 401);
  assert.equal(response.json().code, 'ADMIN_UNAUTHORIZED');
  await app.close();
});

test('production admin routes accept the configured admin token', async () => {
  const app = await buildApp({
    environment: 'production',
    adminApiToken: 'a-secure-admin-token',
    adminOrigins: ['https://admin.nairameme.ng']
  });
  const response = await app.inject({
    method: 'GET',
    url: '/v1/admin/overview',
    headers: { authorization: 'Bearer a-secure-admin-token' }
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.json().users.total, 0);
  await app.close();
});

test('approved admin origin receives a CORS allow-origin header', async () => {
  const app = await buildApp({
    environment: 'production',
    adminApiToken: 'a-secure-admin-token',
    adminOrigins: ['https://admin.nairameme.ng']
  });
  const response = await app.inject({
    method: 'OPTIONS',
    url: '/v1/admin/overview',
    headers: {
      origin: 'https://admin.nairameme.ng',
      'access-control-request-method': 'GET'
    }
  });

  assert.equal(response.headers['access-control-allow-origin'], 'https://admin.nairameme.ng');
  await app.close();
});

test('authentication start fails clearly when no identity provider is configured', async () => {
  const app = await buildApp();
  const response = await app.inject({
    method: 'POST',
    url: '/v1/auth/start',
    payload: { identifier: 'user@example.com' }
  });

  assert.equal(response.statusCode, 503);
  assert.equal(response.json().code, 'PROVIDER_NOT_CONFIGURED');
  await app.close();
});

test('KYC session creation fails clearly when no KYC provider is configured', async () => {
  const app = await buildApp();
  const response = await app.inject({
    method: 'POST',
    url: '/v1/kyc/session'
  });

  assert.equal(response.statusCode, 503);
  assert.equal(response.json().code, 'PROVIDER_NOT_CONFIGURED');
  await app.close();
});

test('invalid API input returns a validation error instead of an internal error', async () => {
  const app = await buildApp();
  const response = await app.inject({
    method: 'POST',
    url: '/v1/auth/start',
    payload: { identifier: 'x' }
  });

  assert.equal(response.statusCode, 400);
  assert.equal(response.json().code, 'VALIDATION_ERROR');
  await app.close();
});
