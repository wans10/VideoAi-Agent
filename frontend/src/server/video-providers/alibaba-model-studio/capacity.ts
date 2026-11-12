import { AlibabaModelStudioError } from './errors';
import {
  BAILIAN_KLING_OMNI_MODEL,
  BAILIAN_KLING_TURBO_MODEL,
  BAILIAN_KLING_V3_MODEL,
  BAILIAN_MINIMAX_H3_MODEL,
} from './bailian-models';
import { ALIBABA_MODEL_STUDIO_PROVIDER } from './model-map';

/**
 * Documented Beijing (cn-beijing) Model Studio limits, checked 2026-11-11:
 * https://docs.bailian.console.aliyun.com/zh/model-studio/rate-limit
 * - wan3.0-video / wan3.0-video-prime / happyhorse-1.1-{t2v,i2v,r2v}: 5 RPS and 5 tasks in progress per model.
 * - qwen-image-3.0-pro: 5 task submissions per minute; qwen-image-3.0: 20 per minute (sync calls, no concurrency cap).
 * - Bailian-hosted kling/kling-v3-turbo-video-generation, kling/kling-v3-video-generation,
 *   kling/kling-v3-omni-video-generation and MiniMax/MiniMax-H3: 300 RPM each (model pages, 限流); no concurrency
 *   cap is documented. An exhausted window is a definite pre-acceptance rejection, so the vendor's direct route
 *   may take the request (bailian-routing.ts).
 * Limits are counted per Alibaba main account. Exceeding them returns HTTP 429 (Throttling.*).
 *
 * The guard below keeps Keyvo under those limits before a paid request reaches Alibaba. Rate windows and
 * in-flight counters are per process; the in-progress video count comes from the database so it holds
 * across restarts. A multi-instance deployment still relies on Alibaba's 429 as the final backstop.
 */
export const ALIBABA_CAPACITY_BUSY_MESSAGE = 'This model is at capacity right now. Please try again in about a minute.';
export const ALIBABA_CAPACITY_BUSY_CODE = 'ALIBABA_MODEL_STUDIO_CAPACITY_EXCEEDED';

type RateWindow = { limit: number; windowMs: number };

export const ALIBABA_SUBMIT_RATE_LIMITS: Readonly<Record<string, RateWindow>> = {
  'wan3.0-video': { limit: 5, windowMs: 1_000 },
  'wan3.0-video-prime': { limit: 5, windowMs: 1_000 },
  'happyhorse-1.1-t2v': { limit: 5, windowMs: 1_000 },
  'happyhorse-1.1-i2v': { limit: 5, windowMs: 1_000 },
  'happyhorse-1.1-r2v': { limit: 5, windowMs: 1_000 },
  'qwen-image-3.0': { limit: 20, windowMs: 60_000 },
  'qwen-image-3.0-pro': { limit: 5, windowMs: 60_000 },
  [BAILIAN_KLING_TURBO_MODEL]: { limit: 300, windowMs: 60_000 },
  [BAILIAN_KLING_V3_MODEL]: { limit: 300, windowMs: 60_000 },
  [BAILIAN_KLING_OMNI_MODEL]: { limit: 300, windowMs: 60_000 },
  [BAILIAN_MINIMAX_H3_MODEL]: { limit: 300, windowMs: 60_000 },
};

export const ALIBABA_VIDEO_CONCURRENCY_LIMITS: Readonly<Record<string, number>> = {
  'wan3.0-video': 5,
  'wan3.0-video-prime': 5,
  'happyhorse-1.1-t2v': 5,
  'happyhorse-1.1-i2v': 5,
  'happyhorse-1.1-r2v': 5,
};

/** Provider-side states that still occupy an Alibaba task slot (output-copy retries do not). */
const IN_PROGRESS_JOB_STATUSES = ['pending', 'queued', 'running', 'in_progress'];

type QueryFn = <T = unknown>(sql: string, params?: unknown[]) => Promise<T[]>;

const submissions = new Map<string, number[]>();
const inFlight = new Map<string, number>();
const locks = new Map<string, Promise<void>>();

export function createAlibabaCapacityError(): AlibabaModelStudioError {
  return new AlibabaModelStudioError(ALIBABA_CAPACITY_BUSY_MESSAGE, {
    status: 429,
    code: ALIBABA_CAPACITY_BUSY_CODE,
    errorClass: 'rate_limit',
    body: { code: ALIBABA_CAPACITY_BUSY_CODE, message: ALIBABA_CAPACITY_BUSY_MESSAGE },
  });
}

