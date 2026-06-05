import Fastify, { FastifyError, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { timingSafeEqual } from 'node:crypto';
import { z, ZodError } from 'zod';
import { config } from './config.js';

type AppOptions = {
  environment?: string;
  adminApiToken?: string;
  adminOrigins?: string[];
};

export async function buildApp(options: AppOptions = {}) {
  const environment = options.environment ?? config.environment;
  const adminApiToken = options.adminApiToken ?? config.adminApiToken;
  const adminOrigins = options.adminOrigins ?? config.adminOrigins;
  const app = Fastify({ logger: false, requestIdHeader: 'x-request-id' });
  await app.register(cors, {
    origin(origin, callback) {
      if (!origin || adminOrigins.includes(origin)) return callback(null, true);
      return callback(null, false);
    }
  });
  await app.register(helmet);
  await app.register(rateLimit, { max: 120, timeWindow: '1 minute' });

  app.addHook('preHandler', async (request, reply) => {
    if (!request.url.startsWith('/v1/admin') || environment !== 'production') return;
    if (!adminApiToken) {
      return reply.status(503).send({
        code: 'ADMIN_AUTH_NOT_CONFIGURED',
        message: 'Admin authentication is not configured.'
      });
    }
    const supplied = request.headers.authorization?.replace(/^Bearer\s+/i, '') || '';
    if (!safeTokenEqual(supplied, adminApiToken)) {
      return reply.status(401).send({
        code: 'ADMIN_UNAUTHORIZED',
        message: 'A valid admin authorization token is required.'
      });
    }
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: 'One or more request fields are invalid.',
        requestId: request.id,
        details: error.flatten()
      });
    }
    const typedError = error as FastifyError;
    request.log.error(typedError);
    reply.status(typedError.statusCode || 500).send({
      code: typedError.statusCode ? 'REQUEST_FAILED' : 'INTERNAL_ERROR',
      message: typedError.statusCode ? typedError.message : 'The request could not be completed.',
      requestId: request.id
    });
  });

  app.get('/health', async () => ({
    ok: true,
    service: 'nairameme-api',
    environment,
    providers: providerStates(),
    features: config.flags
  }));

  app.get('/v1/mobile/home', async () => ({
    wallet: {
      availableNgn: '0.00',
      reservedNgn: '0.00',
      portfolioNgn: '0.00',
      todayPnlNgn: '0.00',
      totalEquityNgn: '0.00'
    },
    runner: null,
    alerts: [],
    providerState: {
      ready: config.providers.marketData,
      message: config.providers.marketData
        ? 'Scanner connected. Waiting for a qualified, verified runner.'
        : 'Market data providers are not configured. No token data will be fabricated.'
    }
  }));

  app.get('/v1/tokens', async () => ({ tokens: [] }));

  app.post('/v1/auth/start', async (request, reply) => {
    z.object({ identifier: z.string().trim().min(5).max(254) }).parse(request.body);
    return providerRequired(reply, 'identity', 'Phone and email authentication provider is not configured.');
  });
  app.post('/v1/kyc/session', async (_, reply) => providerRequired(reply, 'kyc', 'KYC provider is not configured.'));
  app.post('/v1/deposits', async (_, reply) => providerRequired(reply, 'payments', 'Naira deposit provider is not configured.'));
  app.post('/v1/withdrawals', async (_, reply) => providerRequired(reply, 'payments', 'Naira withdrawal provider is not configured.'));
  app.post('/v1/trades/quote', async (_, reply) => providerRequired(reply, 'trading', 'Trading provider is not configured.'));
  app.post('/v1/trades/execute', async (_, reply) => providerRequired(reply, 'trading', 'Trading provider is not configured.'));
  app.post('/v1/copy-allocations', async (_, reply) => featureRequired(reply, 'copyTrading', 'Copy trading is disabled until compliance and execution controls are approved.'));

  app.get('/v1/admin/overview', async () => ({
    users: { total: 0, active: 0, restricted: 0, pendingKyc: 0 },
    money: { depositsPendingNgn: '0.00', withdrawalsPendingNgn: '0.00', revenueTodayNgn: '0.00' },
    operations: { openRiskCases: 0, pendingApprovals: 0, activeIncidents: 0 },
    providers: providerStates(),
    features: config.flags
  }));

  app.get('/v1/admin/providers', async () => Object.entries(providerStates()).map(([key, value]) => ({
    key,
    displayName: providerName(key),
    ...value,
    secret: value.configured ? 'configured (masked)' : 'not configured'
  })));

  app.post('/v1/admin/providers/:key/test', async (request, reply) => {
    const key = z.string().parse((request.params as { key: string }).key);
    const state = providerStates()[key as keyof ReturnType<typeof providerStates>];
    if (!state) return reply.status(404).send({ code: 'UNKNOWN_PROVIDER', message: 'Unknown provider.' });
    return { key, ...state, testedAt: new Date().toISOString() };
  });

  app.post('/v1/admin/providers/:key/configure', async (request, reply) => {
    const key = z.string().parse((request.params as { key: string }).key);
    if (!(key in providerStates())) return reply.status(404).send({ code: 'UNKNOWN_PROVIDER', message: 'Unknown provider.' });
    z.object({
      secret: z.string().min(8).max(10_000),
      publicConfig: z.record(z.string(), z.unknown()).default({})
    }).parse(request.body);
    if (!config.secretManager) {
      return reply.status(503).send({
        code: 'SECRET_MANAGER_NOT_CONFIGURED',
        message: 'Configure a server-side secret manager before storing provider credentials.'
      });
    }
    return reply.status(501).send({
      code: 'SECRET_MANAGER_ADAPTER_PENDING',
      message: 'The secret manager is selected, but its audited storage adapter is not enabled.'
    });
  });

  app.post('/v1/admin/campaigns', async (request, reply) => {
    const campaign = CampaignSchema.parse(request.body);
    if (campaign.channel === 'EMAIL' && !config.providers.email) {
      return reply.status(409).send({ code: 'EMAIL_PROVIDER_MISSING', message: 'Configure the email provider before approving this campaign.' });
    }
    return reply.status(201).send({
      id: crypto.randomUUID(),
      status: 'PENDING_APPROVAL',
      ...campaign,
      createdAt: new Date().toISOString(),
      note: 'Campaigns require recipient consent filtering and second-admin approval before send.'
    });
  });

  app.post('/v1/admin/emergency/:component/pause', async (request, reply) => reply.status(202).send({
    component: (request.params as { component: string }).component,
    paused: false,
    status: 'PENDING_APPROVAL',
    approvalRequired: true,
    recordedAt: new Date().toISOString()
  }));

  return app;
}

