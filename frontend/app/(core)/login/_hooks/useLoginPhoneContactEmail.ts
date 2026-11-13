'use client';

import { useCallback, useRef, useState } from 'react';
import { isValidContactEmail, normalizeContactEmail } from '@/lib/contact-email';

export type ContactEmailError = 'contactEmailRequired' | 'contactEmailInvalid';

/**
 * Keyvo phone sign-up contact email. It is for product notices and marketing mail, is NOT verified, and
 * is never the GoTrue login email: it is saved to our own profiles row through /api/account/contact-email.
 *
 * `pending` means the password step still owes the address: it was not given, or the save failed. The
 * password step then collects it again before the password is saved, so it is never silently lost.
 */
export function useLoginPhoneContactEmail() {
  const [email, setEmail] = useState('');
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ContactEmailError | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  const onEmailChange = useCallback((value: string) => {
    setEmail(value);
    setError(null);
  }, []);

  /** Required on the 注册 tab and on the password step while the address is pending. */
  const validate = useCallback(() => {
    const value = email.trim();
    const kind: ContactEmailError | null = !value ? 'contactEmailRequired' : isValidContactEmail(value) ? null : 'contactEmailInvalid';
    setError(kind);
    if (kind) emailRef.current?.focus();
    return kind === null;
  }, [email]);

  /** Saves the address for the verified session. Resolves false on any failure (the caller keeps it pending). */
  const save = useCallback(async (value: string, accessToken: string | null): Promise<boolean> => {
    const normalized = normalizeContactEmail(value);
    if (!normalized || !accessToken) return false;
    try {
      const res = await fetch('/api/account/contact-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        credentials: 'include',
        body: JSON.stringify({ email: normalized }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) return false;
      setEmail(normalized);
      setError(null);
      setPending(false);
      return true;
    } catch {
      return false;
    }
  }, []);

  /**
   * After a verified code. Stores the address for a new account or whenever the 注册 tab was used; an
   * existing account reached through forgot-password is left alone. Returns whether the password step
   * still owes the address.
   */
  const settleAfterVerify = useCallback(async (input: { signupTab: boolean; newAccount: boolean; accessToken: string | null }) => {
    if (!input.signupTab && !input.newAccount) {
      setPending(false);
      return false;
    }
    const saved = await save(email, input.accessToken);
    setPending(!saved);
    return !saved;
  }, [email, save]);

  /** Restores the pending state after a reload on the password step. */
  const restorePending = useCallback((state: { pending: boolean; draft: string }) => {
    setPending(state.pending);
    setEmail(state.draft);
  }, []);

  return {
    email,
    setEmail,
    emailRef,
    error,
    pending,
    marketingOptIn,
    setMarketingOptIn,
    onEmailChange,
    validate,
    save,
    settleAfterVerify,
    restorePending,
  };
}

export type LoginPhoneContactEmailState = ReturnType<typeof useLoginPhoneContactEmail>;
