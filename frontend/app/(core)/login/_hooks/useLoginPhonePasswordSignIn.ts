'use client';

import { useCallback, useRef, useState, type FormEvent, type RefObject } from 'react';
import { persistPendingAnalyticsEvent } from '@/lib/analytics-client';
import { resolveBrowserCommercialAnalyticsAuthContext } from '@/lib/analytics/commercial-client';
import { loadSupabaseClient } from '@/lib/supabaseClientLoader';
import type { AuthCopy } from '../_lib/login-copy';
import { clearPendingGoogleLogin, sanitizeNextPath } from '../_lib/login-helpers';
import type { AuthValidationErrorCode } from '../_lib/login-validation';
import { toMainlandE164 } from '../_lib/login-phone';
import { classifyPhonePasswordSignInError } from '../_lib/login-phone-password';

type UseLoginPhonePasswordSignInOptions = {
  enabled: boolean;
  authCopy: AuthCopy;
  phone: string;
  nextPath: string;
  nextPathReady: boolean;
  blocked: boolean;
  /** Validates the shared number field (and focuses it when invalid). */
  validatePhone: () => boolean;
  passwordRef: RefObject<HTMLInputElement>;
  completeAuthenticatedRedirect: (target: string, userId?: string | null) => void;
  setStatus: (value: string | null) => void;
  setStatusTone: (value: 'info' | 'success') => void;
  setError: (value: string | null) => void;
};

/** Phone + password sign-in (signInWithPassword with an E.164 phone). No SMS is sent. */
export function useLoginPhonePasswordSignIn({
  enabled,
  authCopy,
  phone,
  nextPath,
  nextPathReady,
  blocked,
  validatePhone,
  passwordRef,
  completeAuthenticatedRedirect,
  setStatus,
  setStatusTone,
  setError,
}: UseLoginPhonePasswordSignInOptions) {
  const copy = authCopy.phone;
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<AuthValidationErrorCode | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const pendingRef = useRef(false);

  const onPasswordChange = useCallback((value: string) => {
    setPassword(value);
    setPasswordError(null);
  }, []);

  async function submitPasswordSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enabled || pendingRef.current || blocked || !nextPathReady) return;
    const phoneValid = validatePhone();
    const missingPassword = !password;
    setPasswordError(missingPassword ? 'passwordRequired' : null);
    if (!phoneValid) return;
    if (missingPassword) {
      passwordRef.current?.focus();
      return;
    }
    pendingRef.current = true;
    setIsSigningIn(true);
    setError(null);
    setStatusTone('info');
    setStatus(copy.feedback.passwordSigningIn);
    try {
      clearPendingGoogleLogin();
      const supabase = await loadSupabaseClient();
      const { data, error } = await supabase.auth.signInWithPassword({ phone: toMainlandE164(phone), password });
      if (error) {
        const kind = classifyPhonePasswordSignInError(error);
        setStatus(null);
        setError(copy.feedback[
          kind === 'invalidCredentials' ? 'passwordInvalid' : kind === 'rateLimited' ? 'passwordRateLimited' : 'passwordUnavailable'
        ]);
        return;
      }
      setStatusTone('info');
      setStatus(authCopy.feedback.signinRedirecting);
      if (data.user) void resolveBrowserCommercialAnalyticsAuthContext(data.user.id, data.session?.access_token, data.user.app_metadata);
      persistPendingAnalyticsEvent('login_completed', { route_family: 'auth', auth_surface: 'login', method: 'phone' });
      completeAuthenticatedRedirect(sanitizeNextPath(nextPath), data.session?.user?.id ?? data.user?.id ?? null);
    } catch {
      setStatus(null);
      setError(copy.feedback.passwordUnavailable);
    } finally {
      pendingRef.current = false;
      setIsSigningIn(false);
    }
  }

  return {
    password,
    passwordError,
    isSigningIn,
    passwordRef,
    onPasswordChange,
    onSignInSubmit: submitPasswordSignIn,
  };
}

export type LoginPhonePasswordSignInState = ReturnType<typeof useLoginPhonePasswordSignIn>;
