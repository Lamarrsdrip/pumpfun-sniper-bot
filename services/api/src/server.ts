import Fastify, { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { z, ZodError } from 'zod';
import { config } from './config.js';
import { aiBudgetStatus, explainWithBudget } from './ai.js';
import { issueSession, resolveSession } from './domain/auth.js';
import { accountBalanceMinor, ensureSufficientBalance, postLedgerTransaction, userWalletBalanceMinor } from './domain/ledger.js';
import { seedDemoData } from './domain/seed.js';
import { createMemoryStore, type MemoryStore } from './domain/store.js';
import {
  createEncryptedProviderVault,
  type ProviderCredentials,
  type ProviderVault
} from './domain/provider-vault.js';
import type { AuditEvent, Mode, MoneyRequest, ProviderConfig, Trade, User } from './domain/types.js';

type AppOptions = {
  environment?: string;
  adminApiToken?: string;
  adminOrigins?: string[];
  store?: MemoryStore;
  providerVault?: ProviderVault;
};

const money = z.coerce.number().positive().max(100_000_000);

type CampaignRecord = z.infer<typeof CampaignSchema> & {
  id: string;
  mode: Mode;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'SCHEDULED' | 'SENT' | 'FAILED';
  audience: string;
  scheduledAt?: string;
  createdAt: string;
  delivery?: { attempted: number; delivered: number; failed: number };
};

type IncidentRecord = {
  id: string;
  mode: Mode;
  title: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED';
  notes: string[];
  affectedRecords: string[];
  createdAt: string;
  updatedAt: string;
};

type OperationsSettings = {
  swapFeePercent: number;
  botFeePercent: number;
  withdrawalFeePercent: number;
  minimumDepositNgn: number;
  maximumWithdrawalNgn: number;
  dailyUserLimitNgn: number;
  proMonthlyNgn: number;
  eliteMonthlyNgn: number;
};

export async function buildApp(options: AppOptions = {}) {
  const environment = options.environment ?? config.environment;
  const adminApiToken = options.adminApiToken ?? config.adminApiToken;
  const adminOrigins = options.adminOrigins ?? config.adminOrigins;
  const store = options.store ?? createMemoryStore(environment === 'production' ? emptyState() : seedDemoData());
  const providerVault = options.providerVault ?? (
    config.providerVaultKey
      ? createEncryptedProviderVault(config.providerVaultPath, config.providerVaultKey)
      : undefined
  );
  if (providerVault) {
    for (const key of await providerVault.keys()) {
      const base = defaultProviders().find((item) => item.key === key);
      if (base) store.saveProvider({ ...base, configured: true, status: 'DEGRADED' });
    }
  }
  const botSettings = new Map<string, { active: boolean; riskLevel: string; maxTradeNgn: number; takeProfitPercent: number; stopLossPercent: number; dailyLossLimitPercent: number }>();
  const campaigns = new Map<string, CampaignRecord>();
  const incidents = new Map<string, IncidentRecord>();
  const operationsSettings = new Map<Mode, OperationsSettings>([
    ['DEMO', defaultOperationsSettings()],
    ['LIVE', defaultOperationsSettings()]
  ]);
  const systemControls = new Map<string, { paused: boolean; status: string; updatedAt: string }>();
  const tokenModeration = new Map<string, { classification: 'DEFAULT' | 'SAFE' | 'RISKY'; hidden: boolean; featured: boolean; updatedAt: string }>();
  const copyProfiles = new Map<string, { enabled: boolean; riskRating: 'LOW' | 'MEDIUM' | 'HIGH'; reviewedAt?: string }>();
  const app = Fastify({ logger: false, requestIdHeader: 'x-request-id' });
  await app.register(cors, {
    origin(origin, callback) {
      if (!origin || adminOrigins.includes(origin) || environment !== 'production') return callback(null, true);
      return callback(null, false);
    }
  });
  await app.register(helmet);
  await app.register(rateLimit, { max: 180, timeWindow: '1 minute' });

  app.addHook('preHandler', async (request, reply) => {
    if (!request.url.startsWith('/v1/admin') || environment !== 'production') return;
    const supplied = request.headers.authorization?.replace(/^Bearer\s+/i, '') || '';
    const sessionUser = supplied ? resolveSession(store, supplied) : undefined;
    const roleAllowed = sessionUser ? sessionUser.role !== 'USER' : false;
    const serviceTokenAllowed = Boolean(adminApiToken) && safeTokenEqual(supplied, adminApiToken);
    if (!roleAllowed && !serviceTokenAllowed) {
      if (!adminApiToken && !sessionUser) return reply.status(503).send({ code: 'ADMIN_AUTH_NOT_CONFIGURED', message: 'Admin authentication is not configured.' });
      return reply.status(401).send({ code: 'ADMIN_UNAUTHORIZED', message: 'An administrator session is required.' });
    }
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) return reply.status(400).send({ code: 'VALIDATION_ERROR', message: 'One or more request fields are invalid.', requestId: request.id, details: error.flatten() });
    const typed = error as FastifyError & { code?: string };
    request.log.error(typed);
    reply.status(typed.statusCode || 500).send({
      code: typed.code || (typed.statusCode ? 'REQUEST_FAILED' : 'INTERNAL_ERROR'),
      message: typed.statusCode ? typed.message : 'The request could not be completed.',
      requestId: request.id
    });
  });

  app.get('/health', async () => statusPayload(environment, store));
  app.get('/api/status', async () => statusPayload(environment, store));

  app.post('/v1/auth/demo', async (request, reply) => {
    if (environment === 'production') return reply.status(404).send({ code: 'NOT_FOUND', message: 'Demo access is unavailable.' });
    const body = z.object({ userId: z.string().default('demo-user-ada') }).parse(request.body || {});
    const user = store.getUser(body.userId);
    if (!user || user.mode !== 'DEMO') return reply.status(404).send({ code: 'DEMO_USER_NOT_FOUND', message: 'Demo user not found.' });
    return { ...issueSession(store, user.id), user };
  });
  app.get('/v1/me', async (request) => {
    const context = requestContext(request, store);
    return { user: context.user, mode: context.mode, isAdmin: context.user.role !== 'USER' };
  });
  app.post('/v1/auth/start', async (request, reply) => {
    z.object({ identifier: z.string().trim().min(5).max(254) }).parse(request.body);
    return providerRequired(reply, 'identity', 'Phone and email authentication provider is not configured.');
  });
  app.get('/v1/auth/me', async (request, reply) => {
    const user = authenticatedUser(request, store);
    return user ? { user } : reply.status(401).send({ code: 'UNAUTHORIZED', message: 'Sign in is required.' });
  });

  app.get('/v1/mobile/home', async (request) => {
    const context = requestContext(request, store);
    const tokens = store.listTokens(context.mode);
    const walletMinor = userWalletBalanceMinor(store, context.user.id, context.mode);
    const positions = store.listPositions({ userId: context.user.id, mode: context.mode });
    const marketValueMinor = positions.reduce((sum, position) => {
      const token = tokens.find((item) => item.id === position.tokenId);
      return sum + (token ? toMinor(Number(position.quantity) * Number(token.priceNgn)) : 0n);
    }, 0n);
    return {
      mode: context.mode,
      demoNotice: context.mode === 'DEMO' ? 'Demo Mode - Not Real Money' : undefined,
      user: context.user,
      wallet: {
        availableNgn: fromMinor(walletMinor),
        reservedNgn: '0.00',
        portfolioNgn: fromMinor(marketValueMinor),
        todayPnlNgn: '0.00',
        totalEquityNgn: fromMinor(walletMinor + marketValueMinor)
      },
      runner: tokens[0] ? {
        mint: tokens[0].mint,
        name: tokens[0].name,
        symbol: tokens[0].symbol,
        runnerScore: tokens[0].runnerScore,
        category: runnerCategory(tokens[0].runnerScore, tokens[0].riskScore),
        explanation: `${tokens[0].holders.toLocaleString()} holders, ${tokens[0].change24h.toFixed(1)}% momentum and ${tokens[0].riskScore}/100 risk.`
      } : null,
      alerts: store.listAlerts(context.mode),
      bounties: store.listBounties(context.mode),
      providerState: marketState(context.mode)
    };
  });
  app.get('/v1/tokens', async (request) => {
    const context = requestContext(request, store);
    return { mode: context.mode, demoNotice: context.mode === 'DEMO' ? 'Demo Mode - Not Real Money' : undefined, tokens: store.listTokens(context.mode) };
  });
  app.get('/v1/tokens/:mint', async (request, reply) => {
    const context = requestContext(request, store);
    const mint = z.string().parse((request.params as { mint: string }).mint);
    const token = store.listTokens(context.mode).find((item) => item.mint === mint);
    return token ? { token, explanation: tokenExplanation(token), ai: await explainWithBudget(token) } : reply.status(404).send({ code: 'TOKEN_NOT_FOUND', message: 'Token not found in this mode.' });
  });
  app.get('/v1/portfolio', async (request) => {
    const context = requestContext(request, store);
    const positions = store.listPositions({ mode: context.mode, userId: context.user.id }).map((position) => ({
      ...position,
      token: store.listTokens(context.mode).find((item) => item.id === position.tokenId)
    }));
    return {
      mode: context.mode,
      balanceNgn: fromMinor(userWalletBalanceMinor(store, context.user.id, context.mode)),
      positions,
      trades: store.listTrades({ mode: context.mode, userId: context.user.id }),
      transactions: store.listMoneyRequests({ mode: context.mode, userId: context.user.id })
    };
  });
  app.get('/v1/bounties', async (request) => {
    const context = requestContext(request, store);
    return { bounties: store.listBounties(context.mode) };
  });
  app.get('/v1/bot/settings', async (request) => {
    const context = requestContext(request, store);
    return { mode: context.mode, settings: botSettings.get(context.user.id) || { active: false, riskLevel: 'BALANCED', maxTradeNgn: 10000, takeProfitPercent: 30, stopLossPercent: 12, dailyLossLimitPercent: 5 } };
  });
  app.put('/v1/bot/settings', async (request, reply) => {
    const context = requestContext(request, store);
    const body = z.object({ active: z.boolean(), riskLevel: z.enum(['SAFE', 'BALANCED', 'SNIPER']), maxTradeNgn: z.number().min(500).max(1_000_000), takeProfitPercent: z.number().min(5).max(500), stopLossPercent: z.number().min(2).max(30), dailyLossLimitPercent: z.number().min(1).max(20) }).parse(request.body);
    if (context.mode === 'LIVE' && body.active) return reply.status(409).send({ code: 'LIVE_BOT_DISABLED', message: 'Live Auto Sniper requires an audited execution adapter, verified KYC and custody controls.' });
    botSettings.set(context.user.id, body);
    return { mode: context.mode, settings: body, message: body.active ? 'Demo Auto Sniper monitoring started. Trades still obey backend limits.' : 'Auto Sniper stopped.' };
  });

  app.post('/v1/kyc/session', async (request, reply) => {
    const context = optionalContext(request, store);
    if (context?.mode === 'DEMO') {
      const current = store.listKycCases().find((item) => item.userId === context.user.id);
      return { mode: 'DEMO', status: current?.status || context.user.kycStatus, message: 'Demo KYC journey is available without submitting real identity documents.' };
    }
    return providerRequired(reply, 'kyc', 'KYC provider is not configured.');
  });
  app.post('/v1/deposits', async (request, reply) => {
    const context = requestContext(request, store);
    const body = z.object({ amountNgn: money }).parse(request.body);
    if (context.mode === 'LIVE') return providerRequired(reply, 'payments', 'Naira deposit provider is not configured.');
    const record = createMoneyRequest(context.user, 'DEPOSIT', body.amountNgn, 'Demo Bank Rail');
    store.saveMoneyRequest(record);
    return reply.status(201).send({ request: record, instructions: { bank: 'NairaMeme Demo Bank', accountName: 'NairaMeme / Ada Nwosu', accountNumber: '0001234567', reference: record.reference } });
  });
  app.post('/v1/withdrawals', async (request, reply) => {
    const context = requestContext(request, store);
    const body = z.object({ amountNgn: money, bankName: z.string().min(2), accountNumber: z.string().regex(/^\d{10}$/), accountName: z.string().min(2) }).parse(request.body);
    if (context.mode === 'LIVE') return providerRequired(reply, 'payments', 'Naira withdrawal provider is not configured.');
    const feeMinor = toMinor(Math.max(50, body.amountNgn * 0.005));
    const amountMinor = toMinor(body.amountNgn);
    const wallet = requiredWallet(store, context.user.id, context.mode);
    ensureSufficientBalance(store, wallet.id, amountMinor + feeMinor);
    const record = { ...createMoneyRequest(context.user, 'WITHDRAWAL', body.amountNgn, 'Demo Bank Rail'), feeMinor: feeMinor.toString(), bankName: body.bankName, accountNumber: body.accountNumber, accountName: body.accountName };
    store.saveMoneyRequest(record);
    return reply.status(201).send({ request: record });
  });
  app.post('/v1/trades/quote', async (request, reply) => {
    const context = requestContext(request, store);
    const body = z.object({ mint: z.string().min(20), side: z.enum(['BUY', 'SELL']), amountNgn: money }).parse(request.body);
    const token = store.listTokens(context.mode).find((item) => item.mint === body.mint);
    if (!token) return reply.status(404).send({ code: 'TOKEN_NOT_FOUND', message: 'Token not found in this mode.' });
    if (context.mode === 'LIVE') return providerRequired(reply, 'trading', 'Trading provider is not configured.');
    const fee = Math.max(25, body.amountNgn * 0.01);
    return { quoteId: `quote_${randomUUID()}`, expiresAt: new Date(Date.now() + 30_000).toISOString(), token, side: body.side, amountNgn: body.amountNgn.toFixed(2), feeNgn: fee.toFixed(2), estimatedQuantity: ((body.amountNgn - fee) / Number(token.priceNgn)).toFixed(6), slippagePercent: 1.5, mode: context.mode };
  });
  app.post('/v1/trades/execute', async (request, reply) => {
    const context = requestContext(request, store);
    const body = z.object({ mint: z.string().min(20), side: z.enum(['BUY', 'SELL']), amountNgn: money, idempotencyKey: z.string().min(8).max(120) }).parse(request.body);
    if (context.mode === 'LIVE') return providerRequired(reply, 'trading', 'Trading provider is not configured.');
    const token = store.listTokens(context.mode).find((item) => item.mint === body.mint);
    if (!token) return reply.status(404).send({ code: 'TOKEN_NOT_FOUND', message: 'Token not found in this mode.' });
    const wallet = requiredWallet(store, context.user.id, context.mode);
    const platform = requiredPlatformWallet(store, context.mode);
    const grossMinor = toMinor(body.amountNgn);
    const feeMinor = toMinor(Math.max(25, body.amountNgn * 0.01));
    let position = store.getPosition(context.user.id, token.id, context.mode);
    if (body.side === 'BUY') {
      ensureSufficientBalance(store, wallet.id, grossMinor);
      postLedgerTransaction(store, { mode: context.mode, idempotencyKey: body.idempotencyKey, description: `Buy ${token.symbol}`, entries: [{ accountId: wallet.id, side: 'DEBIT', amountMinor: grossMinor.toString() }, { accountId: platform.id, side: 'CREDIT', amountMinor: grossMinor.toString() }] });
      const quantity = Number(fromMinor(grossMinor - feeMinor)) / Number(token.priceNgn);
      position = store.savePosition({ id: position?.id || `pos_${randomUUID()}`, mode: context.mode, userId: context.user.id, tokenId: token.id, quantity: String(Number(position?.quantity || 0) + quantity), costMinor: String(BigInt(position?.costMinor || 0) + grossMinor), updatedAt: new Date().toISOString() });
    } else {
      if (!position) return reply.status(409).send({ code: 'NO_POSITION', message: 'There is no position to sell.' });
      const quantity = Math.min(Number(position.quantity), body.amountNgn / Number(token.priceNgn));
      const proceedsMinor = toMinor(quantity * Number(token.priceNgn));
      postLedgerTransaction(store, { mode: context.mode, idempotencyKey: body.idempotencyKey, description: `Sell ${token.symbol}`, entries: [{ accountId: platform.id, side: 'DEBIT', amountMinor: (proceedsMinor - feeMinor).toString() }, { accountId: wallet.id, side: 'CREDIT', amountMinor: (proceedsMinor - feeMinor).toString() }] });
      const remaining = Number(position.quantity) - quantity;
      if (remaining <= 0.000001) store.removePosition(position.id);
      else position = store.savePosition({ ...position, quantity: String(remaining), costMinor: String(BigInt(position.costMinor) * BigInt(Math.round(remaining * 1_000_000)) / BigInt(Math.round(Number(position.quantity) * 1_000_000))), updatedAt: new Date().toISOString() });
    }
    const trade: Trade = { id: `trade_${randomUUID()}`, mode: context.mode, userId: context.user.id, tokenId: token.id, side: body.side, amountMinor: grossMinor.toString(), feeMinor: feeMinor.toString(), quantity: position?.quantity || '0', priceNgn: token.priceNgn, status: 'CONFIRMED', createdAt: new Date().toISOString() };
    store.saveTrade(trade);
    return reply.status(201).send({ trade, position, balanceNgn: fromMinor(userWalletBalanceMinor(store, context.user.id, context.mode)), warning: 'Demo execution only. No blockchain transaction occurred.' });
  });
  app.post('/v1/copy-allocations', async (_, reply) => featureRequired(reply, 'copyTrading', 'Copy trading is disabled until compliance and execution controls are approved.'));

  app.get('/v1/admin/overview', async (request) => {
    const mode = adminMode(request);
    const users = store.listUsers({ mode });
    const requests = store.listMoneyRequests({ mode });
    const trades = store.listTrades({ mode });
    return {
      mode,
      users: { total: users.length, active: users.filter((item) => item.status === 'ACTIVE').length, restricted: users.filter((item) => item.status === 'SUSPENDED').length, pendingKyc: users.filter((item) => item.kycStatus === 'PENDING_REVIEW').length },
      money: {
        depositsTodayNgn: sumMoney(requests.filter((item) => item.type === 'DEPOSIT' && item.status === 'CONFIRMED')),
        withdrawalsTodayNgn: sumMoney(requests.filter((item) => item.type === 'WITHDRAWAL')),
        depositsPendingNgn: sumMoney(requests.filter((item) => item.type === 'DEPOSIT' && item.status === 'PENDING')),
        withdrawalsPendingNgn: sumMoney(requests.filter((item) => item.type === 'WITHDRAWAL' && item.status === 'PENDING')),
        tradingVolumeNgn: fromMinor(trades.reduce((sum, item) => sum + BigInt(item.amountMinor), 0n)),
        revenueTodayNgn: fromMinor(trades.reduce((sum, item) => sum + BigInt(item.feeMinor), 0n))
      },
      operations: {
        openRiskCases: store.listTokens(mode).filter((item) => item.riskScore >= 70).length,
        pendingApprovals: requests.filter((item) => item.status === 'PENDING').length
          + users.filter((item) => item.kycStatus === 'PENDING_REVIEW').length
          + [...campaigns.values()].filter((item) => item.mode === mode && item.status === 'PENDING_APPROVAL').length,
        activeIncidents: [...incidents.values()].filter((item) => item.mode === mode && item.status !== 'RESOLVED').length
      },
      providers: providerStateMap(store),
      features: config.flags
    };
  });
  app.get('/v1/admin/users', async (request) => {
    const query = z.object({ q: z.string().optional(), mode: z.enum(['DEMO', 'LIVE']).optional() }).parse(request.query);
    return { users: store.listUsers({ mode: query.mode || adminMode(request), query: query.q }) };
  });
  app.get('/v1/admin/users/:id', async (request, reply) => {
    const user = store.getUser((request.params as { id: string }).id);
    if (!user) return reply.status(404).send({ code: 'USER_NOT_FOUND', message: 'User not found.' });
    return { user, wallets: walletSummaries(store, user), trades: store.listTrades({ userId: user.id, mode: user.mode }), transactions: store.listMoneyRequests({ userId: user.id, mode: user.mode }) };
  });
  app.patch('/v1/admin/users/:id', async (request, reply) => {
    const user = store.getUser((request.params as { id: string }).id);
    if (!user) return reply.status(404).send({ code: 'USER_NOT_FOUND', message: 'User not found.' });
    const body = z.object({ status: z.enum(['ACTIVE', 'SUSPENDED']).optional(), note: z.string().min(2).max(500).optional(), reason: z.string().min(3).max(500) }).parse(request.body);
    const updated = store.saveUser({ ...user, status: body.status || user.status, notes: body.note ? [...user.notes, body.note] : user.notes });
    audit(store, request, 'USER_UPDATED', 'USER', user.id, body.reason, user, updated);
    return { user: updated };
  });
  app.get('/v1/admin/kyc', async () => ({ cases: store.listKycCases() }));
  app.post('/v1/admin/kyc/:id/decision', async (request, reply) => {
    const current = store.getKycCase((request.params as { id: string }).id);
    if (!current) return reply.status(404).send({ code: 'KYC_NOT_FOUND', message: 'KYC case not found.' });
    const body = z.object({ decision: z.enum(['APPROVED', 'REJECTED', 'MORE_INFORMATION_REQUIRED']), reason: z.string().min(3).max(500) }).parse(request.body);
    const updated = store.saveKycCase({ ...current, status: body.decision, reviewReason: body.reason, reviewedAt: new Date().toISOString() });
    const user = store.getUser(current.userId);
    if (user) store.saveUser({ ...user, kycStatus: body.decision });
    audit(store, request, 'KYC_DECISION', 'KYC_CASE', current.id, body.reason, current, updated);
    return { case: updated };
  });
  app.get('/v1/admin/money-requests', async (request) => {
    const query = z.object({ type: z.enum(['DEPOSIT', 'WITHDRAWAL']).optional(), status: z.enum(['PENDING', 'CONFIRMED', 'REJECTED', 'PAID']).optional(), mode: z.enum(['DEMO', 'LIVE']).optional() }).parse(request.query);
    return { requests: store.listMoneyRequests({ ...query, mode: query.mode || adminMode(request) }) };
  });
  app.post('/v1/admin/money-requests/:id/decision', async (request, reply) => {
    const current = store.getMoneyRequest((request.params as { id: string }).id);
    if (!current) return reply.status(404).send({ code: 'REQUEST_NOT_FOUND', message: 'Money request not found.' });
    const body = z.object({ decision: z.enum(['CONFIRMED', 'REJECTED', 'PAID']), reason: z.string().min(3).max(500) }).parse(request.body);
    if (current.mode === 'LIVE' && body.decision !== 'REJECTED') return reply.status(409).send({ code: 'LIVE_MANUAL_CREDIT_DISABLED', message: 'Live credits require an enabled payment adapter and verified provider event.' });
    const updated = store.saveMoneyRequest({ ...current, status: body.decision, updatedAt: new Date().toISOString() });
    if (current.type === 'DEPOSIT' && body.decision === 'CONFIRMED') {
      const wallet = requiredWallet(store, current.userId, current.mode);
      const platform = requiredPlatformWallet(store, current.mode);
      postLedgerTransaction(store, { mode: current.mode, idempotencyKey: `deposit-${current.id}`, description: `Confirmed deposit ${current.reference}`, entries: [{ accountId: platform.id, side: 'DEBIT', amountMinor: current.amountMinor }, { accountId: wallet.id, side: 'CREDIT', amountMinor: current.amountMinor }] });
    }
    if (current.type === 'WITHDRAWAL' && body.decision === 'PAID') {
      const wallet = requiredWallet(store, current.userId, current.mode);
      const platform = requiredPlatformWallet(store, current.mode);
      const total = BigInt(current.amountMinor) + BigInt(current.feeMinor);
      ensureSufficientBalance(store, wallet.id, total);
      postLedgerTransaction(store, { mode: current.mode, idempotencyKey: `withdrawal-${current.id}`, description: `Paid withdrawal ${current.reference}`, entries: [{ accountId: wallet.id, side: 'DEBIT', amountMinor: total.toString() }, { accountId: platform.id, side: 'CREDIT', amountMinor: total.toString() }] });
    }
    audit(store, request, 'MONEY_REQUEST_DECISION', current.type, current.id, body.reason, current, updated);
    return { request: updated };
  });
  app.get('/v1/admin/trades', async (request) => ({ trades: store.listTrades({ mode: adminMode(request) }) }));
  app.get('/v1/admin/tokens', async (request) => ({
    tokens: store.listTokens(adminMode(request)).map((token) => ({
      ...token,
      moderation: tokenModeration.get(token.id) || { classification: 'DEFAULT', hidden: false, featured: false }
    }))
  }));
  app.patch('/v1/admin/tokens/:id', async (request, reply) => {
    const token = store.listTokens(adminMode(request)).find((item) => item.id === (request.params as { id: string }).id);
    if (!token) return reply.status(404).send({ code: 'TOKEN_NOT_FOUND', message: 'Token not found.' });
    const body = z.object({ classification: z.enum(['DEFAULT', 'SAFE', 'RISKY']).optional(), hidden: z.boolean().optional(), featured: z.boolean().optional(), reason: z.string().min(3).max(500) }).parse(request.body);
    const current = tokenModeration.get(token.id) || { classification: 'DEFAULT' as const, hidden: false, featured: false, updatedAt: new Date().toISOString() };
    const updated = { ...current, classification: body.classification ?? current.classification, hidden: body.hidden ?? current.hidden, featured: body.featured ?? current.featured, updatedAt: new Date().toISOString() };
    tokenModeration.set(token.id, updated);
    audit(store, request, 'TOKEN_MODERATION_UPDATED', 'TOKEN', token.id, body.reason, current, updated);
    return { token, moderation: updated };
  });
  app.get('/v1/admin/audit', async () => ({ events: store.listAudit() }));
  app.get('/v1/admin/ai/settings', async () => aiBudgetStatus());
  app.get('/v1/admin/providers', async () => Object.values(providerStateMap(store)));
  app.patch('/v1/admin/providers/:key', async (request, reply) => {
    const key = z.string().parse((request.params as { key: string }).key);
    const current = store.getProvider(key) || defaultProviders().find((item) => item.key === key);
    if (!current) return reply.status(404).send({ code: 'UNKNOWN_PROVIDER', message: 'Unknown provider.' });
    const body = z.object({ enabled: z.boolean().optional(), priority: z.number().int().min(1).max(100).optional(), publicConfig: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(), reason: z.string().min(3) }).parse(request.body);
    const updated = store.saveProvider({ ...current, enabled: body.enabled ?? current.enabled, priority: body.priority ?? current.priority, publicConfig: body.publicConfig ?? current.publicConfig, status: body.enabled === false ? 'DISABLED' : current.configured ? (current.status === 'CONNECTED' ? 'CONNECTED' : 'DEGRADED') : 'UNCONFIGURED' });
    audit(store, request, 'PROVIDER_UPDATED', 'PROVIDER', key, body.reason, current, updated);
    return { provider: updated };
  });
  app.post('/v1/admin/providers/:key/test', async (request, reply) => {
    const key = z.string().parse((request.params as { key: string }).key);
    const provider = providerStateMap(store)[key];
    if (!provider) return reply.status(404).send({ code: 'UNKNOWN_PROVIDER', message: 'Unknown provider.' });
    if (!providerVault || !(await providerVault.has(key))) {
      return reply.status(409).send({ code: 'PROVIDER_CREDENTIALS_MISSING', message: 'Save the required credentials before testing this provider.' });
    }
    const credentials = await providerVault.get(key);
    const missing = (provider.requiredFields || []).filter((field) => !credentials?.[field]?.trim());
    if (missing.length) {
      return reply.status(422).send({ code: 'PROVIDER_FIELDS_MISSING', message: `Missing required fields: ${missing.join(', ')}.` });
    }
    const updated = store.saveProvider({
      ...provider,
      configured: true,
      status: 'DEGRADED',
      lastTestedAt: new Date().toISOString(),
      lastError: 'Credential validation passed; provider network adapter test is required.'
    });
    audit(store, request, 'PROVIDER_TESTED', 'PROVIDER', key, 'Credential structure validated', provider, updated);
    return { ...updated, testedAt: updated.lastTestedAt, message: 'Credentials decrypted and validated. Network adapter test remains required before Connected status.' };
  });
  app.post('/v1/admin/providers/:key/configure', async (request, reply) => {
    const key = z.string().parse((request.params as { key: string }).key);
    const current = providerStateMap(store)[key];
    if (!current) return reply.status(404).send({ code: 'UNKNOWN_PROVIDER', message: 'Unknown provider.' });
    const body = z.object({
      credentials: z.record(z.string(), z.string().max(20_000)),
      publicConfig: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({})
    }).parse(request.body);
    if (!providerVault) {
      return reply.status(503).send({
        code: 'CREDENTIAL_VAULT_NOT_CONFIGURED',
        message: 'Set FIELD_ENCRYPTION_KEY on the API server before saving provider credentials.'
      });
    }
    const missing = (current.requiredFields || []).filter((field) => !body.credentials[field]?.trim());
    if (missing.length) return reply.status(422).send({ code: 'PROVIDER_FIELDS_MISSING', message: `Complete: ${missing.join(', ')}.` });
    await providerVault.set(key, body.credentials as ProviderCredentials);
    const updated = store.saveProvider({
      ...current,
      configured: true,
      status: 'DEGRADED',
      publicConfig: body.publicConfig,
      lastError: 'Saved securely; run provider test.'
    });
    audit(store, request, 'PROVIDER_CREDENTIALS_SAVED', 'PROVIDER', key, 'Encrypted credentials updated', { configured: current.configured }, { configured: true });
    return reply.status(201).send({ provider: { ...updated, secret: 'configured (masked)' }, message: 'Credentials encrypted and saved. Run Test connection next.' });
  });
  app.get('/v1/admin/campaigns', async (request) => ({
    campaigns: [...campaigns.values()].filter((item) => item.mode === adminMode(request)).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }));
  app.post('/v1/admin/campaigns', async (request, reply) => {
    const body = CampaignRequestSchema.parse(request.body);
    const record: CampaignRecord = {
      id: `campaign_${randomUUID()}`,
      mode: adminMode(request),
      status: body.submitForApproval ? 'PENDING_APPROVAL' : 'DRAFT',
      name: body.name,
      channel: body.channel,
      subject: body.subject,
      body: body.body,
      segment: body.segment,
      audience: body.audience,
      scheduledAt: body.scheduledAt,
      createdAt: new Date().toISOString()
    };
    campaigns.set(record.id, record);
    audit(store, request, 'CAMPAIGN_CREATED', 'CAMPAIGN', record.id, `Created ${record.status.toLowerCase()} campaign`, undefined, record);
    return reply.status(201).send({ campaign: record });
  });
  app.post('/v1/admin/campaigns/:id/approve', async (request, reply) => {
    const current = campaigns.get((request.params as { id: string }).id);
    if (!current) return reply.status(404).send({ code: 'CAMPAIGN_NOT_FOUND', message: 'Campaign not found.' });
    if (current.channel === 'EMAIL' && !providerFamilyReady(store, 'email')) return reply.status(409).send({ code: 'EMAIL_PROVIDER_MISSING', message: 'Configure and test an email provider before approval.' });
    if (current.channel === 'PUSH' && !providerFamilyReady(store, 'push')) return reply.status(409).send({ code: 'PUSH_PROVIDER_MISSING', message: 'Configure and test a push provider before approval.' });
    const updated: CampaignRecord = { ...current, status: current.scheduledAt ? 'SCHEDULED' : 'APPROVED' };
    campaigns.set(updated.id, updated);
    audit(store, request, 'CAMPAIGN_APPROVED', 'CAMPAIGN', updated.id, 'Campaign approved for delivery', current, updated);
    return { campaign: updated };
  });
  app.get('/v1/admin/settings', async (request) => {
    const mode = adminMode(request);
    return { mode, settings: operationsSettings.get(mode) };
  });
  app.put('/v1/admin/settings', async (request) => {
    const mode = adminMode(request);
    const current = operationsSettings.get(mode)!;
    const updated = OperationsSettingsSchema.parse(request.body);
    operationsSettings.set(mode, updated);
    audit(store, request, 'OPERATIONS_SETTINGS_UPDATED', 'SETTINGS', mode, 'Fees and limits updated', current, updated);
    return { mode, settings: updated };
  });
  app.get('/v1/admin/incidents', async (request) => ({
    incidents: [...incidents.values()].filter((item) => item.mode === adminMode(request)).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }));
  app.post('/v1/admin/incidents', async (request, reply) => {
    const body = IncidentCreateSchema.parse(request.body);
    const now = new Date().toISOString();
    const incident: IncidentRecord = { id: `incident_${randomUUID()}`, mode: adminMode(request), title: body.title, severity: body.severity, status: 'OPEN', notes: body.note ? [body.note] : [], affectedRecords: body.affectedRecords, createdAt: now, updatedAt: now };
    incidents.set(incident.id, incident);
    audit(store, request, 'INCIDENT_CREATED', 'INCIDENT', incident.id, body.note || incident.title, undefined, incident);
    return reply.status(201).send({ incident });
  });
  app.patch('/v1/admin/incidents/:id', async (request, reply) => {
    const current = incidents.get((request.params as { id: string }).id);
    if (!current) return reply.status(404).send({ code: 'INCIDENT_NOT_FOUND', message: 'Incident not found.' });
    const body = z.object({ status: z.enum(['OPEN', 'INVESTIGATING', 'RESOLVED']).optional(), note: z.string().min(2).max(1000).optional() }).parse(request.body);
    const updated: IncidentRecord = { ...current, status: body.status || current.status, notes: body.note ? [...current.notes, body.note] : current.notes, updatedAt: new Date().toISOString() };
    incidents.set(updated.id, updated);
    audit(store, request, 'INCIDENT_UPDATED', 'INCIDENT', updated.id, body.note || `Status changed to ${updated.status}`, current, updated);
    return { incident: updated };
  });
  app.get('/v1/admin/bounties', async (request) => ({ bounties: store.listBounties(adminMode(request)) }));
  app.post('/v1/admin/bounties', async (request, reply) => {
    const mode = adminMode(request);
    const body = z.object({ title: z.string().min(4).max(180), sponsor: z.string().min(2).max(120), rewardNgn: money, category: z.string().min(2).max(80), deadline: z.string().datetime() }).parse(request.body);
    const bounty = { id: `bounty_${randomUUID()}`, mode, title: body.title, sponsor: body.sponsor, rewardNgn: body.rewardNgn.toFixed(2), category: body.category, deadline: body.deadline, status: 'OPEN' as const };
    store.saveBounty(bounty);
    audit(store, request, 'BOUNTY_CREATED', 'BOUNTY', bounty.id, 'Funded bounty created', undefined, bounty);
    return reply.status(201).send({ bounty });
  });
  app.get('/v1/admin/bot-controls', async (request) => ({
    mode: adminMode(request),
    users: store.listUsers({ mode: adminMode(request) }).map((user) => ({ userId: user.id, name: user.name, settings: botSettings.get(user.id) || null }))
  }));
  app.patch('/v1/admin/bot-controls/:userId', async (request, reply) => {
    const user = store.getUser((request.params as { userId: string }).userId);
    if (!user) return reply.status(404).send({ code: 'USER_NOT_FOUND', message: 'User not found.' });
    const current = botSettings.get(user.id) || { active: false, riskLevel: 'BALANCED', maxTradeNgn: 10000, takeProfitPercent: 30, stopLossPercent: 12, dailyLossLimitPercent: 5 };
    const body = z.object({ active: z.boolean() }).parse(request.body);
    const updated = { ...current, active: body.active };
    botSettings.set(user.id, updated);
    audit(store, request, 'BOT_CONTROL_UPDATED', 'USER', user.id, body.active ? 'Bot enabled by admin' : 'Bot stopped by admin', current, updated);
    return { userId: user.id, settings: updated };
  });
  app.get('/v1/admin/copy-traders', async (request) => {
    const mode = adminMode(request);
    const trades = store.listTrades({ mode });
    return {
      traders: store.listUsers({ mode }).map((user) => {
        const profile = copyProfiles.get(user.id) || { enabled: false, riskRating: 'MEDIUM' as const };
        const userTrades = trades.filter((trade) => trade.userId === user.id);
        const confirmed = userTrades.filter((trade) => trade.status === 'CONFIRMED');
        return {
          userId: user.id,
          name: user.name,
          enabled: profile.enabled,
          riskRating: profile.riskRating,
          trades: userTrades.length,
          winRate: confirmed.length ? 100 : 0,
          copiedVolumeNgn: '0.00',
          reviewedAt: profile.reviewedAt
        };
      })
    };
  });
  app.patch('/v1/admin/copy-traders/:userId', async (request, reply) => {
    const user = store.getUser((request.params as { userId: string }).userId);
    if (!user) return reply.status(404).send({ code: 'USER_NOT_FOUND', message: 'User not found.' });
    const body = z.object({ enabled: z.boolean(), riskRating: z.enum(['LOW', 'MEDIUM', 'HIGH']), reason: z.string().min(3).max(500) }).parse(request.body);
    const current = copyProfiles.get(user.id) || { enabled: false, riskRating: 'MEDIUM' as const };
    const updated = { enabled: body.enabled, riskRating: body.riskRating, reviewedAt: new Date().toISOString() };
    copyProfiles.set(user.id, updated);
    audit(store, request, 'COPY_PROFILE_UPDATED', 'USER', user.id, body.reason, current, updated);
    return { userId: user.id, profile: updated };
  });
  app.post('/v1/admin/emergency/:component/pause', async (request, reply) => {
    const component = (request.params as { component: string }).component;
    const mode = adminMode(request);
    const now = new Date().toISOString();
    const control = mode === 'DEMO'
      ? { paused: true, status: 'ACTIVE', updatedAt: now }
      : { paused: false, status: 'PENDING_SECOND_ADMIN', updatedAt: now };
    systemControls.set(`${mode}:${component}`, control);
    audit(store, request, 'EMERGENCY_PAUSE_REQUESTED', 'SYSTEM', component, 'Emergency pause requested', undefined, control);
    return reply.status(202).send({ component, ...control, approvalRequired: mode === 'LIVE' });
  });

  return app;
}

