import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
// @ts-expect-error plain ESM script without types
import * as monitor from '../scripts/ops/ops-monitor.mjs';

const m = monitor as any;
const MIN = 60_000;

test('dingtalk signature follows the official scheme and the url percent-encodes it', () => {
  const secret = 'SECtest';
  const ts = 1700000000000;
  const expected = crypto.createHmac('sha256', secret).update(`${ts}\n${secret}`).digest('base64');
  assert.equal(m.dingtalkSign(secret, ts), expected);
  const url = new URL(m.buildDingtalkUrl('https://oapi.dingtalk.com/robot/send?access_token=abc', secret, ts));
  assert.equal(url.searchParams.get('access_token'), 'abc');
  assert.equal(url.searchParams.get('timestamp'), String(ts));
  assert.equal(url.searchParams.get('sign'), expected);
  assert.ok(!m.buildDingtalkUrl('https://oapi.dingtalk.com/robot/send?access_token=abc', '', ts).includes('sign='));
});

test('tls expiry calculation and threshold', () => {
  const now = new Date('2026-11-16T00:00:00Z');
  assert.equal(m.tlsDaysLeft('Dec 16 00:00:00 2026 GMT', now), 30);
  assert.equal(m.tlsDaysLeft('garbage', now), null);
  assert.equal(m.evaluateTls('a.test', 'Nov 20 00:00:00 2026 GMT', now, 14).ok, false);
  assert.equal(m.evaluateTls('a.test', 'Nov 17 00:00:00 2026 GMT', now, 14).severity, 'critical');
  assert.equal(m.evaluateTls('a.test', 'Dec 16 00:00:00 2026 GMT', now, 14).ok, true);
});

const bad = (key: string, extra = {}) => ({ key, ok: false, detail: `${key} bad`, ...extra });
const good = (key: string) => ({ key, ok: true, detail: `${key} ok` });

test('state machine: needs two failures, reminds hourly, recovers once', () => {
  let t = 0;
  let r = m.updateState({}, [bad('a')], t);
  assert.equal(r.events.length, 0, 'first failure is silent');
  t += 5 * MIN;
  r = m.updateState(r.state, [bad('a')], t);
  assert.deepEqual(r.events.map((e: any) => e.type), ['alert']);
  t += 30 * MIN;
  r = m.updateState(r.state, [bad('a')], t);
  assert.equal(r.events.length, 0, 'no reminder before 60 minutes');
  t += 31 * MIN;
  r = m.updateState(r.state, [bad('a')], t);
  assert.deepEqual(r.events.map((e: any) => e.type), ['remind']);
  t += 5 * MIN;
  r = m.updateState(r.state, [good('a')], t);
  assert.deepEqual(r.events.map((e: any) => e.type), ['recover']);
  assert.deepEqual(r.state, {});
  r = m.updateState(r.state, [good('a')], t + 5 * MIN);
  assert.equal(r.events.length, 0);
});

test('state machine: a single blip never alerts and resets the counter; confirm=1 alerts immediately', () => {
  let r = m.updateState({}, [bad('a')], 0);
  r = m.updateState(r.state, [good('a')], 5 * MIN);
  r = m.updateState(r.state, [bad('a')], 10 * MIN);
  assert.equal(r.events.length, 0);
  assert.deepEqual(m.updateState({}, [bad('tls:x', { confirm: 1 })], 0).events.map((e: any) => e.type), ['alert']);
});

test('state machine: cleared app alerts recover, unreachable app source keeps them', () => {
  const first = m.updateState({}, [bad('app:x', { confirm: 1 })], 0);
  const kept = m.updateState(first.state, [bad('http:ops-health')], MIN, { preserve: ['app:'] });
  assert.ok(kept.state['app:x'].bad);
  assert.equal(kept.events.filter((e: any) => e.type === 'recover').length, 0);
  const cleared = m.updateState(first.state, [good('http:ops-health')], MIN);
  assert.deepEqual(cleared.events.map((e: any) => e.type), ['recover']);
});

