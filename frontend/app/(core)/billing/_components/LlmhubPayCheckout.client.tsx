'use client';

import { useEffect, useRef, useState } from 'react';
import type { BillingCopy } from '../_lib/billing-copy';
import styles from './billing-topup.module.css';

type Quote = { amountFen: number; amountCents: number; currency: 'CNY' };
type PaymentType = 'alipay' | 'wxpay';

export function LlmhubPayCheckout({
  accountId,
  accessToken,
  amountCents,
  captchaToken,
  copy,
  creditsLabel,
  enabled,
  onAuthRequired,
  onCaptchaRequired,
  onRateLimited,
}: {
  accountId: string | null;
  accessToken: string | null;
  amountCents: number;
  captchaToken: string | null;
  copy: BillingCopy;
  creditsLabel: string;
  enabled: boolean;
  onAuthRequired: () => void;
  onCaptchaRequired: () => void;
  onRateLimited: (seconds: number | null) => void;
}) {
  const request = useRef<{id: string; amount: number; type: PaymentType} | null>(null);
  const [pending, setPending] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const storageKey = accountId ? `keyvo-payment:${accountId}` : null;
  useEffect(() => {
    request.current = null; setPending(false);
    if (!storageKey) return;
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey) ?? 'null');
      if (saved && typeof saved.id === 'string' && /^[0-9a-f-]{36}$/i.test(saved.id) && Number.isSafeInteger(saved.amount) && ['alipay','wxpay'].includes(saved.type)) { request.current = saved; setPending(true); }
    } catch { /* Storage is optional; the server identity still protects retries. */ }
  }, [storageKey]);
  function clearRequest() { request.current = null; setPending(false); try { if(storageKey)sessionStorage.removeItem(storageKey); } catch {} }

  useEffect(() => {
    if (!enabled || !accessToken) { setQuote(null); return; }
    const controller = new AbortController();
    setLoading(true);
    setQuote(null);
    setError(null);
    void fetch('/api/llmhub-pay/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ amountCents }),
      signal: controller.signal,
    }).then(async (response) => {
      const data = await response.json().catch(() => null);
      if (!response.ok || data?.currency !== 'CNY' || !Number.isSafeInteger(data.amountFen)) throw new Error('quote_unavailable');
      if (!controller.signal.aborted) setQuote({ amountFen: data.amountFen, amountCents, currency: 'CNY' });
    }).catch(() => {
      if (!controller.signal.aborted) setError(copy.wallet.llmhubQuoteUnavailable);
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [accessToken, amountCents, copy.wallet.llmhubQuoteUnavailable, enabled]);

  async function start(type: PaymentType) {
    if (!accessToken) { onAuthRequired(); return; }
    if ((!pending && (!quote || quote.amountCents !== amountCents || loading)) || paying) return;
    if (!request.current) request.current = { id: crypto.randomUUID(), amount: amountCents, type };
    const identity = request.current;
    try { if(storageKey)sessionStorage.setItem(storageKey,JSON.stringify(identity)); } catch {}
    setPaying(true);
    setError(null);
    try {
      const response = await fetch('/api/llmhub-pay/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ requestId: identity.id, amountCents: identity.amount, expectedAmountFen: quote?.amountFen, type: identity.type, ...(captchaToken ? { captchaToken } : {}) }),
      });
      const data = await response.json().catch(() => null);
      if (data?.paid) { clearRequest(); window.location.assign('/billing?status=success'); return; }
      if (data?.pending) { setPending(true); setError(copy.checkoutReturn.pendingDetail); return; }
      if (data?.pending === false) { clearRequest(); }
      if (data?.captchaRequired) { onCaptchaRequired(); return; }
      if (response.status === 429) { onRateLimited(Number(data?.retryAfterSeconds) || null); return; }
      if (response.status === 409 && data?.error === 'quote_changed' && Number.isSafeInteger(data.amountFen)) {
        clearRequest();
        setQuote({ amountCents, amountFen: data.amountFen, currency: 'CNY' });
        setError(copy.wallet.llmhubQuoteChanged);
        return;
      }
      if (!response.ok || typeof data?.url !== 'string' || data?.currency !== 'CNY') throw new Error('checkout_failed');
      const url = new URL(data.url);
      if (url.protocol !== 'https:') throw new Error('invalid_redirect');
      window.location.assign(url.toString());
    } catch {
      setPending(true);
      setError(copy.checkoutReturn.pendingDetail);
    } finally {
      setPaying(false);
    }
  }

  const amountLabel = quote
    ? new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(quote.amountFen / 100)
    : loading ? copy.wallet.llmhubQuoteLoading : copy.wallet.llmhubQuoteUnavailable;

  return (
    <section className={styles.llmhubCheckout} aria-label={copy.wallet.llmhubTitle}>
      <strong>{copy.wallet.llmhubTitle}</strong>
      <p>{copy.wallet.llmhubDescription}</p>
      <div className={styles.llmhubAmount}>{copy.wallet.llmhubPaymentAmount}: <strong>{amountLabel}</strong></div>
      <div className={styles.llmhubAmount}>{copy.wallet.creditsReceived}: <strong>{creditsLabel}</strong></div>
      <div className={styles.llmhubButtons}>
        {pending ? <button type="button" disabled={paying} onClick={() => void start(request.current?.type ?? 'alipay')}>{copy.checkoutReturn.pendingTitle}</button> : null}
        <button type="button" disabled={pending || !enabled || (Boolean(accessToken) && (!quote || loading)) || paying} onClick={() => void start('alipay')}>{copy.wallet.llmhubAlipay}</button>
        <button type="button" disabled={pending || !enabled || (Boolean(accessToken) && (!quote || loading)) || paying} onClick={() => void start('wxpay')}>{copy.wallet.llmhubWxpay}</button>
      </div>
      {error ? <p role="alert" className={styles.llmhubError}>{error}</p> : null}
    </section>
  );
}
