#!/usr/bin/env node
// Keyvo external monitor. Node 22+, no npm dependencies. Run every 5 minutes from a host
// other than the app server (the Aliyun relay). See docs/operations/monitoring.md.
//
//   node ops-monitor.mjs              run all checks, alert via DingTalk (prints only without a webhook)
//   node ops-monitor.mjs --dry-run    print what would be sent, send nothing, write no state
//   node ops-monitor.mjs --test       send one test message and exit
//   node ops-monitor.mjs --heartbeat  send the "monitor alive" message now (cron: daily 09:00)
//
// Exit codes: 0 healthy, 1 at least one check is bad, 2 configuration/internal error,
// 3 an alert could not be delivered.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import tls from 'node:tls';
import { fileURLToPath } from 'node:url';

export const DEFAULTS = {
  appBase: 'https://app.keyvo.cn',
  supabaseBase: 'https://supabase.keyvo.cn',
  tlsHosts: ['app.keyvo.cn', 'supabase.keyvo.cn', 'keyvo.cn'],
  tlsWarnDays: 14,
  slowMs: 5000,
  timeoutMs: 10000,
  failuresBeforeAlert: 2,
  remindMinutes: 60,
  stateFile: '/var/lib/keyvo-ops/state.json',
};

// ---------- pure helpers ----------

export function parseEnvFile(text) {
  const out = {};
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    out[line.slice(0, eq).replace(/^export\s+/, '').trim()] = value;
  }
  return out;
}

/** DingTalk custom robot signature: base64(HMAC-SHA256(secret, `${timestamp}\n${secret}`)). */
export function dingtalkSign(secret, timestamp) {
  return crypto.createHmac('sha256', secret).update(`${timestamp}\n${secret}`).digest('base64');
}

export function buildDingtalkUrl(webhookUrl, secret, timestamp) {
  const url = new URL(webhookUrl);
  if (secret) {
    url.searchParams.set('timestamp', String(timestamp));
    url.searchParams.set('sign', dingtalkSign(secret, timestamp)); // searchParams percent-encodes + / =
  }
  return url.toString();
}

export function tlsDaysLeft(validTo, now) {
  const end = new Date(validTo).getTime();
  if (!Number.isFinite(end)) return null;
  return Math.floor((end - now.getTime()) / 86_400_000);
}

export function evaluateTls(host, validTo, now, warnDays) {
  const days = tlsDaysLeft(validTo, now);
  if (days === null) return { key: `tls:${host}`, ok: false, detail: `${host} 证书到期时间无法读取` };
  if (days < warnDays) return { key: `tls:${host}`, ok: false, severity: days < 3 ? 'critical' : 'warning', confirm: 1, detail: `${host} 的 TLS 证书将在 ${days} 天后到期（阈值 ${warnDays} 天），请续期` };
  return { key: `tls:${host}`, ok: true, detail: `${host} 证书剩余 ${days} 天` };
}

/**
 * One HTTP check. `expect` = { status, json?: boolean }. Slow responses (> slowMs) and timeouts are failures.
 */
export async function httpCheck({ key, label, url, headers = {}, expectStatus = 200, expectJson = false, fetchImpl, now, slowMs, timeoutMs }) {
  const started = now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, { headers, redirect: 'manual', signal: controller.signal });
    let text = '';
    try { text = await response.text(); } catch { /* body read problems count below */ }
    const elapsed = now() - started;
    if (response.status !== expectStatus) return { key, ok: false, detail: `${label} 返回 ${response.status}（应为 ${expectStatus}）`, ms: elapsed, body: text };
    if (expectJson) {
      try { JSON.parse(text); } catch { return { key, ok: false, detail: `${label} 返回的不是 JSON（可能被网关错误页替代）`, ms: elapsed, body: text }; }
    }
    if (elapsed > slowMs) return { key, ok: false, detail: `${label} 响应过慢 ${(elapsed / 1000).toFixed(1)} 秒（上限 ${slowMs / 1000} 秒）`, ms: elapsed, body: text };
    return { key, ok: true, detail: `${label} 正常 ${elapsed}ms`, ms: elapsed, body: text };
  } catch (error) {
    const aborted = error?.name === 'AbortError' || controller.signal.aborted;
    return { key, ok: false, detail: aborted ? `${label} 超时（>${timeoutMs / 1000} 秒）` : `${label} 无法连接（${String(error?.cause?.code ?? error?.code ?? error?.name ?? 'error')}）` };
  } finally {
    clearTimeout(timer);
  }
}

