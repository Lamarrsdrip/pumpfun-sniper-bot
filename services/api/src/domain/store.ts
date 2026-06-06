import type {
  Alert,
  AuditEvent,
  Bounty,
  KycCase,
  LedgerTransaction,
  MoneyRequest,
  Mode,
  Position,
  ProviderConfig,
  StoreState,
  TokenSnapshot,
  Trade,
  User,
  WalletAccount
} from './types.js';

const clone = <T>(value: T): T => structuredClone(value);

export type UserFilter = { mode?: Mode; query?: string; status?: User['status']; kycStatus?: User['kycStatus'] };

export function createMemoryStore(initial: StoreState) {
  const state = clone(initial);

  return {
    snapshot: () => clone(state),
    listUsers(filter: UserFilter = {}): User[] {
      const query = filter.query?.trim().toLowerCase();
      return clone(state.users
        .filter((user) => !filter.mode || user.mode === filter.mode)
        .filter((user) => !filter.status || user.status === filter.status)
        .filter((user) => !filter.kycStatus || user.kycStatus === filter.kycStatus)
        .filter((user) => !query || [user.id, user.name, user.email, user.phone].some((value) => value.toLowerCase().includes(query)))
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt)));
    },
    getUser(id: string): User | undefined {
      return clone(state.users.find((user) => user.id === id));
    },
    saveUser(user: User): User {
      const index = state.users.findIndex((item) => item.id === user.id);
      if (index >= 0) state.users[index] = clone(user);
      else state.users.push(clone(user));
      return clone(user);
    },
    listWallets(userId: string, mode?: Mode): WalletAccount[] {
      return clone(state.wallets.filter((wallet) => wallet.userId === userId && (!mode || wallet.mode === mode)));
    },
    saveWallet(wallet: WalletAccount): WalletAccount {
      if (!state.wallets.some((item) => item.id === wallet.id)) state.wallets.push(clone(wallet));
      return clone(wallet);
    },
    listLedgerTransactions(mode?: Mode): LedgerTransaction[] {
      return clone(state.ledgerTransactions.filter((transaction) => !mode || transaction.mode === mode));
    },
    findLedgerByIdempotencyKey(key: string): LedgerTransaction | undefined {
      return clone(state.ledgerTransactions.find((transaction) => transaction.idempotencyKey === key));
    },
    saveLedgerTransaction(transaction: LedgerTransaction): LedgerTransaction {
      state.ledgerTransactions.push(clone(transaction));
      return clone(transaction);
    },
    listKycCases(): KycCase[] {
      return clone(state.kycCases);
    },
    getKycCase(id: string): KycCase | undefined {
      return clone(state.kycCases.find((item) => item.id === id));
    },
    saveKycCase(value: KycCase): KycCase {
      const index = state.kycCases.findIndex((item) => item.id === value.id);
      if (index >= 0) state.kycCases[index] = clone(value);
      else state.kycCases.push(clone(value));
      return clone(value);
    },
    listProviders(): ProviderConfig[] {
      return clone(state.providers.sort((left, right) => left.family.localeCompare(right.family) || left.priority - right.priority));
    },
    getProvider(key: string): ProviderConfig | undefined {
      return clone(state.providers.find((provider) => provider.key === key));
    },
    saveProvider(value: ProviderConfig): ProviderConfig {
      const index = state.providers.findIndex((item) => item.key === value.key);
      if (index >= 0) state.providers[index] = clone(value);
      else state.providers.push(clone(value));
      return clone(value);
    },
    appendAudit(event: AuditEvent): AuditEvent {
      state.auditEvents.push(clone(event));
      return clone(event);
    },
    listAudit(): AuditEvent[] {
      return clone(state.auditEvents.sort((left, right) => right.createdAt.localeCompare(left.createdAt)));
    },
    listTokens(mode: Mode): TokenSnapshot[] {
      return clone(state.tokens.filter((token) => token.mode === mode).sort((left, right) => right.observedAt.localeCompare(left.observedAt)));
    },
    listBounties(mode: Mode): Bounty[] {
      return clone(state.bounties.filter((bounty) => bounty.mode === mode));
    },
    saveBounty(value: Bounty): Bounty {
      const index = state.bounties.findIndex((item) => item.id === value.id);
      if (index >= 0) state.bounties[index] = clone(value);
      else state.bounties.push(clone(value));
      return clone(value);
    },
    listAlerts(mode: Mode): Alert[] {
      return clone(state.alerts.filter((alert) => alert.mode === mode).sort((left, right) => right.createdAt.localeCompare(left.createdAt)));
    },
    listMoneyRequests(filter: { mode?: Mode; type?: MoneyRequest['type']; status?: MoneyRequest['status']; userId?: string } = {}): MoneyRequest[] {
      return clone(state.moneyRequests
        .filter((item) => !filter.mode || item.mode === filter.mode)
        .filter((item) => !filter.type || item.type === filter.type)
        .filter((item) => !filter.status || item.status === filter.status)
        .filter((item) => !filter.userId || item.userId === filter.userId)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt)));
    },
    getMoneyRequest(id: string): MoneyRequest | undefined {
      return clone(state.moneyRequests.find((item) => item.id === id));
    },
    saveMoneyRequest(value: MoneyRequest): MoneyRequest {
      const index = state.moneyRequests.findIndex((item) => item.id === value.id);
      if (index >= 0) state.moneyRequests[index] = clone(value);
      else state.moneyRequests.push(clone(value));
      return clone(value);
    },
    listTrades(filter: { mode?: Mode; userId?: string } = {}): Trade[] {
      return clone(state.trades
        .filter((item) => !filter.mode || item.mode === filter.mode)
        .filter((item) => !filter.userId || item.userId === filter.userId)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt)));
    },
    saveTrade(value: Trade): Trade {
      state.trades.push(clone(value));
      return clone(value);
    },
    listPositions(filter: { mode?: Mode; userId?: string } = {}): Position[] {
      return clone(state.positions
        .filter((item) => !filter.mode || item.mode === filter.mode)
        .filter((item) => !filter.userId || item.userId === filter.userId));
    },
    getPosition(userId: string, tokenId: string, mode: Mode): Position | undefined {
      return clone(state.positions.find((item) => item.userId === userId && item.tokenId === tokenId && item.mode === mode));
    },
    savePosition(value: Position): Position {
      const index = state.positions.findIndex((item) => item.id === value.id);
      if (index >= 0) state.positions[index] = clone(value);
      else state.positions.push(clone(value));
      return clone(value);
    },
    removePosition(id: string) {
      const index = state.positions.findIndex((item) => item.id === id);
      if (index >= 0) state.positions.splice(index, 1);
    },
    saveCredential(userId: string, passwordHash: string) {
      state.credentials.push({ userId, passwordHash });
    },
    getCredential(userId: string) {
      return clone(state.credentials.find((credential) => credential.userId === userId));
    },
    saveSession(session: StoreState['sessions'][number]) {
      state.sessions.push(clone(session));
    },
    findSessionByHash(tokenHash: string) {
      return clone(state.sessions.find((session) => session.tokenHash === tokenHash));
    },
    revokeSession(id: string, revokedAt: string) {
      const session = state.sessions.find((item) => item.id === id);
      if (session) session.revokedAt = revokedAt;
    }
  };
}

export type MemoryStore = ReturnType<typeof createMemoryStore>;
