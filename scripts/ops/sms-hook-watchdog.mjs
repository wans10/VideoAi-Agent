#!/usr/bin/env node
// Keyvo SMS hook watchdog. Node 22+, no npm dependencies. Runs every minute on the Aliyun relay
// (the host that runs the self-hosted Supabase compose stack), next to ops-monitor.mjs.
//
// Why it exists: the SMS hook container shares the network namespace of the `supabase-auth` container
// (compose `network_mode: "service:auth"`, GoTrue only allows a localhost hook URI). Whenever `auth` is
// recreated on its own, the hook keeps the old namespace, GoTrue gets "connection refused" and every SMS
// login/sign-up fails with "短信服务暂时不可用" while both containers still report healthy. The only fix is to
// restart the hook container so it attaches to the new `auth` namespace. This watchdog detects exactly
// that condition from the path GoTrue really uses (inside the auth container) and repairs it.
//
//   node sms-hook-watchdog.mjs             check, repair if needed, alert via DingTalk
//   node sms-hook-watchdog.mjs --dry-run   check and print the decision; restart nothing, send nothing, write no state
//   node sms-hook-watchdog.mjs --test      send one DingTalk test message and exit
//
// Safety rules (all unit-tested in tests/sms-hook-watchdog.test.ts):
//   * It only ever runs `docker exec supabase-auth ...` (read-only probe) and `docker restart keyvo-sms-hook`.
//     It never restarts or recreates `supabase-auth`, never touches the compose file, never reads secrets.
//   * It does nothing while `supabase-auth` is starting/unhealthy or younger than the grace period: a
//     starting auth container is not a hook problem.
//   * A failed probe must repeat on two consecutive runs before it restarts anything (no flapping).
//   * At most 3 restarts per 30 minutes; after that it only alerts (no restart loop).
//   * Alerts: one message when it repairs, one critical message when it cannot, and one reminder per hour
//     while still broken. It never sends phone numbers or secrets.
//
// Exit codes: 0 healthy or repaired, 1 broken and not repaired, 2 configuration/internal error.
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDingtalkUrl, parseEnvFile } from './ops-monitor.mjs';

export const DEFAULTS = {
  authContainer: 'supabase-auth',
  hookContainer: 'keyvo-sms-hook',
  probeUrl: 'http://127.0.0.1:8787/healthz',
  authGraceSeconds: 90,
  consecutiveFailuresBeforeRestart: 2,
  maxRestartsPerWindow: 3,
  restartWindowMs: 30 * 60_000,
  settleMs: 12_000,
  remindMs: 60 * 60_000,
  commandTimeoutMs: 20_000,
};

/** Pure decision from the facts gathered in one run. */
export function decide({ auth, hook, probeOk, state, nowMs, config = DEFAULTS }) {
  const failures = probeOk ? 0 : (state.consecutiveFailures ?? 0) + 1;
  if (!auth.running) return { action: 'skip', reason: 'auth_not_running', failures: 0 };
  if (auth.health !== 'healthy') return { action: 'skip', reason: 'auth_not_healthy', failures: 0 };
  if (auth.ageSeconds < config.authGraceSeconds) return { action: 'skip', reason: 'auth_in_grace', failures: 0 };
  if (probeOk) return { action: 'ok', reason: 'probe_ok', failures: 0 };
  if (failures < config.consecutiveFailuresBeforeRestart) return { action: 'wait', reason: 'first_failure', failures };
  const recent = (state.restarts ?? []).filter((t) => nowMs - t < config.restartWindowMs);
  if (recent.length >= config.maxRestartsPerWindow) return { action: 'alert_only', reason: 'restart_budget_spent', failures };
  return { action: 'restart', reason: hook.running ? 'hook_unreachable_from_auth' : 'hook_not_running', failures };
}

/** Next state after the decision and, for a restart, the outcome of the second probe. */
export function nextState(prev, decision, { nowMs, repaired = null }) {
  const next = { ...prev, consecutiveFailures: decision.failures, restarts: (prev.restarts ?? []).filter((t) => nowMs - t < DEFAULTS.restartWindowMs) };
  const events = [];
  if (decision.action === 'restart') {
    next.restarts = [...next.restarts, nowMs];
    if (repaired) {
      events.push({ kind: 'repaired', text: '短信钩子已自动恢复：重启了 keyvo-sms-hook 容器，验证码发送通道已重新接通。' });
      next.brokenSince = null;
      next.lastAlertAt = nowMs;
    } else {
      events.push({ kind: 'failed', text: '短信钩子故障，自动重启后仍未恢复，验证码发送不可用。请登录阿里云中转机检查 supabase-auth 与 keyvo-sms-hook 容器。' });
      next.brokenSince = next.brokenSince ?? nowMs;
      next.lastAlertAt = nowMs;
    }
  } else if (decision.action === 'alert_only') {
    next.brokenSince = next.brokenSince ?? nowMs;
    if (next.lastAlertAt == null || nowMs - next.lastAlertAt >= DEFAULTS.remindMs) {
      events.push({ kind: 'failed', text: '短信钩子持续故障，30 分钟内已自动重启 3 次仍无效，已停止自动重启。请登录阿里云中转机排查。' });
      next.lastAlertAt = nowMs;
    }
  } else if (decision.action === 'ok') {
    if (prev.brokenSince) events.push({ kind: 'recovered', text: '短信钩子已恢复正常。' });
    next.brokenSince = null;
    next.lastAlertAt = null;
  }
  return { state: next, events };
}

