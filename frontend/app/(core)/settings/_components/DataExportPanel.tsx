'use client';

import { useState } from 'react';
import { authFetch } from '@/lib/authFetch';
import { Button } from '@/components/ui/Button';

export type DataExportCopy = {
  title: string;
  description: string;
  action: string;
  working: string;
  ready: string;
  download: string;
  expiresPrefix: string;
  rateLimited: string;
  unavailable: string;
  error: string;
};

type State =
  | { status: 'idle' }
  | { status: 'working' }
  | { status: 'ready'; url: string; expiresAt: string | null }
  | { status: 'error'; message: string };

export function DataExportPanel({ copy, locale }: { copy: DataExportCopy; locale?: string }) {
  const [state, setState] = useState<State>({ status: 'idle' });

  const run = async () => {
    if (state.status === 'working') return;
    setState({ status: 'working' });
    try {
      const res = await authFetch('/api/account/export', { method: 'POST' });
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean;
        url?: string;
        expiresAt?: string;
        code?: string;
        retryAfterSeconds?: number;
      } | null;
      if (res.ok && json?.ok && json.url) {
        setState({ status: 'ready', url: json.url, expiresAt: json.expiresAt ?? null });
        return;
      }
      if (res.status === 429 || json?.code === 'rate_limited') {
        const minutes = Math.max(1, Math.ceil((json?.retryAfterSeconds ?? 600) / 60));
        setState({ status: 'error', message: copy.rateLimited.replace('{minutes}', String(minutes)) });
        return;
      }
      setState({ status: 'error', message: json?.code === 'storage_unavailable' ? copy.unavailable : copy.error });
    } catch {
      setState({ status: 'error', message: copy.error });
    }
  };

  const expires =
    state.status === 'ready' && state.expiresAt
      ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(state.expiresAt))
      : null;

  return (
    <div className="rounded-card border border-hairline bg-bg px-4 py-3" data-testid="data-export-panel">
      <p className="text-sm font-semibold text-text-primary">{copy.title}</p>
      <p className="mt-1 text-xs text-text-secondary">{copy.description}</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button type="button" size="sm" variant="outline" onClick={run} disabled={state.status === 'working'}>
          {state.status === 'working' ? copy.working : copy.action}
        </Button>
        {state.status === 'ready' ? (
          <div role="status" className="text-xs text-text-secondary">
            <span className="font-semibold text-text-primary">{copy.ready}</span>{' '}
            <a href={state.url} className="underline underline-offset-2" rel="noopener noreferrer" download>
              {copy.download}
            </a>
            {expires ? <span className="ml-2 text-text-muted">{copy.expiresPrefix}{expires}</span> : null}
          </div>
        ) : null}
        {state.status === 'error' ? (
          <p role="alert" className="text-xs text-state-warning">
            {state.message}
          </p>
        ) : null}
      </div>
    </div>
  );
}