const CampaignSchema = z.object({
  name: z.string().min(3).max(120),
  channel: z.enum(['EMAIL', 'PUSH', 'IN_APP']),
  subject: z.string().max(160).optional(),
  body: z.string().min(1).max(20_000),
  segment: z.object({
    subscriptionTier: z.array(z.enum(['FREE', 'PRO', 'ELITE'])).optional(),
    kycStatus: z.array(z.string()).optional(),
    marketingConsentRequired: z.boolean().default(true)
  })
});

function providerRequired(reply: FastifyReply, provider: keyof typeof config.providers, message: string) {
  if (!config.providers[provider]) return reply.status(503).send({ code: 'PROVIDER_NOT_CONFIGURED', message });
  return reply.status(501).send({ code: 'ADAPTER_NOT_IMPLEMENTED', message: 'Provider configured, but the audited adapter is not enabled.' });
}

function featureRequired(reply: FastifyReply, feature: keyof typeof config.flags, message: string) {
  if (!config.flags[feature]) return reply.status(403).send({ code: 'FEATURE_DISABLED', message });
  return reply.status(501).send({ code: 'FEATURE_PENDING', message: 'Feature enabled but execution adapter is pending audit.' });
}

function providerStates() {
  return {
    payments: state(config.providers.payments),
    identity: state(config.providers.identity),
    marketData: state(config.providers.marketData),
    solanaRpc: state(config.providers.solanaRpc),
    kyc: state(config.providers.kyc),
    email: state(config.providers.email),
    push: state(config.providers.push),
    trading: state(config.providers.trading),
    ai: state(config.providers.ai)
  };
}

function state(configured: boolean) {
  return { configured, status: configured ? 'CONFIGURED' : 'UNCONFIGURED' };
}

function providerName(key: string) {
  return ({ identity: 'Phone and email authentication', payments: 'Naira payments', marketData: 'Market data', solanaRpc: 'Solana RPC', kyc: 'Identity/KYC', email: 'Email delivery', push: 'Push notifications', trading: 'Trade execution', ai: 'AI intelligence' } as Record<string, string>)[key] || key;
}

function safeTokenEqual(supplied: string, expected: string) {
  const left = Buffer.from(supplied);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}