function prune(model: string, now: number): number[] {
  const window = ALIBABA_SUBMIT_RATE_LIMITS[model];
  const recent = (submissions.get(model) ?? []).filter((at) => window && now - at < window.windowMs);
  submissions.set(model, recent);
  return recent;
}

/** Records one submission when the model's window has room; otherwise returns how long to wait. */
export function tryTakeAlibabaRateSlot(model: string, now = Date.now()): { ok: true } | { ok: false; retryAfterMs: number } {
  const window = ALIBABA_SUBMIT_RATE_LIMITS[model];
  if (!window) return { ok: true };
  const recent = prune(model, now);
  if (recent.length >= window.limit) {
    return { ok: false, retryAfterMs: Math.max(1, window.windowMs - (now - recent[0]!)) };
  }
  recent.push(now);
  return { ok: true };
}

/** Waits briefly for a per-second slot; a per-minute limit that is exhausted fails at once with a busy error. */
export async function acquireAlibabaRateSlot(model: string, options: {
  maxWaitMs?: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
} = {}): Promise<void> {
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const now = options.now ?? Date.now;
  const deadline = now() + (options.maxWaitMs ?? 2_000);
  for (;;) {
    const slot = tryTakeAlibabaRateSlot(model, now());
    if (slot.ok) return;
    if (now() + slot.retryAfterMs > deadline) throw createAlibabaCapacityError();
    await sleep(slot.retryAfterMs);
  }
}

async function withModelLock<T>(model: string, run: () => Promise<T>): Promise<T> {
  const previous = locks.get(model) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => { release = resolve; });
  const chained = previous.then(() => current);
  locks.set(model, chained);
  await previous;
  try {
    return await run();
  } finally {
    release();
    if (locks.get(model) === chained) locks.delete(model);
  }
}

export async function countActiveAlibabaVideoTasks(model: string, queryFn: QueryFn): Promise<number> {
  const rows = await queryFn<{ active: number | string | null }>(
    `SELECT COUNT(*)::int AS active
       FROM provider_attempts pa
       JOIN app_jobs aj ON aj.id = pa.job_id
      WHERE pa.provider = $1
        AND pa.provider_model = $2
        AND pa.provider_job_id IS NOT NULL
        AND aj.provider = $1
        AND aj.status = ANY($3::text[])
        AND pa.created_at > NOW() - INTERVAL '24 hours'`,
    [ALIBABA_MODEL_STUDIO_PROVIDER, model, IN_PROGRESS_JOB_STATUSES]
  );
  const active = Number(rows[0]?.active ?? 0);
  return Number.isFinite(active) && active > 0 ? active : 0;
}

export type AlibabaCapacitySlot = { release(): void };

/**
 * Reserves one task slot for a video model before the paid submission. The caller releases the slot once
 * the accepted task ID is persisted (or the submission failed), so concurrent requests in this process
 * never exceed the documented concurrency. Throws a rate_limit AlibabaModelStudioError when full.
 */
export async function reserveAlibabaVideoCapacity(params: {
  model: string;
  queryFn: QueryFn;
  rate?: Parameters<typeof acquireAlibabaRateSlot>[1];
}): Promise<AlibabaCapacitySlot> {
  const limit = ALIBABA_VIDEO_CONCURRENCY_LIMITS[params.model];
  return withModelLock(params.model, async () => {
    if (limit !== undefined) {
      const active = await countActiveAlibabaVideoTasks(params.model, params.queryFn);
      if (active + (inFlight.get(params.model) ?? 0) >= limit) throw createAlibabaCapacityError();
    }
    await acquireAlibabaRateSlot(params.model, params.rate);
    inFlight.set(params.model, (inFlight.get(params.model) ?? 0) + 1);
    let released = false;
    return {
      release() {
        if (released) return;
        released = true;
        const remaining = (inFlight.get(params.model) ?? 1) - 1;
        if (remaining > 0) inFlight.set(params.model, remaining);
        else inFlight.delete(params.model);
      },
    };
  });
}

/** Test hook: forget all per-process windows and counters. */
export function resetAlibabaCapacityStateForTests(): void {
  submissions.clear();
  inFlight.clear();
  locks.clear();
}
