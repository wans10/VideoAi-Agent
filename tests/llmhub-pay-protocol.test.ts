import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import test from 'node:test';

import {
  canonicalLlmhubPayFields,
  createLlmhubPayOrder,
  getLlmhubPaySiteOrigin,
  signLlmhubPayFields,
  signedFieldsFromUrl,
  signedFieldsFromParams,
  verifyLlmhubPayFields,
} from '../frontend/server/llmhub-pay/client';
import { formatFenAsYuan, parseYuanToFen, settleLlmhubPayOrderInTransaction } from '../frontend/server/llmhub-pay/orders';

const merchant = generateKeyPairSync('rsa', { modulusLength: 2048 });
const platform = generateKeyPairSync('rsa', { modulusLength: 2048 });
const merchantPrivateKey = merchant.privateKey.export({ format: 'pem', type: 'pkcs8' }).toString();
const merchantPublicKey = merchant.publicKey.export({ format: 'pem', type: 'spki' }).toString();
const platformPrivateKey = platform.privateKey.export({ format: 'pem', type: 'pkcs8' }).toString();
const platformPublicKey = platform.publicKey.export({ format: 'pem', type: 'spki' }).toString();

test('RSA signatures sort every scalar field and include future callback fields', () => {
  const fields = { type: 'alipay', money: '12.30', out_trade_no: 'mv123', pid: 1001, extra: 'future', empty: '', sign_type: 'RSA' };
  assert.equal(canonicalLlmhubPayFields(fields), 'extra=future&money=12.30&out_trade_no=mv123&pid=1001&type=alipay');
  const signed = { ...fields, sign: signLlmhubPayFields(fields, platformPrivateKey) };
  assert.equal(verifyLlmhubPayFields(signed, platformPublicKey), true);
  assert.equal(verifyLlmhubPayFields({ ...signed, money: '12.31' }, platformPublicKey), false);
  assert.equal(verifyLlmhubPayFields({ ...signed, added_field: 'changed' }, platformPublicKey), false);
  assert.equal(verifyLlmhubPayFields({ ...signed, sign_type: 'MD5' }, platformPublicKey), false);
  assert.equal(signedFieldsFromUrl(new URL('https://example.com/?pid=1&pid=2&sign=x')), null);
  assert.equal(signedFieldsFromParams(new URLSearchParams('pid=1&pid=2&sign=x')), null);
});

test('CNY amounts are parsed exactly in fen', () => {
  assert.equal(parseYuanToFen('12.30'), 1230);
  assert.equal(parseYuanToFen('0.01'), 1);
  assert.equal(parseYuanToFen('1.2'), 120);
  assert.equal(parseYuanToFen('1.234'), null);
  assert.equal(parseYuanToFen('-1.00'), null);
  assert.equal(formatFenAsYuan(1230), '12.30');
});

test('Billing availability and checkout share the same validated site origin', () => {
  const previous = process.env.NEXT_PUBLIC_SITE_URL;
  try {
    process.env.NEXT_PUBLIC_SITE_URL = '  https://example.com/path  ';
    assert.equal(getLlmhubPaySiteOrigin(), 'https://example.com');
    process.env.NEXT_PUBLIC_SITE_URL = 'http://test-server:3000';
    assert.equal(getLlmhubPaySiteOrigin(), null);
    process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3000';
    assert.equal(getLlmhubPaySiteOrigin(), 'http://localhost:3000');
    process.env.NEXT_PUBLIC_SITE_URL = 'https://user:pass@example.com';
    assert.equal(getLlmhubPaySiteOrigin(), null);
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = previous;
  }
});

