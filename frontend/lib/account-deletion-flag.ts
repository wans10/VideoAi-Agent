/**
 * Account deletion cooling-off (PIPL). The authoritative record is
 * `profiles.marked_for_deletion_at`; the same instant is mirrored into the
 * Supabase user's `app_metadata` so every request that already validates the
 * session with Auth can fail closed without a database round trip.
 */
export const ACCOUNT_DELETION_COOLING_OFF_DAYS = 15;
export const ACCOUNT_DELETION_METADATA_KEY = 'keyvo_deletion_scheduled_at';
export const ACCOUNT_DELETION_CONFIRMATION_WORD = '注销';
export const ACCOUNT_DELETION_PAGE_PATH = '/account/deletion';

const DAY_MS = 24 * 60 * 60 * 1000;

export function readDeletionScheduledAt(user: { app_metadata?: unknown } | null | undefined): string | null {
  const meta = user?.app_metadata;
  if (!meta || typeof meta !== 'object') return null;
  const value = (meta as Record<string, unknown>)[ACCOUNT_DELETION_METADATA_KEY];
  if (typeof value !== 'string' || !value) return null;
  return Number.isNaN(Date.parse(value)) ? null : value;
}

export function purgeDateFor(markedAt: Date | string): Date {
  return new Date(new Date(markedAt).getTime() + ACCOUNT_DELETION_COOLING_OFF_DAYS * DAY_MS);
}

export function isPurgeDue(markedAt: Date | string | null | undefined, now: Date = new Date()): boolean {
  if (!markedAt) return false;
  const ms = new Date(markedAt).getTime();
  if (Number.isNaN(ms)) return false;
  return now.getTime() - ms >= ACCOUNT_DELETION_COOLING_OFF_DAYS * DAY_MS;
}

export function isAccountDeletionPagePath(pathname: string): boolean {
  return pathname === ACCOUNT_DELETION_PAGE_PATH || pathname.startsWith(`${ACCOUNT_DELETION_PAGE_PATH}/`);
}
