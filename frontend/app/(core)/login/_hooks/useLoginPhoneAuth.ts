'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent, type MutableRefObject } from 'react';
import { resolveBrowserCommercialAnalyticsAuthContext } from '@/lib/analytics/commercial-client';
import { loadSupabaseClient } from '@/lib/supabaseClientLoader';
import type { AuthCopy, Locale } from '../_lib/login-copy';
import { clearPendingGoogleLogin, formatTemplate } from '../_lib/login-helpers';
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
import {
  clearPhonePasswordSetupState,
  readPhonePasswordSetupState,
  writePhonePasswordSetupState,
  type PhonePasswordSetupState,
} from '../_lib/login-phone-password';
import { useLoginPhonePasswordSignIn } from './useLoginPhonePasswordSignIn';
import { useLoginPhonePasswordSetup } from './useLoginPhonePasswordSetup';

export type LoginMethod = 'email' | 'phone';
/** signin: phone + password (default). code: SMS code (new account or forgot password). setPassword: required after a verified code. */
export type LoginPhoneStep = 'signin' | 'code' | 'setPassword';
export type PhoneFieldError = 'phoneRequired' | 'phoneInvalid' | 'codeRequired' | 'termsRequired' | 'ageRequired';

type UseLoginPhoneAuthOptions = {
  enabled: boolean;
  authCopy: AuthCopy;
  locale: Locale;
  nextPath: string;
  nextPathReady: boolean;
  blocked: boolean;
  completeAuthenticatedRedirect: (target: string, userId?: string | null) => void;
  /** While set, the login page must not redirect: a verified code still owes a password. */
  authRedirectHoldRef: MutableRefObject<boolean>;
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

/**
 * Phone login state machine (flag on): phone + password sign-in, SMS code for new accounts and for
 * forgot-password recovery, and the required password step after a verified code.
 */
export function useLoginPhoneAuth({
  enabled,
  authCopy,
  locale,
  nextPath,
  nextPathReady,
  blocked,
  completeAuthenticatedRedirect,
  authRedirectHoldRef,
  setStatus,
  setStatusTone,
  setError,
}: UseLoginPhoneAuthOptions) {
  const copy = authCopy.phone;
  // The hook only runs with the flag on. 'email' is the sign-in form kept for accounts created with an email.
  const [method, setMethodState] = useState<LoginMethod>('phone');
  const [step, setStep] = useState<LoginPhoneStep>('signin');
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
  const setupRef = useRef<PhonePasswordSetupState | null>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  const termsRef = useRef<HTMLInputElement>(null);
  const ageRef = useRef<HTMLInputElement>(null);
  const signInPasswordRef = useRef<HTMLInputElement>(null);
  const setupPasswordRef = useRef<HTMLInputElement>(null);
  const setupConfirmRef = useRef<HTMLInputElement>(null);

  // Restore after a reload in read-only effects (the first render must match the server markup).
  // A verified code that still owes a password wins over a code that is merely cooling down.
  useEffect(() => {
    if (!enabled) return;
    const storage = browserSessionStorage();
    const pendingSetup = readPhonePasswordSetupState(storage, Date.now());
    if (pendingSetup) {
      setupRef.current = pendingSetup;
      authRedirectHoldRef.current = true;
      setPhone(pendingSetup.phone);
      setStep('setPassword');
      return;
    }
    const restored = readPhoneOtpState(storage, Date.now());
    if (!restored) return;
    setMethodState('phone');
    setStep('code');
    setPhone(restored.phone);
    setCodeSentTo(restored.phone);
    setNow(Date.now());
    setCooldownUntil(restored.cooldownUntil);
  }, [enabled, authRedirectHoldRef]);

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
    setStep('signin');
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

  /** Number only (phone password sign-in and the code step share this check). */
  const validatePhone = () => {
    const normalized = normalizeMainlandMobile(phone);
    if (!normalized) return fail('phoneRequired');
    if (!isValidMainlandMobile(normalized)) return fail('phoneInvalid');
    setFieldError(null);
    return true;
  };

  const validatePhoneAndConsent = () => {
    if (!validatePhone()) return false;
    if (!acceptTerms) return fail('termsRequired');
    if (!ageConfirmed) return fail('ageRequired');
    setFieldError(null);
    return true;
  };

  /** Ends the password step: forgets the pending record and lets the page redirect again. */
  const releaseSetup = useCallback(() => {
    setupRef.current = null;
    authRedirectHoldRef.current = false;
    clearPhonePasswordSetupState(browserSessionStorage());
  }, [authRedirectHoldRef]);

  const returnToSignIn = useCallback(() => {
    setStep('signin');
    setCodeSentTo(null);
    setCode('');
    setCooldownUntil(null);
    clearPhoneOtpState(browserSessionStorage());
  }, []);

  const isNewAccount = useCallback(() => setupRef.current?.newAccount ?? false, []);

  const passwordSignIn = useLoginPhonePasswordSignIn({
    enabled,
    authCopy,
    phone,
    nextPath,
    nextPathReady,
    blocked,
    validatePhone,
    passwordRef: signInPasswordRef,
    completeAuthenticatedRedirect,
    setStatus,
    setStatusTone,
    setError,
  });

  const passwordSetup = useLoginPhonePasswordSetup({
    enabled,
    authCopy,
    nextPath,
    nextPathReady,
    blocked,
    isNewAccount,
    releaseSetup,
    returnToSignIn,
    completeAuthenticatedRedirect,
    passwordRef: setupPasswordRef,
    confirmRef: setupConfirmRef,
    setStatus,
    setStatusTone,
    setError,
  });

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
      body: JSON.stringify({ userId, ageConfirmed: true, cookiesAccepted: true, locale, source: 'signup' }),
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
    // A verified session exists from here on; hold the page's redirect until the password step ends.
    authRedirectHoldRef.current = true;
    try {
      const supabase = await loadSupabaseClient();
      const { data, error } = await supabase.auth.verifyOtp({ phone: toMainlandE164(codeSentTo), token: code, type: 'sms' });
      if (error || !data?.session) {
        authRedirectHoldRef.current = false;
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
      const newAccount = isNewPhoneAccount(user, Date.now());
      if (newAccount && user?.id) {
        try {
          await recordSignupConsents(user.id);
        } catch (consentError) {
          authRedirectHoldRef.current = false;
          setStatus(null);
          setError(consentError instanceof Error ? consentError.message : authCopy.feedback.consentSaveError);
          await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
          return;
        }
      }
      const pending: PhonePasswordSetupState = { phone: codeSentTo, newAccount, verifiedAt: Date.now() };
      setupRef.current = pending;
      writePhonePasswordSetupState(browserSessionStorage(), pending);
      clearPhoneOtpState(browserSessionStorage());
      if (user) void resolveBrowserCommercialAnalyticsAuthContext(user.id, data.session.access_token, user.app_metadata);
      setCodeSentTo(null);
      setCode('');
      setCooldownUntil(null);
      setAttemptsLeft(PHONE_MAX_VERIFY_ATTEMPTS);
      setStep('setPassword');
      setStatusTone('success');
      setStatus(copy.passwordSetup.verified);
    } catch {
      // Keep the hold only when a verified session is pending its password step.
      if (!setupRef.current) authRedirectHoldRef.current = false;
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

  /** Code step -> password sign-in. The SMS state is dropped so a reload lands on the password form. */
  const backToPasswordSignIn = useCallback(() => {
    if (pendingRef.current) return;
    returnToSignIn();
    setFieldError(null);
    setError(null);
    setStatus(null);
  }, [returnToSignIn, setError, setStatus]);

  /** Password sign-in -> SMS code (forgot password, or a number that has no password yet). */
  const startCodeLogin = useCallback(() => {
    if (pendingRef.current) return;
    setStep('code');
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
    step,
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
    isBusy: isSending || isVerifying || passwordSignIn.isSigningIn || passwordSetup.isSaving,
    phoneRef,
    codeRef,
    termsRef,
    ageRef,
    signIn: passwordSignIn,
    setup: passwordSetup,
    onMethodChange: setMethod,
    onPhoneChange,
    onCodeChange,
    onAcceptTermsChange,
    onAgeConfirmedChange,
    onSendCode: sendCode,
    onVerifySubmit: verifyCode,
    onChangePhone: changePhone,
    onStartCodeLogin: startCodeLogin,
    onBackToPasswordSignIn: backToPasswordSignIn,
  };
}

export type LoginPhoneAuthState = NonNullable<ReturnType<typeof useLoginPhoneAuth>>;