/** Turn the app ops-health JSON into per-alert results; the endpoint check itself is separate. */
export function alertsFromOpsHealth(body) {
  const alerts = Array.isArray(body?.alerts) ? body.alerts : [];
  return alerts
    .filter((a) => a && typeof a.key === 'string')
    .map((a) => ({
      key: `app:${a.key}`,
      ok: false,
      severity: a.severity === 'critical' ? 'critical' : 'warning',
      detail: String(a.message ?? a.key).slice(0, 300),
    }));
}

/**
 * State machine. state: { [key]: { bad, failures, since, lastNotified, detail } }.
 * A key turns "bad" after `failuresBeforeAlert` consecutive failing runs (result.confirm overrides),
 * reminds every `remindMinutes`, and recovers on the first good run.
 * Keys with a prefix in `preserve` that are absent from results keep their state (their source was unreachable).
 */
export function updateState(prev, results, nowMs, options = {}) {
  const required = options.failuresBeforeAlert ?? DEFAULTS.failuresBeforeAlert;
  const remindMs = (options.remindMinutes ?? DEFAULTS.remindMinutes) * 60_000;
  const preserve = options.preserve ?? [];
  const next = {};
  const events = [];
  const seen = new Set();
  for (const r of results) {
    seen.add(r.key);
    const old = prev[r.key] ?? { bad: false, failures: 0 };
    if (r.ok) {
      if (old.bad) events.push({ type: 'recover', key: r.key, detail: r.detail, since: old.since });
      continue; // good keys are dropped from state
    }
    const failures = (old.failures ?? 0) + 1;
    const confirm = r.confirm ?? required;
    const entry = { bad: old.bad, failures, since: old.since, lastNotified: old.lastNotified, detail: r.detail, severity: r.severity ?? 'critical' };
    if (!old.bad && failures >= confirm) {
      entry.bad = true;
      entry.since = nowMs;
      entry.lastNotified = nowMs;
      events.push({ type: 'alert', key: r.key, detail: r.detail, severity: entry.severity });
    } else if (old.bad && nowMs - (old.lastNotified ?? 0) >= remindMs) {
      entry.lastNotified = nowMs;
      events.push({ type: 'remind', key: r.key, detail: r.detail, severity: entry.severity, since: old.since });
    }
    next[r.key] = entry;
  }
  for (const [key, value] of Object.entries(prev)) {
    if (seen.has(key)) continue;
    if (preserve.some((p) => key.startsWith(p))) { next[key] = value; continue; }
    // Check no longer reported at all (e.g. an app alert that cleared): recovered.
    if (value.bad) events.push({ type: 'recover', key, detail: value.detail, since: value.since });
  }
  return { state: next, events };
}

/** After a failed delivery, make the same events fire again next run. */
export function revertNotifications(prev, next, events) {
  const out = { ...next };
  for (const e of events) {
    if (e.type === 'recover') {
      if (prev[e.key]) out[e.key] = prev[e.key];
    } else if (out[e.key]) {
      out[e.key] = e.type === 'alert' ? { ...out[e.key], bad: false } : { ...out[e.key], lastNotified: prev[e.key]?.lastNotified };
    }
  }
  return out;
}

const fmtTime = (ms) => new Date(ms + 8 * 3600_000).toISOString().replace('T', ' ').slice(0, 16) + ' (北京时间)';
const fmtDuration = (ms) => {
  const m = Math.max(1, Math.round(ms / 60_000));
  return m >= 120 ? `${Math.round(m / 60)} 小时` : `${m} 分钟`;
};

export function formatMessage(events, nowMs, hostLabel = 'keyvo-monitor') {
  if (!events.length) return null;
  const alerts = events.filter((e) => e.type === 'alert');
  const reminds = events.filter((e) => e.type === 'remind');
  const recovers = events.filter((e) => e.type === 'recover');
  const lines = [];
  const critical = [...alerts, ...reminds].some((e) => e.severity !== 'warning');
  const title = alerts.length || reminds.length ? `【Keyvo 告警】${critical ? '严重' : '提醒'} ${alerts.length + reminds.length} 项` : '【Keyvo 告警】已恢复';
  lines.push(`### ${title}`);
  for (const e of alerts) lines.push(`- **${e.severity === 'warning' ? '警告' : '严重'}**：${e.detail}`);
  for (const e of reminds) lines.push(`- **仍未恢复**（已持续 ${fmtDuration(nowMs - (e.since ?? nowMs))}）：${e.detail}`);
  for (const e of recovers) lines.push(`- **已恢复**：${e.detail ?? e.key}${e.since != null ? `（持续 ${fmtDuration(nowMs - e.since)}）` : ''}`);
  lines.push('', `时间：${fmtTime(nowMs)}　来源：${hostLabel}`);
  return { title, text: lines.join('\n') };
}