test('failed delivery makes the alert fire again next run', () => {
  const r = m.updateState({}, [bad('a', { confirm: 1 })], 0);
  const reverted = m.revertNotifications({}, r.state, r.events);
  const again = m.updateState(reverted, [bad('a', { confirm: 1 })], MIN);
  assert.deepEqual(again.events.map((e: any) => e.type), ['alert']);
});

test('message formatting is Chinese markdown with branding and no secrets', () => {
  const msg = m.formatMessage(
    [{ type: 'alert', key: 'a', detail: '首页 /zh 返回 502', severity: 'critical' }, { type: 'recover', key: 'b', detail: '登录页 正常', since: 0 }],
    90 * MIN,
  );
  assert.match(msg.title, /^【Keyvo 告警】/);
  assert.match(msg.text, /严重.*首页 \/zh 返回 502/);
  assert.match(msg.text, /已恢复.*持续 90 分钟/);
  assert.equal(m.formatMessage([], 0), null);
  assert.match(m.formatHeartbeat([good('a')], 0).text, /全部 1 项检查正常/);
});

test('heartbeat is due once per Beijing day after the configured hour', () => {
  const nineBeijing = Date.UTC(2026, 10, 16, 1, 0); // 09:00 UTC+8
  assert.equal(m.heartbeatDue(undefined, nineBeijing - MIN, 9), false);
  assert.equal(m.heartbeatDue(undefined, nineBeijing, 9), true);
  assert.equal(m.heartbeatDue('2026-11-16', nineBeijing + 60 * MIN, 9), false);
  assert.equal(m.heartbeatDue('2026-11-15', nineBeijing, 9), true);
});

test('env file parser', () => {
  assert.deepEqual(m.parseEnvFile('# c\nA=1\nexport B="x y"\n\nC=\'z\'\nbad'), { A: '1', B: 'x y', C: 'z' });
});

function fakeFetch(routes: Record<string, () => { status: number; body?: string; delay?: number }>) {
  const calls: Array<{ url: string; init: any }> = [];
  const impl = async (url: string, init: any = {}) => {
    calls.push({ url, init });
    const handler = routes[url];
    if (!handler) throw Object.assign(new Error('no route'), { code: 'ECONNREFUSED' });
    const r = handler();
    return { status: r.status, ok: r.status < 300, text: async () => r.body ?? '', json: async () => JSON.parse(r.body ?? '{}') };
  };
  return { impl, calls };
}

test('httpCheck: status, JSON expectation, slow and unreachable', async () => {
  let clock = 0;
  const base = { slowMs: 5000, timeoutMs: 1000, now: () => clock };
  const ok = await m.httpCheck({ ...base, key: 'k', label: 'L', url: 'u', fetchImpl: async () => ({ status: 200, text: async () => '' }) });
  assert.equal(ok.ok, true);
  const wrong = await m.httpCheck({ ...base, key: 'k', label: 'L', url: 'u', fetchImpl: async () => ({ status: 502, text: async () => '' }) });
  assert.match(wrong.detail, /502/);
  const html = await m.httpCheck({ ...base, key: 'k', label: 'L', url: 'u', expectStatus: 401, expectJson: true, fetchImpl: async () => ({ status: 401, text: async () => '<html>' }) });
  assert.equal(html.ok, false);
  const slow = await m.httpCheck({ ...base, key: 'k', label: 'L', url: 'u', fetchImpl: async () => { clock += 6000; return { status: 200, text: async () => '' }; } });
  assert.match(slow.detail, /过慢/);
  const down = await m.httpCheck({ ...base, key: 'k', label: 'L', url: 'u', fetchImpl: async () => { throw Object.assign(new Error('x'), { code: 'ECONNREFUSED' }); } });
  assert.match(down.detail, /无法连接/);
});

