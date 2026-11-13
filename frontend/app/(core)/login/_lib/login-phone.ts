/**
 * Phone number + SMS one-time code sign-in (Keyvo, mainland China only).
 *
 * Pure helpers: build-time flag, number validation, resend cooldown storage and
 * mapping of Supabase (GoTrue) errors to localized feedback keys. The browser
 * flow lives in ../_hooks/useLoginPhoneAuth.ts and the form in
 * ../_components/LoginPhoneAuthPanel.tsx.
 */

export const PHONE_COUNTRY_CODE = '+86';
export const PHONE_OTP_LENGTH = 6;
export const PHONE_RESEND_COOLDOWN_SECONDS = 60;
/** Client-side guidance only; GoTrue's verify rate limit is the server-side bound. */
export const PHONE_MAX_VERIFY_ATTEMPTS = 5;
/** A phone account created this recently is treated as a new sign-up (consents are recorded). */
export const PHONE_NEW_ACCOUNT_WINDOW_MS = 30 * 60 * 1000;
export const PHONE_COOLDOWN_STORAGE_KEY = 'keyvo-login-phone-otp';

const MAINLAND_MOBILE = /^1[3-9]\d{9}$/;
const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);

/**
 * NEXT_PUBLIC_PHONE_LOGIN_ENABLED is compiled into the browser bundle at build time
 * (Dockerfile ARG / GitHub variable). Default off until the GoTrue SMS hook is live.
 */
export function isPhoneLoginEnabled(raw: string | undefined = process.env.NEXT_PUBLIC_PHONE_LOGIN_ENABLED): boolean {
  return TRUE_VALUES.has((raw ?? '').trim().toLowerCase());
}

/** Strips spaces, dashes, brackets and an optional +86 / 0086 / 86 prefix. */
export function normalizeMainlandMobile(input: string): string {
  const compact = input.replace(/[\s\-()（）]/g, '');
  const withoutPrefix = compact.replace(/^(?:\+86|0086|86(?=1\d{10}$))/, '');
  return withoutPrefix;
}

export function isValidMainlandMobile(input: string): boolean {
  return MAINLAND_MOBILE.test(normalizeMainlandMobile(input));
}

export function toMainlandE164(input: string): string {
  return `${PHONE_COUNTRY_CODE}${normalizeMainlandMobile(input)}`;
}

/** 138****5678 for status messages; never show more than needed. */
export function maskMainlandMobile(input: string): string {
  const digits = normalizeMainlandMobile(input);
  if (!MAINLAND_MOBILE.test(digits)) return '***';
  return `${digits.slice(0, 3)}****${digits.slice(7)}`;
}

export function sanitizeOtpInput(input: string): string {
  return input.replace(/\D/g, '').slice(0, PHONE_OTP_LENGTH);
}

export function isCompleteOtp(input: string): boolean {
  return new RegExp(`^\\d{${PHONE_OTP_LENGTH}}$`).test(input);
}

export type PhoneOtpPersistedState = { phone: string; sentAt: number; cooldownUntil: number };

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** Reads the last send (number + cooldown) so a reload keeps the countdown and the code step. */
export function readPhoneOtpState(storage: StorageLike | null | undefined, now: number): PhoneOtpPersistedState | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(PHONE_COOLDOWN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PhoneOtpPersistedState>;
    if (
      typeof parsed?.phone !== 'string' ||
      !isValidMainlandMobile(parsed.phone) ||
      typeof parsed.sentAt !== 'number' ||
      typeof parsed.cooldownUntil !== 'number' ||
      !Number.isFinite(parsed.sentAt) ||
      !Number.isFinite(parsed.cooldownUntil)
    ) {
      storage.removeItem(PHONE_COOLDOWN_STORAGE_KEY);
      return null;
    }
    // A code expires after 5 minutes (GOTRUE_SMS_OTP_EXP=300); older state is useless.
    if (now - parsed.sentAt > 10 * 60 * 1000 || parsed.cooldownUntil - now > PHONE_RESEND_COOLDOWN_SECONDS * 1000) {
      storage.removeItem(PHONE_COOLDOWN_STORAGE_KEY);
      return null;
    }
    return { phone: normalizeMainlandMobile(parsed.phone), sentAt: parsed.sentAt, cooldownUntil: parsed.cooldownUntil };
  } catch {
    return null;
  }
}

