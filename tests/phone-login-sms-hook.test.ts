import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import type { AddressInfo } from 'node:net';
import test from 'node:test';

// The hook is a standalone CommonJS service (docs/deployment/phone-login-sms); its SDKs are only loaded when
// no verifier/sender is injected, so these tests run without installing them.
const require = createRequire(`${process.cwd()}/tests/`);
const hook = require('../docs/deployment/phone-login-sms/hook.js');
const dir = 'docs/deployment/phone-login-sms';

const config = hook.readConfig({ ALI_AK: 'placeholder', ALI_SK: 'placeholder', ALI_SIGN: 'placeholder', ALI_TPL: 'SMS_000000000', HOOK_SECRET: 'v1,whsec_placeholder' });

async function withServer(options: Record<string, unknown>, run: (url: string) => Promise<void>) {
  const server = hook.createHookServer({ config, verify: (raw: string) => JSON.parse(raw), ...options });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  try { await run(`http://127.0.0.1:${port}`); } finally { await new Promise((resolve) => server.close(resolve)); }
}

function post(url: string, phone: string, id: string, otp = '123456') {
  return fetch(`${url}/send-sms`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'webhook-id': id, 'webhook-timestamp': '0', 'webhook-signature': 'v1,placeholder' },
    body: JSON.stringify({ user: { id: 'u', phone }, sms: { otp } }),
  });
}

function captureLogs() {
  const lines: string[] = [];
  const original = { log: console.log, error: console.error };
  console.log = (line: string) => lines.push(String(line));
  console.error = (line: string) => lines.push(String(line));
  return { lines, restore: () => Object.assign(console, original) };
}

test('hook accepts only mainland mobiles and masks numbers in logs', () => {
  assert.equal(hook.normalizeMainlandPhone('8613812345678'), '13812345678');
  assert.equal(hook.normalizeMainlandPhone('+8613812345678'), '13812345678');
  assert.equal(hook.normalizeMainlandPhone('008613812345678'), '13812345678');
  for (const bad of ['13812345678', '14155550100', '85291234567', '+14155550100', '8612812345678', '12812345678', '', null, 13812345678]) assert.equal(hook.normalizeMainlandPhone(bad), null, String(bad));
  assert.equal(hook.maskPhone('13812345678'), '138****5678');
  assert.equal(hook.maskPhone('12'), '***');
  assert.deepEqual(hook.missingConfig(hook.readConfig({})), ['ALI_AK', 'ALI_SK', 'ALI_SIGN', 'ALI_TPL', 'HOOK_SECRET']);
});

test('hook sends the template parameter, answers in the Supabase hook format and never logs secrets or codes', async () => {
  const sent: string[][] = [];
  const logs = captureLogs();
  try {
    await withServer({ send: async (phone: string, otp: string) => { sent.push([phone, otp]); return { ok: true, code: 'OK', requestId: 'req-1' }; } }, async (url) => {
      const ok = await post(url, '8613812345678', 'msg-1', '654321');
      assert.equal(ok.status, 200);
      assert.deepEqual(await ok.json(), {});
      assert.deepEqual(sent, [['13812345678', '654321']]);

      const foreign = await post(url, '85291234567', 'msg-2');
      assert.equal(foreign.status, 200, 'GoTrue only forwards http_code from a 200 response');
      assert.deepEqual(await foreign.json(), { error: { http_code: 400, message: 'Invalid phone number: only mainland China mobile numbers are supported.' } });

      const health = await fetch(`${url}/healthz`);
      assert.equal(health.status, 200);
      assert.equal((await health.json()).sent, 1);
    });
  } finally { logs.restore(); }
  const output = logs.lines.join('\n');
  assert.match(output, /138\*\*\*\*5678/);
  assert.doesNotMatch(output, /13812345678|654321|placeholder|whsec/);
});

test('hook rejects bad signatures and oversized bodies before doing any work', async () => {
  const logs = captureLogs();
  let sends = 0;
  try {
    await withServer({ verify: () => { throw new Error('bad'); }, send: async () => { sends += 1; return { ok: true }; } }, async (url) => {
      const res = await post(url, '8613812345678', 'msg-1');
      assert.equal(res.status, 401);
      const big = await fetch(`${url}/send-sms`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: 'x'.repeat(20 * 1024) });
      assert.equal(big.status, 413);
      assert.equal((await fetch(`${url}/other`)).status, 404);
      assert.equal((await fetch(`${url}/send-sms`)).status, 405);
    });
  } finally { logs.restore(); }
  assert.equal(sends, 0);
});