export function formatHeartbeat(results, nowMs, hostLabel = 'keyvo-monitor') {
  const bad = results.filter((r) => !r.ok);
  const body = bad.length ? `当前有 ${bad.length} 项异常：\n${bad.map((b) => `- ${b.detail}`).join('\n')}` : `全部 ${results.length} 项检查正常。`;
  return { title: '【Keyvo 监控】监控存活', text: `### 【Keyvo 监控】监控存活\n${body}\n\n时间：${fmtTime(nowMs)}　来源：${hostLabel}` };
}

/** Beijing calendar date and hour for the heartbeat schedule. */
export function beijingDateHour(nowMs) {
  const d = new Date(nowMs + 8 * 3600_000);
  return { date: d.toISOString().slice(0, 10), hour: d.getUTCHours() };
}

export function heartbeatDue(lastDate, nowMs, hour = 9) {
  const t = beijingDateHour(nowMs);
  return t.hour >= hour && t.date !== lastDate;
}

export async function sendDingtalk({ webhookUrl, secret, message, fetchImpl, nowMs, log = () => {} }) {
  const url = buildDingtalkUrl(webhookUrl, secret, nowMs);
  const body = JSON.stringify({ msgtype: 'markdown', markdown: { title: message.title, text: message.text } });
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetchImpl(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body, signal: AbortSignal.timeout(10_000) });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.errcode === 0) return true;
      log(`dingtalk attempt ${attempt} rejected: status=${res.status} errcode=${json.errcode} errmsg=${json.errmsg}`);
    } catch (error) {
      log(`dingtalk attempt ${attempt} failed: ${error?.name ?? 'error'}`);
    }
  }
  return false;
}

// ---------- runtime ----------

export function loadConfig(env) {
  const num = (v, d) => (Number.isFinite(Number(v)) && v !== undefined && v !== '' ? Number(v) : d);
  return {
    appBase: (env.APP_BASE_URL || DEFAULTS.appBase).replace(/\/$/, ''),
    supabaseBase: (env.SUPABASE_URL || DEFAULTS.supabaseBase).replace(/\/$/, ''),
    supabaseAnonKey: env.SUPABASE_ANON_KEY || '',
    opsCronSecret: env.OPS_CRON_SECRET || '',
    smsHookHealthUrl: env.SMS_HOOK_HEALTH_URL || '',
    tlsHosts: env.TLS_HOSTS ? env.TLS_HOSTS.split(',').map((h) => h.trim()).filter(Boolean) : DEFAULTS.tlsHosts,
    tlsWarnDays: num(env.TLS_WARN_DAYS, DEFAULTS.tlsWarnDays),
    slowMs: num(env.SLOW_MS, DEFAULTS.slowMs),
    timeoutMs: num(env.TIMEOUT_MS, DEFAULTS.timeoutMs),
    failuresBeforeAlert: num(env.FAILURES_BEFORE_ALERT, DEFAULTS.failuresBeforeAlert),
    remindMinutes: num(env.REMIND_MINUTES, DEFAULTS.remindMinutes),
    stateFile: env.KEYVO_OPS_STATE || DEFAULTS.stateFile,
    webhookUrl: env.DINGTALK_WEBHOOK_URL || '',
    secret: env.DINGTALK_SECRET || '',
    heartbeat: env.OPS_HEARTBEAT === '1',
    heartbeatHour: num(env.OPS_HEARTBEAT_HOUR, 9),
    hostLabel: env.OPS_HOST_LABEL || 'aliyun-relay',
  };
}

export function readTlsExpiry(host, timeoutMs = 10_000) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({ host, port: 443, servername: host, timeout: timeoutMs }, () => {
      const cert = socket.getPeerCertificate();
      socket.end();
      resolve(cert?.valid_to ?? null);
    });
    socket.on('timeout', () => { socket.destroy(); reject(new Error('timeout')); });
    socket.on('error', reject);
  });
}