const CampaignSchema = z.object({
  name: z.string().min(3).max(120),
  channel: z.enum(['EMAIL', 'PUSH', 'IN_APP']),
  subject: z.string().max(160).optional(),
  body: z.string().min(1).max(20_000),
  segment: z.object({ subscriptionTier: z.array(z.enum(['FREE', 'PRO', 'ELITE'])).optional(), kycStatus: z.array(z.string()).optional(), marketingConsentRequired: z.boolean().default(true) })
});

const CampaignRequestSchema = CampaignSchema.extend({
  audience: z.enum(['ALL', 'KYC_APPROVED', 'INACTIVE', 'BOUNTY_USERS', 'TRADERS']).default('ALL'),
  scheduledAt: z.string().datetime().optional(),
  submitForApproval: z.boolean().default(false)
});

const OperationsSettingsSchema = z.object({
  swapFeePercent: z.number().min(0).max(10),
  botFeePercent: z.number().min(0).max(25),
  withdrawalFeePercent: z.number().min(0).max(10),
  minimumDepositNgn: z.number().min(100).max(10_000_000),
  maximumWithdrawalNgn: z.number().min(1000).max(1_000_000_000),
  dailyUserLimitNgn: z.number().min(1000).max(1_000_000_000),
  proMonthlyNgn: z.number().min(0).max(10_000_000),
  eliteMonthlyNgn: z.number().min(0).max(10_000_000)
});

