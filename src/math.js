export function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

export function pctChange(from, to) {
  if (!Number.isFinite(from) || from <= 0) return 0;
  return (to - from) / from;
}

export function safeRatio(a, b, fallback = 0) {
  if (!Number.isFinite(b) || b === 0) return fallback;
  return a / b;
}

export function sum(values) {
  return values.reduce((total, value) => total + (Number(value) || 0), 0);
}

export function nowIso() {
  return new Date().toISOString();
}
