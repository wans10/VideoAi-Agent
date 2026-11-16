import { isDatabaseConfigured, query, withDbTransaction, type QueryExecutor } from '@/lib/db';
import { ACCOUNT_DELETION_COOLING_OFF_DAYS } from '@/lib/account-deletion-flag';
import { getWalletBalancesByCurrency } from '@/lib/wallet';
import { recordPrivacyEvent } from '@/server/account-privacy';
import { ACCOUNT_PURGE_STEPS } from '@/server/account-purge-plan';

export const ACCOUNT_PURGE_MAX_BATCH = 20;
export const ACCOUNT_PURGE_DEFAULT_BATCH = 5;
const MAX_OBJECTS_PER_USER = 5000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type PurgeSkipReason =
  | 'not_due'
  | 'not_marked'
  | 'invalid_id'
  | 'wallet_balance'
  | 'active_jobs'
  | 'operator_account'
  | 'identity_unavailable';

export type PurgeUserReport = {
  userId: string;
  /** Failure class only (SQLSTATE or error name); never row data. */
  detail?: string;
  outcome: 'purged' | 'dry_run' | 'skipped' | 'failed';
  reason?: PurgeSkipReason | 'error';
  counts: Record<string, number>;
  objects: number;
};

export type PurgeReport = { dryRun: boolean; candidates: number; users: PurgeUserReport[] };

export type PurgeDependencies = {
  now?: () => Date;
  /** Owner-scoped object deletion; must only be given keys owned by the user. */
  deleteObject?: (key: string) => Promise<void>;
  deleteExportObjects?: (userId: string) => Promise<number>;
  ownedKeyForUrl?: (url: string, userId: string) => string | null;
  /** Returns the account email (or null) / throws when Auth is unreachable. */
  getEmail?: (userId: string) => Promise<string | null>;
  /** Resolves true when the Auth user is gone (including "already gone"). */
  deleteAuthUser?: (userId: string) => Promise<boolean>;
};

type Candidate = { id: string; marked_for_deletion_at: Date | string | null };

async function loadDefaults(): Promise<Required<Omit<PurgeDependencies, 'now'>>> {
  const storage = await import('@/server/storage');
  const admin = await import('@/server/supabase-admin');
  return {
    deleteObject: (key) => storage.deleteStorageObjectKey(key),
    deleteExportObjects: (userId) => storage.deleteUserExportObjects(userId),
    ownedKeyForUrl: (url, userId) => storage.ownedMediaStorageKeyForUrl({ url, userId }),
    getEmail: async (userId) => {
      const identity = await admin.getUserIdentity(userId);
      if (!identity) throw new Error('identity unavailable');
      return identity.email;
    },
    deleteAuthUser: async (userId) => {
      const { error } = await admin.getSupabaseAdmin().auth.admin.deleteUser(userId);
      if (!error) return true;
      return (error as { status?: number }).status === 404 || /not.?found/i.test(error.message);
    },
  };
}

function isMissingObject(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return code === '42P01' || code === '42703';
}

async function guardReason(userId: string, executor: QueryExecutor): Promise<PurgeSkipReason | null> {
  const admins = await executor.query<{ n: number }>(`SELECT 1 AS n FROM app_admins WHERE user_id = $1::uuid LIMIT 1`, [userId]).catch((e) => {
    if (isMissingObject(e)) return [];
    throw e;
  });
  if (admins.length) return 'operator_account';
  const jobs = await executor.query<{ n: number }>(
    `SELECT 1 AS n FROM app_jobs WHERE user_id = $1
       AND status IN ('pending','queued','running','processing','in_progress') LIMIT 1`,
    [userId],
  ).catch((e) => {
    if (isMissingObject(e)) return [];
    throw e;
  });
  if (jobs.length) return 'active_jobs';
  return null;
}

/** Media URLs the user owns, as storage keys restricted to that user's prefixes. */
async function collectOwnedObjectKeys(
  userId: string,
  ownedKeyForUrl: (url: string, userId: string) => string | null,
): Promise<string[]> {
  const urlSources: Array<{ sql: string; columns: string[] }> = [
    { sql: `SELECT url, thumb_url, preview_url FROM media_assets WHERE user_id = $1 LIMIT ${MAX_OBJECTS_PER_USER}`, columns: ['url', 'thumb_url', 'preview_url'] },
    { sql: `SELECT url, storage_url, thumb_url, preview_url FROM job_outputs WHERE user_id = $1 LIMIT ${MAX_OBJECTS_PER_USER}`, columns: ['url', 'storage_url', 'thumb_url', 'preview_url'] },
    { sql: `SELECT url, metadata->>'thumbUrl' AS thumb FROM user_assets WHERE user_id = $1 LIMIT ${MAX_OBJECTS_PER_USER}`, columns: ['url', 'thumb'] },
    {
      sql: `SELECT video_url, preview_video_url, thumb_url, audio_url, preview_frame FROM app_jobs
            WHERE user_id = $1 AND COALESCE(featured, FALSE) = FALSE LIMIT ${MAX_OBJECTS_PER_USER}`,
      columns: ['video_url', 'preview_video_url', 'thumb_url', 'audio_url', 'preview_frame'],
    },
  ];
  const keys = new Set<string>();
  for (const source of urlSources) {
    let rows: Array<Record<string, unknown>> = [];
    try {
      rows = await query<Record<string, unknown>>(source.sql, [userId]);
    } catch (error) {
      if (isMissingObject(error)) continue;
      throw error;
    }
    for (const row of rows) {
      for (const column of source.columns) {
        const value = row[column];
        if (typeof value !== 'string' || !value) continue;
        const key = ownedKeyForUrl(value, userId);
        if (key) keys.add(key);
      }
    }
  }
  return [...keys];
}