const IncidentCreateSchema = z.object({
  title: z.string().min(4).max(180),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  note: z.string().max(1000).optional(),
  affectedRecords: z.array(z.string().max(160)).max(100).default([])
});

function defaultOperationsSettings(): OperationsSettings {
  return {
    swapFeePercent: 1,
    botFeePercent: 5,
    withdrawalFeePercent: 0.5,
    minimumDepositNgn: 1000,
    maximumWithdrawalNgn: 5_000_000,
    dailyUserLimitNgn: 10_000_000,
    proMonthlyNgn: 7500,
    eliteMonthlyNgn: 25000
  };
}

function providerFamilyReady(store: MemoryStore, family: string) {
  return store.listProviders().some((provider) => provider.family === family && provider.enabled && provider.status === 'CONNECTED');
}

function requestContext(request: FastifyRequest, store: MemoryStore) {
  return optionalContext(request, store) || { mode: 'DEMO' as Mode, user: store.getUser('demo-user-ada')! };
}

function optionalContext(request: FastifyRequest, store: MemoryStore) {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, '') || '';
  const user = token ? resolveSession(store, token) : undefined;
  if (user) return { mode: user.mode, user };
  if (!request.headers['x-app-mode']) return undefined;
  const mode = String(request.headers['x-app-mode']).toUpperCase() as Mode;
  if (mode === 'LIVE') {
    const live = store.listUsers({ mode: 'LIVE' })[0];
    if (live) return { mode, user: live };
  }
  const demo = store.getUser('demo-user-ada');
  return demo ? { mode: 'DEMO' as Mode, user: demo } : undefined;
}

