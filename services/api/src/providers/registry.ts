import type { HealthCheckedProvider } from './contracts.js';

export type ProviderRuntimeStatus = {
  key: string;
  family: string;
  configured: boolean;
  enabled: boolean;
  tested: boolean;
  status: 'MISSING' | 'DISABLED' | 'READY' | 'DEGRADED' | 'OFFLINE';
  latencyMs?: number;
  lastError?: string;
};

export class ProviderRegistry {
  private readonly adapters = new Map<string, { family: string; adapter: HealthCheckedProvider }>();

  register(key: string, family: string, adapter: HealthCheckedProvider) {
    this.adapters.set(key, { family, adapter });
  }

  get<T extends HealthCheckedProvider>(key: string): T | undefined {
    return this.adapters.get(key)?.adapter as T | undefined;
  }

  async test(key: string): Promise<ProviderRuntimeStatus> {
    const registered = this.adapters.get(key);
    if (!registered) {
      return { key, family: 'unknown', configured: false, enabled: false, tested: false, status: 'MISSING' };
    }
    try {
      const result = await registered.adapter.healthcheck();
      return {
        key,
        family: registered.family,
        configured: true,
        enabled: true,
        tested: true,
        status: result.ok ? 'READY' : 'DEGRADED',
        latencyMs: result.latencyMs,
        lastError: result.ok ? undefined : result.message
      };
    } catch (error) {
      return {
        key,
        family: registered.family,
        configured: true,
        enabled: true,
        tested: true,
        status: 'OFFLINE',
        lastError: error instanceof Error ? error.message : 'Provider health test failed.'
      };
    }
  }
}
