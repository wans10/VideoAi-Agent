'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Button } from '@/components/ui/Button';
import { readLastKnownUserId } from '@/lib/last-known';
import { readBrowserSession } from '@/lib/supabase-auth-cleanup';
import { hasSupabaseAuthCookie } from '@/lib/supabase-session-hint';
import { loadSupabaseClient } from '@/lib/supabaseClientLoader';

type DocumentStatus = {
  key: 'terms' | 'privacy' | 'cookies';
  currentVersion: string;
  publishedAt: string | null;
  acceptedVersion: string | null;
};

type ReconsentStatus =
  | null
  | {
      needsReconsent: boolean;
      shouldBlock: boolean;
      mode: 'soft' | 'hard';
      graceEndsAt: string | null;
      documents: DocumentStatus[];
    };

type ApiResponse = {
  ok: boolean;
  needsReconsent?: boolean;
  shouldBlock?: boolean;
  mode?: 'soft' | 'hard';
  graceEndsAt?: string | null;
  documents?: DocumentStatus[];
  error?: string;
};

async function resolveReconsentSession(): Promise<Session | null> {
  if (!readLastKnownUserId() && !hasSupabaseAuthCookie()) {
    return null;
  }
  return readBrowserSession();
}

function sessionHeaders(session: Session): Headers {
  const headers = new Headers();
  if (session.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }
  return headers;
}

// Keyvo 2026-11-13: the prompt is Chinese when the page language is zh (the provider sets <html lang>);
// every other case keeps the upstream English copy.
function isChinesePage(): boolean {
  return typeof document !== 'undefined' && document.documentElement.lang.toLowerCase().startsWith('zh');
}

const PROMPT_COPY = {
  en: {
    title: "We've updated our legal terms",
    intro: 'To continue using Keyvo, please review and accept the updated documents below.',
    grace: 'Grace period active',
    version: 'Version',
    lastAccepted: 'Your last acceptance:',
    required: 'Acceptance required',
    view: 'View',
    saving: 'Saving…',
    accept: 'Accept and continue',
    docs: { terms: 'Terms of Service', privacy: 'Privacy Policy', cookies: 'Cookie Policy' },
  },
  zh: {
    title: '我们更新了法律条款',
    intro: '继续使用 Keyvo 前，请查看并接受下列文件。',
    grace: '宽限期内',
    version: '版本',
    lastAccepted: '您上次接受的版本：',
    required: '需要您的同意',
    view: '查看',
    saving: '保存中…',
    accept: '接受并继续',
    docs: { terms: '服务条款', privacy: '隐私政策', cookies: 'Cookie 政策' },
  },
} as const;

function describeDocument(key: DocumentStatus['key']): { label: string; href: string } {
  const labels = PROMPT_COPY[isChinesePage() ? 'zh' : 'en'].docs;
  switch (key) {
    case 'terms':
      return { label: labels.terms, href: '/legal/terms' };
    case 'privacy':
      return { label: labels.privacy, href: '/legal/privacy' };
    case 'cookies':
      return { label: labels.cookies, href: '/legal/cookies' };
    default:
      return { label: key, href: '#' };
  }
}

function useCountdown(targetIso: string | null): string | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!targetIso) return;
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, [targetIso]);

  return useMemo(() => {
    if (!targetIso) return null;
    const target = Date.parse(targetIso);
    if (Number.isNaN(target)) return null;
    const diffMs = target - now;
    const zh = isChinesePage();
    if (diffMs <= 0) return zh ? '宽限期已结束' : 'Grace period expired';
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays > 0) {
      if (zh) return `剩余 ${diffDays} 天`;
      return diffDays === 1 ? '1 day remaining' : `${diffDays} days remaining`;
    }
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours > 0) {
      if (zh) return `剩余 ${diffHours} 小时`;
      return diffHours === 1 ? '1 hour remaining' : `${diffHours} hours remaining`;
    }
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    if (zh) return diffMinutes <= 1 ? '剩余不到 1 分钟' : `剩余 ${diffMinutes} 分钟`;
    return diffMinutes <= 1 ? 'Less than a minute remaining' : `${diffMinutes} minutes remaining`;
  }, [targetIso, now]);
}

