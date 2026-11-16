'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import deepmerge from 'deepmerge';
import { authFetch } from '@/lib/authFetch';
import { Button } from '@/components/ui/Button';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { clearStaleBrowserAuthState } from '@/lib/supabase-auth-cleanup';

const DEFAULT_COPY = {
  title: 'Account scheduled for deletion',
  body: 'Your account is in its deletion cooling-off and cannot be used. After {purge} your personal data, generations and media will be permanently deleted.',
  purgeLabel: 'Scheduled deletion: ',
  cancelHint: 'Changed your mind? Cancelling restores the account immediately.',
  cancel: 'Cancel deletion',
  cancelling: 'Cancelling…',
  signOut: 'Sign out',
  export: 'Export my data first',
  cancelled: 'Deletion cancelled. Your account is restored.',
  error: 'Something went wrong. Try again later.',
  loading: 'Loading…',
};

type Status =
  | { phase: 'loading' }
  | { phase: 'scheduled'; purgeAt: string }
  | { phase: 'not-scheduled' }
  | { phase: 'cancelled' };

/**
 * The only app screen reachable during the 15-day cooling-off. Status, cancel,
 * export and sign-out are the only APIs a flagged account may call.
 */
export function AccountDeletionScreen() {
  const { t, locale } = useI18n();
  const raw = t('workspace.accountDeletion', DEFAULT_COPY);
  const copy = useMemo(
    () => (raw && typeof raw === 'object' ? deepmerge(DEFAULT_COPY, raw as Partial<typeof DEFAULT_COPY>) : DEFAULT_COPY),
    [raw],
  );
  const [status, setStatus] = useState<Status>({ phase: 'loading' });
  const [busy, setBusy] = useState<'cancel' | 'export' | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await authFetch('/api/account/delete/status');
        if (res.status === 401) {
          window.location.href = '/login?next=/account/deletion';
          return;
        }
        const json = (await res.json().catch(() => null)) as { scheduled?: boolean; purgeAt?: string } | null;
        if (!active) return;
        setStatus(json?.scheduled && json.purgeAt ? { phase: 'scheduled', purgeAt: json.purgeAt } : { phase: 'not-scheduled' });
      } catch {
        if (active) setMessage(copy.error);
      }
    })();
    return () => {
      active = false;
    };
  }, [copy.error]);

  useEffect(() => {
    if (status.phase === 'not-scheduled') window.location.href = '/app';
  }, [status.phase]);

  const cancelDeletion = useCallback(async () => {
    setBusy('cancel');
    setMessage(null);
    try {
      const res = await authFetch('/api/account/delete/cancel', { method: 'POST' });
      const json = (await res.json().catch(() => null)) as { ok?: boolean } | null;
      if (!res.ok || !json?.ok) throw new Error('cancel failed');
      setStatus({ phase: 'cancelled' });
      setMessage(copy.cancelled);
      window.setTimeout(() => {
        window.location.href = '/app';
      }, 1200);
    } catch {
      setMessage(copy.error);
    } finally {
      setBusy(null);
    }
  }, [copy.cancelled, copy.error]);

  const exportData = useCallback(async () => {
    setBusy('export');
    setMessage(null);
    try {
      const res = await authFetch('/api/account/export', { method: 'POST' });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; url?: string; error?: string } | null;
      if (res.ok && json?.ok && json.url) {
        window.location.href = json.url;
      } else {
        setMessage(json?.error || copy.error);
      }
    } catch {
      setMessage(copy.error);
    } finally {
      setBusy(null);
    }
  }, [copy.error]);

  const signOut = useCallback(async () => {
    await clearStaleBrowserAuthState();
    void fetch('/api/auth/signout', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: '{}' }).catch(() => undefined);
    window.location.href = '/';
  }, []);

  const purgeDate =
    status.phase === 'scheduled'
      ? new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(new Date(status.purgeAt))
      : '';

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-12" data-testid="account-deletion-screen">
      <div className="rounded-card border border-border bg-surface p-6 shadow-card">
        <h1 className="text-xl font-semibold text-text-primary">{copy.title}</h1>
        {status.phase === 'loading' ? (
          <p className="mt-3 text-sm text-text-secondary">{copy.loading}</p>
        ) : null}
        {status.phase === 'scheduled' ? (
          <>
            <p className="mt-3 text-sm text-text-secondary">{copy.body.replace('{purge}', purgeDate)}</p>
            <p className="mt-3 text-sm text-text-primary">
              <span className="font-semibold">{copy.purgeLabel}</span>
              <time dateTime={status.purgeAt}>{purgeDate}</time>
            </p>
            <p className="mt-3 text-xs text-text-muted">{copy.cancelHint}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button type="button" onClick={cancelDeletion} disabled={busy !== null}>
                {busy === 'cancel' ? copy.cancelling : copy.cancel}
              </Button>
              <Button type="button" variant="outline" onClick={exportData} disabled={busy !== null}>
                {copy.export}
              </Button>
              <Button type="button" variant="ghost" onClick={signOut} disabled={busy === 'cancel'}>
                {copy.signOut}
              </Button>
            </div>
          </>
        ) : null}
        {message ? (
          <p role="status" className="mt-4 text-sm text-text-secondary">
            {message}
          </p>
        ) : null}
      </div>
    </main>
  );
}
