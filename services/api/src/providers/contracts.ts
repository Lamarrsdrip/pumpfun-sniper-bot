export type ProviderResult<T> =
  | { ok: true; providerReference: string; data: T }
  | { ok: false; retryable: boolean; code: string; message: string };

export interface PaymentProvider {
  createVirtualAccount(input: { userId: string; name: string; email: string }): Promise<ProviderResult<{ bankName: string; accountName: string; accountNumber: string }>>;
  verifyDeposit(input: { providerReference: string; amountMinor: string }): Promise<ProviderResult<{ confirmed: boolean }>>;
  verifyAccountName(input: { bankCode: string; accountNumber: string }): Promise<ProviderResult<{ accountName: string }>>;
  initiateBankTransfer(input: { idempotencyKey: string; amountMinor: string; bankCode: string; accountNumber: string; narration: string }): Promise<ProviderResult<{ status: string }>>;
  getTransactionStatus(providerReference: string): Promise<ProviderResult<{ status: string }>>;
}

export interface CryptoProvider {
  createCryptoDepositAddress(input: { userId: string; asset: string; network: string }): Promise<ProviderResult<{ address: string; memo?: string }>>;
  sendCrypto(input: { idempotencyKey: string; asset: string; network: string; amountAtomic: string; address: string }): Promise<ProviderResult<{ transactionHash: string }>>;
  getSwapQuote(input: { fromAsset: string; toAsset: string; amountAtomic: string; maxSlippageBps: number }): Promise<ProviderResult<{ receiveAtomic: string; networkFeeAtomic: string; priceImpactBps: number }>>;
  executeSwap(input: { idempotencyKey: string; quoteReference: string }): Promise<ProviderResult<{ transactionHash: string }>>;
}

export interface MemeMarketProvider {
  streamMemeTokens(onEvent: (event: unknown) => void): Promise<() => Promise<void>>;
}

export interface SniperExecutionProvider {
  executeSniperTrade(input: { idempotencyKey: string; mint: string; side: 'BUY' | 'SELL'; amountAtomic: string; maxSlippageBps: number }): Promise<ProviderResult<{ transactionHash: string; filledAtomic: string }>>;
}