function authenticatedUser(request: FastifyRequest, store: MemoryStore) {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, '') || '';
  return token ? resolveSession(store, token) : undefined;
}

function requiredWallet(store: MemoryStore, userId: string, mode: Mode) {
  const wallet = store.listWallets(userId, mode).find((item) => item.asset === 'NGN');
  if (!wallet) throw Object.assign(new Error('NGN wallet is unavailable.'), { statusCode: 409, code: 'WALLET_NOT_FOUND' });
  return wallet;
}

function requiredPlatformWallet(store: MemoryStore, mode: Mode) {
  let wallet = store.listWallets(mode === 'DEMO' ? 'platform-demo' : 'platform-live', mode).find((item) => item.asset === 'NGN');
  if (!wallet) wallet = store.saveWallet({ id: `platform-${mode.toLowerCase()}-funding-ngn`, userId: `platform-${mode.toLowerCase()}`, mode, asset: 'NGN', label: `${mode} funding reserve` });
  return wallet;
}

function createMoneyRequest(user: User, type: MoneyRequest['type'], amountNgn: number, provider: string): MoneyRequest {
  const now = new Date().toISOString();
  return { id: `${type.toLowerCase()}_${randomUUID()}`, mode: user.mode, userId: user.id, type, amountMinor: toMinor(amountNgn).toString(), feeMinor: '0', status: 'PENDING', provider, reference: `NM-${type.slice(0, 3)}-${Date.now().toString(36).toUpperCase()}`, createdAt: now, updatedAt: now };
}

