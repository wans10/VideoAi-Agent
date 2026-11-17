// Keyvo hides the WeChat Pay button (KEYVO_WECHAT_PAY_HIDDEN). Only the UI offering is hidden: the API keeps the `wxpay` type.
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DEFAULT_BILLING_COPY } from '../frontend/app/(core)/billing/_lib/billing-copy';
import { KEYVO_WECHAT_PAY_HIDDEN, isKeyvoWechatPayHidden } from '../frontend/config/keyvo-disabled-features';

(globalThis as typeof globalThis & { React: typeof React }).React = React;
const req = createRequire(import.meta.url);
(req.extensions as Record<string, unknown>)['.css'] = (m: { exports: unknown }) => { const names: Record<string, string> = new Proxy({}, { get: (_t, k) => String(k) }); m.exports = { __esModule: true, default: names }; };
const { LlmhubPayCheckout } = req('../frontend/app/(core)/billing/_components/LlmhubPayCheckout.client') as typeof import('../frontend/app/(core)/billing/_components/LlmhubPayCheckout.client');
const zh = JSON.parse(readFileSync('frontend/messages/zh.json', 'utf8')).workspace.billing;
const copy = { ...DEFAULT_BILLING_COPY, wallet: { ...DEFAULT_BILLING_COPY.wallet, ...zh.wallet } };
const props = { accountId: 'acct', accessToken: null, amountCents: 8000, captchaToken: null, copy, creditsLabel: '¥80', enabled: true, onAuthRequired() {}, onCaptchaRequired() {}, onRateLimited() {} };
const render = () => renderToStaticMarkup(React.createElement(LlmhubPayCheckout, props as never));

test('the flag is on and the checkout offers 支付宝 only', () => {
  assert.equal(KEYVO_WECHAT_PAY_HIDDEN, true);
  assert.equal(isKeyvoWechatPayHidden(), true);
  const html = render();
  assert.match(html, /支付宝/);
  assert.doesNotMatch(html, /微信/);
  assert.equal((html.match(/<button/g) ?? []).length, 1);
  assert.match(html, /llmhubButtonsSingle/);
});

test('the test-only switch reopens the WeChat Pay button without touching the copy keys', () => {
  process.env.KEYVO_WECHAT_PAY_FULL_UI = '1';
  try {
    assert.equal(isKeyvoWechatPayHidden(), false);
    const html = render();
    assert.match(html, /支付宝/);
    assert.match(html, /微信支付/);
    assert.doesNotMatch(html, /llmhubButtonsSingle/);
  } finally {
    delete process.env.KEYVO_WECHAT_PAY_FULL_UI;
  }
  for (const l of ['zh', 'en', 'fr', 'es']) {
    const wallet = JSON.parse(readFileSync(`frontend/messages/${l}.json`, 'utf8')).workspace.billing.wallet;
    assert.equal(typeof wallet.llmhubWxpay, 'string', l);
    assert.equal(typeof wallet.llmhubTitleAlipayOnly, 'string', l);
  }
  assert.equal(zh.wallet.llmhubTitleAlipayOnly, '支付宝');
  assert.equal(zh.wallet.llmhubTitle, '支付宝或微信支付');
});

test('the checkout API and order types still accept wxpay', () => {
  assert.match(readFileSync('frontend/app/api/llmhub-pay/checkout/route.ts', 'utf8'), /type !== 'wxpay'/);
  assert.match(readFileSync('frontend/server/llmhub-pay/client.ts', 'utf8'), /'alipay' \| 'wxpay'/);
});
