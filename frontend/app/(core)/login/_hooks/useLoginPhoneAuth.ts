'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { persistPendingAnalyticsEvent } from '@/lib/analytics-client';
import { resolveBrowserCommercialAnalyticsAuthContext } from '@/lib/analytics/commercial-client';
import { loadSupabaseClient } from '@/lib/supabaseClientLoader';
import type { AuthCopy, Locale } from '../_lib/login-copy';
import { clearPendingGoogleLogin, formatTemplate, sanitizeNextPath } from '../_lib/login-helpers';
import {
  PHONE_MAX_VERIFY_ATTEMPTS,
  PHONE_RESEND_COOLDOWN_SECONDS,
  classifyPhoneSendError,
  classifyPhoneVerifyError,
  clearPhoneOtpState,
  isCompleteOtp,
  isNewPhoneAccount,
  isValidMainlandMobile,
  maskMainlandMobile,
  normalizeMainlandMobile,
  readPhoneOtpState,
  remainingCooldownSeconds,
  sanitizeOtpInput,
  toMainlandE164,
  writePhoneOtpState,
} from '../_lib/login-phone';

export type LoginMethod = 'email' | 'phone';
export type PhoneFieldError = 'phoneRequired' | 'phoneInvalid' | 'codeRequired' | 'termsRequired' | 'ageRequired';

type UseLoginPhoneAuthOptions = {
  enabled: boolean;
  authCopy: AuthCopy;
  locale: Locale;
  nextPath: string;
  nextPathReady: boolean;
  blocked: boolean;
  completeAuthenticatedRedirect: (target: string, userId?: string | null) => void;
  setStatus: (value: string | null) => void;
  setStatusTone: (value: 'info' | 'success') => void;
  setError: (value: string | null) => void;
};

function browserSessionStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

