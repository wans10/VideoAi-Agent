import { BytePlusModelArkError } from './byteplus-modelark-error';
import { BYTEPLUS_MODELARK_PROVIDER, PUBLIC_SEEDANCE_ENGINE_ID } from './byteplus-modelark-constants';

/**
 * Documented Volcengine Ark account limits that are narrower than the general Seedance limits.
 *
 * Source: https://ark.volcengine.com/region:cn-beijing/docs/model-list.md (checked 2026-11-11).
 * doubao-seedance-2-0-260128 at 4K: RPM 15 and concurrency 1 for both enterprise and personal
 * accounts (other resolutions and models: enterprise RPM 600 / concurrency 10, personal 180 / 3).
 * Ark rejects the excess task with HTTP 429; this guard refuses it locally first so the customer
 * is refunded immediately instead of waiting on a provider rejection.
 */
export const SEEDANCE_2_4K_DOCUMENTED_LIMITS = { rpm: 15, concurrency: 1 } as const;
export const BYTEPLUS_4K_CONCURRENCY_LIMIT_CODE = 'BYTEPLUS_4K_CONCURRENCY_LIMIT';

type QueryFn = (sql: string, params?: unknown[]) => Promise<unknown>;

export function isSeedance2FourKSubmission(engineId: string, resolution: string | null | undefined): boolean {
  return engineId.trim() === PUBLIC_SEEDANCE_ENGINE_ID && (resolution ?? '').trim().toLowerCase() === '4k';
}

/** Account-wide 4K concurrency for Seedance 2.0 (the limit is per Ark account, not per user). */
export function resolveSeedance2FourKConcurrency(raw = process.env.SEEDANCE_2_4K_MAX_CONCURRENCY): number {
  const parsed = Number.parseInt(String(raw ?? '').trim(), 10);
  return Number.isSafeInteger(parsed) && parsed >= 1 ? parsed : SEEDANCE_2_4K_DOCUMENTED_LIMITS.concurrency;
}

/**
 * Throws a definite (HTTP 429) rejection when the account already has the documented number of
 * Seedance 2.0 4K tasks in flight. Best effort: two simultaneous submissions can still race, in
 * which case Ark's own 429 is mapped by the normal error path.
 */
export async function assertSeedance2FourKCapacity(params: {
  engineId: string;
  resolution: string | null | undefined;
  jobId: string;
  queryFn: QueryFn;
  maxConcurrency?: number;
}): Promise<void> {
  if (!isSeedance2FourKSubmission(params.engineId, params.resolution)) return;
  const limit = params.maxConcurrency ?? resolveSeedance2FourKConcurrency();
  const rows = await params.queryFn(
    `SELECT COUNT(*)::int AS active
       FROM app_jobs
      WHERE engine_id = $1
        AND provider = $2
        AND provider_job_id IS NOT NULL
        AND status IN ('queued', 'running')
        AND job_id <> $3
        AND lower(settings_snapshot #>> '{core,resolution}') = '4k'`,
    [PUBLIC_SEEDANCE_ENGINE_ID, BYTEPLUS_MODELARK_PROVIDER, params.jobId]
  );
  const active = Array.isArray(rows) ? Number((rows[0] as { active?: unknown } | undefined)?.active ?? 0) : 0;
  if (Number.isFinite(active) && active >= limit) {
    throw new BytePlusModelArkError(
      'Seedance 2.0 4K is busy: only one 4K render can run at a time. Try again in a few minutes or choose 1080p.',
      { status: 429, code: BYTEPLUS_4K_CONCURRENCY_LIMIT_CODE }
    );
  }
}
