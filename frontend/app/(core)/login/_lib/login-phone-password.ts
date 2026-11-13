/**
 * Phone + password helpers (Keyvo, NEXT_PUBLIC_PHONE_LOGIN_ENABLED).
 *
 * Pure rules only: Supabase error mapping for phone password sign-in and password setup, and the
 * sessionStorage record that keeps the "set a password" step after a reload. The browser flow lives in
 * ../_hooks/useLoginPhonePasswordSignIn.ts, ../_hooks/useLoginPhonePasswordSetup.ts and
 * ../_hooks/useLoginPhoneAuth.ts; the forms are in ../_components/LoginPhone*.tsx.
 */
import { describeAuthError, isValidMainlandMobile } from './login-phone';

export const PHONE_PASSWORD_SETUP_STORAGE_KEY = 'keyvo-login-phone-password-setup';
/** A verified session that never finished setting a password is dropped after this long. */
export const PHONE_PASSWORD_SETUP_MAX_AGE_MS = 60 * 60 * 1000;

export type PhonePasswordSetupState = { phone: string; newAccount: boolean; verifiedAt: number };

export type PhoneSignInErrorKind = 'invalidCredentials' | 'rateLimited' | 'unavailable';
export type PhoneSetPasswordErrorKind = 'weak' | 'same' | 'sessionExpired' | 'rateLimited' | 'unavailable';

/** Wrong number or wrong password both come back as invalid_credentials; the page does not say which. */
export function classifyPhonePasswordSignInError(error: unknown): PhoneSignInErrorKind {
  const { status, code, message } = describeAuthError(error);
  if (status === 429 || code === 'over_request_rate_limit') return 'rateLimited';
  if (code === 'invalid_credentials' || message.includes('invalid login credentials')) return 'invalidCredentials';
  return 'unavailable';
}

/** updateUser({ password }) errors. Provider details never reach the page. */
export function classifyPhoneSetPasswordError(error: unknown): PhoneSetPasswordErrorKind {
  const { status, code, message } = describeAuthError(error);
  if (status === 429 || code === 'over_request_rate_limit') return 'rateLimited';
  if (code === 'weak_password') return 'weak';
  if (code === 'same_password' || message.includes('different from the old password')) return 'same';
  if (
    status === 401 ||
    code === 'session_not_found' ||
    code === 'session_expired' ||
    code === 'no_authorization' ||
    code === 'reauthentication_needed'
  ) {
    return 'sessionExpired';
  }
  return 'unavailable';
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function readPhonePasswordSetupState(storage: StorageLike | null | undefined, now: number): PhonePasswordSetupState | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(PHONE_PASSWORD_SETUP_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PhonePasswordSetupState>;
    if (
      typeof parsed?.phone !== 'string' ||
      !isValidMainlandMobile(parsed.phone) ||
      typeof parsed.newAccount !== 'boolean' ||
      typeof parsed.verifiedAt !== 'number' ||
      !Number.isFinite(parsed.verifiedAt) ||
      now - parsed.verifiedAt > PHONE_PASSWORD_SETUP_MAX_AGE_MS
    ) {
      storage.removeItem(PHONE_PASSWORD_SETUP_STORAGE_KEY);
      return null;
    }
    return { phone: parsed.phone, newAccount: parsed.newAccount, verifiedAt: parsed.verifiedAt };
  } catch {
    try {
      storage.removeItem(PHONE_PASSWORD_SETUP_STORAGE_KEY);
    } catch {
      // ignore
    }
    return null;
  }
}

export function writePhonePasswordSetupState(storage: StorageLike | null | undefined, state: PhonePasswordSetupState): void {
  try {
    storage?.setItem(PHONE_PASSWORD_SETUP_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private mode or quota: the in-memory step still applies for this page view.
  }
}

export function clearPhonePasswordSetupState(storage: StorageLike | null | undefined): void {
  try {
    storage?.removeItem(PHONE_PASSWORD_SETUP_STORAGE_KEY);
  } catch {
    // ignore
  }
}
