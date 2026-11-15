// Keyvo 2026-11-15: the workspace top-up modal must start in (and fall back to) the build's customer currency, and
// must read the quote route's `walletAmountCents` field (the billing page hook already does).
process.env.NEXT_PUBLIC_CUSTOMER_CURRENCY = 'CNY';
import assert from 'node:assert/strict';
import test from 'node:test';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';

test('a failed currency lookup falls back to CNY and the wallet-cents quote is matched', async () => {
  const { useWorkspaceTopupPaymentQuote } = await import('../frontend/app/(core)/(workspace)/app/_hooks/useWorkspaceTopupPaymentQuote');
  const dom = new JSDOM('<div id="root"></div>', { url: 'https://app.keyvo.test/app', pretendToBeVisual: true });
  const requests: Array<{ url: string; body: unknown }> = [];
  const fetcher = (async (url: string, options?: { body?: string }) => {
    requests.push({ url, body: options?.body ? JSON.parse(options.body) : null });
    if (url === '/api/me/currency') return Response.json({ ok: false }, { status: 503 });
    // Shape of the real /api/topup/quote response on the CNY build (no usdAmountCents field).
    return Response.json({ ok: true, currency: 'CNY', quotes: [{ walletAmountCents: 8000, localAmountMinor: 8000, currency: 'CNY' }] });
  }) as unknown as typeof fetch;
  const saved = new Map<string, PropertyDescriptor | undefined>();
  for (const [key, value] of Object.entries({
    window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, React,
    IS_REACT_ACT_ENVIRONMENT: true, fetch: fetcher, navigator: { sendBeacon: () => true },
  })) {
    saved.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  const root = createRoot(dom.window.document.getElementById('root')!);
  let result!: ReturnType<typeof useWorkspaceTopupPaymentQuote>;
  function Probe() {
    result = useWorkspaceTopupPaymentQuote({ amountCents: 8000, enabled: true, accessToken: 'test-token' });
    return null;
  }
  try {
    await act(async () => root.render(React.createElement(Probe)));
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });
    assert.equal(result.chargeCurrency, 'CNY', 'the fallback currency is the build currency, never a hard-coded USD');
    const quoteRequest = requests.find((request) => request.url === '/api/topup/quote');
    assert.deepEqual(quoteRequest?.body, { currency: 'CNY', amounts: [8000] });
    assert.equal(result.quoteError, false);
    assert.equal(result.paymentAmountMinor, 8000);
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
    for (const [key, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key);
    }
  }
});