export async function runChecks(config, deps) {
  const { fetchImpl, now, tlsExpiry } = deps;
  const common = { fetchImpl, now, slowMs: config.slowMs, timeoutMs: config.timeoutMs };
  const results = [];
  results.push(await httpCheck({ ...common, key: 'http:app-zh', label: '首页 /zh', url: `${config.appBase}/zh` }));
  results.push(await httpCheck({ ...common, key: 'http:app-login', label: '登录页 /login', url: `${config.appBase}/login` }));
  results.push(await httpCheck({ ...common, key: 'http:app-api', label: '应用接口 /api/me/currency', url: `${config.appBase}/api/me/currency`, expectStatus: 401, expectJson: true }));
  if (config.supabaseAnonKey) {
    results.push(await httpCheck({ ...common, key: 'http:supabase-auth', label: 'Supabase 登录服务', url: `${config.supabaseBase}/auth/v1/health`, headers: { apikey: config.supabaseAnonKey } }));
  }
  if (config.smsHookHealthUrl) {
    results.push(await httpCheck({ ...common, key: 'http:sms-hook', label: '短信 Hook 健康检查', url: config.smsHookHealthUrl }));
  }
  for (const host of config.tlsHosts) {
    try {
      results.push(evaluateTls(host, await tlsExpiry(host), new Date(now()), config.tlsWarnDays));
    } catch {
      results.push({ key: `tls:${host}`, ok: false, detail: `${host} 无法建立 TLS 连接读取证书` });
    }
  }
  let appHealthReachable = false;
  if (config.opsCronSecret) {
    const r = await httpCheck({ ...common, key: 'http:ops-health', label: '应用健康接口 ops-health', url: `${config.appBase}/api/cron/ops-health`, headers: { 'x-cron-key': config.opsCronSecret }, expectJson: true });
    results.push(r);
    if (r.ok) {
      try { results.push(...alertsFromOpsHealth(JSON.parse(r.body))); appHealthReachable = true; } catch { /* unreachable */ }
    }
  }
  for (const r of results) delete r.body;
  return { results, preserve: appHealthReachable || !config.opsCronSecret ? [] : ['app:'] };
}

function atomicWrite(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, content, { mode: 0o600 });
  fs.renameSync(tmp, file);
}

export async function main(argv, env, deps = {}) {
  const log = deps.log ?? ((m) => console.log(`${new Date().toISOString()} ${m}`));
  const fetchImpl = deps.fetchImpl ?? fetch;
  const now = deps.now ?? Date.now;
  const config = loadConfig(env);
  const dryRun = argv.includes('--dry-run');
  const deliver = async (message) => {
    if (dryRun || !config.webhookUrl) {
      log(`[${dryRun ? 'dry-run' : 'no webhook configured, print only'}] ${message.title}\n${message.text}`);
      return true;
    }
    return sendDingtalk({ webhookUrl: config.webhookUrl, secret: config.secret, message, fetchImpl, nowMs: now(), log });
  };

  if (argv.includes('--test')) {
    const ok = await deliver({ title: '【Keyvo 监控】测试消息', text: `### 【Keyvo 监控】测试消息\n如果你看到这条消息，说明钉钉机器人配置正确。\n\n时间：${fmtTime(now())}　来源：${config.hostLabel}` });
    return ok ? 0 : 3;
  }

  const { results, preserve } = await runChecks(config, { fetchImpl, now, tlsExpiry: deps.tlsExpiry ?? readTlsExpiry });
  let prev = {};
  let meta = {};
  try {
    const raw = JSON.parse(fs.readFileSync(config.stateFile, 'utf8'));
    prev = raw.checks ?? {};
    meta = raw.meta ?? {};
  } catch (error) {
    if (error?.code !== 'ENOENT') log(`state file unreadable, starting fresh: ${error?.message}`);
  }
  const nowMs = now();
  const { state, events } = updateState(prev, results, nowMs, { failuresBeforeAlert: config.failuresBeforeAlert, remindMinutes: config.remindMinutes, preserve });
  for (const r of results) log(`${r.ok ? 'OK ' : 'BAD'} ${r.key} ${r.detail}`);

  let finalState = state;
  let delivered = true;
  const message = formatMessage(events, nowMs, config.hostLabel);
  if (message) {
    delivered = await deliver(message);
    if (!delivered) finalState = revertNotifications(prev, state, events);
  }
  const hb = argv.includes('--heartbeat') || (config.heartbeat && heartbeatDue(meta.lastHeartbeat, nowMs, config.heartbeatHour));
  if (hb && (await deliver(formatHeartbeat(results, nowMs, config.hostLabel)))) meta.lastHeartbeat = beijingDateHour(nowMs).date;
  if (!dryRun) {
    try { atomicWrite(config.stateFile, JSON.stringify({ checks: finalState, meta }, null, 2)); } catch (error) { log(`cannot write state file ${config.stateFile}: ${error?.message}`); return 2; }
  }
  if (!delivered) return 3;
  return results.some((r) => !r.ok) ? 1 : 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const envFile = process.env.KEYVO_OPS_ENV || '/etc/keyvo-ops.env';
  let fileEnv = {};
  try { fileEnv = parseEnvFile(fs.readFileSync(envFile, 'utf8')); } catch (error) { if (process.env.KEYVO_OPS_ENV) { console.error(`cannot read KEYVO_OPS_ENV=${envFile}`); process.exit(2); } }
  main(process.argv.slice(2), { ...fileEnv, ...process.env }).then(
    (code) => process.exit(code),
    (error) => { console.error(`ops-monitor crashed: ${error?.stack ?? error}`); process.exit(2); },
  );
}