test('main: end to end with injected fetch, clock, tls and state file (no network)', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ops-monitor-'));
  const stateFile = path.join(dir, 'state.json');
  let appStatus = 502;
  const sent: any[] = [];
  const env = {
    APP_BASE_URL: 'https://app.test', SUPABASE_URL: 'https://sb.test', SUPABASE_ANON_KEY: 'anon', OPS_CRON_SECRET: 'cron',
    TLS_HOSTS: 'app.test', KEYVO_OPS_STATE: stateFile, DINGTALK_WEBHOOK_URL: 'https://hook.test/robot/send?access_token=t', DINGTALK_SECRET: 's',
  };
  const routes = {
    'https://app.test/zh': () => ({ status: appStatus }),
    'https://app.test/login': () => ({ status: 200 }),
    'https://app.test/api/me/currency': () => ({ status: 401, body: '{"error":"x"}' }),
    'https://sb.test/auth/v1/health': () => ({ status: 200 }),
    'https://app.test/api/cron/ops-health': () => ({ status: 200, body: JSON.stringify({ ok: false, alerts: [{ key: 'stuck_jobs', severity: 'critical', message: '3 个任务卡住' }] }) }),
  };
  const ff = fakeFetch(routes);
  const fetchImpl = async (url: string, init: any) => {
    if (url.startsWith('https://hook.test')) { sent.push({ url, body: JSON.parse(init.body) }); return { ok: true, status: 200, json: async () => ({ errcode: 0 }) }; }
    return ff.impl(url, init);
  };
  let t = Date.UTC(2026, 10, 16, 0, 0);
  const deps = { fetchImpl, now: () => t, tlsExpiry: async () => 'Dec 31 00:00:00 2030 GMT', log: () => {} };
  assert.equal(await monitor.main([], env, deps), 1);
  assert.equal(sent.length, 0, 'first failing run is silent');
  t += 5 * MIN;
  assert.equal(await monitor.main([], env, deps), 1);
  assert.equal(sent.length, 1);
  assert.match(sent[0].body.markdown.text, /\/zh 返回 502/);
  assert.match(sent[0].body.markdown.text, /3 个任务卡住/);
  assert.ok(sent[0].url.includes('sign='));
  assert.equal(ff.calls.find((c) => c.url.endsWith('ops-health'))?.init.headers['x-cron-key'], 'cron');
  assert.equal(ff.calls.find((c) => c.url.includes('/auth/v1/health'))?.init.headers.apikey, 'anon');
  appStatus = 200;
  (routes as any)['https://app.test/api/cron/ops-health'] = () => ({ status: 200, body: '{"ok":true,"alerts":[]}' });
  t += 5 * MIN;
  assert.equal(await monitor.main([], env, deps), 0);
  assert.equal(sent.length, 2);
  assert.match(sent[1].body.markdown.title, /已恢复/);
  t += 5 * MIN;
  assert.equal(await monitor.main(['--dry-run'], env, deps), 0);
  assert.equal(sent.length, 2);
  assert.equal(await monitor.main(['--test'], env, deps), 0);
  assert.equal(sent.length, 3);
  fs.rmSync(dir, { recursive: true });
});

test('main without a webhook only prints and never calls the network for delivery', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ops-monitor-'));
  const logs: string[] = [];
  const fetchImpl = async (url: string) => { assert.ok(!url.includes('dingtalk')); throw Object.assign(new Error('x'), { code: 'ECONNREFUSED' }); };
  const code = await monitor.main(['--test'], { KEYVO_OPS_STATE: path.join(dir, 's.json') }, { fetchImpl, now: () => 0, tlsExpiry: async () => '', log: (x: string) => logs.push(x) });
  assert.equal(code, 0);
  assert.ok(logs.some((l) => l.includes('print only')));
  fs.rmSync(dir, { recursive: true });
});
