import { randomUUID } from 'node:crypto';

export type JobStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'DEAD_LETTER';

export type DurableJob<T = unknown> = {
  id: string;
  type: string;
  payload: T;
  status: JobStatus;
  attempts: number;
  availableAt: string;
  leaseOwner?: string;
  leaseExpiresAt?: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
};

type QueueOptions = {
  now?: () => Date;
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  leaseMs?: number;
};

export function createDurableJobQueue(options: QueueOptions = {}) {
  const now = options.now || (() => new Date());
  const maxAttempts = options.maxAttempts ?? 5;
  const baseDelayMs = options.baseDelayMs ?? 1_000;
  const maxDelayMs = options.maxDelayMs ?? 60_000;
  const leaseMs = options.leaseMs ?? 30_000;
  const jobs = new Map<string, DurableJob>();

  return {
    enqueue<T>(type: string, payload: T, availableAt = now()): DurableJob<T> {
      const timestamp = now().toISOString();
      const job: DurableJob<T> = {
        id: `job_${randomUUID()}`,
        type,
        payload: structuredClone(payload),
        status: 'PENDING',
        attempts: 0,
        availableAt: availableAt.toISOString(),
        createdAt: timestamp,
        updatedAt: timestamp
      };
      jobs.set(job.id, job);
      return structuredClone(job);
    },
    claim(workerId: string): DurableJob | undefined {
      const timestamp = now();
      const candidate = [...jobs.values()]
        .filter((job) => {
          const leaseExpired = job.status === 'RUNNING' && job.leaseExpiresAt && Date.parse(job.leaseExpiresAt) <= timestamp.getTime();
          return (job.status === 'PENDING' || leaseExpired) && Date.parse(job.availableAt) <= timestamp.getTime();
        })
        .sort((left, right) => left.availableAt.localeCompare(right.availableAt) || left.createdAt.localeCompare(right.createdAt))[0];
      if (!candidate) return undefined;

      candidate.status = 'RUNNING';
      candidate.attempts += 1;
      candidate.leaseOwner = workerId;
      candidate.leaseExpiresAt = new Date(timestamp.getTime() + leaseMs).toISOString();
      candidate.updatedAt = timestamp.toISOString();
      return structuredClone(candidate);
    },
    complete(jobId: string) {
      const job = requireJob(jobs, jobId);
      job.status = 'COMPLETED';
      job.leaseOwner = undefined;
      job.leaseExpiresAt = undefined;
      job.updatedAt = now().toISOString();
      return structuredClone(job);
    },
    fail(jobId: string, error: string) {
      const job = requireJob(jobs, jobId);
      const timestamp = now();
      job.lastError = error.slice(0, 500);
      job.leaseOwner = undefined;
      job.leaseExpiresAt = undefined;
      job.updatedAt = timestamp.toISOString();
      if (job.attempts >= maxAttempts) {
        job.status = 'DEAD_LETTER';
      } else {
        job.status = 'PENDING';
        const delay = Math.min(baseDelayMs * 2 ** Math.max(0, job.attempts - 1), maxDelayMs);
        job.availableAt = new Date(timestamp.getTime() + delay).toISOString();
      }
      return structuredClone(job);
    },
    list(filter: { status?: JobStatus } = {}) {
      return [...jobs.values()]
        .filter((job) => !filter.status || job.status === filter.status)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
        .map((job) => structuredClone(job));
    }
  };
}

function requireJob(jobs: Map<string, DurableJob>, id: string) {
  const job = jobs.get(id);
  if (!job) throw new Error('Job was not found.');
  if (job.status !== 'RUNNING') throw new Error('Only a running job can be completed or failed.');
  return job;
}
