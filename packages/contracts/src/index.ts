import { z } from 'zod';

export const MoneySchema = z.object({
  currency: z.enum(['NGN', 'USDT', 'USDC', 'SOL']),
  amount: z.string()
});

export const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  requestId: z.string().optional(),
  details: z.record(z.unknown()).optional()
});

export const TokenSummarySchema = z.object({
  mint: z.string(),
  name: z.string(),
  symbol: z.string(),
  imageUrl: z.string().url().nullable(),
  priceNgn: z.number().nonnegative(),
  priceChange24hPct: z.number(),
  marketCapNgn: z.number().nonnegative(),
  liquidityNgn: z.number().nonnegative(),
  volume24hNgn: z.number().nonnegative(),
  holderCount: z.number().int().nonnegative().nullable(),
  ageSeconds: z.number().int().nonnegative(),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'EXTREME', 'UNVERIFIED']),
  sniperScore: z.number().min(0).max(100),
  status: z.enum(['WATCHING', 'QUALIFIED', 'ENTERED', 'BLOCKED', 'EXITED']),
  source: z.string(),
  updatedAt: z.string().datetime()
});

export const WalletSummarySchema = z.object({
  availableNgn: z.string(),
  reservedNgn: z.string(),
  portfolioNgn: z.string(),
  todayPnlNgn: z.string(),
  totalEquityNgn: z.string(),
  kycTier: z.number().int().min(0).max(3),
  depositEnabled: z.boolean(),
  withdrawalEnabled: z.boolean(),
  tradingEnabled: z.boolean()
});

export const TradeQuoteRequestSchema = z.object({
  mint: z.string().min(32),
  side: z.enum(['BUY', 'SELL']),
  amountNgn: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  tokenQuantity: z.string().optional(),
  maxSlippageBps: z.number().int().min(10).max(3000)
});

export const TradeQuoteSchema = z.object({
  quoteId: z.string(),
  mint: z.string(),
  side: z.enum(['BUY', 'SELL']),
  debit: MoneySchema,
  estimatedTokenQuantity: z.string(),
  estimatedPriceNgn: z.string(),
  platformFeeNgn: z.string(),
  networkFeeNgn: z.string(),
  estimatedSlippageNgn: z.string(),
  totalNgn: z.string(),
  expiresAt: z.string().datetime(),
  warnings: z.array(z.string())
});

export const CreateDepositSchema = z.object({
  amountNgn: z.string().regex(/^\d+(\.\d{1,2})?$/),
  channel: z.literal('BANK_TRANSFER')
});

export const CreateWithdrawalSchema = z.object({
  amountNgn: z.string().regex(/^\d+(\.\d{1,2})?$/),
  bankAccountId: z.string().uuid()
});

export const BotSettingsSchema = z.object({
  enabled: z.boolean(),
  riskLevel: z.enum(['SAFE', 'BALANCED', 'SNIPER']),
  maxTradeNgn: z.string().regex(/^\d+(\.\d{1,2})?$/),
  takeProfitPct: z.number().min(5).max(500),
  stopLossPct: z.number().min(2).max(50),
  dailyLossLimitNgn: z.string().regex(/^\d+(\.\d{1,2})?$/),
  autoBuyRunners: z.boolean(),
  autoSellProtection: z.boolean()
});

export type TokenSummary = z.infer<typeof TokenSummarySchema>;
export type WalletSummary = z.infer<typeof WalletSummarySchema>;
export type TradeQuote = z.infer<typeof TradeQuoteSchema>;
export type BotSettings = z.infer<typeof BotSettingsSchema>;
