import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { createRequire } from 'node:module';
import { DEFAULT_BILLING_COPY } from '../frontend/app/(core)/billing/_lib/billing-copy';

const req = createRequire(import.meta.url);
(req.extensions as Record<string, unknown>)['.css'] = (m: { exports: unknown }) => { const names: Record<string, string> = new Proxy({}, { get: (_t, k) => String(k) }); m.exports = { __esModule: true, default: names }; };
const { LlmhubPayCheckout } = req('../frontend/app/(core)/billing/_components/LlmhubPayCheckout.client') as typeof import('../frontend/app/(core)/billing/_components/LlmhubPayCheckout.client');
const zh = JSON.parse(readFileSync('frontend/messages/zh.json', 'utf8')).workspace.billing;
const copy = {
  ...DEFAULT_BILLING_COPY,
  checkoutReturn: { ...DEFAULT_BILLING_COPY.checkoutReturn, ...zh.checkoutReturn },
};
const ID = '11111111-1111-4111-8111-111111111111';

test('zh copy: pending action is explicit, banner title stays, Stripe wording removed from receipts', () => {
  assert.equal(zh.checkoutReturn.pendingConfirmAction, '我已完成支付，点击确认到账');
  assert.equal(zh.checkoutReturn.pendingCancelAction, '取消本次支付');
  assert.match(zh.checkoutReturn.pendingHint, /取消本次支付/);
  assert.equal(zh.checkoutReturn.pendingTitle, '等待支付确认');
  assert.equal(zh.receipts.subtitle, '查看钱包充值与消费记录。');
  assert.equal(zh.receipts.documentsEmpty, '暂无可下载的单据，您的充值与消费记录请在「钱包流水」中查看。');
  assert.doesNotMatch(JSON.stringify(zh.receipts), /Stripe/);
  assert.doesNotMatch(JSON.stringify(zh.wallet), /Stripe/);
  for (const l of ['en', 'fr', 'es']) {
    const c = JSON.parse(readFileSync(`frontend/messages/${l}.json`, 'utf8')).workspace.billing.checkoutReturn;
    for (const k of ['pendingConfirmAction', 'pendingHint', 'pendingCancelAction']) assert.equal(typeof c[k], 'string');
  }
});

test('a remembered payment can be cancelled, and the next click gets a fresh request id', async () => {
  const dom = new JSDOM('<div id="root"></div>', { pretendToBeVisual: true, url: 'https://keyvo.test/billing' });
  const g = globalThis as Record<string, unknown>;
  const saved: Record<string, unknown> = {};
  for (const [k, v] of Object.entries({ window: dom.window, document: dom.window.document, navigator: dom.window.navigator, sessionStorage: dom.window.sessionStorage, HTMLElement: dom.window.HTMLElement, React, IS_REACT_ACT_ENVIRONMENT: true })) {
    saved[k] = Object.getOwnPropertyDescriptor(g, k); Object.defineProperty(g, k, { configurable: true, writable: true, value: v });
  }
  const bodies: string[] = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    if (String(url).endsWith('/quote')) return { ok: true, json: async () => ({ currency: 'CNY', amountFen: 8000 }) } as Response;
    bodies.push(String(init?.body));
    return { ok: false, status: 503, json: async () => ({ pending: true }) } as Response;
  }) as typeof fetch;
  const root = createRoot(dom.window.document.getElementById('root')!);
  const props = { accountId: 'acct', accessToken: 't', amountCents: 8000, captchaToken: null, copy, creditsLabel: '¥80', enabled: true, onAuthRequired() {}, onCaptchaRequired() {}, onRateLimited() {} };
  try {
    dom.window.sessionStorage.setItem('keyvo-payment:acct', JSON.stringify({ id: ID, amount: 8000, type: 'alipay' }));
    await act(async () => root.render(React.createElement(LlmhubPayCheckout, props)));
    const buttons = () => Array.from(dom.window.document.querySelectorAll('button'));
    const text = () => buttons().map((b) => b.textContent);
    assert.ok(text().includes('我已完成支付，点击确认到账'));
    assert.ok(!text().includes('等待支付确认'));
    assert.match(dom.window.document.body.textContent ?? '', /如果您已经付款/);
    assert.ok(buttons().filter((b) => b.textContent === copy.wallet.llmhubAlipay).every((b) => b.disabled));
    await act(async () => buttons().find((b) => b.textContent === '取消本次支付')!.click());
    assert.equal(dom.window.sessionStorage.getItem('keyvo-payment:acct'), null);
    assert.ok(!text().includes('取消本次支付'));
    const alipay = buttons().find((b) => b.textContent === copy.wallet.llmhubAlipay)!;
    assert.equal(alipay.disabled, false);
    await act(async () => alipay.click());
    const fresh = JSON.parse(bodies[0]).requestId;
    assert.match(fresh, /^[0-9a-f-]{36}$/i);
    assert.notEqual(fresh, ID);
  } finally {
    await act(async () => root.unmount());
    globalThis.fetch = realFetch;
    for (const [k, d] of Object.entries(saved)) { if (d) Object.defineProperty(g, k, d as PropertyDescriptor); else delete g[k]; }
    dom.window.close();
  }
});

