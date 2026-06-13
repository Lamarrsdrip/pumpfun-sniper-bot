import { Prisma, PrismaClient } from '@prisma/client';

export type DatabaseRuntime = {
  client: PrismaClient;
  healthcheck: () => Promise<{ ok: boolean; latencyMs: number; error?: string }>;
  disconnect: () => Promise<void>;
};

export function createDatabaseRuntime(databaseUrl = process.env.DATABASE_URL): DatabaseRuntime | undefined {
  if (!databaseUrl) return undefined;
  const client = new PrismaClient({ datasourceUrl: databaseUrl });
  return {
    client,
    async healthcheck() {
      const started = Date.now();
      try {
        await client.$queryRaw`SELECT 1`;
        return { ok: true, latencyMs: Date.now() - started };
      } catch (error) {
        return {
          ok: false,
          latencyMs: Date.now() - started,
          error: error instanceof Error ? error.message : 'Database health check failed.'
        };
      }
    },
    disconnect: () => client.$disconnect()
  };
}

export function withSerializableTransaction<T>(
  client: PrismaClient,
  operation: (transaction: Prisma.TransactionClient) => Promise<T>
) {
  return client.$transaction(operation, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    maxWait: 5_000,
    timeout: 15_000
  });
}

export async function lockWalletRows(transaction: Prisma.TransactionClient, walletIds: string[]) {
  const uniqueIds = [...new Set(walletIds)].sort();
  if (!uniqueIds.length) return;
  await transaction.$queryRaw`
    SELECT id
    FROM "Wallet"
    WHERE id IN (${Prisma.join(uniqueIds)})
    ORDER BY id
    FOR UPDATE
  `;
}

export async function claimDurableJob(transaction: Prisma.TransactionClient, workerId: string, leaseSeconds = 30) {
  const rows = await transaction.$queryRaw<Array<{ id: string }>>`
    WITH candidate AS (
      SELECT id
      FROM "DurableJob"
      WHERE (
        status = 'PENDING'
        OR (status = 'RUNNING' AND "leaseExpiresAt" < NOW())
      )
      AND "availableAt" <= NOW()
      ORDER BY "availableAt", "createdAt"
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    UPDATE "DurableJob"
    SET
      status = 'RUNNING',
      attempts = attempts + 1,
      "leaseOwner" = ${workerId},
      "leaseExpiresAt" = NOW() + (${leaseSeconds} * INTERVAL '1 second'),
      "updatedAt" = NOW()
    WHERE id IN (SELECT id FROM candidate)
    RETURNING id
  `;
  return rows[0]?.id;
}
