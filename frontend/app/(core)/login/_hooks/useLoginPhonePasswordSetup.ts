'use client';

import { useCallback, useRef, useState, type FormEvent, type RefObject } from 'react';
import { persistPendingAnalyticsEvent } from '@/lib/analytics-client';
import { loadSupabaseClient } from '@/lib/supabaseClientLoader';
import type { AuthCopy } from '../_lib/login-copy';
import { sanitizeNextPath } from '../_lib/login-helpers';
import { validatePasswordSetup, type AuthFieldErrors } from '../_lib/login-validation';
import { classifyPhoneSetPasswordError } from '../_lib/login-phone-password';

type UseLoginPhonePasswordSetupOptions = {
  enabled: boolean;
  authCopy: AuthCopy;
  nextPath: string;
  nextPathReady: boolean;
  blocked: boolean;
  /** Whether the verified account was created by this flow (decides the analytics event). */
  isNewAccount: () => boolean;
  /** Clears the pending-setup record and releases the redirect hold. */
  releaseSetup: () => void;
  /** Returns to the phone sign-in step (after an expired verification or a cancel). */
  returnToSignIn: () => void;
  completeAuthenticatedRedirect: (target: string, userId?: string | null) => void;
  passwordRef: RefObject<HTMLInputElement>;
  confirmRef: RefObject<HTMLInputElement>;
  setStatus: (value: string | null) => void;
  setStatusTone: (value: 'info' | 'success') => void;
  setError: (value: string | null) => void;
};

/**
 * Required step after a verified SMS code (new account or forgot-password recovery): the user sets
 * the password that phone + password sign-in uses from now on (updateUser({ password })).
 */
export function useLoginPhonePasswordSetup({
  enabled,
  authCopy,
  nextPath,
  nextPathReady,
  blocked,
  isNewAccount,
  releaseSetup,
  returnToSignIn,
  completeAuthenticatedRedirect,
  passwordRef,
  confirmRef,
  setStatus,
  setStatusTone,
  setError,
}: UseLoginPhonePasswordSetupOptions) {
  const copy = authCopy.phone;
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<AuthFieldErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const pendingRef = useRef(false);

  const onPasswordChange = useCallback((value: string) => {
    setPassword(value);
    setErrors((current) => (current.password ? { ...current, password: undefined } : current));
  }, []);

  const onConfirmChange = useCallback((value: string) => {
    setConfirm(value);
    setErrors((current) => (current.confirm ? { ...current, confirm: undefined } : current));
  }, []);

  async function submitPasswordSetup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enabled || pendingRef.current || blocked || !nextPathReady) return;
    const result = validatePasswordSetup({ password, confirm });
    setErrors(result);
    if (result.password) {
      passwordRef.current?.focus();
      return;
    }
    if (result.confirm) {
      confirmRef.current?.focus();
      return;
    }
    pendingRef.current = true;
    setIsSaving(true);
    setError(null);
    setStatusTone('info');
    setStatus(copy.feedback.passwordSetupSaving);
    try {
      const supabase = await loadSupabaseClient();
      const { data, error } = await supabase.auth.updateUser({ password });
      if (error) {
        const kind = classifyPhoneSetPasswordError(error);
        setStatus(null);
        if (kind === 'sessionExpired') {
          // The verified session is gone: start again from a fresh SMS code.
          await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
          releaseSetup();
          returnToSignIn();
          setError(copy.feedback.passwordSessionExpired);
          return;
        }
        setError(copy.feedback[
          kind === 'weak' ? 'passwordWeak'
            : kind === 'same' ? 'passwordSame'
              : kind === 'rateLimited' ? 'passwordSetupRateLimited'
                : 'passwordSetupUnavailable'
        ]);
        return;
      }
      const userId = data.user?.id ?? null;
      const newAccount = isNewAccount();
      // Release the hold first: completeAuthenticatedRedirect ignores calls while it is set.
      releaseSetup();
      setStatusTone('success');
      setStatus(copy.feedback.passwordSetupSaved);
      persistPendingAnalyticsEvent(newAccount ? 'sign_up_completed' : 'login_completed', {
        route_family: 'auth',
        auth_surface: 'login',
        method: 'phone',
        ...(newAccount ? { email_confirmation_required: false } : {}),
      });
      completeAuthenticatedRedirect(sanitizeNextPath(nextPath), userId);
    } catch {
      setStatus(null);
      setError(copy.feedback.passwordSetupUnavailable);
    } finally {
      pendingRef.current = false;
      setIsSaving(false);
    }
  }

  /** Cancel: signs this browser out so the password step cannot be bypassed by a reload. */
  const cancelSetup = useCallback(async () => {
    if (pendingRef.current) return;
    try {
      const supabase = await loadSupabaseClient();
      await supabase.auth.signOut({ scope: 'local' });
    } catch {
      // The local session is dropped by the next visit anyway; never block the user here.
    }
    releaseSetup();
    returnToSignIn();
    setPassword('');
    setConfirm('');
    setErrors({});
    setStatus(null);
    setError(null);
  }, [releaseSetup, returnToSignIn, setError, setStatus]);

  return {
    password,
    confirm,
    errors,
    isSaving,
    passwordRef,
    confirmRef,
    onPasswordChange,
    onConfirmChange,
    onSetupSubmit: submitPasswordSetup,
    onCancelSetup: cancelSetup,
  };
}

export type LoginPhonePasswordSetupState = ReturnType<typeof useLoginPhonePasswordSetup>;
