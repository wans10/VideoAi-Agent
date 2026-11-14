import { useEffect, useState } from 'react';
import { recordCheckoutInteractionEvent } from '@/lib/analytics/checkout-interaction-events';
import { CUSTOMER_CURRENCY } from '@/lib/customer-currency';

// Keyvo 2026-11-15: the Keyvo build charges in CNY, so the top-up modal starts in, and falls back to, the build's customer
// currency instead of a hard-coded USD (a failed /api/me/currency lookup must not quote the wrong currency).
const DEFAULT_TOPUP_CURRENCY: string = CUSTOMER_CURRENCY;

type CurrencyState = {
  token: string | null;
  status: 'idle' | 'loading' | 'ready';
  currency: string;
};

type QuoteState = {
  key: string;
  status: 'idle' | 'loading' | 'ready' | 'error';
  amountMinor: number | null;
};

export function useWorkspaceTopupPaymentQuote({
  accessToken,
  amountCents,
  enabled,
}: {
  accessToken: string | null;
  amountCents: number;
  enabled: boolean;
}) {
  const [currencyState, setCurrencyState] = useState<CurrencyState>({
    token: null,
    status: 'idle',
    currency: DEFAULT_TOPUP_CURRENCY,
  });
  const [quoteState, setQuoteState] = useState<QuoteState>({
    key: '',
    status: 'idle',
    amountMinor: null,
  });

  useEffect(() => {
    if (!enabled || !accessToken) return;
    const controller = new AbortController();
    setCurrencyState({ token: accessToken, status: 'loading', currency: DEFAULT_TOPUP_CURRENCY });
    async function loadCurrency() {
      const startedAt = performance.now();
      let currency = DEFAULT_TOPUP_CURRENCY;
      let status = 'fallback';
      let failureCategory: string | null = 'network';
      try {
        const response = await fetch('/api/me/currency', {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: controller.signal,
        });
        failureCategory = response.ok ? 'invalid_response' : 'http';
        const data = response.ok ? await response.json() : null;
        const preferred = String(data?.currency ?? '').toUpperCase();
        const enabledCurrencies = Array.isArray(data?.enabled) ? data.enabled.map((value: unknown) => String(value).toUpperCase()) : [];
        if (data?.ok && enabledCurrencies.includes(preferred)) {
          currency = preferred;
          status = 'ready';
          failureCategory = null;
        }
      } catch {
        // The build's customer currency is the checkout currency if the preference lookup fails.
      }
      if (!controller.signal.aborted) {
        recordCheckoutInteractionEvent({
          eventName: 'topup_currency_resolved', source: 'workspace', mode: 'hosted',
          metadata: { measurement_version: 1, currency, status, failure_category: failureCategory, latency_ms: Math.round(performance.now() - startedAt) },
        });
        setCurrencyState({ token: accessToken, status: 'ready', currency });
      }
    }
    void loadCurrency();
    return () => controller.abort();
  }, [accessToken, enabled]);

  const currencyReady = !accessToken || (currencyState.token === accessToken && currencyState.status === 'ready');
  const chargeCurrency = currencyReady && accessToken ? currencyState.currency : DEFAULT_TOPUP_CURRENCY;
  const quoteKey = `${accessToken ?? 'guest'}:${chargeCurrency}:${amountCents}`;

  useEffect(() => {
    if (!enabled || !currencyReady) return;
    const controller = new AbortController();
    setQuoteState({ key: quoteKey, status: 'loading', amountMinor: null });
    async function loadQuote() {
      const startedAt = performance.now();
      let failureCategory = 'network';
      function measureQuote(status: 'ready' | 'error', amountMinor: number | null) {
        if (!accessToken) return;
        recordCheckoutInteractionEvent({
          eventName: 'topup_quote_resolved', source: 'workspace', mode: 'hosted', amountCents,
          metadata: {
            measurement_version: 1, currency: chargeCurrency, status,
            latency_ms: Math.round(performance.now() - startedAt),
            failure_category: status === 'error' ? failureCategory : null,
            payment_amount_minor: amountMinor, tax_included: false,
          },
        });
      }
      try {
        const response = await fetch('/api/topup/quote', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({ currency: chargeCurrency, amounts: [amountCents] }),
          signal: controller.signal,
        });
        failureCategory = response.ok ? 'invalid_response' : 'http';
        const data = response.ok ? await response.json() : null;
        // The quote route returns walletAmountCents (wallet-currency cents); usdAmountCents is the upstream field name,
        // kept as a fallback exactly like the billing page hook (useBillingTopupQuotes).
        const match = Array.isArray(data?.quotes)
          ? data.quotes.find((entry: Record<string, unknown>) =>
              Number(entry.walletAmountCents ?? entry.usdAmountCents) === amountCents && String(entry.currency).toUpperCase() === chargeCurrency)
          : null;
        const amountMinor = Number(match?.localAmountMinor);
        if (!data?.ok || !match || !Number.isFinite(amountMinor) || amountMinor <= 0) {
          throw new Error('topup_quote_unavailable');
        }
        if (!controller.signal.aborted) {
          measureQuote('ready', amountMinor);
          setQuoteState({ key: quoteKey, status: 'ready', amountMinor });
        }
      } catch {
        if (!controller.signal.aborted) {
          measureQuote('error', null);
          setQuoteState({ key: quoteKey, status: 'error', amountMinor: null });
        }
      }
    }
    void loadQuote();
    return () => controller.abort();
  }, [accessToken, amountCents, chargeCurrency, currencyReady, enabled, quoteKey]);

  const currentQuote = quoteState.key === quoteKey;
  return {
    chargeCurrency,
    paymentAmountMinor: enabled && currentQuote && quoteState.status === 'ready' ? quoteState.amountMinor : null,
    quoteLoading: enabled && (!currencyReady || !currentQuote || quoteState.status === 'idle' || quoteState.status === 'loading'),
    quoteError: enabled && currencyReady && currentQuote && quoteState.status === 'error',
  };
}
