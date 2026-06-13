import Fastify, { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { z, ZodError } from 'zod';
import { config } from './config.js';
import { aiBudgetStatus, explainWithBudget } from './ai.js';
import { issueSession, resolveSession, rotateSession } from './domain/auth.js';
import { accountBalanceMinor, ensureSufficientBalance, postLedgerTransaction, userWalletBalanceMinor } from './domain/ledger.js';
import { seedDemoData } from './domain/seed.js';
import { createMemoryStore, type MemoryStore } from './domain/store.js';
import { evaluateTransferRisk, verifyTransactionPin as verifyHashedTransactionPin } from './domain/security.js';
import {
  createEncryptedProviderVault,
  type ProviderCredentials,
  type ProviderVault
} from './domain/provider-vault.js';
import type {
  AiPaymentDraft,
  AuditEvent,
  BillPayment,
  InternalTransfer,
  Mode,
  MoneyRequest,
  P2pOrder,
  ProviderConfig,
  Trade,
  User,
  WhatsappApprovalSession,
  WhatsappAutomationSettings,
  WhatsappCommandLog,
  WhatsappConnection,
  WhatsappMessage,
  WhatsappTemplate,
  WhatsappWebhookEvent
} from './domain/types.js';

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
  depositFeePercent: number;
  swapFeePercent: number;
  botFeePercent: number;
  withdrawalFeePercent: number;
  cryptoWithdrawalMarginPercent: number;
  minimumDepositNgn: number;
  maximumWithdrawalNgn: number;
  dailyUserLimitNgn: number;
  proMonthlyNgn: number;
  eliteMonthlyNgn: number;
};

type AssetPolicy = {
  symbol: string;
  name: string;
  enabled: boolean;
  deposits: boolean;
  withdrawals: boolean;
  swaps: boolean;
  networks: string[];
};

