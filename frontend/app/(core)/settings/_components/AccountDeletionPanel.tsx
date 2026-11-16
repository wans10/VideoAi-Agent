'use client';

import { useState, type FormEvent } from 'react';
import { authFetch } from '@/lib/authFetch';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAccessibleModal } from '@/components/ui/useAccessibleModal';
import { clearStaleBrowserAuthState } from '@/lib/supabase-auth-cleanup';

export type AccountDeletionCopy = {
  title: string;
  description: string;
  action: string;
  dialogTitle: string;
  consequences: readonly string[];
  confirmLabel: string;
  confirmWord: string;
  passwordLabel: string;
  passwordHelp: string;
  submit: string;
  submitting: string;
  cancel: string;
  successTitle: string;
  successBody: string;
  successAction: string;
  errors: {
    confirmation_required: string;
    password_required: string;
    invalid_password: string;
    wallet_not_empty: string;
    generic: string;
  };
};

type Phase = { name: 'closed' } | { name: 'form' } | { name: 'done'; purgeAt: string };

export function AccountDeletionPanel({ copy, locale }: { copy: AccountDeletionCopy; locale?: string }) {
  const [phase, setPhase] = useState<Phase>({ name: 'closed' });
  const [confirm, setConfirm] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    if (busy) return;
    setPhase({ name: 'closed' });
    setConfirm('');
    setPassword('');
    setError(null);
  };
  const finish = () => {
    window.location.href = '/login';
  };
  const { dialogRef, onDialogKeyDown } = useAccessibleModal<HTMLDivElement>({
    onClose: phase.name === 'done' ? finish : close,
    closeDisabled: busy,
  });

  const canSubmit = confirm.trim() === copy.confirmWord && password.length > 0 && !busy;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const res = await authFetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: confirm.trim(), password }),
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; purgeAt?: string; code?: string } | null;
      if (res.ok && json?.ok && json.purgeAt) {
        await clearStaleBrowserAuthState();
        setPassword('');
        setPhase({ name: 'done', purgeAt: json.purgeAt });
        return;
      }
      const code = json?.code as keyof AccountDeletionCopy['errors'] | undefined;
      setError((code && copy.errors[code]) || copy.errors.generic);
    } catch {
      setError(copy.errors.generic);
    } finally {
      setBusy(false);
    }
  };

  const purgeDate =
    phase.name === 'done'
      ? new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(new Date(phase.purgeAt))
      : '';

  return (
    <div className="rounded-card border border-state-warning/40 bg-bg px-4 py-3" data-testid="account-deletion-panel">
      <p className="text-sm font-semibold text-text-primary">{copy.title}</p>
      <p className="mt-1 text-xs text-text-secondary">{copy.description}</p>
      <div className="mt-3">
        <Button type="button" size="sm" variant="outline" onClick={() => setPhase({ name: 'form' })}>
          {copy.action}
        </Button>
      </div>
      {phase.name !== 'closed' ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/55 sm:items-center sm:p-4">
          <div
            ref={dialogRef}
            onKeyDown={onDialogKeyDown}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={phase.name === 'done' ? copy.successTitle : copy.dialogTitle}
            className="relative z-10 max-h-[100dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-surface p-5 shadow-2xl outline-none sm:rounded-2xl"
          >
            {phase.name === 'done' ? (
              <div>
                <h3 className="text-lg font-semibold text-text-primary">{copy.successTitle}</h3>
                <p className="mt-2 text-sm text-text-secondary">{copy.successBody.replace('{date}', purgeDate)}</p>
                <Button type="button" className="mt-4" data-modal-initial-focus="true" onClick={finish}>
                  {copy.successAction}
                </Button>
              </div>
            ) : (
              <form onSubmit={submit} noValidate>
                <h3 className="text-lg font-semibold text-text-primary">{copy.dialogTitle}</h3>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-text-secondary">
                  {copy.consequences.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                <label className="mt-4 block text-xs font-semibold text-text-primary">
                  {copy.confirmLabel}
                  <Input
                    value={confirm}
                    onChange={(event) => setConfirm(event.target.value)}
                    autoComplete="off"
                    data-modal-initial-focus="true"
                    className="mt-1"
                  />
                </label>
                <label className="mt-3 block text-xs font-semibold text-text-primary">
                  {copy.passwordLabel}
                  <Input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    className="mt-1"
                  />
                </label>
                <p className="mt-1 text-[11px] text-text-muted">{copy.passwordHelp}</p>
                {error ? (
                  <p role="alert" className="mt-3 text-xs text-state-warning">
                    {error}
                  </p>
                ) : null}
                <div className="mt-4 flex justify-end gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={close} disabled={busy}>
                    {copy.cancel}
                  </Button>
                  <Button type="submit" size="sm" disabled={!canSubmit}>
                    {busy ? copy.submitting : copy.submit}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