async function runSteps(executor: QueryExecutor, userId: string, email: string | null, dryRun: boolean): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const step of ACCOUNT_PURGE_STEPS) {
    if (step.needsEmail && !email) continue;
    const params = step.needsEmail ? [userId, email] : [userId];
    await executor.query('SAVEPOINT purge_step');
    try {
      let affected = 0;
      if (dryRun) {
        const rows = await executor.query<{ n: string }>(
          `WITH affected AS (${step.sql} RETURNING 1) SELECT count(*)::text AS n FROM affected`,
          params,
        );
        affected = Number(rows[0]?.n ?? 0);
        await executor.query('ROLLBACK TO SAVEPOINT purge_step');
      } else {
        const rows = await executor.query<{ n: string }>(
          `WITH affected AS (${step.sql} RETURNING 1) SELECT count(*)::text AS n FROM affected`,
          params,
        );
        affected = Number(rows[0]?.n ?? 0);
      }
      await executor.query('RELEASE SAVEPOINT purge_step');
      counts[`${step.table}:${step.kind}`] = (counts[`${step.table}:${step.kind}`] ?? 0) + affected;
    } catch (error) {
      await executor.query('ROLLBACK TO SAVEPOINT purge_step');
      await executor.query('RELEASE SAVEPOINT purge_step');
      if (!isMissingObject(error)) throw error;
      counts[`${step.table}:skipped`] = 1;
    }
  }
  return counts;
}

export async function runAccountPurge(
  options: { dryRun: boolean; limit?: number },
  dependencies: PurgeDependencies = {},
): Promise<PurgeReport> {
  if (!isDatabaseConfigured()) throw new Error('database unavailable');
  const now = (dependencies.now ?? (() => new Date()))();
  const limit = Math.min(Math.max(Math.trunc(options.limit ?? ACCOUNT_PURGE_DEFAULT_BATCH), 1), ACCOUNT_PURGE_MAX_BATCH);
  const deps = { ...(await loadDefaults()), ...dependencies };
  const cutoff = new Date(now.getTime() - ACCOUNT_DELETION_COOLING_OFF_DAYS * 24 * 60 * 60 * 1000);

  const candidates = await query<Candidate>(
    `SELECT id::text AS id, marked_for_deletion_at FROM profiles
     WHERE marked_for_deletion_at IS NOT NULL AND marked_for_deletion_at <= $1
     ORDER BY marked_for_deletion_at ASC LIMIT $2`,
    [cutoff.toISOString(), limit],
  );

  const users: PurgeUserReport[] = [];
  for (const candidate of candidates) {
    users.push(await purgeOne(candidate, { dryRun: options.dryRun, now, cutoff }, deps));
  }
  return { dryRun: options.dryRun, candidates: candidates.length, users };
}

async function purgeOne(
  candidate: Candidate,
  context: { dryRun: boolean; now: Date; cutoff: Date },
  deps: Required<Omit<PurgeDependencies, 'now'>>,
): Promise<PurgeUserReport> {
  const userId = candidate.id;
  const skip = (reason: PurgeSkipReason): PurgeUserReport => ({ userId, outcome: 'skipped', reason, counts: {}, objects: 0 });

  // Hard safety limits, re-checked even though the candidate query filters on them.
  if (!UUID_RE.test(userId)) return skip('invalid_id');
  if (!candidate.marked_for_deletion_at) return skip('not_marked');
  if (new Date(candidate.marked_for_deletion_at).getTime() > context.cutoff.getTime()) return skip('not_due');

  try {
    const balances = await getWalletBalancesByCurrency(userId, { throwOnError: true });
    if (balances.some((entry) => entry.balanceCents > 0)) return skip('wallet_balance');
    const reason = await guardReason(userId, { query: (text, params) => query(text, params) });
    if (reason) return skip(reason);

    let email: string | null;
    try {
      email = await deps.getEmail(userId);
    } catch {
      return skip('identity_unavailable');
    }

    const keys = await collectOwnedObjectKeys(userId, deps.ownedKeyForUrl);
    if (context.dryRun) {
      const counts = await withDbTransaction((executor) => runSteps(executor, userId, email, true));
      return { userId, outcome: 'dry_run', counts, objects: keys.length };
    }

    // 1. Stored objects first (idempotent); failure leaves the account for the next run.
    for (let i = 0; i < keys.length; i += 8) {
      const results = await Promise.allSettled(keys.slice(i, i + 8).map((key) => deps.deleteObject(key)));
      if (results.some((result) => result.status === 'rejected')) throw new Error('object deletion incomplete');
    }
    await deps.deleteExportObjects(userId);

    // 2. Database erasure in one transaction.
    const counts = await withDbTransaction((executor) => runSteps(executor, userId, email, false));

    // 3. Auth user (frees phone/email), then the profile tombstone.
    if (!(await deps.deleteAuthUser(userId))) throw new Error('auth user deletion failed');
    await query(`DELETE FROM profiles WHERE id = $1::uuid AND marked_for_deletion_at IS NOT NULL`, [userId]);
    await recordPrivacyEvent(userId, 'purged', { objects: keys.length });
    return { userId, outcome: 'purged', counts, objects: keys.length };
  } catch (error) {
    console.error('[account-purge] failed', { userId, message: error instanceof Error ? error.message : 'error' });
    const detail = (error as { code?: string; table?: string; constraint?: string } | null);
    const safe = [detail?.code, detail?.table, detail?.constraint].filter(Boolean).join(':') || (error instanceof Error ? error.message.slice(0, 80) : 'error');
    await recordPrivacyEvent(userId, 'purge_failed', { detail: safe });
    return { userId, outcome: 'failed', reason: 'error', detail: safe, counts: {}, objects: 0 };
  }
}