function walletSummaries(store: MemoryStore, user: User) {
  return store.listWallets(user.id, user.mode).map((wallet) => ({ ...wallet, balance: fromMinor(accountBalanceMinor(store, wallet.id)) }));
}

function audit(store: MemoryStore, request: FastifyRequest, action: string, targetType: string, targetId: string, reason: string, oldValue?: unknown, newValue?: unknown) {
  const event: AuditEvent = { id: `audit_${randomUUID()}`, actorId: String(request.headers['x-admin-id'] || 'development-admin'), action, targetType, targetId, reason, oldValue, newValue, ip: request.ip, device: request.headers['user-agent'], requestId: request.id, createdAt: new Date().toISOString() };
  store.appendAudit(event);
}

function adminMode(request: FastifyRequest): Mode {
  return String((request.query as { mode?: string }).mode || request.headers['x-app-mode'] || (config.environment === 'production' ? 'LIVE' : 'DEMO')).toUpperCase() === 'LIVE' ? 'LIVE' : 'DEMO';
}

function marketState(mode: Mode) {
  if (mode === 'DEMO') return { ready: true, status: 'DEMO', message: 'Demo market simulation is active. Values are clearly labelled and are not real market data.' };
  const states = providerStates();
  return { ready: states.marketData.configured && states.solanaRpc.configured, status: states.marketData.configured ? 'DEGRADED' : 'OFFLINE', message: states.marketData.configured ? 'Market key present; live adapter deployment and health verification are still required.' : 'Live market providers are not configured. No token data will be fabricated.' };
}

