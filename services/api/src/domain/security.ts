import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';

const PIN_KEY_LENGTH = 64;

export type TransferRiskInput = {
  amountMinor: bigint;
  duplicateDetected: boolean;
  transfersLastTenMinutes: number;
  deviceTrusted: boolean;
  highValueThresholdMinor: bigint;
};

export type TransferRiskDecision = {
  allow: boolean;
  reviewRequired: boolean;
  flags: string[];
};

export type ApprovalRequest = {
  id: string;
  action: string;
  requestedBy: string;
  payload: Record<string, unknown>;
  approvedBy: string[];
  status: 'PENDING_SECOND_APPROVAL' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
};

export function hashTransactionPin(pin: string, pepper = process.env.TRANSACTION_PIN_PEPPER || '') {
  assertPin(pin);
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(`${pin}:${pepper}`, salt, PIN_KEY_LENGTH).toString('hex');
  return `scrypt-v1:${salt}:${hash}`;
}

export function verifyTransactionPin(pin: string, encoded: string, pepper = process.env.TRANSACTION_PIN_PEPPER || '') {
  if (!/^\d{4,6}$/.test(pin)) return false;
  const [version, salt, stored] = encoded.split(':');
  if (version !== 'scrypt-v1' || !salt || !stored) return false;
  try {
    const supplied = scryptSync(`${pin}:${pepper}`, salt, PIN_KEY_LENGTH);
    const expected = Buffer.from(stored, 'hex');
    return supplied.length === expected.length && timingSafeEqual(supplied, expected);
  } catch {
    return false;
  }
}

export function evaluateTransferRisk(input: TransferRiskInput): TransferRiskDecision {
  const flags: string[] = [];
  if (input.duplicateDetected) flags.push('POSSIBLE_DUPLICATE');
  if (input.transfersLastTenMinutes >= 5) flags.push('TRANSFER_VELOCITY_HIGH');
  if (input.amountMinor >= input.highValueThresholdMinor) flags.push('HIGH_VALUE_TRANSFER');
  if (!input.deviceTrusted) flags.push('UNTRUSTED_DEVICE');

  const hardBlocks = new Set(['POSSIBLE_DUPLICATE', 'TRANSFER_VELOCITY_HIGH', 'UNTRUSTED_DEVICE']);
  const reviewRequired = flags.length > 0;
  return {
    allow: !flags.some((flag) => hardBlocks.has(flag)),
    reviewRequired,
    flags
  };
}

export function createApprovalRequest(input: {
  action: string;
  requestedBy: string;
  payload: Record<string, unknown>;
  now?: Date;
}): ApprovalRequest {
  const now = (input.now || new Date()).toISOString();
  return {
    id: `approval_${randomUUID()}`,
    action: input.action,
    requestedBy: input.requestedBy,
    payload: structuredClone(input.payload),
    approvedBy: [],
    status: 'PENDING_SECOND_APPROVAL',
    createdAt: now,
    updatedAt: now
  };
}

export function recordApproval(request: ApprovalRequest, administratorId: string, now = new Date()): ApprovalRequest {
  if (request.status !== 'PENDING_SECOND_APPROVAL') throw new Error('Approval request is no longer pending.');
  if (request.approvedBy.includes(administratorId)) throw new Error('A different administrator must provide the second approval.');

  const approvedBy = [...request.approvedBy, administratorId];
  return {
    ...request,
    approvedBy,
    status: approvedBy.length >= 2 ? 'APPROVED' : 'PENDING_SECOND_APPROVAL',
    updatedAt: now.toISOString()
  };
}

function assertPin(pin: string) {
  if (!/^\d{4,6}$/.test(pin)) throw new Error('Transaction PIN must contain 4 to 6 digits.');
}
