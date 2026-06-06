import { randomUUID } from 'node:crypto';
import type { LedgerEntry, LedgerTransaction, Mode } from './types.js';
import type { MemoryStore } from './store.js';

export function accountBalanceMinor(store: MemoryStore, accountId: string): bigint {
  return store.listLedgerTransactions().reduce((balance, transaction) => transaction.entries.reduce((next, entry) => {
    if (entry.accountId !== accountId) return next;
    const amount = BigInt(entry.amountMinor);
    return next + (entry.side === 'CREDIT' ? amount : -amount);
  }, balance), 0n);
}

export function postLedgerTransaction(store: MemoryStore, input: {
  mode: Mode;
  idempotencyKey: string;
  description: string;
  entries: LedgerEntry[];
  metadata?: Record<string, string>;
}): LedgerTransaction {
  const existing = store.findLedgerByIdempotencyKey(input.idempotencyKey);
  if (existing) {
    const samePayload = existing.mode === input.mode &&
      existing.description === input.description &&
      JSON.stringify(existing.entries) === JSON.stringify(input.entries) &&
      JSON.stringify(existing.metadata || {}) === JSON.stringify(input.metadata || {});
    if (!samePayload) {
      throw Object.assign(new Error('Idempotency key was already used for a different ledger transaction.'), {
        statusCode: 409,
        code: 'IDEMPOTENCY_CONFLICT'
      });
    }
    return existing;
  }
  const debit = total(input.entries, 'DEBIT');
  const credit = total(input.entries, 'CREDIT');
  if (debit !== credit || debit <= 0n) throw new Error('Ledger transaction must contain equal positive debits and credits.');
  return store.saveLedgerTransaction({ id: `led_${randomUUID()}`, createdAt: new Date().toISOString(), ...input });
}

export function userWalletBalanceMinor(store: MemoryStore, userId: string, mode: Mode, asset = 'NGN'): bigint {
  const wallet = store.listWallets(userId, mode).find((item) => item.asset === asset);
  return wallet ? accountBalanceMinor(store, wallet.id) : 0n;
}

export function ensureSufficientBalance(store: MemoryStore, accountId: string, requiredMinor: bigint) {
  if (accountBalanceMinor(store, accountId) >= requiredMinor) return;
  const error = new Error('Insufficient available balance.') as Error & { statusCode?: number; code?: string };
  error.statusCode = 409;
  error.code = 'INSUFFICIENT_BALANCE';
  throw error;
}

function total(entries: LedgerEntry[], side: LedgerEntry['side']) {
  return entries.filter((entry) => entry.side === side).reduce((sum, entry) => sum + BigInt(entry.amountMinor), 0n);
}