function statusPayload(environment: string, store: MemoryStore) {
  return { ok: true, appRunning: true, service: 'nairameme-api', environment, modeIsolation: true, database: 'IN_MEMORY_DEVELOPMENT', providers: providerStateMap(store), paperBroker: { status: 'AVAILABLE', mode: 'DEMO' }, liveTrading: { enabled: false, reason: 'Audited custody and execution adapters are not configured.' }, features: config.flags };
}

function providerStateMap(store: MemoryStore): Record<string, ProviderConfig & { secret: string }> {
  const configured = providerStates();
  const saved = new Map(store.listProviders().map((item) => [item.key, item]));
  return Object.fromEntries(defaultProviders().map((base) => {
    const runtime = configured[base.key as keyof typeof configured];
    const value = saved.get(base.key) || { ...base, configured: runtime?.configured || false, status: runtime?.configured ? 'CONNECTED' : 'UNCONFIGURED' };
    return [base.key, { ...value, secret: value.configured ? 'configured (masked)' : 'not configured' }];
  }));
}

function defaultProviders(): ProviderConfig[] {
  return [
    provider('monnify', 'payments', 'Monnify', 1, 'https://app.monnify.com/', ['API Key', 'Secret Key', 'Contract Code', 'Base URL', 'Webhook Secret']),
    provider('paystack', 'payments', 'Paystack', 2, 'https://dashboard.paystack.com/', ['Secret Key', 'Public Key', 'Webhook Secret', 'Base URL']),
    provider('flutterwave', 'payments', 'Flutterwave', 3, 'https://app.flutterwave.com/', ['Secret Key', 'Public Key', 'Encryption Key', 'Webhook Secret', 'Base URL']),
    provider('supabase', 'identity', 'Supabase Auth', 1, 'https://supabase.com/dashboard', ['Project URL', 'Anon key', 'Service role secret']),
    provider('dojah', 'kyc', 'Dojah', 1, 'https://app.dojah.io/', ['App ID', 'Secret Key', 'Base URL']),
    provider('smileid', 'kyc', 'Smile ID', 2, 'https://portal.smileidentity.com/', ['Partner ID', 'API Key', 'Callback URL']),
    provider('prembly', 'kyc', 'Prembly', 3, 'https://prembly.com/', ['API Key', 'App ID', 'Webhook Secret']),
    provider('termii', 'identity', 'Termii OTP', 2, 'https://accounts.termii.com/', ['API key', 'Sender ID']),
    provider('sendchamp', 'identity', 'Sendchamp OTP', 3, 'https://my.sendchamp.com/', ['Public key', 'Sender ID']),
    provider('helius', 'marketData', 'Helius', 1, 'https://dashboard.helius.dev/', ['RPC URL', 'API Key', 'Webhook Secret']),
    provider('quicknode', 'marketData', 'QuickNode', 2, 'https://dashboard.quicknode.com/', ['RPC URL', 'API Key', 'Webhook Secret']),
    provider('alchemy', 'marketData', 'Alchemy', 3, 'https://dashboard.alchemy.com/', ['RPC URL', 'API Key', 'Webhook Secret']),
    provider('pumpportal', 'marketData', 'PumpPortal', 4, 'https://pumpportal.fun/', ['API URL', 'API Key']),
    provider('birdeye', 'marketData', 'Birdeye', 5, 'https://bds.birdeye.so/', ['API URL', 'API Key']),
    provider('dexscreener', 'marketData', 'DexScreener', 6, 'https://dexscreener.com/', ['API URL']),
    provider('jupiter', 'trading', 'Jupiter', 1, 'https://portal.jup.ag/', ['Quote API URL', 'Swap API URL', 'API Key', 'Max Slippage', 'Priority Fee']),
    provider('pumpswap', 'trading', 'PumpSwap', 2, 'https://pump.fun/', ['Execution adapter credentials']),
    provider('resend', 'email', 'Resend', 1, 'https://resend.com/api-keys', ['API Key', 'Sender Email', 'Verified Domain']),
    provider('sendgrid', 'email', 'SendGrid', 2, 'https://app.sendgrid.com/settings/api_keys', ['API Key', 'Sender Email', 'Verified Domain']),
    provider('ses', 'email', 'Amazon SES', 2, 'https://console.aws.amazon.com/ses/', ['Access key', 'Secret key', 'Region']),
    provider('google', 'email', 'Google Workspace', 3, 'https://admin.google.com/', ['SMTP relay host', 'Username', 'App password']),
    provider('expo', 'push', 'Expo Push', 1, 'https://expo.dev/accounts', ['Project ID', 'Access Token']),
    provider('firebase', 'push', 'Firebase Cloud Messaging', 2, 'https://console.firebase.google.com/', ['Project ID', 'Service Account Credentials']),
    provider('apns', 'push', 'Apple Push Notifications', 3, 'https://developer.apple.com/account/resources/authkeys/list', ['Key ID', 'Team ID', 'APNs key']),
    provider('emergent', 'ai', 'Emergent Universal LLM', 1, 'https://app.emergent.sh/', ['Provider Name', 'Base URL', 'API Key', 'Model', 'Monthly Budget Limit']),
    provider('turnkey', 'custody', 'Turnkey', 1, 'https://app.turnkey.com/', ['Organization ID', 'API Public Key', 'API Private Key']),
    provider('trmlabs', 'transactionRisk', 'TRM Labs', 1, 'https://www.trmlabs.com/contact', ['API URL', 'API Key']),
    provider('chainalysis', 'transactionRisk', 'Chainalysis', 2, 'https://www.chainalysis.com/contact/', ['API URL', 'API Key']),
    provider('sentry', 'observability', 'Sentry', 1, 'https://sentry.io/', ['DSN', 'Auth Token', 'Organization', 'Project']),
    provider('posthog', 'analytics', 'PostHog', 1, 'https://app.posthog.com/signup', ['Host URL', 'Project API Key']),
    provider('revenuecat', 'subscriptions', 'RevenueCat', 1, 'https://app.revenuecat.com/signup', ['Project ID', 'Public SDK Key', 'Secret API Key', 'Webhook Secret']),
    provider('zendesk', 'support', 'Zendesk', 1, 'https://www.zendesk.com/register/', ['Subdomain', 'API Token', 'Support Email'])
  ];
}

