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
  p2pOrders: P2pOrder[];
  billPayments: BillPayment[];
  trades: Trade[];
  positions: Position[];
  sessions: Array<{ id: string; userId: string; tokenHash: string; expiresAt: string; revokedAt?: string }>;
  credentials: Array<{ userId: string; passwordHash: string }>;
};
