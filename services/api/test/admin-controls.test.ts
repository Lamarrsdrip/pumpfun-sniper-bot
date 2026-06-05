import assert from 'node:assert/strict';
import test from 'node:test';
import { buildApp } from '../src/server.js';

test('provider configuration fails closed when no secret manager is configured', async () => {
  const app = await buildApp();
  const response = await app.inject({
    method: 'POST',
    url: '/v1/admin/providers/payments/configure',
    payload: {
      secret: 'must-never-be-returned',
      publicConfig: { provider: 'paystack' }
    }
  });

  assert.equal(response.statusCode, 503);
  assert.equal(response.json().code, 'SECRET_MANAGER_NOT_CONFIGURED');
  assert.equal(response.body.includes('must-never-be-returned'), false);
  await app.close();
});

test('campaign draft reports a missing email provider instead of pretending to send', async () => {
  const app = await buildApp();
  const response = await app.inject({
    method: 'POST',
    url: '/v1/admin/campaigns',
    payload: {
      name: 'Market safety update',
      channel: 'EMAIL',
      subject: 'Important account notice',
      body: 'We have updated the market-risk controls.',
      segment: { marketingConsentRequired: true }
    }
  });

  assert.equal(response.statusCode, 409);
  assert.equal(response.json().code, 'EMAIL_PROVIDER_MISSING');
  await app.close();
});

test('emergency pause creates an approval-controlled action', async () => {
  const app = await buildApp();
  const response = await app.inject({
    method: 'POST',
    url: '/v1/admin/emergency/trading/pause'
  });

  assert.equal(response.statusCode, 202);
  assert.equal(response.json().component, 'trading');
  assert.equal(response.json().paused, false);
  assert.equal(response.json().status, 'PENDING_APPROVAL');
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
