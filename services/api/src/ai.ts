import { config } from './config.js';

type ExplanationInput = {
  name: string;
  symbol: string;
  runnerScore: number;
  riskScore: number;
  holders: number;
  liquidityNgn: string;
  change24h: number;
};

const cache = new Map<string, { expiresAt: number; value: string }>();

export function rulesFirstExplanation(input: ExplanationInput) {
  const risk = input.riskScore >= 70 ? 'high' : input.riskScore >= 45 ? 'medium' : 'lower';
  const momentum = input.runnerScore >= 85 ? 'strong' : input.runnerScore >= 70 ? 'developing' : 'weak';
  return `${input.name} (${input.symbol}) has ${momentum} measured momentum and ${risk} measured risk. It has ${input.holders.toLocaleString()} tracked holders, ₦${Number(input.liquidityNgn).toLocaleString()} liquidity and ${input.change24h.toFixed(1)}% 24-hour movement. Review liquidity, holder concentration and execution costs before trading.`;
}

export async function explainWithBudget(input: ExplanationInput) {
  const key = JSON.stringify(input);
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return { text: cached.value, source: 'CACHE', costProtected: true };
  const fallback = rulesFirstExplanation(input);
  if (!config.ai.enabled || !config.providers.ai || !config.ai.baseUrl) {
    return { text: fallback, source: 'RULES', costProtected: true };
  }
  // The deployed adapter can call Emergent here. Production requests remain disabled
  // until the exact gateway contract and billing limits are verified.
  cache.set(key, { value: fallback, expiresAt: Date.now() + config.ai.cacheTtlSeconds * 1000 });
  return { text: fallback, source: 'RULES_WITH_LLM_RESERVED', costProtected: true };
}

export function aiBudgetStatus() {
  return {
    provider: 'Emergent Universal LLM',
    configured: config.providers.ai,
    enabled: config.ai.enabled,
    strategy: 'RULES_FIRST',
    dailyCreditBudget: config.ai.dailyCreditBudget,
    maxRequestsPerMinute: config.ai.maxRequestsPerMinute,
    cacheTtlSeconds: config.ai.cacheTtlSeconds,
    liveCallsEnabled: false,
    safeguards: ['Rules before LLM', 'Cached explanations', 'Short output', 'No AI trade authorization', 'Daily budget ceiling']
  };
}
