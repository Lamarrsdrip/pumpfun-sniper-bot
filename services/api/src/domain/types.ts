export type Mode = 'DEMO' | 'LIVE';
export type UserStatus = 'ACTIVE' | 'SUSPENDED';
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

export type Bounty = {
  id: string;
  mode: Mode;
  title: string;
  sponsor: string;
  rewardNgn: string;
  category: string;
  deadline: string;
  status: 'OPEN' | 'CLOSED';
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
  bounties: Bounty[];
  alerts: Alert[];
  moneyRequests: MoneyRequest[];
  trades: Trade[];
  positions: Position[];
  sessions: Array<{ id: string; userId: string; tokenHash: string; expiresAt: string; revokedAt?: string }>;
  credentials: Array<{ userId: string; passwordHash: string }>;
};
