const SECRET_KEYS = /authorization|password|pin|secret|token|api[_-]?key|private[_-]?key|cookie/i;
const ACCOUNT_KEYS = /accountnumber|account_number/i;

export function redactSensitive<T>(value: T): T {
  return redact(value) as T;
}

export function structuredEvent(input: {
  level: 'debug' | 'info' | 'warn' | 'error';
  event: string;
  requestId?: string;
  correlationId?: string;
  data?: Record<string, unknown>;
}) {
  return {
    timestamp: new Date().toISOString(),
    ...input,
    data: redactSensitive(input.data || {})
  };
}

function redact(value: unknown, key = ''): unknown {
  if (SECRET_KEYS.test(key)) return '[REDACTED]';
  if (ACCOUNT_KEYS.test(key) && typeof value === 'string') return maskAccount(value);
  if (Array.isArray(value)) return value.map((item) => redact(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([childKey, childValue]) => [childKey, redact(childValue, childKey)]));
  }
  return value;
}

function maskAccount(value: string) {
  if (value.length <= 4) return '[REDACTED]';
  return `${'*'.repeat(value.length - 4)}${value.slice(-4)}`;
}