test('order creation submits signed form fields and accepts only signed HTTPS jump responses', async () => {
  const config = { pid: '1001', merchantPrivateKey, platformPublicKey };
  const input = {
    outTradeNo: 'mv123', type: 'alipay' as const, money: '12.30',
    clientIp: '192.0.2.1', notifyUrl: 'https://example.com/notify', returnUrl: 'https://example.com/return',
  };
  const fakeFetch = async (_url: string | URL | Request, init?: RequestInit) => {
    const request = Object.fromEntries(new URLSearchParams(init?.body as URLSearchParams));
    assert.equal(request.method, 'jump');
    assert.equal(request.money, '12.30');
    assert.equal(request.name, 'Keyvo 账户充值');
    assert.equal(request.type, input.type);
    assert.equal(verifyLlmhubPayFields(request, merchantPublicKey), true);
    const payload = { code: 0, trade_no: 'platform123', pay_type: 'jump', pay_info: 'https://pay.example.com/checkout', timestamp: '1721206072', sign_type: 'RSA' };
    return Response.json({ ...payload, sign: signLlmhubPayFields(payload, platformPrivateKey) });
  };
  assert.deepEqual(await createLlmhubPayOrder(input, config, fakeFetch as typeof fetch), {
    tradeNo: 'platform123', url: 'https://pay.example.com/checkout',
  });
  assert.deepEqual(await createLlmhubPayOrder({ ...input, type: 'wxpay' }, config, (async (url, init) => {
    const request = Object.fromEntries(new URLSearchParams(init?.body as URLSearchParams));
    assert.equal(request.name, 'Keyvo 账户充值');
    assert.equal(request.type, 'wxpay');
    assert.equal(verifyLlmhubPayFields(request, merchantPublicKey), true);
    const payload = { code: 0, trade_no: 'wx123', pay_type: 'jump', pay_info: 'https://pay.example.com/wxpay', sign_type: 'RSA' };
    return Response.json({ ...payload, sign: signLlmhubPayFields(payload, platformPrivateKey) });
  }) as typeof fetch), { tradeNo: 'wx123', url: 'https://pay.example.com/wxpay' });
  await assert.rejects(() => createLlmhubPayOrder(input, config, async () => Response.json({ code: 0, trade_no: '123', pay_type: 'jump', pay_info: 'https://evil.example' })), /invalid_response_signature/);
  await assert.rejects(() => createLlmhubPayOrder(input, config, async () => Response.json({ code: -3, msg: '时间戳字段不正确' })), /llmhub_api_-3: 时间戳字段不正确/);
  await assert.rejects(() => createLlmhubPayOrder(input, config, async () => Response.json({ code: -3, msg: 'error', sign: 'invalid', sign_type: 'RSA' })), /invalid_response_signature/);
});

test('signed payment settlement checks merchant, order, type and exact CNY amount before one wallet receipt', async () => {
  const order = {
    out_trade_no: 'mv123', user_id: 'user-1', wallet_amount_cents: 1000,
    settlement_amount_fen: 7250, payment_type: 'alipay', provider_trade_no: null,
    status: 'pending', quote_metadata: { walletCurrency: 'USD', source: 'test', rateWithMargin: 7.25, paymentUrl: 'https://pay.example/private-token' },
  };
  const fields = { pid: '1001', out_trade_no: 'mv123', trade_no: 'provider-1', type: 'alipay', money: '72.50' };
  const calls: string[] = [];
  const executor = {
    async query<T>(sql: string, params?: ReadonlyArray<unknown>): Promise<T[]> {
      calls.push(sql);
      if (sql.includes('INSERT INTO app_receipts')) assert.equal(JSON.parse(String(params?.[3])).paymentUrl, undefined);
      if (sql.includes('SELECT * FROM llmhub_pay_topup_orders')) return [order] as T[];
      if (sql.includes('INSERT INTO app_receipts')) {
        assert.equal(params?.[0], 'user-1');
        assert.equal(params?.[1], 1000);
        assert.equal(params?.[2], 'USD');
        assert.equal(params?.[4], 7250);
        assert.equal(params?.[6], 'mv123');
        return [{ id: '42', created_at: new Date() }] as T[];
      }
      return [];
    },
  };
  await assert.rejects(() => settleLlmhubPayOrderInTransaction(executor, { ...fields, pid: '9999' }, '1001'), /invalid_payment_identity/);
  for (const altered of [{ type: 'wxpay' }, { money: '72.51' }, { trade_no: '' }]) {
    await assert.rejects(() => settleLlmhubPayOrderInTransaction(executor, { ...fields, ...altered }, '1001'));
  }
  assert.equal(calls.filter((sql) => sql.includes('INSERT INTO app_receipts')).length, 0);
  const paid = await settleLlmhubPayOrderInTransaction(executor, fields, '1001');
  assert.equal(paid.kind, 'paid');
  assert.match(calls[0], /FOR UPDATE/);
  assert.equal(calls.filter((sql) => sql.includes('INSERT INTO app_receipts')).length, 1);
  order.status = 'paid';
  assert.equal((await settleLlmhubPayOrderInTransaction(executor, fields, '1001')).kind, 'duplicate');
  assert.equal(calls.filter((sql) => sql.includes('INSERT INTO app_receipts')).length, 1);
});