test('Keyvo shows the payment currency as fixed zh text that wraps inside its card', () => {
  const src = readFileSync('frontend/app/(core)/billing/_components/WalletTopupPanel.tsx', 'utf8');
  assert.doesNotMatch(src, /<select|<option/);
  assert.equal(zh.wallet.currencyLabel, '支付币种');
  assert.equal(zh.wallet.currencyNames.CNY, '人民币（CNY）');
  const css = readFileSync('frontend/app/(core)/billing/_components/billing-topup.module.css', 'utf8');
  assert.match(css.match(/\.currencyField \{[^}]*\}/)![0], /min-width: 0/);
  assert.match(css.match(/\.currencyField \.currencyFixed \{[^}]*\}/)![0], /overflow-wrap: anywhere/);
  assert.match(css.match(/\.reviewHeading \{[^}]*\}/)![0], /flex-wrap: wrap/);
  assert.doesNotMatch(css, /max-width: 104px/);
});

test('receipts open on wallet activity when there are no downloadable documents', async () => {
  const dom = new JSDOM('<div id="root"></div>', { pretendToBeVisual: true, url: 'https://keyvo.test/billing' });
  const g = globalThis as Record<string, unknown>;
  const saved: Record<string, unknown> = {};
  for (const [k, v] of Object.entries({ window: dom.window, document: dom.window.document, navigator: dom.window.navigator, HTMLElement: dom.window.HTMLElement, React, IS_REACT_ACT_ENVIRONMENT: true })) {
    saved[k] = Object.getOwnPropertyDescriptor(g, k); Object.defineProperty(g, k, { configurable: true, writable: true, value: v });
  }
  const scopes: string[] = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string) => {
    const scope = new URL(url, 'https://keyvo.test').searchParams.get('scope') ?? '';
    scopes.push(scope);
    const receipts = scope === 'activity' ? [{ id: 'r1', type: 'topup', amount_cents: 8000, currency: 'CNY', created_at: '2026-11-01' }] : [];
    return { ok: true, json: async () => ({ ok: true, receipts, nextCursor: null }) } as Response;
  }) as typeof fetch;
  const { useBillingReceipts } = req('../frontend/app/(core)/billing/_hooks/useBillingReceipts') as typeof import('../frontend/app/(core)/billing/_hooks/useBillingReceipts');
  let view = '';
  function Probe() {
    view = useBillingReceipts({ session: { user: { id: 'u1' }, access_token: 't' } as never, authLoading: false, loadReceiptsError: 'e', loadMoreError: 'm' }).receiptsView;
    return null;
  }
  const root = createRoot(dom.window.document.getElementById('root')!);
  try {
    await act(async () => root.render(React.createElement(Probe)));
    await act(async () => { await new Promise((r) => setTimeout(r, 20)); });
    assert.equal(view, 'activity');
    assert.deepEqual(scopes.slice(0, 2), ['documents', 'activity']);
  } finally {
    await act(async () => root.unmount());
    globalThis.fetch = realFetch;
    for (const [k, d] of Object.entries(saved)) { if (d) Object.defineProperty(g, k, d as PropertyDescriptor); else delete g[k]; }
    dom.window.close();
  }
});
