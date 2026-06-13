import { Redis } from 'ioredis';

export type RedisRuntime = {
  client: Redis;
  healthcheck: () => Promise<{ ok: boolean; latencyMs: number; error?: string }>;
  disconnect: () => Promise<void>;
};

export function createRedisRuntime(redisUrl = process.env.REDIS_URL): RedisRuntime | undefined {
  if (!redisUrl) return undefined;
  const client = new Redis(redisUrl, {
    enableOfflineQueue: false,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    retryStrategy(times: number) {
      return Math.min(times * 250, 5_000);
    }
  });
  return {
    client,
    async healthcheck() {
      const started = Date.now();
      try {
        if (client.status === 'wait') await client.connect();
        await client.ping();
        return { ok: true, latencyMs: Date.now() - started };
      } catch (error) {
        return {
          ok: false,
          latencyMs: Date.now() - started,
          error: error instanceof Error ? error.message : 'Redis health check failed.'
        };
      }
    },
    async disconnect() {
      if (client.status !== 'end') await client.quit();
    }
  };
}

export async function withDistributedLock<T>(
  client: Redis,
  key: string,
  owner: string,
  ttlMs: number,
  operation: () => Promise<T>
) {
  const acquired = await client.set(key, owner, 'PX', ttlMs, 'NX');
  if (acquired !== 'OK') throw new Error('The operation is already in progress.');
  try {
    return await operation();
  } finally {
    await client.eval(
      "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
      1,
      key,
      owner
    );
  }
}