type RewardPolicy = {
  enabled: boolean;
  referralRewardNgn: number;
  refereeRewardNgn: number;
  billCashbackPercent: number;
  cardCashbackPercent: number;
  tradingRewardPercent: number;
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
  const botSettings = new Map<string, {
    active: boolean;
    automationMode: 'SIMULATION' | 'MANUAL' | 'SEMI_AUTO' | 'FULL_AUTO';
    riskLevel: string;
    maxTradeNgn: number;
    takeProfitPercent: number;
    stopLossPercent: number;
    dailyLossLimitPercent: number;
    maxOpenTrades: number;
    maxSlippagePercent: number;
    minimumLiquidityNgn: number;
  }>();
  const campaigns = new Map<string, CampaignRecord>();
  const incidents = new Map<string, IncidentRecord>();
  const operationsSettings = new Map<Mode, OperationsSettings>([
    ['DEMO', defaultOperationsSettings()],
    ['LIVE', defaultOperationsSettings()]
  ]);
  const assetPolicies = new Map<Mode, AssetPolicy[]>([
    ['DEMO', defaultAssetPolicies()],
    ['LIVE', defaultAssetPolicies()]
  ]);
  const rewardPolicies = new Map<Mode, RewardPolicy>([
    ['DEMO', defaultRewardPolicy()],
    ['LIVE', defaultRewardPolicy()]
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
    return {
      ...issueSession(store, user.id, {
        deviceId: String(request.headers['x-device-id'] || 'demo-device'),
        deviceName: String(request.headers['x-device-name'] || 'Expo Demo Device'),
        ipAddress: request.ip
      }),
      user
    };
  });
  app.post('/v1/auth/session/rotate', async (request, reply) => {
    const token = request.headers.authorization?.replace(/^Bearer\s+/i, '') || '';
    const rotated = rotateSession(store, token, {
      deviceId: request.headers['x-device-id'] ? String(request.headers['x-device-id']) : undefined,
      deviceName: request.headers['x-device-name'] ? String(request.headers['x-device-name']) : undefined,
      ipAddress: request.ip
    });
    return rotated
      ? { ...rotated, user: store.getUser(rotated.session.userId) }
      : reply.status(401).send({ code: 'SESSION_EXPIRED', message: 'Sign in again to continue.' });
  });
  app.get('/v1/me', async (request) => {
    const context = requestContext(request, store, environment);
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
    const context = requestContext(request, store, environment);
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
      services: [
        { key: 'AI_PAY', title: 'AI Pay', subtitle: 'Prepare a verified payment from text or an image.' },
        { key: 'P2P', title: 'P2P Manager', subtitle: 'Review merchant orders and reconcile payouts.' },
        { key: 'BILLS', title: 'Bills', subtitle: 'Airtime, data, electricity and subscriptions.' }
      ],
      providerState: marketState(context.mode)
    };
  });
  app.get('/v1/tokens', async (request) => {
    const context = requestContext(request, store, environment);
    return { mode: context.mode, demoNotice: context.mode === 'DEMO' ? 'Demo Mode - Not Real Money' : undefined, tokens: store.listTokens(context.mode) };
  });
  app.get('/v1/tokens/:mint', async (request, reply) => {
    const context = requestContext(request, store, environment);
    const mint = z.string().parse((request.params as { mint: string }).mint);
    const token = store.listTokens(context.mode).find((item) => item.mint === mint);
    return token ? { token, explanation: tokenExplanation(token), ai: await explainWithBudget(token) } : reply.status(404).send({ code: 'TOKEN_NOT_FOUND', message: 'Token not found in this mode.' });
  });
  app.get('/v1/portfolio', async (request) => {
    const context = requestContext(request, store, environment);
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
  app.get('/v1/wallet/assets', async (request) => {
    const context = requestContext(request, store, environment);
    const policies = assetPolicies.get(context.mode)!.filter((asset) => asset.enabled);
    return {
      mode: context.mode,
      assets: policies.map((asset) => {
        const balanceMinor = userWalletBalanceMinor(store, context.user.id, context.mode, asset.symbol);
        const balance = assetUnits(asset.symbol, balanceMinor);
        return {
          ...asset,
          balance,
          valueNgn: (balance * assetRateNgn(asset.symbol)).toFixed(2)
        };
      })
    };
  });
  app.get('/v1/transfers/recipients', async (request) => {
    const context = requestContext(request, store, environment);
    const query = z.object({ q: z.string().trim().min(2).max(120) }).parse(request.query).q;
    return {
      recipients: store.listUsers({ mode: context.mode, query })
        .filter((user) => user.id !== context.user.id && user.status === 'ACTIVE')
        .slice(0, 8)
        .map((user) => ({
          id: user.id,
          name: user.name,
          tag: user.handle,
          maskedPhone: maskPhone(user.phone),
          verified: user.kycStatus === 'APPROVED'
        }))
    };
  });
  app.get('/v1/transfers/internal', async (request) => {
    const context = requestContext(request, store, environment);
    return {
      transfers: store.listInternalTransfers({ mode: context.mode, userId: context.user.id }).map((transfer) => ({
        ...transfer,
        direction: transfer.senderId === context.user.id ? 'SENT' : 'RECEIVED'
      }))
    };
  });
  app.post('/v1/transfers/internal', async (request, reply) => {
    const context = requestContext(request, store, environment);
    const body = z.object({
      recipientId: z.string().min(4),
      amountNgn: money,
      narration: z.string().trim().max(120).default('MemeZo transfer'),
      pin: z.string().regex(/^\d{4,6}$/),
      idempotencyKey: z.string().min(8).max(120)
    }).parse(request.body);
    if (body.recipientId === context.user.id) return reply.status(409).send({ code: 'SELF_TRANSFER_NOT_ALLOWED', message: 'Choose another MemeZo user.' });
    assertTransactionPin(store, context.user, body.pin);
    const recipient = store.getUser(body.recipientId);
    if (!recipient || recipient.mode !== context.mode || recipient.status !== 'ACTIVE') {
      return reply.status(404).send({ code: 'RECIPIENT_NOT_FOUND', message: 'The MemeZo recipient is unavailable.' });
    }
    const amountMinor = toMinor(body.amountNgn);
    if (recipient.kycStatus !== 'APPROVED') return reply.status(409).send({ code: 'RECIPIENT_NOT_VERIFIED', message: 'This recipient cannot receive internal transfers yet.' });
    const recentTransfers = store.listInternalTransfers({ userId: context.user.id, mode: context.mode })
      .filter((transfer) => transfer.senderId === context.user.id && Date.parse(transfer.createdAt) >= Date.now() - 10 * 60_000);
    const deviceId = String(request.headers['x-device-id'] || '');
    const risk = evaluateTransferRisk({
      amountMinor,
      duplicateDetected: recentTransfers.some((transfer) =>
        transfer.recipientId === recipient.id
        && transfer.amountMinor === amountMinor.toString()
        && transfer.narration === body.narration
      ),
      transfersLastTenMinutes: recentTransfers.length,
      deviceTrusted: context.mode === 'DEMO' || Boolean(deviceId && store.findTrustedDevice(context.user.id, deviceId)),
      highValueThresholdMinor: 2_000_000n
    });
    if (!risk.allow) {
      return reply.status(409).send({
        code: 'TRANSFER_RISK_REVIEW',
        message: 'This transfer needs a security review before money can move.',
        flags: risk.flags
      });
    }
    if (context.mode === 'LIVE') return providerRequired(reply, 'payments', 'Live internal-transfer settlement is not enabled.');
    const senderWallet = requiredAssetWallet(store, context.user.id, context.mode, 'NGN');
    const recipientWallet = requiredAssetWallet(store, recipient.id, context.mode, 'NGN');
    ensureSufficientBalance(store, senderWallet.id, amountMinor);
    const transaction = postLedgerTransaction(store, {
      mode: context.mode,
      idempotencyKey: body.idempotencyKey,
      description: `MemeZo transfer to ${recipient.name}`,
      entries: [
        { accountId: senderWallet.id, side: 'DEBIT', amountMinor: amountMinor.toString() },
        { accountId: recipientWallet.id, side: 'CREDIT', amountMinor: amountMinor.toString() }
      ],
      metadata: { senderId: context.user.id, recipientId: recipient.id, narration: body.narration }
    });
    const receipt = `MZ-${transaction.id.slice(-8).toUpperCase()}`;
    const transfer: InternalTransfer = store.saveInternalTransfer({
      id: `transfer_${randomUUID()}`,
      mode: context.mode,
      senderId: context.user.id,
      recipientId: recipient.id,
      recipientName: recipient.name,
      recipientHandle: recipient.handle,
      amountMinor: amountMinor.toString(),
      feeMinor: '0',
      narration: body.narration,
      status: 'COMPLETED',
      ledgerTransactionId: transaction.id,
      receipt,
      createdAt: transaction.createdAt
    });
    return reply.status(201).send({
      transfer,
      senderBalanceNgn: fromMinor(userWalletBalanceMinor(store, context.user.id, context.mode)),
      recipientBalanceNgn: fromMinor(userWalletBalanceMinor(store, recipient.id, context.mode)),
      balanceNgn: fromMinor(userWalletBalanceMinor(store, context.user.id, context.mode)),
      receipt
    });
  });
  app.post('/v1/swaps/quote', async (request, reply) => {
    const context = requestContext(request, store, environment);
    const body = z.object({
      fromAsset: z.string().trim().toUpperCase().min(2).max(10),
      toAsset: z.string().trim().toUpperCase().min(2).max(10),
      amount: z.coerce.number().positive(),
      slippagePercent: z.coerce.number().min(0.1).max(10).default(1)
    }).parse(request.body);
    if (body.fromAsset === body.toAsset) return reply.status(400).send({ code: 'INVALID_SWAP_ROUTE', message: 'Choose two different assets.' });
    const policies = assetPolicies.get(context.mode)!;
    const fromPolicy = policies.find((asset) => asset.symbol === body.fromAsset && asset.enabled && asset.swaps);
    const toPolicy = policies.find((asset) => asset.symbol === body.toAsset && asset.enabled && asset.swaps);
    if (!fromPolicy || !toPolicy) return reply.status(409).send({ code: 'SWAP_ROUTE_DISABLED', message: 'One of these assets is not enabled for swaps.' });
    if (context.mode === 'LIVE') return providerRequired(reply, 'trading', 'A live multi-chain swap provider is not connected.');
    return reply.status(201).send({ quote: buildSwapQuote(body.fromAsset, body.toAsset, body.amount, body.slippagePercent, context.mode) });
  });
  app.post('/v1/swaps/execute', async (request, reply) => {
    const context = requestContext(request, store, environment);
    const body = z.object({
      fromAsset: z.string().trim().toUpperCase().min(2).max(10),
      toAsset: z.string().trim().toUpperCase().min(2).max(10),
      amount: z.coerce.number().positive(),
      slippagePercent: z.coerce.number().min(0.1).max(10).default(1),
      pin: z.string().regex(/^\d{4}$/),
      idempotencyKey: z.string().min(8).max(120)
    }).parse(request.body);
    if (context.mode === 'LIVE') return providerRequired(reply, 'trading', 'A live multi-chain swap provider is not connected.');
    assertTransactionPin(store, context.user, body.pin);
    const quote = buildSwapQuote(body.fromAsset, body.toAsset, body.amount, body.slippagePercent, context.mode);
    const sourceWallet = requiredAssetWallet(store, context.user.id, context.mode, body.fromAsset);
    const targetWallet = requiredAssetWallet(store, context.user.id, context.mode, body.toAsset);
    const sourceReserve = requiredPlatformAssetWallet(store, context.mode, body.fromAsset);
    const targetReserve = requiredPlatformAssetWallet(store, context.mode, body.toAsset);
    const sourceMinor = assetMinor(body.fromAsset, body.amount);
    const targetMinor = assetMinor(body.toAsset, Number(quote.estimatedReceive));
    ensureSufficientBalance(store, sourceWallet.id, sourceMinor);
    postLedgerTransaction(store, {
      mode: context.mode,
      idempotencyKey: `${body.idempotencyKey}:source`,
      description: `Swap ${body.fromAsset} to ${body.toAsset} source leg`,
      entries: [
        { accountId: sourceWallet.id, side: 'DEBIT', amountMinor: sourceMinor.toString() },
        { accountId: sourceReserve.id, side: 'CREDIT', amountMinor: sourceMinor.toString() }
      ]
    });
    postLedgerTransaction(store, {
      mode: context.mode,
      idempotencyKey: `${body.idempotencyKey}:target`,
      description: `Swap ${body.fromAsset} to ${body.toAsset} target leg`,
      entries: [
        { accountId: targetReserve.id, side: 'DEBIT', amountMinor: targetMinor.toString() },
        { accountId: targetWallet.id, side: 'CREDIT', amountMinor: targetMinor.toString() }
      ]
    });
    return reply.status(201).send({
      swap: { ...quote, status: 'SUCCESSFUL', executedAt: new Date().toISOString() },
      balances: {
        [body.fromAsset]: assetUnits(body.fromAsset, accountBalanceMinor(store, sourceWallet.id)).toFixed(6),
        [body.toAsset]: assetUnits(body.toAsset, accountBalanceMinor(store, targetWallet.id)).toFixed(6)
      },
      receipt: `MZ-SWAP-${randomUUID().slice(0, 8).toUpperCase()}`,
      warning: 'Demo ledger execution only. No bank or blockchain provider was called.'
    });
  });
  app.get('/v1/bounties', async (_, reply) => reply.status(410).send({ code: 'FEATURE_RETIRED', message: 'Bounties were replaced by MemeZo AI Payments.' }));
  app.get('/v1/bot/settings', async (request) => {
    const context = requestContext(request, store, environment);
    return { mode: context.mode, settings: botSettings.get(context.user.id) || defaultBotSettings() };
  });
  app.put('/v1/bot/settings', async (request, reply) => {
    const context = requestContext(request, store, environment);
    const body = z.object({
      active: z.boolean(),
      automationMode: z.enum(['SIMULATION', 'MANUAL', 'SEMI_AUTO', 'FULL_AUTO']),
      riskLevel: z.enum(['SAFE', 'BALANCED', 'SNIPER']),
      maxTradeNgn: z.number().min(500).max(10_000_000),
      takeProfitPercent: z.number().min(5).max(500),
      stopLossPercent: z.number().min(2).max(30),
      dailyLossLimitPercent: z.number().min(1).max(20),
      maxOpenTrades: z.number().int().min(1).max(20),
      maxSlippagePercent: z.number().min(0.1).max(20),
      minimumLiquidityNgn: z.number().min(100_000).max(1_000_000_000)
    }).parse(request.body);
    if (context.mode === 'LIVE' && body.active && body.automationMode !== 'SIMULATION') return reply.status(409).send({ code: 'LIVE_BOT_DISABLED', message: 'Live Auto Sniper execution requires an audited custody and trading adapter. Simulation remains available.' });
    botSettings.set(context.user.id, body);
    return { mode: context.mode, settings: body, message: body.active ? 'Demo Auto Sniper monitoring started. Trades still obey backend limits.' : 'Auto Sniper stopped.' };
  });

  app.post('/v1/kyc/session', async (request, reply) => {
    const context = optionalContext(request, store, environment);
    if (context?.mode === 'DEMO') {
      const current = store.listKycCases().find((item) => item.userId === context.user.id);
      return { mode: 'DEMO', status: current?.status || context.user.kycStatus, message: 'Demo KYC journey is available without submitting real identity documents.' };
    }
    return providerRequired(reply, 'kyc', 'KYC provider is not configured.');
  });
  app.post('/v1/deposits', async (request, reply) => {
    const context = requestContext(request, store, environment);
    const body = z.object({ amountNgn: money }).parse(request.body);
    if (context.mode === 'LIVE') return providerRequired(reply, 'payments', 'Naira deposit provider is not configured.');
    const settings = operationsSettings.get(context.mode)!;
    const record = {
      ...createMoneyRequest(context.user, 'DEPOSIT', body.amountNgn, 'Demo Bank Rail'),
      feeMinor: toMinor(body.amountNgn * settings.depositFeePercent / 100).toString()
    };
    store.saveMoneyRequest(record);
    const account = store.listVirtualAccounts({ userId: context.user.id, mode: context.mode })[0];
    return reply.status(201).send({ request: record, instructions: account, feeNgn: fromMinor(BigInt(record.feeMinor)), netCreditNgn: fromMinor(BigInt(record.amountMinor) - BigInt(record.feeMinor)) });
  });
  app.post('/v1/withdrawals', async (request, reply) => {
    const context = requestContext(request, store, environment);
    const body = z.object({ amountNgn: money, bankName: z.string().min(2), accountNumber: z.string().regex(/^\d{10}$/), accountName: z.string().min(2) }).parse(request.body);
    if (context.mode === 'LIVE') return providerRequired(reply, 'payments', 'Naira withdrawal provider is not configured.');
    const settings = operationsSettings.get(context.mode)!;
    const feeMinor = toMinor(body.amountNgn * settings.withdrawalFeePercent / 100);
    const amountMinor = toMinor(body.amountNgn);
    const wallet = requiredWallet(store, context.user.id, context.mode);
    ensureSufficientBalance(store, wallet.id, amountMinor + feeMinor);
    const record = { ...createMoneyRequest(context.user, 'WITHDRAWAL', body.amountNgn, 'Demo Bank Rail'), feeMinor: feeMinor.toString(), bankName: body.bankName, accountNumber: body.accountNumber, accountName: body.accountName };
    store.saveMoneyRequest(record);
    return reply.status(201).send({ request: record });
  });
  app.get('/v1/virtual-account', async (request, reply) => {
    const context = requestContext(request, store, environment);
    const account = store.listVirtualAccounts({ userId: context.user.id, mode: context.mode })[0];
    if (account) return { account };
    if (context.mode === 'LIVE') return providerRequired(reply, 'payments', 'A virtual-account provider is not configured.');
    const created = store.saveVirtualAccount({
      id: `va_${randomUUID()}`,
      userId: context.user.id,
      mode: context.mode,
      provider: 'Demo payment rail',
      bankName: 'MemeZo Demo Bank',
      accountName: `MemeZo / ${context.user.name}`,
      accountNumber: String(Math.floor(1_000_000_000 + Math.random() * 8_999_999_999)),
      reference: `MZ-${context.user.id.slice(-4).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`,
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    });
    return reply.status(201).send({ account: created });
  });
  app.get('/v1/ai-payments', async (request) => {
    const context = requestContext(request, store, environment);
    return { payments: store.listAiPaymentDrafts({ userId: context.user.id, mode: context.mode }) };
  });
  app.post('/v1/ai-pay/prepare', async (request, reply) => {
    const context = requestContext(request, store, environment);
    const body = z.object({
      instruction: z.string().trim().min(8).max(2000),
      source: z.enum(['TEXT', 'IMAGE']).default('TEXT'),
      bankName: z.string().trim().min(2).max(100).optional(),
      accountNumber: z.string().regex(/^\d{10}$/).optional(),
      accountName: z.string().trim().min(2).max(120).optional(),
      amountNgn: money.optional(),
      narration: z.string().trim().max(120).optional()
    }).parse(request.body);
    if (body.source === 'IMAGE' && context.mode === 'LIVE' && !providerFamilyReady(store, 'ai')) {
      return reply.status(503).send({ code: 'OCR_PROVIDER_NOT_CONNECTED', message: 'AI image extraction is not connected. Enter the payment details manually.' });
    }
    const parsed = parsePaymentInstruction(body.instruction);
    const amountNgn = body.amountNgn ?? parsed.amountNgn;
    const accountNumber = body.accountNumber ?? parsed.accountNumber;
    if (!amountNgn || amountNgn <= 0 || amountNgn > 100_000_000 || !accountNumber) {
      return reply.status(422).send({ code: 'PAYMENT_DETAILS_INCOMPLETE', message: 'Confirm a valid amount and 10-digit account number before review.' });
    }
    const recent = store.listAiPaymentDrafts({ userId: context.user.id, mode: context.mode }).find((item) =>
      item.accountNumber === accountNumber
      && item.amountMinor === toMinor(amountNgn).toString()
      && Date.now() - Date.parse(item.createdAt) < 10 * 60_000
    );
    const riskFlags = [
      ...(amountNgn >= 1_000_000 ? ['LARGE_AMOUNT_REVIEW'] : []),
      ...(recent ? ['POSSIBLE_DUPLICATE'] : [])
    ];
    const now = new Date().toISOString();
    const draft: AiPaymentDraft = {
      id: `aipay_${randomUUID()}`,
      userId: context.user.id,
      mode: context.mode,
      source: body.source,
      instruction: body.instruction,
      bankName: body.bankName || parsed.bankName || 'Bank confirmation required',
      accountNumber,
      accountName: body.accountName || 'Account lookup required',
      amountMinor: toMinor(amountNgn).toString(),
      narration: body.narration || parsed.narration || 'MemeZo payment',
      riskFlags,
      duplicateOf: recent?.id,
      status: 'REVIEW',
      createdAt: now,
      updatedAt: now
    };
    store.saveAiPaymentDraft(draft);
    return reply.status(201).send({ payment: draft, reviewRequired: true, message: 'Payment prepared. Review the recipient, amount and risk checks before approval.' });
  });
  app.post('/v1/ai-pay/:id/approve', async (request, reply) => {
    const context = requestContext(request, store, environment);
    const draft = store.getAiPaymentDraft((request.params as { id: string }).id);
    if (!draft || draft.userId !== context.user.id || draft.mode !== context.mode) return reply.status(404).send({ code: 'PAYMENT_NOT_FOUND', message: 'Payment draft not found.' });
    const body = z.object({ pin: z.string().regex(/^\d{4}$/), idempotencyKey: z.string().min(8).max(120), confirmDuplicate: z.boolean().default(false) }).parse(request.body);
    assertTransactionPin(store, context.user, body.pin);
    if (draft.riskFlags.includes('POSSIBLE_DUPLICATE') && !body.confirmDuplicate) return reply.status(409).send({ code: 'DUPLICATE_CONFIRMATION_REQUIRED', message: 'This resembles a recent payment. Confirm the duplicate warning before continuing.' });
    if (context.mode === 'LIVE') return providerRequired(reply, 'payments', 'Bank transfer execution is not connected.');
    const wallet = requiredWallet(store, context.user.id, context.mode);
    const platform = requiredPlatformWallet(store, context.mode);
    ensureSufficientBalance(store, wallet.id, BigInt(draft.amountMinor));
    postLedgerTransaction(store, {
      mode: context.mode,
      idempotencyKey: body.idempotencyKey,
      description: `AI Pay to ${draft.accountName}`,
      entries: [
        { accountId: wallet.id, side: 'DEBIT', amountMinor: draft.amountMinor },
        { accountId: platform.id, side: 'CREDIT', amountMinor: draft.amountMinor }
      ],
      metadata: { paymentId: draft.id, accountNumber: draft.accountNumber }
    });
    const paid = store.saveAiPaymentDraft({ ...draft, status: 'PAID', updatedAt: new Date().toISOString() });
    return { payment: paid, balanceNgn: fromMinor(userWalletBalanceMinor(store, context.user.id, context.mode)), receipt: `MZ-${paid.id.slice(-8).toUpperCase()}` };
  });
  app.get('/v1/p2p/orders', async (request) => {
    const context = requestContext(request, store, environment);
    return { orders: store.listP2pOrders({ userId: context.user.id, mode: context.mode }), sync: context.mode === 'DEMO' ? 'DEMO_MANUAL' : 'PROVIDER_REQUIRED' };
  });
  app.post('/v1/p2p/orders/:id/approve', async (request, reply) => {
    const context = requestContext(request, store, environment);
    const order = store.getP2pOrder((request.params as { id: string }).id);
    if (!order || order.userId !== context.user.id || order.mode !== context.mode) return reply.status(404).send({ code: 'ORDER_NOT_FOUND', message: 'P2P order not found.' });
    const body = z.object({ pin: z.string().regex(/^\d{4,6}$/), idempotencyKey: z.string().min(8).max(120) }).parse(request.body || {});
    assertTransactionPin(store, context.user, body.pin);
    if (order.riskFlags.length) return reply.status(409).send({ code: 'MANUAL_REVIEW_REQUIRED', message: `Resolve risk flags first: ${order.riskFlags.join(', ')}.` });
    if (context.mode === 'LIVE') return providerRequired(reply, 'payments', 'P2P payout execution is not connected.');
    const wallet = requiredWallet(store, context.user.id, context.mode);
    const platform = requiredPlatformWallet(store, context.mode);
    ensureSufficientBalance(store, wallet.id, BigInt(order.amountMinor));
    postLedgerTransaction(store, { mode: context.mode, idempotencyKey: body.idempotencyKey, description: `P2P payout ${order.externalOrderId}`, entries: [{ accountId: wallet.id, side: 'DEBIT', amountMinor: order.amountMinor }, { accountId: platform.id, side: 'CREDIT', amountMinor: order.amountMinor }], metadata: { orderId: order.id } });
    const paid = store.saveP2pOrder({ ...order, status: 'PAID', updatedAt: new Date().toISOString() });
    return { order: paid, balanceNgn: fromMinor(userWalletBalanceMinor(store, context.user.id, context.mode)) };
  });
  app.post('/v1/p2p/orders/:id/reject', async (request, reply) => {
    const context = requestContext(request, store, environment);
    const order = store.getP2pOrder((request.params as { id: string }).id);
    if (!order || order.userId !== context.user.id || order.mode !== context.mode) return reply.status(404).send({ code: 'ORDER_NOT_FOUND', message: 'P2P order not found.' });
    const rejected = store.saveP2pOrder({ ...order, status: 'REJECTED', updatedAt: new Date().toISOString() });
    return { order: rejected };
  });
  app.get('/v1/bills', async (request) => {
    const context = requestContext(request, store, environment);
    return { payments: store.listBillPayments({ userId: context.user.id, mode: context.mode }) };
  });
  app.post('/v1/bills/pay', async (request, reply) => {
    const context = requestContext(request, store, environment);
    const body = z.object({ service: z.enum(['AIRTIME', 'DATA', 'ELECTRICITY', 'CABLE', 'INTERNET', 'BETTING', 'EDUCATION']), customerReference: z.string().trim().min(3).max(80), amountNgn: money, pin: z.string().regex(/^\d{4}$/), idempotencyKey: z.string().min(8).max(120) }).parse(request.body);
    if (store.findLedgerByIdempotencyKey(body.idempotencyKey)) return reply.status(409).send({ code: 'DUPLICATE_REQUEST', message: 'This bill-payment request was already processed.' });
    assertTransactionPin(store, context.user, body.pin);
    if (context.mode === 'LIVE') return providerRequired(reply, 'payments', 'Bill-payment provider is not connected.');
    const amountMinor = toMinor(body.amountNgn);
    const feeMinor = toMinor(50);
    const wallet = requiredWallet(store, context.user.id, context.mode);
    const platform = requiredPlatformWallet(store, context.mode);
    ensureSufficientBalance(store, wallet.id, amountMinor + feeMinor);
    postLedgerTransaction(store, { mode: context.mode, idempotencyKey: body.idempotencyKey, description: `${body.service} payment`, entries: [{ accountId: wallet.id, side: 'DEBIT', amountMinor: (amountMinor + feeMinor).toString() }, { accountId: platform.id, side: 'CREDIT', amountMinor: (amountMinor + feeMinor).toString() }], metadata: { customerReference: body.customerReference } });
    const now = new Date().toISOString();
    const payment: BillPayment = { id: `bill_${randomUUID()}`, userId: context.user.id, mode: context.mode, service: body.service, customerReference: body.customerReference, amountMinor: amountMinor.toString(), feeMinor: feeMinor.toString(), provider: 'Demo bill rail', status: 'PAID', createdAt: now, updatedAt: now };
    store.saveBillPayment(payment);
    return reply.status(201).send({ payment, balanceNgn: fromMinor(userWalletBalanceMinor(store, context.user.id, context.mode)), receipt: `MZ-${payment.id.slice(-8).toUpperCase()}` });
  });
  app.get('/v1/whatsapp/status', async (request) => {
    const context = requestContext(request, store, environment);
    const connection = store.listWhatsappConnections({ userId: context.user.id, mode: context.mode })[0];
    const settings = whatsappSettings(store, context.user.id, context.mode);
    return {
      connection: connection || null,
      settings,
      provider: context.mode === 'DEMO'
        ? { status: 'DEMO', message: 'Demo connection flow only. No WhatsApp message is sent.' }
        : { status: providerFamilyReady(store, 'messaging') ? 'CONNECTED' : 'UNCONFIGURED', message: providerFamilyReady(store, 'messaging') ? 'WhatsApp provider configured.' : 'Meta WhatsApp Business credentials are required.' },
      commands: ['balance', 'account', 'transactions', 'savings status', 'pending approvals', 'orders', 'pause auto pay', 'resume auto pay', 'send money instruction']
    };
  });
  app.get('/v1/whatsapp/settings', async (request) => {
    const context = requestContext(request, store, environment);
    return { settings: whatsappSettings(store, context.user.id, context.mode) };
  });
  app.put('/v1/whatsapp/settings', async (request) => {
    const context = requestContext(request, store, environment);
    const current = whatsappSettings(store, context.user.id, context.mode);
    const body = z.object({
      paymentsEnabled: z.boolean(),
      p2pAlertsEnabled: z.boolean().optional(),
      p2pAutoPayPaused: z.boolean(),
      whatsappPinLimitNgn: z.number().min(0).max(1_000_000).optional(),
      perTransactionLimitNgn: z.number().min(0).max(5_000_000).optional(),
      requireInAppAboveNgn: z.number().min(0).max(5_000_000).optional(),
      dailyLimitNgn: z.number().min(0).max(10_000_000),
      trustedRecipients: z.array(z.string().regex(/^\d{10}$/)).max(50)
    }).parse(request.body);
    const perTransactionLimitNgn = body.perTransactionLimitNgn ?? body.whatsappPinLimitNgn ?? 0;
    const requireInAppAboveNgn = body.requireInAppAboveNgn ?? perTransactionLimitNgn;
    const updated = store.saveWhatsappAutomationSettings({
      ...current,
      paymentsEnabled: body.paymentsEnabled,
      p2pAlertsEnabled: body.p2pAlertsEnabled ?? current.p2pAlertsEnabled,
      p2pAutoPayPaused: body.p2pAutoPayPaused,
      perTransactionLimitMinor: toMinor(perTransactionLimitNgn).toString(),
      requireInAppAboveMinor: toMinor(requireInAppAboveNgn).toString(),
      dailyLimitMinor: toMinor(body.dailyLimitNgn).toString(),
      trustedRecipients: [...new Set(body.trustedRecipients)],
      updatedAt: new Date().toISOString()
    });
    return { settings: updated };
  });
  app.post('/v1/whatsapp/link', async (request, reply) => {
    const context = requestContext(request, store, environment);
    const body = z.object({ phone: z.string().regex(/^\+?[1-9]\d{9,14}$/) }).parse(request.body);
    if (context.mode === 'LIVE' && !providerFamilyReady(store, 'messaging')) return providerRequired(reply, 'messaging', 'WhatsApp Cloud API is not configured.');
    const current = store.listWhatsappConnections({ userId: context.user.id, mode: context.mode })[0];
    const now = new Date().toISOString();
    const connection: WhatsappConnection = store.saveWhatsappConnection({
      id: current?.id || `wa_conn_${randomUUID()}`,
      userId: context.user.id,
      mode: context.mode,
      phone: body.phone,
      status: 'PENDING_VERIFICATION',
      verificationCode: context.mode === 'DEMO' ? '246810' : undefined,
      createdAt: current?.createdAt || now,
      updatedAt: now
    });
    return reply.status(201).send({
      connection: maskWhatsappConnection(connection),
      demoVerificationCode: context.mode === 'DEMO' ? '246810' : undefined,
      message: context.mode === 'DEMO' ? 'Use Demo code 246810. No SMS or WhatsApp message was sent.' : 'Verification message queued by the provider.'
    });
  });
  app.post('/v1/whatsapp/verify', async (request, reply) => {
    const context = requestContext(request, store, environment);
    const body = z.object({ connectionId: z.string().min(8), code: z.string().regex(/^\d{6}$/) }).parse(request.body);
    const current = store.getWhatsappConnection(body.connectionId);
    if (!current || current.userId !== context.user.id || current.mode !== context.mode) return reply.status(404).send({ code: 'WHATSAPP_CONNECTION_NOT_FOUND', message: 'WhatsApp connection not found.' });
    if (!current.verificationCode || body.code !== current.verificationCode) return reply.status(401).send({ code: 'INVALID_VERIFICATION_CODE', message: 'The verification code is invalid or expired.' });
    const now = new Date().toISOString();
    const connected = store.saveWhatsappConnection({ ...current, status: 'CONNECTED', verifiedAt: now, verificationCode: undefined, updatedAt: now });
    const message: WhatsappMessage = {
      id: `wa_msg_${randomUUID()}`, connectionId: connected.id, userId: context.user.id, mode: context.mode, direction: 'OUTBOUND',
      messageType: 'SYSTEM', body: 'WhatsApp Assistant connected. Payments still require secure approval in MemeZo.', status: context.mode === 'DEMO' ? 'SENT' : 'QUEUED', createdAt: now
    };
    store.saveWhatsappMessage(message);
    return { connection: maskWhatsappConnection(connected), message: 'WhatsApp Assistant connected.' };
  });
  app.get('/v1/whatsapp/messages', async (request) => {
    const context = requestContext(request, store, environment);
    return { messages: store.listWhatsappMessages({ userId: context.user.id, mode: context.mode }), commands: store.listWhatsappCommandLogs({ userId: context.user.id, mode: context.mode }) };
  });
  app.post('/v1/whatsapp/command', async (request, reply) => {
    const context = requestContext(request, store, environment);
    const body = z.object({ connectionId: z.string().min(8), text: z.string().trim().min(2).max(2000) }).parse(request.body);
    const connection = store.getWhatsappConnection(body.connectionId);
    if (!connection || connection.userId !== context.user.id || connection.mode !== context.mode || connection.status !== 'CONNECTED') return reply.status(409).send({ code: 'WHATSAPP_NOT_CONNECTED', message: 'Connect and verify WhatsApp before using commands.' });
    const now = new Date().toISOString();
    store.saveWhatsappMessage({ id: `wa_msg_${randomUUID()}`, connectionId: connection.id, userId: context.user.id, mode: context.mode, direction: 'INBOUND', messageType: 'TEXT', body: body.text, status: 'RECEIVED', createdAt: now });
    const command = parseWhatsappCommand(body.text);
    let result = '';
    let approval: WhatsappApprovalSession | undefined;
    if (command === 'BALANCE') result = `Your ${context.mode === 'DEMO' ? 'simulated ' : ''}MemeZo balance is ₦${Number(fromMinor(userWalletBalanceMinor(store, context.user.id, context.mode))).toLocaleString('en-NG', { minimumFractionDigits: 2 })}.`;
    else if (command === 'ACCOUNT') {
      const account = store.listVirtualAccounts({ userId: context.user.id, mode: context.mode })[0];
      result = account ? `${account.bankName}: ${account.accountNumber}, ${account.accountName}.` : 'No virtual account is available.';
    } else if (command === 'TRANSACTIONS') result = 'Open MemeZo to view verified transactions and receipts.';
    else if (command === 'SAVINGS') result = 'Savings is not connected to a live provider yet. No savings balance will be fabricated.';
    else if (command === 'APPROVALS') {
      const pending = store.listWhatsappApprovalSessions({ userId: context.user.id, mode: context.mode })
        .filter((item) => item.status === 'AWAITING_IN_APP_APPROVAL').length;
      result = `${pending} secure approval${pending === 1 ? '' : 's'} waiting in MemeZo. Sensitive transfers must be approved in the app.`;
    }
    else if (command === 'ORDERS') result = `${store.listP2pOrders({ userId: context.user.id, mode: context.mode }).filter((item) => ['PENDING', 'REVIEW'].includes(item.status)).length} P2P orders need attention.`;
    else if (command === 'PAUSE_AUTO_PAY' || command === 'RESUME_AUTO_PAY') {
      const currentSettings = whatsappSettings(store, context.user.id, context.mode);
      const paused = command === 'PAUSE_AUTO_PAY';
      store.saveWhatsappAutomationSettings({ ...currentSettings, p2pAutoPayPaused: paused, updatedAt: now });
      result = paused ? 'P2P auto-pay is paused. Existing paid orders are unchanged.' : 'P2P auto-pay is active again and remains bounded by your saved rules.';
    }
    else if (command === 'PAYMENT') {
      const parsed = parsePaymentInstruction(body.text);
      if (!parsed.amountNgn || !parsed.accountNumber) return reply.status(422).send({ code: 'PAYMENT_DETAILS_INCOMPLETE', message: 'Include a valid amount and 10-digit account number.' });
      const draft: AiPaymentDraft = {
        id: `aipay_${randomUUID()}`, userId: context.user.id, mode: context.mode, source: 'TEXT', instruction: body.text,
        bankName: parsed.bankName || 'Bank confirmation required', accountNumber: parsed.accountNumber, accountName: 'Account lookup required',
        amountMinor: toMinor(parsed.amountNgn).toString(), narration: parsed.narration || 'Prepared from WhatsApp', riskFlags: parsed.amountNgn >= 1_000_000 ? ['LARGE_AMOUNT_REVIEW'] : [],
        status: 'REVIEW', createdAt: now, updatedAt: now
      };
      store.saveAiPaymentDraft(draft);
      approval = store.saveWhatsappApprovalSession({
        id: `wa_approval_${randomUUID()}`, userId: context.user.id, mode: context.mode, connectionId: connection.id, actionType: 'PAYMENT', actionId: draft.id,
        status: 'AWAITING_IN_APP_APPROVAL', expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(), createdAt: now, updatedAt: now
      });
      result = `Payment prepared for ₦${parsed.amountNgn.toLocaleString()} to ${parsed.accountNumber}. Open MemeZo to verify the account name and approve securely.`;
    } else result = 'I can show balance, account details, recent transactions, P2P orders, or prepare a payment for secure in-app approval.';
    const log: WhatsappCommandLog = { id: `wa_cmd_${randomUUID()}`, connectionId: connection.id, userId: context.user.id, mode: context.mode, command, input: body.text, result, approvalSessionId: approval?.id, createdAt: now };
    store.saveWhatsappCommandLog(log);
    store.saveWhatsappMessage({ id: `wa_msg_${randomUUID()}`, connectionId: connection.id, userId: context.user.id, mode: context.mode, direction: 'OUTBOUND', messageType: 'TEXT', body: result, status: context.mode === 'DEMO' ? 'SENT' : 'QUEUED', createdAt: now });
    return { command: log, approval, reply: result, requiresInAppApproval: Boolean(approval) };
  });
  app.get('/v1/whatsapp/approvals', async (request) => {
    const context = requestContext(request, store, environment);
    return {
      approvals: store.listWhatsappApprovalSessions({ userId: context.user.id, mode: context.mode }).map((approval) => ({
        ...approval,
        payment: approval.actionType === 'PAYMENT' ? store.getAiPaymentDraft(approval.actionId) : undefined
      }))
    };
  });
  app.post('/v1/whatsapp/approvals/:id/approve', async (request, reply) => {
    const context = requestContext(request, store, environment);
    const approval = store.getWhatsappApprovalSession((request.params as { id: string }).id);
    if (!approval || approval.userId !== context.user.id || approval.mode !== context.mode) return reply.status(404).send({ code: 'APPROVAL_NOT_FOUND', message: 'WhatsApp approval was not found.' });
    if (approval.status !== 'AWAITING_IN_APP_APPROVAL' || Date.parse(approval.expiresAt) <= Date.now()) return reply.status(409).send({ code: 'APPROVAL_EXPIRED', message: 'This approval is no longer active.' });
    const body = z.object({
      pin: z.string().regex(/^\d{4}$/),
      channel: z.enum(['WHATSAPP_PIN', 'IN_APP']).optional(),
      approvalChannel: z.enum(['WHATSAPP_PIN', 'IN_APP']).optional(),
      idempotencyKey: z.string().min(8).max(120)
    }).parse(request.body);
    const approvalChannel = body.approvalChannel ?? body.channel ?? 'IN_APP';
    assertTransactionPin(store, context.user, body.pin);
    if (approval.actionType !== 'PAYMENT') return reply.status(409).send({ code: 'UNSUPPORTED_APPROVAL', message: 'This approval type is not executable yet.' });
    const payment = store.getAiPaymentDraft(approval.actionId);
    if (!payment) return reply.status(404).send({ code: 'PAYMENT_NOT_FOUND', message: 'Prepared payment was not found.' });
    const settings = whatsappSettings(store, context.user.id, context.mode);
    if (!settings.paymentsEnabled) return reply.status(403).send({ code: 'WHATSAPP_PAYMENTS_DISABLED', message: 'Enable WhatsApp payment preparation in MemeZo settings first.' });
    const safeForWhatsappPin = BigInt(payment.amountMinor) <= BigInt(settings.perTransactionLimitMinor)
      && BigInt(payment.amountMinor) <= BigInt(settings.requireInAppAboveMinor)
      && settings.trustedRecipients.includes(payment.accountNumber)
      && payment.riskFlags.length === 0;
    if (approvalChannel === 'WHATSAPP_PIN' && !safeForWhatsappPin) {
      return reply.status(409).send({ code: 'IN_APP_APPROVAL_REQUIRED', message: 'This payment exceeds your WhatsApp rule or recipient trust settings. Approve it inside MemeZo.' });
    }
    if (whatsappSpendToday(store, context.user.id, context.mode) + BigInt(payment.amountMinor) > BigInt(settings.dailyLimitMinor)) {
      return reply.status(409).send({ code: 'WHATSAPP_DAILY_LIMIT_REACHED', message: 'Your WhatsApp payment limit has been reached for today.' });
    }
    if (context.mode === 'LIVE') return providerRequired(reply, 'payments', 'Bank transfer execution is not connected.');
    const wallet = requiredWallet(store, context.user.id, context.mode);
    const platform = requiredPlatformWallet(store, context.mode);
    ensureSufficientBalance(store, wallet.id, BigInt(payment.amountMinor));
    postLedgerTransaction(store, {
      mode: context.mode,
      idempotencyKey: body.idempotencyKey,
      description: `WhatsApp prepared payment to ${payment.accountName}`,
      entries: [
        { accountId: wallet.id, side: 'DEBIT', amountMinor: payment.amountMinor },
        { accountId: platform.id, side: 'CREDIT', amountMinor: payment.amountMinor }
      ],
      metadata: { paymentId: payment.id, approvalId: approval.id, channel: approvalChannel }
    });
    const now = new Date().toISOString();
    const paid = store.saveAiPaymentDraft({ ...payment, status: 'PAID', updatedAt: now });
    const completed = store.saveWhatsappApprovalSession({ ...approval, status: 'APPROVED', updatedAt: now });
    return {
      approval: completed,
      payment: paid,
      receipt: `MZ-WA-${completed.id.slice(-8).toUpperCase()}`,
      balanceNgn: fromMinor(userWalletBalanceMinor(store, context.user.id, context.mode))
    };
  });
  app.get('/v1/whatsapp/webhook', async (request, reply) => {
    const query = z.object({ 'hub.mode': z.string(), 'hub.verify_token': z.string(), 'hub.challenge': z.string() }).parse(request.query);
    if (query['hub.mode'] !== 'subscribe') return reply.status(400).send('Invalid mode');
    return reply.status(503).send({ code: 'WEBHOOK_VERIFY_TOKEN_REQUIRED', message: 'Webhook verification requires the encrypted Meta verify token.' });
  });
  app.post('/v1/whatsapp/webhook', async (request, reply) => {
    if (!providerFamilyReady(store, 'messaging')) return providerRequired(reply, 'messaging', 'WhatsApp webhook provider is not configured.');
    const event: WhatsappWebhookEvent = { id: `wa_hook_${randomUUID()}`, mode: 'LIVE', eventType: 'WHATSAPP_MESSAGE', signatureVerified: false, status: 'REJECTED', error: 'Signature verification adapter is not enabled.', createdAt: new Date().toISOString() };
    store.saveWhatsappWebhookEvent(event);
    return reply.status(401).send({ code: 'WEBHOOK_SIGNATURE_REQUIRED', message: event.error });
  });
  app.post('/v1/trades/quote', async (request, reply) => {
    const context = requestContext(request, store, environment);
    const body = z.object({ mint: z.string().min(20), side: z.enum(['BUY', 'SELL']), amountNgn: money }).parse(request.body);
    const token = store.listTokens(context.mode).find((item) => item.mint === body.mint);
    if (!token) return reply.status(404).send({ code: 'TOKEN_NOT_FOUND', message: 'Token not found in this mode.' });
    if (context.mode === 'LIVE') return providerRequired(reply, 'trading', 'Trading provider is not configured.');
    const fee = Math.max(25, body.amountNgn * 0.01);
    return { quoteId: `quote_${randomUUID()}`, expiresAt: new Date(Date.now() + 30_000).toISOString(), token, side: body.side, amountNgn: body.amountNgn.toFixed(2), feeNgn: fee.toFixed(2), estimatedQuantity: ((body.amountNgn - fee) / Number(token.priceNgn)).toFixed(6), slippagePercent: 1.5, mode: context.mode };
  });
  app.post('/v1/trades/execute', async (request, reply) => {
    const context = requestContext(request, store, environment);
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
  app.get('/v1/admin/command-center', async (request) => {
    const mode = adminMode(request);
    const status = statusPayload(environment, store);
    const moneyRequests = store.listMoneyRequests({ mode });
    const pendingWhatsappApprovals = store.listWhatsappApprovalSessions({ mode })
      .filter((item) => item.status === 'AWAITING_IN_APP_APPROVAL').length;
    const platformWallets = store.listWallets(mode === 'DEMO' ? 'platform-demo' : 'platform-live', mode);
    return {
      mode,
      system: {
        app: status.appRunning ? 'RUNNING' : 'OFFLINE',
        database: status.database,
        redis: status.redis,
        queues: status.queues,
        reconciliation: status.reconciliation,
        launchBlockers: status.launchBlockers
      },
      queues: {
        kyc: store.listKycCases().filter((item) => item.mode === mode && item.status === 'PENDING_REVIEW').length,
        deposits: moneyRequests.filter((item) => item.type === 'DEPOSIT' && item.status === 'PENDING').length,
        withdrawals: moneyRequests.filter((item) => item.type === 'WITHDRAWAL' && item.status === 'PENDING').length,
        whatsappApprovals: pendingWhatsappApprovals,
        incidents: [...incidents.values()].filter((item) => item.mode === mode && item.status !== 'RESOLVED').length
      },
      treasury: platformWallets.map((wallet) => ({
        asset: wallet.asset,
        available: fromMinor(accountBalanceMinor(store, wallet.id)),
        status: mode === 'DEMO' ? 'SIMULATED' : 'UNRECONCILED'
      })),
      risk: {
        highRiskTokens: store.listTokens(mode).filter((item) => item.riskScore >= 70).length,
        failedTrades: store.listTrades({ mode }).filter((item) => item.status === 'FAILED').length,
        unverifiedWebhookEvents: store.listWhatsappWebhookEvents(mode).filter((item) => !item.signatureVerified).length
      },
      providers: providerStateMap(store),
      ai: aiBudgetStatus(),
      whatsapp: {
        connections: store.listWhatsappConnections({ mode }).length,
        failedMessages: store.listWhatsappMessages({ mode }).filter((item) => item.status === 'FAILED').length,
        rejectedWebhooks: store.listWhatsappWebhookEvents(mode).filter((item) => item.status === 'REJECTED').length
      }
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
      const net = BigInt(current.amountMinor) - BigInt(current.feeMinor);
      postLedgerTransaction(store, { mode: current.mode, idempotencyKey: `deposit-${current.id}`, description: `Confirmed deposit ${current.reference}`, entries: [{ accountId: platform.id, side: 'DEBIT', amountMinor: net.toString() }, { accountId: wallet.id, side: 'CREDIT', amountMinor: net.toString() }] });
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
  app.get('/v1/admin/virtual-accounts', async (request) => ({ accounts: store.listVirtualAccounts({ mode: adminMode(request) }) }));
  app.get('/v1/admin/ai-payments', async (request) => ({ payments: store.listAiPaymentDrafts({ mode: adminMode(request) }) }));
  app.get('/v1/admin/p2p-orders', async (request) => ({ orders: store.listP2pOrders({ mode: adminMode(request) }) }));
  app.get('/v1/admin/bill-payments', async (request) => ({ payments: store.listBillPayments({ mode: adminMode(request) }) }));
  app.get('/v1/admin/whatsapp/connections', async (request) => ({ connections: store.listWhatsappConnections({ mode: adminMode(request) }).map(maskWhatsappConnection) }));
  app.get('/v1/admin/whatsapp/messages', async (request) => ({ messages: store.listWhatsappMessages({ mode: adminMode(request) }) }));
  app.get('/v1/admin/whatsapp/webhooks', async (request) => ({ events: store.listWhatsappWebhookEvents(adminMode(request)) }));
  app.get('/v1/admin/whatsapp/commands', async (request) => ({ commands: store.listWhatsappCommandLogs({ mode: adminMode(request) }) }));
  app.get('/v1/admin/whatsapp/templates', async (request) => ({ templates: store.listWhatsappTemplates(adminMode(request)) }));
  app.post('/v1/admin/whatsapp/templates', async (request, reply) => {
    const mode = adminMode(request);
    const body = z.object({
      name: z.string().regex(/^[a-z0-9_]{3,80}$/),
      category: z.enum(['UTILITY', 'AUTHENTICATION', 'MARKETING']),
      language: z.string().min(2).max(10).default('en'),
      body: z.string().min(5).max(2000)
    }).parse(request.body);
    const template: WhatsappTemplate = {
      id: `wa_template_${randomUUID()}`,
      mode,
      name: body.name,
      category: body.category,
      language: body.language,
      status: 'DRAFT',
      body: body.body,
      createdAt: new Date().toISOString()
    };
    store.saveWhatsappTemplate(template);
    audit(store, request, 'WHATSAPP_TEMPLATE_CREATED', 'WHATSAPP_TEMPLATE', template.id, `Created ${template.name}`, undefined, template);
    return reply.status(201).send({ template });
  });
  app.patch('/v1/admin/whatsapp/templates/:id', async (request, reply) => {
    const mode = adminMode(request);
    const current = store.listWhatsappTemplates(mode).find((item) => item.id === (request.params as { id: string }).id);
    if (!current) return reply.status(404).send({ code: 'WHATSAPP_TEMPLATE_NOT_FOUND', message: 'WhatsApp template not found.' });
    const body = z.object({
      status: z.enum(['DRAFT', 'PENDING', 'APPROVED', 'REJECTED']).optional(),
      body: z.string().min(5).max(2000).optional(),
      reason: z.string().min(3).max(500)
    }).parse(request.body);
    const updated = store.saveWhatsappTemplate({ ...current, status: body.status ?? current.status, body: body.body ?? current.body });
    audit(store, request, 'WHATSAPP_TEMPLATE_UPDATED', 'WHATSAPP_TEMPLATE', current.id, body.reason, current, updated);
    return { template: updated };
  });
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
  app.get('/v1/admin/assets', async (request) => {
    const mode = adminMode(request);
    return { mode, assets: assetPolicies.get(mode) };
  });
  app.patch('/v1/admin/assets/:symbol', async (request, reply) => {
    const mode = adminMode(request);
    const symbol = z.string().min(2).max(10).parse((request.params as { symbol: string }).symbol).toUpperCase();
    const policies = assetPolicies.get(mode)!;
    const current = policies.find((item) => item.symbol === symbol);
    if (!current) return reply.status(404).send({ code: 'ASSET_NOT_FOUND', message: 'Supported asset policy not found.' });
    const body = z.object({
      enabled: z.boolean().optional(),
      deposits: z.boolean().optional(),
      withdrawals: z.boolean().optional(),
      swaps: z.boolean().optional(),
      networks: z.array(z.string().min(2).max(40)).max(20).optional(),
      reason: z.string().min(3).max(500)
    }).parse(request.body);
    const updated = {
      ...current,
      enabled: body.enabled ?? current.enabled,
      deposits: body.deposits ?? current.deposits,
      withdrawals: body.withdrawals ?? current.withdrawals,
      swaps: body.swaps ?? current.swaps,
      networks: body.networks ?? current.networks
    };
    assetPolicies.set(mode, policies.map((item) => item.symbol === symbol ? updated : item));
    audit(store, request, 'ASSET_POLICY_UPDATED', 'ASSET', symbol, body.reason, current, updated);
    return { mode, asset: updated };
  });
  app.get('/v1/admin/rewards', async (request) => {
    const mode = adminMode(request);
    return { mode, settings: rewardPolicies.get(mode) };
  });
  app.put('/v1/admin/rewards', async (request) => {
    const mode = adminMode(request);
    const current = rewardPolicies.get(mode)!;
    const updated = z.object({
      enabled: z.boolean(),
      referralRewardNgn: z.number().min(0).max(1_000_000),
      refereeRewardNgn: z.number().min(0).max(1_000_000),
      billCashbackPercent: z.number().min(0).max(20),
      cardCashbackPercent: z.number().min(0).max(20),
      tradingRewardPercent: z.number().min(0).max(20)
    }).parse(request.body);
    rewardPolicies.set(mode, updated);
    audit(store, request, 'REWARD_POLICY_UPDATED', 'REWARDS', mode, 'Reward and cashback policy updated', current, updated);
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
  app.get('/v1/admin/bot-controls', async (request) => ({
    mode: adminMode(request),
    users: store.listUsers({ mode: adminMode(request) }).map((user) => ({ userId: user.id, name: user.name, settings: botSettings.get(user.id) || null }))
  }));
  app.patch('/v1/admin/bot-controls/:userId', async (request, reply) => {
    const user = store.getUser((request.params as { userId: string }).userId);
    if (!user) return reply.status(404).send({ code: 'USER_NOT_FOUND', message: 'User not found.' });
    const current = botSettings.get(user.id) || defaultBotSettings();
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
  audience: z.enum(['ALL', 'KYC_APPROVED', 'INACTIVE', 'AI_PAY_USERS', 'P2P_MERCHANTS', 'TRADERS']).default('ALL'),
  scheduledAt: z.string().datetime().optional(),
  submitForApproval: z.boolean().default(false)
});

const OperationsSettingsSchema = z.object({
  depositFeePercent: z.number().min(0).max(10),
  swapFeePercent: z.number().min(0).max(10),
  botFeePercent: z.number().min(0).max(25),
  withdrawalFeePercent: z.number().min(0).max(10),
  cryptoWithdrawalMarginPercent: z.number().min(0).max(10),
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
    depositFeePercent: 0.5,
    swapFeePercent: 1,
    botFeePercent: 5,
    withdrawalFeePercent: 0.5,
    cryptoWithdrawalMarginPercent: 0.1,
    minimumDepositNgn: 1000,
    maximumWithdrawalNgn: 5_000_000,
    dailyUserLimitNgn: 10_000_000,
    proMonthlyNgn: 7500,
    eliteMonthlyNgn: 25000
  };
}

function defaultBotSettings() {
  return {
    active: false,
    automationMode: 'SIMULATION' as const,
    riskLevel: 'BALANCED',
    maxTradeNgn: 10_000,
    takeProfitPercent: 30,
    stopLossPercent: 12,
    dailyLossLimitPercent: 5,
    maxOpenTrades: 3,
    maxSlippagePercent: 1.5,
    minimumLiquidityNgn: 2_000_000
  };
}

function providerFamilyReady(store: MemoryStore, family: string) {
  return store.listProviders().some((provider) => provider.family === family && provider.enabled && provider.status === 'CONNECTED');
}

function requestContext(request: FastifyRequest, store: MemoryStore, environment: string) {
  const context = optionalContext(request, store, environment);
  if (context) return context;
  if (environment === 'production') {
    throw Object.assign(new Error('A signed-in session is required.'), { statusCode: 401, code: 'UNAUTHORIZED' });
  }
  const demo = store.getUser('demo-user-ada');
  if (!demo) throw Object.assign(new Error('Demo user is unavailable.'), { statusCode: 503, code: 'DEMO_UNAVAILABLE' });
  return { mode: 'DEMO' as Mode, user: demo };
}

function optionalContext(request: FastifyRequest, store: MemoryStore, environment: string) {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, '') || '';
  const user = token ? resolveSession(store, token) : undefined;
  if (user) return { mode: user.mode, user };
  if (environment === 'production') return undefined;
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

function assertTransactionPin(store: MemoryStore, user: User, pin: string) {
  const credential = store.getTransactionPin(user.id);
  if (!credential) {
    throw Object.assign(new Error('Set a transaction PIN before moving money.'), {
      statusCode: 409,
      code: 'TRANSACTION_PIN_NOT_CONFIGURED'
    });
  }
  if (credential.lockedUntil && Date.parse(credential.lockedUntil) > Date.now()) {
    throw Object.assign(new Error('Transaction PIN is temporarily locked. Try again later or contact support.'), {
      statusCode: 423,
      code: 'TRANSACTION_PIN_LOCKED'
    });
  }
  if (!verifyHashedTransactionPin(pin, credential.pinHash)) {
    const failedAttempts = credential.failedAttempts + 1;
    store.saveTransactionPin({
      ...credential,
      failedAttempts,
      lockedUntil: failedAttempts >= 5 ? new Date(Date.now() + 15 * 60_000).toISOString() : undefined,
      updatedAt: new Date().toISOString()
    });
    throw Object.assign(new Error(user.mode === 'DEMO' ? 'The demo transaction PIN is 1234.' : 'The transaction PIN is incorrect.'), {
      statusCode: 401,
      code: 'INVALID_TRANSACTION_PIN'
    });
  }
  if (credential.failedAttempts || credential.lockedUntil) {
    store.saveTransactionPin({ ...credential, failedAttempts: 0, lockedUntil: undefined, updatedAt: new Date().toISOString() });
  }
}

function requiredWallet(store: MemoryStore, userId: string, mode: Mode) {
  const wallet = store.listWallets(userId, mode).find((item) => item.asset === 'NGN');
  if (!wallet) throw Object.assign(new Error('NGN wallet is unavailable.'), { statusCode: 409, code: 'WALLET_NOT_FOUND' });
  return wallet;
}

function requiredAssetWallet(store: MemoryStore, userId: string, mode: Mode, asset: string) {
  let wallet = store.listWallets(userId, mode).find((item) => item.asset === asset);
  if (!wallet) wallet = store.saveWallet({ id: `${userId}-${asset.toLowerCase()}`, userId, mode, asset, label: `${asset} Wallet` });
  return wallet;
}

function requiredPlatformWallet(store: MemoryStore, mode: Mode) {
  let wallet = store.listWallets(mode === 'DEMO' ? 'platform-demo' : 'platform-live', mode).find((item) => item.asset === 'NGN');
  if (!wallet) wallet = store.saveWallet({ id: `platform-${mode.toLowerCase()}-funding-ngn`, userId: `platform-${mode.toLowerCase()}`, mode, asset: 'NGN', label: `${mode} funding reserve` });
  return wallet;
}

function requiredPlatformAssetWallet(store: MemoryStore, mode: Mode, asset: string) {
  const userId = mode === 'DEMO' ? 'platform-demo' : 'platform-live';
  let wallet = store.listWallets(userId, mode).find((item) => item.asset === asset);
  if (!wallet) wallet = store.saveWallet({ id: `platform-${mode.toLowerCase()}-funding-${asset.toLowerCase()}`, userId, mode, asset, label: `${mode} ${asset} reserve` });
  return wallet;
}

function createMoneyRequest(user: User, type: MoneyRequest['type'], amountNgn: number, provider: string): MoneyRequest {
  const now = new Date().toISOString();
  return { id: `${type.toLowerCase()}_${randomUUID()}`, mode: user.mode, userId: user.id, type, amountMinor: toMinor(amountNgn).toString(), feeMinor: '0', status: 'PENDING', provider, reference: `MZ-${type.slice(0, 3)}-${Date.now().toString(36).toUpperCase()}`, createdAt: now, updatedAt: now };
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
  const databaseStatus = config.infrastructure.postgresConfigured
    ? { status: 'CONFIGURED_NOT_VERIFIED', durable: true }
    : { status: environment === 'production' ? 'MISSING' : 'IN_MEMORY_DEMO', durable: false };
  const redisStatus = config.infrastructure.redisConfigured
    ? { status: 'CONFIGURED_NOT_VERIFIED', durable: false }
    : { status: environment === 'production' ? 'MISSING' : 'NOT_REQUIRED_FOR_DEMO', durable: false };
  const launchBlockers = [
    !config.infrastructure.postgresConfigured ? 'PostgreSQL is not configured.' : '',
    !config.infrastructure.redisConfigured ? 'Redis is not configured.' : '',
    !providerFamilyReady(store, 'custody') ? 'Custody provider is not connected.' : '',
    !providerFamilyReady(store, 'trading') ? 'Trading provider is not connected.' : ''
  ].filter(Boolean);
  return {
    ok: environment !== 'production' || launchBlockers.length === 0,
    appRunning: true,
    service: 'memezo-api',
    environment,
    modeIsolation: true,
    database: databaseStatus,
    redis: redisStatus,
    queues: { status: config.infrastructure.postgresConfigured ? 'SCHEMA_READY' : 'MEMORY_ONLY', durable: config.infrastructure.postgresConfigured },
    reconciliation: { status: config.infrastructure.postgresConfigured ? 'SCHEMA_READY' : 'NOT_DURABLE' },
    providers: providerStateMap(store),
    paperBroker: { status: 'AVAILABLE', mode: 'DEMO' },
    liveTrading: {
      enabled: false,
      reason: launchBlockers.length ? launchBlockers.join(' ') : 'Live activation still requires external audit and an explicit release approval.'
    },
    launchBlockers,
    features: config.flags
  };
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
    provider('nomba', 'payments', 'Nomba', 1, 'https://dashboard.nomba.com/', ['Client ID', 'Client Secret', 'Account ID', 'Base URL', 'Webhook Secret']),
    provider('monnify', 'payments', 'Monnify', 2, 'https://app.monnify.com/', ['API Key', 'Secret Key', 'Contract Code', 'Base URL', 'Webhook Secret']),
    provider('paystack', 'payments', 'Paystack', 3, 'https://dashboard.paystack.com/', ['Secret Key', 'Public Key', 'Webhook Secret', 'Base URL']),
    provider('flutterwave', 'payments', 'Flutterwave', 4, 'https://app.flutterwave.com/', ['Secret Key', 'Public Key', 'Encryption Key', 'Webhook Secret', 'Base URL']),
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
    provider('vtpass', 'bills', 'VTPass', 1, 'https://www.vtpass.com/register', ['API Key', 'Secret Key', 'Public Key', 'Webhook Secret']),
    provider('sudo', 'cards', 'Sudo Cards', 1, 'https://app.sudo.africa/', ['API Key', 'Vault Key', 'Webhook Secret', 'Base URL']),
    provider('whatsapp', 'messaging', 'WhatsApp Cloud API', 1, 'https://developers.facebook.com/apps/', ['App ID', 'Phone Number ID', 'Access Token', 'Verify Token', 'App Secret']),
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
    push: state(config.providers.push), trading: state(config.providers.trading), ai: state(config.providers.ai), messaging: state(config.providers.messaging)
  };
}

function state(configured: boolean) { return { configured, status: configured ? 'CONNECTED' : 'UNCONFIGURED' }; }
function safeTokenEqual(supplied: string, expected: string) {
  const left = Buffer.from(supplied); const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}
function toMinor(value: number) { return BigInt(Math.round(value * 100)); }
function fromMinor(value: bigint) { return (Number(value) / 100).toFixed(2); }
function assetScale(asset: string) { return asset === 'NGN' ? 100 : 1_000_000; }
function assetMinor(asset: string, value: number) { return BigInt(Math.round(value * assetScale(asset))); }
function assetUnits(asset: string, value: bigint) { return Number(value) / assetScale(asset); }
function assetRateNgn(asset: string) {
  const rates: Record<string, number> = { NGN: 1, USDT: 1570, USDC: 1572, BTC: 109_083_333, ETH: 618_710, SOL: 246_406, BNB: 99_524, TRX: 230, XRP: 915, DOGE: 244, POL: 363, TON: 3748 };
  return rates[asset] || 0;
}
function buildSwapQuote(fromAsset: string, toAsset: string, amount: number, slippagePercent: number, mode: Mode) {
  const fromRate = assetRateNgn(fromAsset);
  const toRate = assetRateNgn(toAsset);
  if (!fromRate || !toRate) throw Object.assign(new Error('No price route is available for this asset pair.'), { statusCode: 409, code: 'SWAP_ROUTE_UNAVAILABLE' });
  const sourceValueNgn = amount * fromRate;
  const feeNgn = Math.max(25, sourceValueNgn * 0.01);
  const receive = Math.max(0, (sourceValueNgn - feeNgn) / toRate);
  return {
    id: `swap_quote_${randomUUID()}`,
    mode,
    fromAsset,
    toAsset,
    amount: amount.toFixed(fromAsset === 'NGN' ? 2 : 6),
    sourceValueNgn: sourceValueNgn.toFixed(2),
    rate: (fromRate / toRate).toFixed(8),
    feeNgn: feeNgn.toFixed(2),
    priceImpactPercent: sourceValueNgn >= 1_000_000 ? 0.42 : 0.18,
    slippagePercent,
    estimatedReceive: receive.toFixed(toAsset === 'NGN' ? 2 : 6),
    route: `${fromAsset} → MemeZo demo router → ${toAsset}`,
    liquiditySource: 'MemeZo Demo Rate Book',
    expiresAt: new Date(Date.now() + 30_000).toISOString()
  };
}
function maskPhone(phone: string) { return `${phone.slice(0, 4)}••••${phone.slice(-3)}`; }
function sumMoney(items: MoneyRequest[]) { return fromMinor(items.reduce((sum, item) => sum + BigInt(item.amountMinor), 0n)); }
function runnerCategory(score: number, risk: number) { return risk >= 70 ? 'High Risk Runner' : score >= 90 ? 'Explosive Runner' : score >= 80 ? 'Strong Runner' : score >= 65 ? 'Potential Runner' : 'Avoid'; }
function tokenExplanation(token: { runnerScore: number; riskScore: number; liquidityNgn: string; holders: number }) {
  return { summary: `Runner score ${token.runnerScore}/100 with ${token.riskScore}/100 risk. Liquidity is ₦${Number(token.liquidityNgn).toLocaleString()} across ${token.holders.toLocaleString()} tracked holders.`, highestRisk: token.riskScore >= 60 ? 'Wallet concentration and liquidity depth require caution.' : 'No extreme risk flag in the available Demo signals.', disclaimer: 'Scores are decision support, not a profit guarantee.' };
}
function emptyState() {
  const seeded = seedDemoData();
  return { ...seeded, users: [], wallets: [], ledgerTransactions: [], kycCases: [], tokens: [], alerts: [], moneyRequests: [], virtualAccounts: [], aiPaymentDrafts: [], internalTransfers: [], p2pOrders: [], billPayments: [], whatsappConnections: [], whatsappMessages: [], whatsappWebhookEvents: [], whatsappCommandLogs: [], whatsappApprovalSessions: [], whatsappAutomationSettings: [], whatsappTemplates: [], trades: [], positions: [] };
}

function defaultAssetPolicies(): AssetPolicy[] {
  return [
    { symbol: 'NGN', name: 'Nigerian Naira', enabled: true, deposits: true, withdrawals: true, swaps: true, networks: ['MemeZo Balance'] },
    { symbol: 'USDT', name: 'Tether', enabled: true, deposits: true, withdrawals: true, swaps: true, networks: ['Ethereum', 'Tron', 'BNB Chain', 'Solana', 'Polygon', 'Arbitrum'] },
    { symbol: 'USDC', name: 'USD Coin', enabled: true, deposits: true, withdrawals: true, swaps: true, networks: ['Ethereum', 'Base', 'Solana', 'Polygon', 'Arbitrum'] },
    { symbol: 'BTC', name: 'Bitcoin', enabled: true, deposits: true, withdrawals: true, swaps: true, networks: ['Bitcoin'] },
    { symbol: 'ETH', name: 'Ethereum', enabled: true, deposits: true, withdrawals: true, swaps: true, networks: ['Ethereum', 'Base', 'Arbitrum', 'Optimism'] },
    { symbol: 'SOL', name: 'Solana', enabled: true, deposits: true, withdrawals: true, swaps: true, networks: ['Solana'] },
    { symbol: 'BNB', name: 'BNB', enabled: true, deposits: true, withdrawals: true, swaps: true, networks: ['BNB Chain'] },
    { symbol: 'TRX', name: 'TRON', enabled: true, deposits: true, withdrawals: true, swaps: true, networks: ['Tron'] },
    { symbol: 'XRP', name: 'XRP', enabled: true, deposits: true, withdrawals: true, swaps: true, networks: ['XRP Ledger'] },
    { symbol: 'DOGE', name: 'Dogecoin', enabled: true, deposits: true, withdrawals: true, swaps: true, networks: ['Dogecoin'] },
    { symbol: 'POL', name: 'Polygon', enabled: false, deposits: false, withdrawals: false, swaps: false, networks: ['Polygon'] },
    { symbol: 'TON', name: 'Toncoin', enabled: false, deposits: false, withdrawals: false, swaps: false, networks: ['TON'] }
  ];
}

function defaultRewardPolicy(): RewardPolicy {
  return {
    enabled: false,
    referralRewardNgn: 1000,
    refereeRewardNgn: 500,
    billCashbackPercent: 0.5,
    cardCashbackPercent: 0.25,
    tradingRewardPercent: 0
  };
}

function parsePaymentInstruction(instruction: string) {
  const normalized = instruction.replace(/,/g, '');
  const amountMatch = normalized.match(/(?:₦|NGN\s*)?(\d+(?:\.\d{1,2})?)/i);
  const accountMatch = normalized.match(/\b(\d{10})\b/);
  const bankMatch = normalized.match(/\b(Access|GTBank|Guaranty Trust|UBA|Zenith|First Bank|Kuda|Opay|PalmPay|Moniepoint|Fidelity|Stanbic|FCMB|Wema)\b/i);
  return {
    amountNgn: amountMatch ? Number(amountMatch[1]) : undefined,
    accountNumber: accountMatch?.[1],
    bankName: bankMatch?.[1],
    narration: 'Prepared by MemeZo AI Pay'
  };
}

function parseWhatsappCommand(input: string): WhatsappCommandLog['command'] {
  const text = input.trim().toLowerCase();
  if (/\b(balance|wallet balance)\b/.test(text)) return 'BALANCE';
  if (/\b(account number|bank account|account details)\b/.test(text)) return 'ACCOUNT';
  if (/\b(transactions|history|receipt)\b/.test(text)) return 'TRANSACTIONS';
  if (/\b(savings|saving balance|savings status)\b/.test(text)) return 'SAVINGS';
  if (/\b(approvals|pending approval|approve transfer)\b/.test(text)) return 'APPROVALS';
  if (/\b(orders|pending order|p2p)\b/.test(text)) return 'ORDERS';
  if (/\bpause auto ?pay\b/.test(text)) return 'PAUSE_AUTO_PAY';
  if (/\bresume auto ?pay\b/.test(text)) return 'RESUME_AUTO_PAY';
  if (/\b(send|pay|transfer)\b/.test(text) && /\b\d{10}\b/.test(text)) return 'PAYMENT';
  if (/\b(airtime|data|electricity|cable|internet|betting)\b/.test(text)) return 'BILL';
  if (/\b(help|support|complaint)\b/.test(text)) return 'SUPPORT';
  return 'UNKNOWN';
}

function maskWhatsappConnection(connection: WhatsappConnection) {
  return { ...connection, phone: `${connection.phone.slice(0, 4)}••••${connection.phone.slice(-3)}`, verificationCode: undefined };
}

function whatsappSettings(store: MemoryStore, userId: string, mode: Mode): WhatsappAutomationSettings {
  const current = store.getWhatsappAutomationSettings(userId, mode);
  if (current) return current;
  return store.saveWhatsappAutomationSettings({
    id: `wa_settings_${randomUUID()}`,
    userId,
    mode,
    paymentsEnabled: false,
    p2pAlertsEnabled: true,
    p2pAutoPayPaused: true,
    perTransactionLimitMinor: '0',
    requireInAppAboveMinor: '0',
    dailyLimitMinor: '0',
    trustedRecipients: [],
    updatedAt: new Date().toISOString()
  });
}

function whatsappSpendToday(store: MemoryStore, userId: string, mode: Mode) {
  const today = new Date().toISOString().slice(0, 10);
  return store.listWhatsappApprovalSessions({ userId, mode })
    .filter((approval) => approval.status === 'APPROVED' && approval.updatedAt.slice(0, 10) === today)
    .reduce((sum, approval) => {
      const payment = approval.actionType === 'PAYMENT' ? store.getAiPaymentDraft(approval.actionId) : undefined;
      return sum + BigInt(payment?.amountMinor || 0);
    }, 0n);
}
