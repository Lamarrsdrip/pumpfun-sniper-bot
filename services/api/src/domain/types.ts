export type Mode = 'DEMO' | 'LIVE';
export type UserStatus = 'ACTIVE' | 'SUSPENDED';
export type UserRole = 'USER' | 'ADMIN' | 'SUPER_ADMIN' | 'COMPLIANCE_ADMIN' | 'SUPPORT_ADMIN';
export type KycStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'MORE_INFORMATION_REQUIRED'
  | 'EXPIRED';

export type User = {
  id: string;
  mode: Mode;
  handle?: string;
  name: string;
  email: string;
  phone: string;
  status: UserStatus;
  role: UserRole;
  kycStatus: KycStatus;
  createdAt: string;
  lastActiveAt: string;
  notes: string[];
};

export type WalletAccount = {
  id: string;
  userId: string;
  mode: Mode;
  asset: string;
  label: string;
};

export type LedgerEntry = {
  accountId: string;
  side: 'DEBIT' | 'CREDIT';
  amountMinor: string;
};

export type LedgerTransaction = {
  id: string;
  mode: Mode;
  idempotencyKey: string;
  description: string;
  createdAt: string;
  entries: LedgerEntry[];
  metadata?: Record<string, string>;
};

export type KycCase = {
  id: string;
  userId: string;
  mode: Mode;
  status: KycStatus;
  provider: string;
  submittedAt?: string;
  reviewedAt?: string;
  reviewReason?: string;
};

export type ProviderConfig = {
  key: string;
  family: string;
  displayName: string;
  enabled: boolean;
  priority: number;
  configured: boolean;
  status: 'CONNECTED' | 'DEGRADED' | 'UNCONFIGURED' | 'DISABLED';
  lastTestedAt?: string;
  latencyMs?: number;
  lastError?: string;
  setupUrl?: string;
  docsUrl?: string;
  requiredFields?: string[];
  featureUnlocked?: string;
  publicConfig: Record<string, string | number | boolean>;
};

export type AuditEvent = {
  id: string;
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  reason: string;
  oldValue?: unknown;
  newValue?: unknown;
  ip?: string;
  device?: string;
  requestId?: string;
  createdAt: string;
};

export type TokenSnapshot = {
  id: string;
  mode: Mode;
  name: string;
  symbol: string;
  mint: string;
  priceNgn: string;
  marketCapNgn: string;
  liquidityNgn: string;
  volume24hNgn: string;
  holders: number;
  runnerScore: number;
  riskScore: number;
  change24h: number;
  source: string;
  sourceMode: 'DEX' | 'EARLY_SOLANA' | 'WATCHLIST';
  chain: 'SOLANA' | 'ETHEREUM' | 'BASE' | 'BNB_CHAIN' | 'POLYGON' | 'ARBITRUM' | 'OPTIMISM' | 'TRON';
  dex?: string;
  pairAddress?: string;
  ageMinutes: number;
  buyPressurePercent: number;
  contractWarnings: string[];
  observedAt: string;
};

export type Alert = {
  id: string;
  mode: Mode;
  title: string;
  body: string;
  severity: 'INFO' | 'OPPORTUNITY' | 'WARNING';
  createdAt: string;
};

export type MoneyRequest = {
  id: string;
  mode: Mode;
  userId: string;
  type: 'DEPOSIT' | 'WITHDRAWAL';
  amountMinor: string;
  feeMinor: string;
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'PAID';
  provider: string;
  reference: string;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  createdAt: string;
  updatedAt: string;
};

export type VirtualAccount = {
  id: string;
  userId: string;
  mode: Mode;
  provider: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  reference: string;
  status: 'ACTIVE' | 'PENDING' | 'DISABLED';
  createdAt: string;
};

export type AiPaymentDraft = {
  id: string;
  userId: string;
  mode: Mode;
  source: 'TEXT' | 'IMAGE';
  instruction: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  amountMinor: string;
  narration: string;
  riskFlags: string[];
  duplicateOf?: string;
  status: 'REVIEW' | 'APPROVED' | 'PAID' | 'REJECTED' | 'FAILED';
  createdAt: string;
  updatedAt: string;
};

export type InternalTransfer = {
  id: string;
  mode: Mode;
  senderId: string;
  recipientId: string;
  recipientName: string;
  recipientHandle?: string;
  amountMinor: string;
  feeMinor: string;
  narration: string;
  status: 'COMPLETED' | 'FAILED' | 'REVERSED';
  ledgerTransactionId: string;
  receipt: string;
  createdAt: string;
};

export type P2pOrder = {
  id: string;
  userId: string;
  mode: Mode;
  exchange: string;
  externalOrderId: string;
  sellerName: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  amountMinor: string;
  asset: string;
  assetQuantity: string;
  riskFlags: string[];
  status: 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED' | 'FAILED' | 'REVIEW';
  createdAt: string;
  updatedAt: string;
};