/** Phone + SMS one-time code sign-in / sign-up (signInWithOtp + verifyOtp). */
export function useLoginPhoneAuth({
  enabled,
  authCopy,
  locale,
  nextPath,
  nextPathReady,
  blocked,
  completeAuthenticatedRedirect,
  setStatus,
  setStatusTone,
  setError,
}: UseLoginPhoneAuthOptions) {
  const copy = authCopy.phone;
  // The hook only runs with the flag on, where phone is the default (and only) sign-up path;
  // 'email' is the sign-in form kept for accounts created with an email before.
  const [method, setMethodState] = useState<LoginMethod>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [attemptsLeft, setAttemptsLeft] = useState(PHONE_MAX_VERIFY_ATTEMPTS);
  const [fieldError, setFieldError] = useState<PhoneFieldError | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const pendingRef = useRef(false);
  const phoneRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  const termsRef = useRef<HTMLInputElement>(null);
  const ageRef = useRef<HTMLInputElement>(null);

  // Restore an in-flight code (number + cooldown) after a reload. Read in an effect so the first
  // render matches the server markup.
  useEffect(() => {
    if (!enabled) return;
    const restored = readPhoneOtpState(browserSessionStorage(), Date.now());
    if (!restored) return;
    setMethodState('phone');
    setPhone(restored.phone);
    setCodeSentTo(restored.phone);
    setNow(Date.now());
    setCooldownUntil(restored.cooldownUntil);
  }, [enabled]);

  const cooldownSeconds = remainingCooldownSeconds(cooldownUntil, now);
  useEffect(() => {
    if (!cooldownUntil) return;
    setNow(Date.now());
    const timer = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= cooldownUntil) window.clearInterval(timer);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldownUntil]);

  const setMethod = useCallback((next: LoginMethod) => {
    if (pendingRef.current || blocked) return;
    setMethodState(next);
    setFieldError(null);
    setError(null);
    setStatus(null);
  }, [blocked, setError, setStatus]);

  const focusField = (field: PhoneFieldError) => {
    const ref = field === 'codeRequired' ? codeRef : field === 'termsRequired' ? termsRef : field === 'ageRequired' ? ageRef : phoneRef;
    ref.current?.focus();
  };

  const fail = (field: PhoneFieldError) => {
    setFieldError(field);
    focusField(field);
    return false;
  };

  const validatePhoneAndConsent = () => {
    const normalized = normalizeMainlandMobile(phone);
    if (!normalized) return fail('phoneRequired');
    if (!isValidMainlandMobile(normalized)) return fail('phoneInvalid');
    if (!acceptTerms) return fail('termsRequired');
    if (!ageConfirmed) return fail('ageRequired');
    setFieldError(null);
    return true;
  };

  async function sendCode() {
    if (!enabled || pendingRef.current || blocked || !nextPathReady) return;
    if (remainingCooldownSeconds(cooldownUntil, Date.now()) > 0) return;
    if (!validatePhoneAndConsent()) return;
    const normalized = normalizeMainlandMobile(phone);
    pendingRef.current = true;
    setIsSending(true);
    setError(null);
    setStatusTone('info');
    setStatus(copy.feedback.sending);
    try {
      clearPendingGoogleLogin();
      const supabase = await loadSupabaseClient();
      const { error } = await supabase.auth.signInWithOtp({
        phone: toMainlandE164(normalized),
        options: { shouldCreateUser: true, data: { locale } },
      });
      const startedAt = Date.now();
      if (error) {
        const kind = classifyPhoneSendError(error);
        if (kind === 'rateLimited') {
          // Back off locally as well so repeated clicks do not hit the provider.
          setNow(startedAt);
          setCooldownUntil(startedAt + PHONE_RESEND_COOLDOWN_SECONDS * 1000);
        }
        setStatus(null);
        setError(copy.feedback[kind]);
        return;
      }
      const until = startedAt + PHONE_RESEND_COOLDOWN_SECONDS * 1000;
      writePhoneOtpState(browserSessionStorage(), { phone: normalized, sentAt: startedAt, cooldownUntil: until });
      setPhone(normalized);
      setCodeSentTo(normalized);
      setNow(startedAt);
      setCooldownUntil(until);
      setCode('');
      setAttemptsLeft(PHONE_MAX_VERIFY_ATTEMPTS);
      setStatus(formatTemplate(copy.feedback.sent, { phone: `+86 ${maskMainlandMobile(normalized)}` }));
      window.setTimeout(() => codeRef.current?.focus(), 0);
    } catch {
      setStatus(null);
      setError(copy.feedback.providerUnavailable);
    } finally {
      pendingRef.current = false;
      setIsSending(false);
    }
  }

  async function recordSignupConsents(userId: string) {
    const res = await fetch('/api/legal/consents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ userId, ageConfirmed: true, locale, source: 'signup' }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.ok) throw new Error(authCopy.feedback.consentSaveError);
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enabled || pendingRef.current || blocked || !nextPathReady) return;
    if (!codeSentTo) {
      await sendCode();
      return;
    }
    if (attemptsLeft <= 0) {
      setError(copy.feedback.attemptsExhausted);
      return;
    }
    if (!acceptTerms) return void fail('termsRequired');
    if (!ageConfirmed) return void fail('ageRequired');
    if (!isCompleteOtp(code)) return void fail('codeRequired');
    setFieldError(null);
    pendingRef.current = true;
    setIsVerifying(true);
    setError(null);
    setStatusTone('info');
    setStatus(copy.feedback.verifying);
    try {
      const supabase = await loadSupabaseClient();
      const { data, error } = await supabase.auth.verifyOtp({ phone: toMainlandE164(codeSentTo), token: code, type: 'sms' });
      if (error || !data?.session) {
        const kind = error ? classifyPhoneVerifyError(error) : 'unavailable';
        setStatus(null);
        if (kind === 'codeInvalid') {
          const left = attemptsLeft - 1;
          setAttemptsLeft(left);
          setCode('');
          setError(left > 0 ? formatTemplate(copy.feedback.codeInvalid, { count: String(left) }) : copy.feedback.attemptsExhausted);
          codeRef.current?.focus();
        } else {
          setError(kind === 'rateLimited'
            ? copy.feedback.verifyRateLimited
            : kind === 'signupDisabled' ? copy.feedback.signupDisabled : copy.feedback.verifyUnavailable);
        }
        return;
      }
      const user = data.session.user ?? data.user;
      const isNewAccount = isNewPhoneAccount(user, Date.now());
      if (isNewAccount && user?.id) {
        try {
          await recordSignupConsents(user.id);
        } catch (consentError) {
          setStatus(null);
          setError(consentError instanceof Error ? consentError.message : authCopy.feedback.consentSaveError);
          await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
          return;
        }
      }
      clearPhoneOtpState(browserSessionStorage());
      setStatusTone(isNewAccount ? 'success' : 'info');
      setStatus(copy.feedback.redirecting);
      if (user) void resolveBrowserCommercialAnalyticsAuthContext(user.id, data.session.access_token, user.app_metadata);
      if (isNewAccount) {
        persistPendingAnalyticsEvent('sign_up_completed', {
          route_family: 'auth',
          auth_surface: 'login',
          method: 'phone',
          email_confirmation_required: false,
        });
      } else {
        persistPendingAnalyticsEvent('login_completed', { route_family: 'auth', auth_surface: 'login', method: 'phone' });
      }
      completeAuthenticatedRedirect(sanitizeNextPath(nextPath), user?.id ?? null);
    } catch {
      setStatus(null);
      setError(copy.feedback.verifyUnavailable);
    } finally {
      pendingRef.current = false;
      setIsVerifying(false);
    }
  }

  const changePhone = useCallback(() => {
    if (pendingRef.current) return;
    setCodeSentTo(null);
    setCode('');
    setFieldError(null);
    setError(null);
    setStatus(null);
    window.setTimeout(() => phoneRef.current?.focus(), 0);
  }, [setError, setStatus]);

  const onPhoneChange = useCallback((value: string) => {
    setPhone(value.replace(/[^\d\s+\-]/g, '').slice(0, 16));
    setFieldError((current) => (current === 'phoneRequired' || current === 'phoneInvalid' ? null : current));
  }, []);

  const onCodeChange = useCallback((value: string) => {
    setCode(sanitizeOtpInput(value));
    setFieldError((current) => (current === 'codeRequired' ? null : current));
  }, []);

  const onAcceptTermsChange = useCallback((checked: boolean) => {
    setAcceptTerms(checked);
    setFieldError((current) => (current === 'termsRequired' ? null : current));
  }, []);

  const onAgeConfirmedChange = useCallback((checked: boolean) => {
    setAgeConfirmed(checked);
    setFieldError((current) => (current === 'ageRequired' ? null : current));
  }, []);

  if (!enabled) return null;

  return {
    method,
    phone,
    code,
    codeSentTo,
    cooldownSeconds,
    attemptsLeft,
    fieldError,
    acceptTerms,
    ageConfirmed,
    isSending,
    isVerifying,
    isBusy: isSending || isVerifying,
    phoneRef,
    codeRef,
    termsRef,
    ageRef,
    onMethodChange: setMethod,
    onPhoneChange,
    onCodeChange,
    onAcceptTermsChange,
    onAgeConfirmedChange,
    onSendCode: sendCode,
    onVerifySubmit: verifyCode,
    onChangePhone: changePhone,
  };
}

export type LoginPhoneAuthState = NonNullable<ReturnType<typeof useLoginPhoneAuth>>;