function provider(key: string, family: string, displayName: string, priority: number, setupUrl: string, requiredFields: string[]): ProviderConfig {
  return { key, family, displayName, enabled: true, priority, configured: false, status: 'UNCONFIGURED', setupUrl, docsUrl: setupUrl, requiredFields, publicConfig: {} };
}

function providerRequired(reply: FastifyReply, providerName: keyof typeof config.providers, message: string) {
  if (!config.providers[providerName]) return reply.status(503).send({ code: 'PROVIDER_NOT_CONFIGURED', message });
  return reply.status(501).send({ code: 'ADAPTER_NOT_IMPLEMENTED', message: 'Provider configured, but the audited adapter is not enabled.' });
}

function featureRequired(reply: FastifyReply, feature: keyof typeof config.flags, message: string) {
  if (!config.flags[feature]) return reply.status(403).send({ code: 'FEATURE_DISABLED', message });
  return reply.status(501).send({ code: 'FEATURE_PENDING', message: 'Feature enabled but execution adapter is pending audit.' });
}

function providerStates() {
  return {
    payments: state(config.providers.payments), identity: state(config.providers.identity), marketData: state(config.providers.marketData),
    solanaRpc: state(config.providers.solanaRpc), kyc: state(config.providers.kyc), email: state(config.providers.email),
    push: state(config.providers.push), trading: state(config.providers.trading), ai: state(config.providers.ai)
  };
}