export function writePhoneOtpState(storage: StorageLike | null | undefined, state: PhoneOtpPersistedState): void {
  try {
    storage?.setItem(PHONE_COOLDOWN_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private mode or quota: the in-memory countdown still applies.
  }
}

export function clearPhoneOtpState(storage: StorageLike | null | undefined): void {
  try {
    storage?.removeItem(PHONE_COOLDOWN_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function remainingCooldownSeconds(cooldownUntil: number | null, now: number): number {
  if (!cooldownUntil) return 0;
  return Math.min(PHONE_RESEND_COOLDOWN_SECONDS, Math.max(0, Math.ceil((cooldownUntil - now) / 1000)));
}

export type PhoneSendErrorKind =
  | 'rateLimited'
  | 'signupDisabled'
  | 'phoneDisabled'
  | 'invalidPhone'
  | 'providerUnavailable';

export type PhoneVerifyErrorKind = 'codeInvalid' | 'rateLimited' | 'signupDisabled' | 'unavailable';

type AuthErrorLike = { status?: number; code?: string; message?: string } | null | undefined;

/** Reads status/code/message from a Supabase AuthError-like value without trusting its shape. */
export function describeAuthError(error: unknown): { status: number; code: string; message: string } {
  const value = (error && typeof error === 'object' ? error : {}) as NonNullable<AuthErrorLike>;
  return {
    status: typeof value.status === 'number' ? value.status : 0,
    code: typeof value.code === 'string' ? value.code : '',
    message: typeof value.message === 'string' ? value.message.toLowerCase() : '',
  };
}

/** Maps signInWithOtp errors. Provider details never reach the page. */
export function classifyPhoneSendError(error: unknown): PhoneSendErrorKind {
  const { status, code, message } = describeAuthError(error);
  if (status === 429 || code === 'over_sms_send_rate_limit' || code === 'over_request_rate_limit') return 'rateLimited';
  if (code === 'signup_disabled' || code === 'otp_disabled' || message.includes('signups not allowed')) return 'signupDisabled';
  if (code === 'phone_provider_disabled' || code === 'sms_provider_disabled' || message.includes('unsupported phone provider')) {
    return 'phoneDisabled';
  }
  if (code === 'validation_failed' || message.includes('invalid phone')) return 'invalidPhone';
  return 'providerUnavailable';
}

/** Maps verifyOtp errors (GoTrue answers 403 otp_expired for both wrong and expired codes). */
export function classifyPhoneVerifyError(error: unknown): PhoneVerifyErrorKind {
  const { status, code, message } = describeAuthError(error);
  if (status === 429 || code === 'over_request_rate_limit') return 'rateLimited';
  if (code === 'signup_disabled' || code === 'otp_disabled') return 'signupDisabled';
  if (
    code === 'otp_expired' ||
    code === 'invalid_credentials' ||
    status === 401 ||
    status === 403 ||
    (status === 400 && message.includes('token'))
  ) {
    return 'codeInvalid';
  }
  return 'unavailable';
}

/**
 * True when the verified user was created by this OTP flow, so the sign-up consents captured on the
 * form must be recorded. GoTrue creates the user when the code is sent (shouldCreateUser), so a new
 * account's created_at is within the last 30 minutes. Recording consent again for an account created
 * minutes earlier is harmless; missing it for a new account is not.
 */
export function isNewPhoneAccount(user: { created_at?: string | null } | null | undefined, now: number): boolean {
  const created = user?.created_at ? Date.parse(user.created_at) : Number.NaN;
  return Number.isFinite(created) && created <= now + 60_000 && now - created <= PHONE_NEW_ACCOUNT_WINDOW_MS;
}