export type BillPayment = {
  id: string;
  userId: string;
  mode: Mode;
  service: 'AIRTIME' | 'DATA' | 'ELECTRICITY' | 'CABLE' | 'INTERNET' | 'BETTING' | 'EDUCATION';
  customerReference: string;
  amountMinor: string;
  feeMinor: string;
  provider: string;
  status: 'PENDING' | 'PAID' | 'FAILED';
  createdAt: string;
  updatedAt: string;
};

export type WhatsappConnection = {
  id: string;
  userId: string;
  mode: Mode;
  phone: string;
  status: 'PENDING_VERIFICATION' | 'CONNECTED' | 'PAUSED' | 'DISCONNECTED';
  verificationCode?: string;
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type WhatsappMessage = {
  id: string;
  connectionId: string;
  userId: string;
  mode: Mode;
  direction: 'INBOUND' | 'OUTBOUND';
  messageType: 'TEXT' | 'IMAGE' | 'TEMPLATE' | 'SYSTEM';
  body: string;
  providerMessageId?: string;
  status: 'RECEIVED' | 'QUEUED' | 'SENT' | 'FAILED';
  createdAt: string;
};

export type WhatsappWebhookEvent = {
  id: string;
  mode: Mode;
  eventType: string;
  providerEventId?: string;
  signatureVerified: boolean;
  status: 'RECEIVED' | 'PROCESSED' | 'REJECTED' | 'FAILED';
  error?: string;
  createdAt: string;
};

export type WhatsappCommandLog = {
  id: string;
  connectionId: string;
  userId: string;
  mode: Mode;
  command: 'BALANCE' | 'ACCOUNT' | 'PAYMENT' | 'BILL' | 'TRANSACTIONS' | 'SUPPORT' | 'ORDERS' | 'PAUSE_AUTO_PAY' | 'RESUME_AUTO_PAY' | 'UNKNOWN';
  input: string;
  result: string;
  approvalSessionId?: string;
  createdAt: string;
};

export type WhatsappApprovalSession = {
  id: string;
  userId: string;
  mode: Mode;
  connectionId: string;
  actionType: 'PAYMENT' | 'BILL' | 'P2P';
  actionId: string;
  status: 'AWAITING_IN_APP_APPROVAL' | 'APPROVED' | 'EXPIRED' | 'CANCELLED';
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
};

export type WhatsappAutomationSettings = {
  id: string;
  userId: string;
  mode: Mode;
  paymentsEnabled: boolean;
  p2pAlertsEnabled: boolean;
  p2pAutoPayPaused: boolean;
  perTransactionLimitMinor: string;
  requireInAppAboveMinor: string;
  dailyLimitMinor: string;
  trustedRecipients: string[];
  updatedAt: string;
};

export type WhatsappTemplate = {
  id: string;
  mode: Mode;
  name: string;
  category: 'UTILITY' | 'AUTHENTICATION' | 'MARKETING';
  language: string;
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';
  body: string;
  createdAt: string;
};

export type Trade = {
  id: string;
  mode: Mode;
  userId: string;
  tokenId: string;
  side: 'BUY' | 'SELL';
  amountMinor: string;
  feeMinor: string;
  quantity: string;
  priceNgn: string;
  status: 'CONFIRMED' | 'FAILED';
  failureReason?: string;
  createdAt: string;
};

export type Position = {
  id: string;
  mode: Mode;
  userId: string;
  tokenId: string;
  quantity: string;
  costMinor: string;
  updatedAt: string;
};

export type StoreState = {
  users: User[];
  wallets: WalletAccount[];
  ledgerTransactions: LedgerTransaction[];
  kycCases: KycCase[];
  providers: ProviderConfig[];
  auditEvents: AuditEvent[];
  tokens: TokenSnapshot[];
  alerts: Alert[];
  moneyRequests: MoneyRequest[];
  virtualAccounts: VirtualAccount[];
  aiPaymentDrafts: AiPaymentDraft[];
  internalTransfers: InternalTransfer[];
  p2pOrders: P2pOrder[];
  billPayments: BillPayment[];
  whatsappConnections: WhatsappConnection[];
  whatsappMessages: WhatsappMessage[];
  whatsappWebhookEvents: WhatsappWebhookEvent[];
  whatsappCommandLogs: WhatsappCommandLog[];
  whatsappApprovalSessions: WhatsappApprovalSession[];
  whatsappAutomationSettings: WhatsappAutomationSettings[];
  whatsappTemplates: WhatsappTemplate[];
  trades: Trade[];
  positions: Position[];
  sessions: Array<{ id: string; userId: string; tokenHash: string; expiresAt: string; revokedAt?: string }>;
  credentials: Array<{ userId: string; passwordHash: string }>;
};