function state(configured: boolean) { return { configured, status: configured ? 'CONNECTED' : 'UNCONFIGURED' }; }
function safeTokenEqual(supplied: string, expected: string) {
  const left = Buffer.from(supplied); const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}
function toMinor(value: number) { return BigInt(Math.round(value * 100)); }
function fromMinor(value: bigint) { return (Number(value) / 100).toFixed(2); }
function sumMoney(items: MoneyRequest[]) { return fromMinor(items.reduce((sum, item) => sum + BigInt(item.amountMinor), 0n)); }
function runnerCategory(score: number, risk: number) { return risk >= 70 ? 'High Risk Runner' : score >= 90 ? 'Explosive Runner' : score >= 80 ? 'Strong Runner' : score >= 65 ? 'Potential Runner' : 'Avoid'; }
function tokenExplanation(token: { runnerScore: number; riskScore: number; liquidityNgn: string; holders: number }) {
  return { summary: `Runner score ${token.runnerScore}/100 with ${token.riskScore}/100 risk. Liquidity is ₦${Number(token.liquidityNgn).toLocaleString()} across ${token.holders.toLocaleString()} tracked holders.`, highestRisk: token.riskScore >= 60 ? 'Wallet concentration and liquidity depth require caution.' : 'No extreme risk flag in the available Demo signals.', disclaimer: 'Scores are decision support, not a profit guarantee.' };
}
function emptyState() {
  const seeded = seedDemoData();
  return { ...seeded, users: [], wallets: [], ledgerTransactions: [], kycCases: [], tokens: [], bounties: [], alerts: [], moneyRequests: [], trades: [], positions: [] };
}
