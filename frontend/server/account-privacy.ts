import { createClient } from '@supabase/supabase-js';
import { isDatabaseConfigured, query } from '@/lib/db';
import { getWalletBalancesByCurrency } from '@/lib/wallet';
import { getSupabaseAdmin, type UserIdentity } from '@/server/supabase-admin';
import {
  ACCOUNT_DELETION_METADATA_KEY,
  purgeDateFor,
} from '@/lib/account-deletion-flag';

export type PrivacyEventName =
  | 'deletion_requested'
  | 'deletion_cancelled'
  | 'export_generated'
  | 'purged'
  | 'purge_failed';

const EXPORT_MIN_INTERVAL_MS = 10 * 60 * 1000;
const memoryExportTimes = new Map<string, number>();

function isMissingRelation(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === '42P01';
}

/** Best effort: the audit table ships in migration 98 and may not exist yet. */
export async function recordPrivacyEvent(
  userId: string,
  event: PrivacyEventName,
  detail: Record<string, unknown> | null = null,
): Promise<boolean> {
  try {
    await query(
      `INSERT INTO account_privacy_events (user_id, event, detail) VALUES ($1, $2, $3::jsonb)`,
      [userId, event, detail ? JSON.stringify(detail) : null],
    );
    return true;
  } catch (error) {
    if (!isMissingRelation(error)) console.warn('[account-privacy] event not recorded', event, error);
    return false;
  }
}

/** Returns the seconds to wait when the user exported less than 10 minutes ago, else 0. */
export async function exportRetryAfterSeconds(userId: string, now = Date.now()): Promise<number> {
  let lastMs = memoryExportTimes.get(userId) ?? 0;
  try {
    const rows = await query<{ created_at: Date | string }>(
      `SELECT created_at FROM account_privacy_events
       WHERE user_id = $1 AND event = 'export_generated'
       ORDER BY created_at DESC LIMIT 1`,
      [userId],
    );
    if (rows[0]) lastMs = Math.max(lastMs, new Date(rows[0].created_at).getTime());
  } catch (error) {
    if (!isMissingRelation(error)) console.warn('[account-privacy] export rate lookup failed', error);
  }
  const wait = lastMs + EXPORT_MIN_INTERVAL_MS - now;
  return wait > 0 ? Math.ceil(wait / 1000) : 0;
}

export function markExportGenerated(userId: string, now = Date.now()) {
  memoryExportTimes.set(userId, now);
  if (memoryExportTimes.size > 5000) {
    for (const [key, at] of memoryExportTimes) if (now - at > EXPORT_MIN_INTERVAL_MS) memoryExportTimes.delete(key);
  }
}

/** Positive wallet balances per currency (any currency > 0 blocks deletion). */
export async function getPositiveWalletBalances(userId: string) {
  const balances = await getWalletBalancesByCurrency(userId, { throwOnError: true });
  return balances.filter((entry) => entry.balanceCents > 0);
}

function phoneForAuth(phone: string): string {
  return phone.startsWith('+') ? phone : `+${phone}`;
}

/** Verifies the account password with Supabase Auth on a throwaway, non-persistent client. */
export async function verifyAccountPassword(identity: UserIdentity, password: string): Promise<boolean> {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();
  const anon = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();
  if (!url || !anon || !password || (!identity.email && !identity.phone)) return false;
  const client = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const credentials = identity.phone
    ? { phone: phoneForAuth(identity.phone), password }
    : { email: identity.email as string, password };
  const { data, error } = await client.auth.signInWithPassword(credentials);
  if (error || data.user?.id !== identity.id) return false;
  await client.auth.signOut({ scope: 'local' }).catch(() => undefined);
  return true;
}

export async function setAuthDeletionFlag(userId: string, markedAt: string | null): Promise<void> {
  const { error } = await getSupabaseAdmin().auth.admin.updateUserById(userId, {
    app_metadata: { [ACCOUNT_DELETION_METADATA_KEY]: markedAt },
  });
  if (error) throw new Error(`auth metadata update failed: ${error.message}`);
}

export type DeletionRequestResult =
  | { ok: true; markedAt: string; purgeAt: string }
  | { ok: false; status: number; code: 'profile_not_found' | 'auth_unavailable' | 'database_unavailable' };

/**
 * Marks the account (database first, then the Auth mirror that the guard reads).
 * If the Auth mirror cannot be written the database flag is rolled back, so a
 * flagged account is never left usable by accident and the user can retry.
 */
export async function scheduleAccountDeletion(userId: string): Promise<DeletionRequestResult> {
  if (!isDatabaseConfigured()) return { ok: false, status: 503, code: 'database_unavailable' };
  const rows = await query<{ marked_for_deletion_at: Date | string }>(
    `INSERT INTO profiles (id, marked_for_deletion_at, marketing_opt_in, marketing_opt_in_at)
     VALUES ($1::uuid, NOW(), FALSE, NULL)
     ON CONFLICT (id) DO UPDATE
       SET marked_for_deletion_at = COALESCE(profiles.marked_for_deletion_at, NOW()),
           marketing_opt_in = FALSE,
           marketing_opt_in_at = NULL
     RETURNING marked_for_deletion_at`,
    [userId],
  );
  const markedAt = new Date(rows[0].marked_for_deletion_at).toISOString();
  try {
    await setAuthDeletionFlag(userId, markedAt);
  } catch (error) {
    console.error('[account-privacy] auth flag failed; rolling back', error);
    await query(`UPDATE profiles SET marked_for_deletion_at = NULL WHERE id = $1::uuid`, [userId]).catch(() => undefined);
    return { ok: false, status: 503, code: 'auth_unavailable' };
  }
  await recordPrivacyEvent(userId, 'deletion_requested', { purgeAt: purgeDateFor(markedAt).toISOString() });
  return { ok: true, markedAt, purgeAt: purgeDateFor(markedAt).toISOString() };
}

export async function cancelAccountDeletion(userId: string): Promise<{ ok: boolean; wasScheduled: boolean }> {
  await setAuthDeletionFlag(userId, null);
  const rows = await query<{ id: string }>(
    `UPDATE profiles SET marked_for_deletion_at = NULL
     WHERE id = $1::uuid AND marked_for_deletion_at IS NOT NULL RETURNING id`,
    [userId],
  );
  if (rows.length) await recordPrivacyEvent(userId, 'deletion_cancelled');
  return { ok: true, wasScheduled: rows.length > 0 };
}
