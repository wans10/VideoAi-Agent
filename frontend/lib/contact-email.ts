/**
 * Contact email collected at Keyvo phone sign-up (NEXT_PUBLIC_PHONE_LOGIN_ENABLED).
 *
 * The address is for product notices and marketing mail only. It is NOT verified and it is never the
 * Supabase/GoTrue login email. Browser-safe pure rules shared by the sign-up form and the route.
 */

export const CONTACT_EMAIL_MAX_LENGTH = 254;

const LOCAL_PART = /^[a-z0-9._%+-]{1,64}$/;
const DOMAIN_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const TOP_LEVEL_DOMAIN = /^[a-z]{2,63}$/;

/** Trims and lower-cases the address. Returns null when the value is not an obviously valid email. */
export function normalizeContactEmail(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const value = input.trim().toLowerCase();
  if (!value || value.length > CONTACT_EMAIL_MAX_LENGTH) return null;
  const at = value.lastIndexOf('@');
  if (at <= 0 || at === value.length - 1) return null;
  const local = value.slice(0, at);
  const domain = value.slice(at + 1);
  if (!LOCAL_PART.test(local) || local.startsWith('.') || local.endsWith('.') || local.includes('..')) return null;
  const labels = domain.split('.');
  if (labels.length < 2 || !labels.every((label) => DOMAIN_LABEL.test(label))) return null;
  if (!TOP_LEVEL_DOMAIN.test(labels[labels.length - 1])) return null;
  return value;
}

export function isValidContactEmail(input: unknown): boolean {
  return normalizeContactEmail(input) !== null;
}