async function fetchStatus(headers: Headers): Promise<ReconsentStatus> {
  try {
    const res = await fetch('/api/legal/reconsent', { credentials: 'include', headers });
    if (res.status === 401) return null;
    const json = (await res.json()) as ApiResponse;
    if (!json.ok) {
      throw new Error(json.error ?? 'Failed to load legal status');
    }
    if (!json.needsReconsent) {
      return {
        needsReconsent: false,
        shouldBlock: false,
        mode: json.mode ?? 'soft',
        graceEndsAt: json.graceEndsAt ?? null,
        documents: json.documents ?? [],
      };
    }
    return {
      needsReconsent: true,
      shouldBlock: Boolean(json.shouldBlock),
      mode: json.mode ?? 'soft',
      graceEndsAt: json.graceEndsAt ?? null,
      documents: json.documents ?? [],
    };
  } catch (error) {
    console.warn('[reconsent] status fetch failed', error);
    throw error instanceof Error ? error : new Error('Failed to load legal status');
  }
}

async function acceptDocuments(documents: DocumentStatus[], headers: Headers): Promise<ReconsentStatus> {
  const locale = typeof navigator !== 'undefined' ? navigator.language ?? null : null;
  headers.set('Content-Type', 'application/json');

  const res = await fetch('/api/legal/reconsent', {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({
      documents: documents.map((doc) => doc.key),
      locale,
      source: 'reconsent',
    }),
  });
  const json = (await res.json()) as ApiResponse;
  if (!res.ok || !json.ok) {
    throw new Error(json?.error ?? 'Failed to record consent');
  }
  if (!json.needsReconsent) {
    return {
      needsReconsent: false,
      shouldBlock: false,
      mode: json.mode ?? 'soft',
      graceEndsAt: json.graceEndsAt ?? null,
      documents: json.documents ?? [],
    };
  }
  return {
    needsReconsent: true,
    shouldBlock: Boolean(json.shouldBlock),
    mode: json.mode ?? 'soft',
    graceEndsAt: json.graceEndsAt ?? null,
    documents: json.documents ?? [],
  };
}

type ReconsentPromptProps = {
  enabled?: boolean;
};

