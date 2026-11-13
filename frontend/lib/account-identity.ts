/**
 * Browser-safe helpers for the identity shown for a signed-in account.
 *
 * Keyvo phone sign-up (NEXT_PUBLIC_PHONE_LOGIN_ENABLED) creates Supabase users without an email:
 * `auth.users.email` is NULL and GoTrue returns `email: ""`, while `phone` holds the E.164 digits
 * without `+` (e.g. `8613812345678`). Identity is always the user id; these helpers only decide
 * what to display. Never treat a missing email as "signed out".
 */

type AccountIdentityLike = {
  email?: unknown;
  phone?: unknown;
} | null | undefined;

/** Returns a trimmed email, or null for missing/empty values (phone-only users). */
export function normalizeAccountEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Masks a phone number for display: mainland mobiles become `138****5678`. */
export function maskAccountPhone(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  let digits = value.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length === 13 && digits.startsWith('86')) digits = digits.slice(2);
  else if (digits.length === 15 && digits.startsWith('0086')) digits = digits.slice(4);
  if (digits.length >= 7) return `${digits.slice(0, 3)}****${digits.slice(-4)}`;
  return '****';
}

/** Email when the account has one, otherwise the masked phone, otherwise null. */
export function resolveAccountDisplayLabel(user: AccountIdentityLike): string | null {
  if (!user) return null;
  return normalizeAccountEmail(user.email) ?? maskAccountPhone(user.phone);
}