export function formatMessage(events, nowMs, hostLabel = 'aliyun-relay') {
  const stamp = new Date(nowMs + 8 * 3_600_000).toISOString().replace('T', ' ').slice(0, 16);
  const head = events.some((e) => e.kind === 'failed') ? '【Keyvo 告警】' : '【Keyvo 监控】';
  return `${head}短信钩子\n${events.map((e) => `- ${e.text}`).join('\n')}\n\n时间：${stamp}（北京时间）　来源：${hostLabel}`;
}

function run(file, args, timeoutMs) {
  return new Promise((resolve) => {
    execFile(file, args, { timeout: timeoutMs, windowsHide: true }, (error, stdout, stderr) => {
      resolve({ ok: !error, code: error?.code ?? 0, stdout: String(stdout ?? '').trim(), stderr: String(stderr ?? '').trim() });
    });
  });
}

export async function gatherFacts(config, exec = run) {
  const inspect = async (name) => {
    const r = await exec('docker', ['inspect', '--format', '{{.State.Running}}|{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}|{{.State.StartedAt}}', name], config.commandTimeoutMs);
    if (!r.ok) return { running: false, health: 'missing', ageSeconds: 0 };
    const [running, health, startedAt] = r.stdout.split('|');
    const age = Math.max(0, Math.round((Date.now() - Date.parse(startedAt)) / 1000));
    return { running: running === 'true', health, ageSeconds: Number.isFinite(age) ? age : 0 };
  };
  const [auth, hook] = await Promise.all([inspect(config.authContainer), inspect(config.hookContainer)]);
  // The probe runs INSIDE the auth container: it is the same network namespace GoTrue calls the hook from.
  const probe = await exec('docker', ['exec', config.authContainer, 'wget', '-q', '-T', '4', '-O', '-', config.probeUrl], config.commandTimeoutMs);
  let probeOk = false;
  try { probeOk = probe.ok && JSON.parse(probe.stdout).ok === true; } catch { probeOk = false; }
  return { auth, hook, probeOk };
}

export async function sendDingtalk({ webhookUrl, secret, message, fetchImpl = fetch, nowMs = Date.now() }) {
  if (!webhookUrl) { console.log(`[sms-hook-watchdog] (no webhook configured) ${message.replace(/\n/g, ' | ')}`); return true; }
  const res = await fetchImpl(buildDingtalkUrl(webhookUrl, secret, nowMs), {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ msgtype: 'text', text: { content: message } }),
  });
  const body = await res.json().catch(() => ({}));
  return res.ok && (body.errcode === 0 || body.errcode === undefined);
}

function readState(file) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return {}; } }
function writeState(file, state) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(tmp, file);
}

export async function main(argv = process.argv.slice(2), env = process.env, deps = {}) {
  const exec = deps.exec ?? run;
  const sleep = deps.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  const now = deps.now ?? (() => Date.now());
  const send = deps.send ?? sendDingtalk;
  const log = deps.log ?? ((m) => console.log(`[sms-hook-watchdog] ${m}`));
  const dryRun = argv.includes('--dry-run');
  const envFile = env.KEYVO_OPS_ENV || '/etc/keyvo-ops.env';
  let fileEnv = {};
  try { fileEnv = parseEnvFile(fs.readFileSync(envFile, 'utf8')); } catch { /* optional: prints instead of sending */ }
  const webhookUrl = env.DINGTALK_WEBHOOK_URL || fileEnv.DINGTALK_WEBHOOK_URL || '';
  const secret = env.DINGTALK_SECRET || fileEnv.DINGTALK_SECRET || '';
  const stateFile = env.KEYVO_SMS_WATCHDOG_STATE || '/var/lib/keyvo-ops/sms-hook-watchdog.json';
  const config = { ...DEFAULTS };

  if (argv.includes('--test')) {
    const ok = await send({ webhookUrl, secret, message: formatMessage([{ kind: 'recovered', text: '这是一条短信钩子看门狗的测试消息。' }], now()) });
    return ok ? 0 : 2;
  }

  const prev = dryRun ? {} : readState(stateFile);
  const facts = await gatherFacts(config, exec);
  const nowMs = now();
  const decision = decide({ ...facts, state: prev, nowMs, config });
  log(`auth=${facts.auth.health}/${facts.auth.ageSeconds}s hook=${facts.hook.running ? 'running' : 'down'} probe=${facts.probeOk ? 'ok' : 'FAIL'} -> ${decision.action} (${decision.reason})`);

  let repaired = null;
  if (decision.action === 'restart') {
    if (dryRun) { log('dry run: would restart keyvo-sms-hook'); return facts.probeOk ? 0 : 1; }
    const r = await exec('docker', ['restart', config.hookContainer], 60_000);
    log(`docker restart ${config.hookContainer}: ${r.ok ? 'done' : `failed (${r.stderr.slice(0, 120)})`}`);
    await sleep(config.settleMs);
    repaired = (await gatherFacts(config, exec)).probeOk;
    log(`probe after restart: ${repaired ? 'ok' : 'FAIL'}`);
  }

  const { state, events } = nextState(prev, decision, { nowMs, repaired });
  if (dryRun) { events.forEach((e) => log(`dry run event: ${e.kind}: ${e.text}`)); return facts.probeOk || decision.action === 'skip' ? 0 : 1; }
  let delivered = true;
  if (events.length) delivered = await send({ webhookUrl, secret, message: formatMessage(events, nowMs, env.OPS_HOST_LABEL || 'aliyun-relay') }).catch(() => false);
  if (!delivered) { state.lastAlertAt = prev.lastAlertAt ?? null; log('alert delivery failed; will retry next run'); }
  writeState(stateFile, state);
  const broken = decision.action === 'alert_only' || (decision.action === 'restart' && !repaired);
  return broken ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then((code) => process.exit(code), (error) => { console.error('[sms-hook-watchdog] internal error', error?.message ?? error); process.exit(2); });
}