test('per-phone cooldown, hourly and global limits return 429 hook errors', async () => {
  let clock = Date.parse('2026-11-13T00:00:00Z');
  const limiter = hook.createRateLimiter({ phoneCooldownMs: 60_000, phonePerHour: 5, phonePerDay: 10, ipPerHour: 20, globalPerHour: 300 }, () => clock);
  assert.equal(limiter.take('13812345678', null), null);
  assert.equal(limiter.take('13812345678', null), 'phone_cooldown');
  for (let i = 0; i < 4; i += 1) { clock += 61_000; assert.equal(limiter.take('13812345678', null), null); }
  clock += 61_000;
  assert.equal(limiter.take('13812345678', null), 'phone_hourly');
  clock += 60 * 60_000;
  assert.equal(limiter.take('13812345678', null), null);
  for (let i = 0; i < 20; i += 1) assert.equal(limiter.take(`1390000${String(i).padStart(4, '0')}`, '203.0.113.9'), null);
  assert.equal(limiter.take('13700000000', '203.0.113.9'), 'ip_hourly');
  const global = hook.createRateLimiter({ phoneCooldownMs: 60_000, phonePerHour: 5, phonePerDay: 10, ipPerHour: 20, globalPerHour: 2 }, () => clock);
  global.take('13800000001', null); global.take('13800000002', null);
  assert.equal(global.take('13800000003', null), 'global_hourly');

  const logs = captureLogs();
  try {
    await withServer({ send: async () => ({ ok: true, code: 'OK' }) }, async (url) => {
      assert.deepEqual(await (await post(url, '8613812345678', 'a')).json(), {});
      assert.deepEqual(await (await post(url, '8613812345678', 'b')).json(), { error: { http_code: 429, message: 'Too many SMS requests. Please try again later.' } });
    });
  } finally { logs.restore(); }
});

test('Alibaba failures map to hook errors and a GoTrue retry never sends a second SMS', async () => {
  assert.equal(hook.hookErrorForAliyunCode('isv.BUSINESS_LIMIT_CONTROL').http_code, 429);
  assert.equal(hook.hookErrorForAliyunCode('isv.MOBILE_NUMBER_ILLEGAL').http_code, 400);
  assert.equal(hook.hookErrorForAliyunCode('isv.AMOUNT_NOT_ENOUGH').http_code, 503);
  assert.equal(hook.hookErrorForAliyunCode('Timeout').http_code, 503);
  await assert.rejects(hook.withTimeout(new Promise(() => {}), 10), /timed out/);

  const logs = captureLogs();
  let calls = 0;
  try {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    await withServer({ send: async () => { calls += 1; await gate; return { ok: true, code: 'OK' }; } }, async (url) => {
      const first = post(url, '8613812345678', 'same-id');
      await new Promise((resolve) => setTimeout(resolve, 50));
      const retry = post(url, '8613812345678', 'same-id');
      await new Promise((resolve) => setTimeout(resolve, 50));
      release();
      assert.deepEqual(await (await first).json(), {});
      assert.deepEqual(await (await retry).json(), {});
      assert.deepEqual(await (await post(url, '8613812345678', 'same-id')).json(), {});
    });
    assert.equal(calls, 1);
    await withServer({ send: async () => { throw Object.assign(new Error('boom'), { code: 'SignatureDoesNotMatch' }); } }, async (url) => {
      assert.deepEqual(await (await post(url, '8613812345678', 'x')).json(), { error: { http_code: 503, message: 'SMS provider unavailable. Please try again later.' } });
    });
  } finally { logs.restore(); }
});

test('deployment bundle pins exact dependency versions and keeps secrets as placeholders', () => {
  const pkg = JSON.parse(readFileSync(`${dir}/package.json`, 'utf8'));
  for (const [name, version] of Object.entries(pkg.dependencies as Record<string, string>)) assert.match(version, /^\d+\.\d+\.\d+$/, name);
  assert.deepEqual(Object.keys(pkg.dependencies).sort(), ['@alicloud/dysmsapi20170525', '@alicloud/openapi-client', 'standardwebhooks']);
  const lock = JSON.parse(readFileSync(`${dir}/package-lock.json`, 'utf8'));
  assert.equal(lock.packages['node_modules/@alicloud/dysmsapi20170525'].version, pkg.dependencies['@alicloud/dysmsapi20170525']);
  const dockerfile = readFileSync(`${dir}/Dockerfile`, 'utf8');
  assert.match(dockerfile, /^FROM node:22-alpine$/m);
  assert.match(dockerfile, /registry\.npmmirror\.com/);
  const gotrue = readFileSync(`${dir}/gotrue-env.example`, 'utf8');
  for (const line of ['GOTRUE_EXTERNAL_PHONE_ENABLED: "true"', 'GOTRUE_SMS_AUTOCONFIRM: "false"', 'GOTRUE_SMS_OTP_LENGTH: "6"', 'GOTRUE_SMS_OTP_EXP: "300"', 'GOTRUE_HOOK_SEND_SMS_ENABLED: "true"', 'GOTRUE_HOOK_SEND_SMS_URI:', 'GOTRUE_HOOK_SEND_SMS_SECRETS:', 'GOTRUE_RATE_LIMIT_SMS_SENT:']) {
    assert.ok(gotrue.includes(line), line);
  }
  const hookSource = readFileSync(`${dir}/hook.js`, 'utf8');
  assert.doesNotMatch(hookSource, /LTAI[0-9A-Za-z]{8,}/, 'no Alibaba AccessKey id in source');
  assert.match(hookSource, /templateParam: JSON\.stringify\(\{ code: otp \}\)/);
  for (const file of ['README.md', 'docker-compose.sms-hook.yml', 'gotrue-env.example', 'hook.js']) {
    const text = readFileSync(`${dir}/${file}`, 'utf8');
    assert.doesNotMatch(text, /LTAI[0-9A-Za-z]{8,}|whsec_[A-Za-z0-9+/]{20,}/, `${file} holds placeholders only`);
  }
});
