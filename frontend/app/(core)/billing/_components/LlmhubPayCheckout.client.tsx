'use client';

import { useEffect, useState } from 'react';
import type { BillingCopy } from '../_lib/billing-copy';
import styles from './billing-topup.module.css';

type Quote = { amountFen: number; amountCents: number; currency: 'CNY' };
type PaymentType = 'alipay' | 'wxpay';

export function LlmhubPayCheckout({
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
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (!quote || quote.amountCents !== amountCents || loading || paying) return;
    setPaying(true);
    setError(null);
    try {
      const response = await fetch('/api/llmhub-pay/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ amountCents, expectedAmountFen: quote.amountFen, type, ...(captchaToken ? { captchaToken } : {}) }),
      });
      const data = await response.json().catch(() => null);
      if (data?.captchaRequired) { onCaptchaRequired(); return; }
      if (response.status === 429) { onRateLimited(Number(data?.retryAfterSeconds) || null); return; }
      if (response.status === 409 && data?.error === 'quote_changed' && Number.isSafeInteger(data.amountFen)) {
        setQuote({ amountCents, amountFen: data.amountFen, currency: 'CNY' });
        setError(copy.wallet.llmhubQuoteChanged);
        return;
      }
      if (!response.ok || typeof data?.url !== 'string' || data?.currency !== 'CNY') throw new Error('checkout_failed');
      const url = new URL(data.url);
      if (url.protocol !== 'https:') throw new Error('invalid_redirect');
      window.location.assign(url.toString());
    } catch {
      setError(copy.wallet.llmhubCheckoutError);
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
        <button type="button" disabled={!enabled || (Boolean(accessToken) && (!quote || loading)) || paying} onClick={() => void start('alipay')}>{copy.wallet.llmhubAlipay}</button>
        <button type="button" disabled={!enabled || (Boolean(accessToken) && (!quote || loading)) || paying} onClick={() => void start('wxpay')}>{copy.wallet.llmhubWxpay}</button>
      </div>
      {error ? <p role="alert" className={styles.llmhubError}>{error}</p> : null}
    </section>
  );
}
