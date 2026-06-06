export const config = {
  port: Number(process.env.API_PORT || 8790),
  host: process.env.API_HOST || '127.0.0.1',
  environment: process.env.NODE_ENV || 'development',
  appUrl: process.env.APP_URL || 'nairameme://',
  adminApiToken: process.env.ADMIN_API_TOKEN || '',
  adminOrigins: (process.env.ADMIN_ALLOWED_ORIGINS || 'http://127.0.0.1:5173,http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  secretManager: process.env.SECRET_MANAGER_PROVIDER || '',
  providers: {
    identity: Boolean(process.env.AUTH_PROVIDER_SECRET),
    payments: Boolean(process.env.PAYMENT_PROVIDER_SECRET),
    marketData: Boolean(process.env.PUMPPORTAL_API_KEY || process.env.BIRDEYE_API_KEY),
    solanaRpc: Boolean(process.env.SOLANA_RPC_URL),
    kyc: Boolean(process.env.KYC_PROVIDER_SECRET),
    email: Boolean(process.env.EMAIL_PROVIDER_KEY),
    push: Boolean(process.env.EXPO_ACCESS_TOKEN),
    trading: Boolean(process.env.TRADING_PROVIDER_URL && process.env.TRADING_PROVIDER_KEY),
    ai: Boolean(process.env.EMERGENT_LLM_API_KEY || process.env.AI_PROVIDER_KEY)
  },
  ai: {
    baseUrl: process.env.EMERGENT_LLM_BASE_URL || '',
    model: process.env.EMERGENT_LLM_MODEL || 'low-cost',
    dailyCreditBudget: Number(process.env.EMERGENT_LLM_DAILY_CREDIT_BUDGET || 1),
    maxRequestsPerMinute: Number(process.env.EMERGENT_LLM_MAX_REQUESTS_PER_MINUTE || 6),
    cacheTtlSeconds: Number(process.env.EMERGENT_LLM_CACHE_TTL_SECONDS || 900),
    enabled: process.env.AI_EXPLANATIONS_ENABLED === 'true'
  },
  flags: {
    deposits: process.env.FEATURE_DEPOSITS === 'true',
    withdrawals: process.env.FEATURE_WITHDRAWALS === 'true',
    trading: process.env.FEATURE_TRADING === 'true',
    autoSniper: process.env.FEATURE_AUTO_SNIPER === 'true',
    copyTrading: process.env.FEATURE_COPY_TRADING === 'true'
  }
};