export function ReconsentPrompt({ enabled = true }: ReconsentPromptProps) {
  const [status, setStatus] = useState<ReconsentStatus>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const acceptRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    setStatus(null);
    setError(null);
    setSubmitting(false);
    if (!enabled) return;

    // Requests and displayed status belong to this mounted auth lifecycle only.
    let active = true;
    let generation = 0;
    let pendingRead: number | null = null;
    let pendingWrite: number | null = null;
    let scope: { userId: string; token: string } | null | undefined;
    let currentStatus: ReconsentStatus = null;
    let subscription: { unsubscribe: () => void } | null = null;
    let subscriptionPromise: Promise<void> | null = null;

    const commitStatus = (next: ReconsentStatus) => {
      currentStatus = next;
      setStatus(next);
    };
    const retireRequests = () => {
      generation += 1;
      pendingRead = null;
      pendingWrite = null;
      setSubmitting(false);
      setError(null);
    };
    const observeSession = (session: Session | null) => {
      if (!active) return;
      const userId = session?.user?.id ?? null;
      const token = session?.access_token ?? null;
      // Rotating credentials cannot cancel a write already owned by this account.
      // Wait for its authoritative result before allowing another read or write.
      if (userId && scope?.userId === userId && pendingWrite !== null) {
        scope = { userId, token: token ?? '' };
        return;
      }
      if (scope?.userId !== userId || scope?.token !== token) {
        retireRequests();
        if (scope?.userId !== userId) commitStatus(null);
        scope = userId ? { userId, token: token ?? '' } : null;
      }
      if (!userId) {
        commitStatus(null);
        return;
      }
      // The auth callback uses its supplied session and never awaits another SDK call.
      void loadStatus(session);
    };
    const ensureSubscription = async () => {
      if (!readLastKnownUserId() && !hasSupabaseAuthCookie()) return;
      if (!subscriptionPromise) {
        subscriptionPromise = loadSupabaseClient().then((supabase) => {
          if (!active) return;
          const { data } = supabase.auth.onAuthStateChange((event, session) => {
            observeSession(event === 'SIGNED_OUT' ? null : session);
          });
          subscription = data.subscription;
        }).catch((err) => {
          subscriptionPromise = null;
          throw err;
        });
      }
      await subscriptionPromise;
    };
    async function loadStatus(providedSession?: Session | null) {
      if (!active || pendingRead !== null || pendingWrite !== null) return;
      const requestId = ++generation;
      pendingRead = requestId;
      const isCurrent = () => active && generation === requestId && pendingRead === requestId;
      setError(null);
      try {
        let session = providedSession;
        if (session === undefined) {
          await ensureSubscription();
          if (!isCurrent()) return;
          session = await resolveReconsentSession();
        }
        if (!isCurrent()) return;
        const userId = session?.user?.id ?? null;
        if (scope?.userId !== userId) commitStatus(null);
        scope = userId ? { userId, token: session?.access_token ?? '' } : null;
        if (!session?.user) {
          commitStatus(null);
          return;
        }
        const next = await fetchStatus(sessionHeaders(session));
        if (isCurrent()) commitStatus(next);
      } catch (err) {
        if (isCurrent()) setError(err instanceof Error ? err.message : 'Unable to load legal status.');
      } finally {
        if (isCurrent()) pendingRead = null;
      }
    }

    acceptRef.current = async () => {
      if (!active || pendingWrite !== null || !scope || !currentStatus?.documents.length) return;
      const userId = scope.userId;
      const documents = currentStatus.documents;
      // A response read before acceptance must never undo its authoritative result.
      pendingRead = null;
      const requestId = ++generation;
      pendingWrite = requestId;
      const isCurrent = () => active && generation === requestId && pendingWrite === requestId;
      setSubmitting(true);
      setError(null);
      try {
        const session = await resolveReconsentSession();
        if (!isCurrent()) return;
        if (!session?.user) {
          throw new Error('Unable to confirm your session. Please try again or sign in again to accept the updated legal terms.');
        }
        if (session.user.id !== userId) {
          observeSession(session);
          return;
        }
        scope = { userId, token: session.access_token };
        const next = await acceptDocuments(documents, sessionHeaders(session));
        if (isCurrent()) commitStatus(next);
      } catch (err) {
        if (isCurrent()) setError(err instanceof Error ? err.message : 'Failed to record consent.');
      } finally {
        if (isCurrent()) {
          pendingWrite = null;
          setSubmitting(false);
        }
      }
    };

    void loadStatus();
    const handleFocus = () => { void loadStatus(); };
    window.addEventListener('focus', handleFocus);
    return () => {
      active = false;
      generation += 1;
      acceptRef.current = null;
      subscription?.unsubscribe();
      window.removeEventListener('focus', handleFocus);
    };
  }, [enabled]);

  const countdown = useCountdown(status?.graceEndsAt ?? null);

  if (!enabled || !status?.needsReconsent) return null;

  const documents = status.documents;
  const copy = PROMPT_COPY[isChinesePage() ? 'zh' : 'en'];
  const handleAccept = () => { acceptRef.current?.(); };

  const content = (
    <div className="space-y-4">
      <div className="space-y-2 text-left">
        <h2 className="text-lg font-semibold text-text-primary">
          {copy.title}
        </h2>
        <p className="text-sm text-text-secondary">
          {copy.intro}
        </p>
        {status.mode === 'soft' && !status.shouldBlock ? (
          <p className="text-xs font-medium uppercase tracking-wide text-brand">
            {copy.grace} {countdown ? `· ${countdown}` : ''}
          </p>
        ) : null}
      </div>

      <ul className="space-y-2 text-sm text-text-secondary">
        {documents.map((doc) => {
          const meta = describeDocument(doc.key);
          return (
            <li
              key={doc.key}
              className="flex items-start justify-between gap-4 rounded-input border border-border bg-bg px-3 py-2"
            >
              <div>
                <p className="font-medium text-text-primary">{meta.label}</p>
                <p className="text-xs text-text-muted">
                  {copy.version} {doc.currentVersion}
                  {doc.acceptedVersion ? ` · ${copy.lastAccepted} ${doc.acceptedVersion}` : ` · ${copy.required}`}
                </p>
              </div>
              <a
                href={meta.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold uppercase tracking-wide text-brand underline hover:text-brandHover"
              >
                {copy.view}
              </a>
            </li>
          );
        })}
      </ul>

      {error ? <p className="text-sm text-[var(--warning)]">{error}</p> : null}

      <Button
        type="button"
        size="sm"
        onClick={handleAccept}
        disabled={submitting}
        className="w-full px-3 py-2 text-sm"
      >
        {submitting ? copy.saving : copy.accept}
      </Button>
    </div>
  );

  if (status.shouldBlock) {
    return (
      <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-surface-on-media-dark-50 px-4 py-8">
        <div className="w-full max-w-md rounded-card border border-border bg-surface p-6 shadow-xl">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="pointer-events-auto fixed bottom-6 right-6 z-[999] w-full max-w-sm rounded-card border border-border bg-surface p-5 shadow-card">
      {content}
    </div>
  );
}
