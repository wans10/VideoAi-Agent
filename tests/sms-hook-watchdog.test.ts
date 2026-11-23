import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
// @ts-expect-error plain ESM script without types
import * as watchdog from '../scripts/ops/sms-hook-watchdog.mjs';

const w = watchdog as any;
const MIN = 60_000;
const healthyAuth = { running: true, health: 'healthy', ageSeconds: 3600 };
const hookUp = { running: true, health: 'healthy', ageSeconds: 3600 };

test('decide: a healthy probe changes nothing', () => {
  const d = w.decide({ auth: healthyAuth, hook: hookUp, probeOk: true, state: { consecutiveFailures: 1 }, nowMs: 0 });
  assert.equal(d.action, 'ok');
  assert.equal(d.failures, 0);
});

test('decide: never acts while auth is starting, unhealthy, missing or inside the grace period', () => {
  for (const auth of [
    { running: false, health: 'missing', ageSeconds: 0 },
    { running: true, health: 'starting', ageSeconds: 5 },
    { running: true, health: 'unhealthy', ageSeconds: 999 },
    { running: true, health: 'healthy', ageSeconds: 30 },
  ]) {
    const d = w.decide({ auth, hook: hookUp, probeOk: false, state: { consecutiveFailures: 5 }, nowMs: 0 });
    assert.equal(d.action, 'skip', JSON.stringify(auth));
    assert.equal(d.failures, 0);
  }
});

test('decide: the first failed probe only waits, the second restarts', () => {
  const first = w.decide({ auth: healthyAuth, hook: hookUp, probeOk: false, state: {}, nowMs: 0 });
  assert.equal(first.action, 'wait');
  const second = w.decide({ auth: healthyAuth, hook: hookUp, probeOk: false, state: { consecutiveFailures: 1 }, nowMs: MIN });
  assert.equal(second.action, 'restart');
  assert.equal(second.reason, 'hook_unreachable_from_auth');
  const down = w.decide({ auth: healthyAuth, hook: { running: false, health: 'missing', ageSeconds: 0 }, probeOk: false, state: { consecutiveFailures: 1 }, nowMs: MIN });
  assert.equal(down.reason, 'hook_not_running');
});

test('decide: at most 3 restarts per 30 minutes, then alert only', () => {
  const now = 100 * MIN;
  const spent = { consecutiveFailures: 1, restarts: [now - 25 * MIN, now - 15 * MIN, now - 5 * MIN] };
  assert.equal(w.decide({ auth: healthyAuth, hook: hookUp, probeOk: false, state: spent, nowMs: now }).action, 'alert_only');
  const old = { consecutiveFailures: 1, restarts: [now - 80 * MIN, now - 70 * MIN, now - 60 * MIN] };
  assert.equal(w.decide({ auth: healthyAuth, hook: hookUp, probeOk: false, state: old, nowMs: now }).action, 'restart');
});

test('nextState: repaired and failed restarts, recovery notice, reminder spacing', () => {
  const restart = { action: 'restart', reason: 'x', failures: 2 };
  const fixed = w.nextState({}, restart, { nowMs: 1000, repaired: true });
  assert.equal(fixed.events[0].kind, 'repaired');
  assert.deepEqual(fixed.state.restarts, [1000]);
  const broken = w.nextState({}, restart, { nowMs: 1000, repaired: false });
  assert.equal(broken.events[0].kind, 'failed');
  assert.ok(broken.state.brokenSince);
  const recovered = w.nextState(broken.state, { action: 'ok', reason: 'probe_ok', failures: 0 }, { nowMs: 2000 });
  assert.equal(recovered.events[0].kind, 'recovered');
  assert.equal(recovered.state.brokenSince, null);
  const alertOnly = { action: 'alert_only', reason: 'restart_budget_spent', failures: 9 };
  const a1 = w.nextState({}, alertOnly, { nowMs: 0 });
  assert.equal(a1.events.length, 1);
  assert.equal(w.nextState(a1.state, alertOnly, { nowMs: 30 * MIN }).events.length, 0, 'no reminder inside the hour');
  assert.equal(w.nextState(a1.state, alertOnly, { nowMs: 61 * MIN }).events.length, 1, 'reminder after an hour');
});

