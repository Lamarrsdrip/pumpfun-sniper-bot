export type ProviderResult<T> =
  | { ok: true; providerReference: string; data: T }
  | { ok: false; retryable: boolean; code: string; message: string };

export interface HealthCheckedProvider {
  healthcheck(): Promise<{ ok: boolean; latencyMs: number; message: string }>;
}

export interface PaymentProvider extends HealthCheckedProvider {
  createVirtualAccount(input: { userId: string; name: string; email: string }): Promise<ProviderResult<{ bankName: string; accountName: string; accountNumber: string }>>;
  verifyDeposit(input: { providerReference: string; amountMinor: string }): Promise<ProviderResult<{ confirmed: boolean }>>;
  verifyAccountName(input: { bankCode: string; accountNumber: string }): Promise<ProviderResult<{ accountName: string }>>;
  initiateBankTransfer(input: { idempotencyKey: string; amountMinor: string; bankCode: string; accountNumber: string; narration: string }): Promise<ProviderResult<{ status: string }>>;
  getTransactionStatus(providerReference: string): Promise<ProviderResult<{ status: string }>>;
}

export interface CryptoProvider extends HealthCheckedProvider {
  createCryptoDepositAddress(input: { userId: string; asset: string; network: string }): Promise<ProviderResult<{ address: string; memo?: string }>>;
  sendCrypto(input: { idempotencyKey: string; asset: string; network: string; amountAtomic: string; address: string }): Promise<ProviderResult<{ transactionHash: string }>>;
  getSwapQuote(input: { fromAsset: string; toAsset: string; amountAtomic: string; maxSlippageBps: number }): Promise<ProviderResult<{ receiveAtomic: string; networkFeeAtomic: string; priceImpactBps: number }>>;
  executeSwap(input: { idempotencyKey: string; quoteReference: string }): Promise<ProviderResult<{ transactionHash: string }>>;
}

export interface MemeMarketProvider extends HealthCheckedProvider {
  streamMemeTokens(onEvent: (event: unknown) => void): Promise<() => Promise<void>>;
}

export interface SniperExecutionProvider extends HealthCheckedProvider {
  executeSniperTrade(input: { idempotencyKey: string; mint: string; side: 'BUY' | 'SELL'; amountAtomic: string; maxSlippageBps: number }): Promise<ProviderResult<{ transactionHash: string; filledAtomic: string }>>;
}

export interface IdentityProvider extends HealthCheckedProvider {
  sendOtp(input: { destination: string; channel: 'SMS' | 'EMAIL'; purpose: string }): Promise<ProviderResult<{ challengeId: string; expiresAt: string }>>;
  verifyOtp(input: { challengeId: string; code: string }): Promise<ProviderResult<{ verified: boolean }>>;
}

export interface KycProvider extends HealthCheckedProvider {
  createSession(input: { userId: string; tier: number; callbackUrl: string }): Promise<ProviderResult<{ sessionId: string; url: string }>>;
  getDecision(sessionId: string): Promise<ProviderResult<{ status: string; evidence: Record<string, unknown> }>>;
}

export interface MessagingProvider extends HealthCheckedProvider {
  sendTemplate(input: { destination: string; template: string; variables: string[]; idempotencyKey: string }): Promise<ProviderResult<{ messageId: string }>>;
}

export interface EmailProvider extends HealthCheckedProvider {
  send(input: { to: string; subject: string; html: string; idempotencyKey: string }): Promise<ProviderResult<{ messageId: string }>>;
}

export interface CustodyProvider extends HealthCheckedProvider {
  createWallet(input: { userId: string; network: string }): Promise<ProviderResult<{ walletId: string; address: string }>>;
  signTransaction(input: { walletId: string; unsignedTransaction: string; idempotencyKey: string }): Promise<ProviderResult<{ signedTransaction: string }>>;
}

export interface RiskProvider extends HealthCheckedProvider {
  screenAddress(input: { address: string; network: string }): Promise<ProviderResult<{ riskScore: number; flags: string[] }>>;
}