test('message format is Chinese, has no phone numbers or secrets', () => {
  const text = w.formatMessage([{ kind: 'failed', text: '短信钩子故障' }], Date.UTC(2026, 10, 23, 0, 0));
  assert.match(text, /^【Keyvo 告警】短信钩子/);
  assert.match(text, /2026-11-23 08:00（北京时间）/);
  assert.doesNotMatch(text, /\b1[3-9]\d{9}\b|SEC|access_token/);
});

function fakeExec(script: Array<(args: string[]) => any>) {
  const calls: string[][] = [];
  const exec = async (_file: string, args: string[]) => {
    calls.push(args);
    const step = script.shift();
    return step ? step(args) : { ok: true, stdout: '', stderr: '', code: 0 };
  };
  return { exec, calls };
}
const inspectOk = (health = 'healthy', ageMs = 3_600_000) => () => ({ ok: true, stdout: `true|${health}|${new Date(Date.now() - ageMs).toISOString()}`, stderr: '', code: 0 });

test('main: probe failure twice restarts only the hook container and reports the repair', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wd-'));
  const env = { KEYVO_SMS_WATCHDOG_STATE: path.join(dir, 's.json'), KEYVO_OPS_ENV: path.join(dir, 'none.env') };
  const sent: string[] = [];
  const base = { sleep: async () => {}, send: async ({ message }: any) => { sent.push(message); return true; }, log: () => {} };
  const probeFail = () => ({ ok: false, stdout: '', stderr: 'refused', code: 1 });
  const probeOk = () => ({ ok: true, stdout: '{"ok":true}', stderr: '', code: 0 });
  // run 1: auth inspect, hook inspect, probe fail -> wait
  let f = fakeExec([inspectOk(), inspectOk(), probeFail]);
  assert.equal(await w.main([], env, { ...base, exec: f.exec, now: () => 1000 }), 0);
  assert.equal(sent.length, 0);
  // run 2: probe fail again -> restart hook, second probe ok -> repaired
  f = fakeExec([inspectOk(), inspectOk(), probeFail, () => ({ ok: true, stdout: '', stderr: '', code: 0 }), inspectOk(), inspectOk(), probeOk]);
  assert.equal(await w.main([], env, { ...base, exec: f.exec, now: () => 2000 }), 0);
  const restarts = f.calls.filter((a) => a[0] === 'restart');
  assert.deepEqual(restarts, [['restart', 'keyvo-sms-hook']]);
  assert.equal(f.calls.some((a) => a.includes('supabase-auth') && (a[0] === 'restart' || a[0] === 'stop' || a[0] === 'rm')), false, 'never touches auth');
  assert.equal(sent.length, 1);
  assert.match(sent[0], /已自动恢复/);
});

test('main: dry run restarts nothing, sends nothing, writes no state file', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wd-'));
  const state = path.join(dir, 's.json');
  const env = { KEYVO_SMS_WATCHDOG_STATE: state, KEYVO_OPS_ENV: path.join(dir, 'none.env') };
  const f = fakeExec([inspectOk(), inspectOk(), () => ({ ok: false, stdout: '', stderr: 'x', code: 1 })]);
  const code = await w.main(['--dry-run'], env, { exec: f.exec, send: async () => { throw new Error('must not send'); }, log: () => {}, now: () => 5 });
  assert.equal(code, 1);
  assert.equal(f.calls.some((a) => a[0] === 'restart'), false);
  assert.equal(fs.existsSync(state), false);
});

test('service and timer files match the script contract', () => {
  const svc = fs.readFileSync('scripts/ops/keyvo-sms-hook-watchdog.service', 'utf8');
  const tmr = fs.readFileSync('scripts/ops/keyvo-sms-hook-watchdog.timer', 'utf8');
  assert.match(svc, /ExecStart=\/usr\/bin\/node \/opt\/keyvo-ops\/sms-hook-watchdog\.mjs/);
  assert.match(svc, /SuccessExitStatus=1/);
  assert.match(tmr, /OnUnitActiveSec=1min/);
  const script = fs.readFileSync('scripts/ops/sms-hook-watchdog.mjs', 'utf8');
  assert.doesNotMatch(script, /docker['"],\s*\[\s*['"](compose|rm|stop|kill|up)/, 'script must not stop, recreate or compose anything');
});
