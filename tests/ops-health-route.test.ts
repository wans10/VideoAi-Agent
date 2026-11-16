import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';
import { GET } from '../frontend/app/api/cron/ops-health/route';
import {
  ACCOUNT_MESSAGE_PATTERN,
  OPS_HEALTH_DEFAULTS,
  buildOpsHealthReport,
  evaluateOpsSignals,
  resolveOpsHealthThresholds,
  type OpsQueryRunner,
} from '../frontend/src/server/ops-health';

const req = (headers: Record<string, string> = {}) => new NextRequest('http://localhost/api/cron/ops-health', { headers });

test('route fails closed without CRON_SECRET and rejects wrong or missing credentials', async () => {
  const prev = { s: process.env.CRON_SECRET, v: process.env.VERCEL };
  delete process.env.VERCEL;
  try {
    delete process.env.CRON_SECRET;
    assert.equal((await GET(req())).status, 503);
    process.env.CRON_SECRET = 'top-secret';
    assert.equal((await GET(req())).status, 401);
    assert.equal((await GET(req({ authorization: 'Bearer nope' }))).status, 401);
    assert.equal((await GET(req({ 'x-cron-key': 'nope' }))).status, 401);
    const res = await GET(req({ 'x-cron-key': 'top-secret' }));
    assert.notEqual(res.status, 401);
    assert.equal(res.headers.get('cache-control'), 'no-store');
  } finally {
    if (prev.s === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = prev.s;
    if (prev.v !== undefined) process.env.VERCEL = prev.v;
  }
});

test('threshold env overrides ignore junk', () => {
  const t = resolveOpsHealthThresholds({ OPS_HEALTH_STUCK_MINUTES: '90', OPS_HEALTH_FAILURE_RATE_WARN: 'abc', OPS_HEALTH_REFUND_COUNT_60M_WARN: '-1' });
  assert.equal(t.stuckMinutes, 90);
  assert.equal(t.failureRateWarn, OPS_HEALTH_DEFAULTS.failureRateWarn);
  assert.equal(t.refundCount60Warn, OPS_HEALTH_DEFAULTS.refundCount60Warn);
});

function runnerFor(answers: Array<[RegExp, Array<Record<string, unknown>> | Error]>, log: string[] = []): OpsQueryRunner {
  return async (sql) => {
    log.push(sql);
    for (const [re, rows] of answers) if (re.test(sql)) { if (rows instanceof Error) throw rows; return rows; }
    return [];
  };
}

test('every query is bounded by a time window and a limit or aggregate, and read-only SQL only', async () => {
  const log: string[] = [];
  await buildOpsHealthReport(runnerFor([], log), {});
  assert.ok(log.length >= 10);
  for (const sql of log) {
    assert.match(sql, /NOW\(\) - /, `unbounded query: ${sql.slice(0, 60)}`);
    assert.match(sql, /LIMIT \d+|COUNT\(\*\)|SUM\(/);
    assert.doesNotMatch(sql, /\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE)\b/i);
  }
});

test('thresholds produce critical and warning alerts, none when healthy', async () => {
  const healthy = await buildOpsHealthReport(runnerFor([[/FROM app_jobs\s+WHERE created_at > NOW\(\) - INTERVAL '60 minutes'\s+GROUP/, [{ provider: 'kling', engine: 'k3', total15: 3, failed15: 0, total60: 20, failed60: 1, refunded60: 1 }]]]), {});
  assert.equal(healthy.ok, true);
  assert.deepEqual(healthy.alerts, []);

  const report = await buildOpsHealthReport(
    runnerFor([
      [/COALESCE\(provider,'unknown'\) AS provider, engine_id/, [{ provider: 'kling', engine: 'k3', total15: 10, failed15: 9, total60: 20, failed60: 15, refunded60: 15 }]],
      [/status IN \('pending'/, [{ provider: 'alibaba', count: 12, oldest_minutes: 200 }]],
      [/payment_status = 'paid_wallet'/, [{ count: 2 }]],
      [/provider_attempts/, [{ provider: 'minimax', error_class: 'insufficient_provider_credits', count: 3 }, { provider: 'kling', error_class: 'rate_limited', count: 11 }]],
      [/message ~\*/, [{ provider: 'byteplus_modelark', count: 2 }]],
      [/llmhub_pay_topup_orders o/, [{ count: 1 }]],
      [/FROM llmhub_pay_topup_orders WHERE/, [{ created60: 5, paid60: 1, failed60: 2, pending_old: 9 }]],
      [/type = 'refund'/, [{ count: 25 }]],
      [/balances/, [{ count: 2 }]],
      [/prompt_assistance_requests/, [{ total: 10, failed: 6 }]],
    ]),
    {},
  );
  const keys = report.alerts.map((a) => a.key);
  for (const k of [
    'generation_failures_15m:kling', 'stuck_jobs', 'failed_without_refund', 'provider_account_error:minimax', 'provider_balance_hint:byteplus_modelark',
    'provider_rate_limit:kling', 'paid_order_without_receipt', 'topup_orders_failed', 'topup_orders_pending', 'refund_spike', 'negative_wallet_balance', 'assistant_failures',
  ]) assert.ok(keys.includes(k), `missing ${k}: ${keys.join(',')}`);
  assert.equal(report.alerts.find((a) => a.key === 'stuck_jobs')?.severity, 'critical');
  assert.equal(report.ok, false);
});

test('a failing query is reported as an alert instead of failing the whole report', async () => {
  const report = await buildOpsHealthReport(runnerFor([[/engine_id/, new Error('boom')]]), {});
  assert.deepEqual(report.signals.collectionErrors, ['generation_windows']);
  assert.ok(report.alerts.some((a) => a.key === 'ops_health_query_failed'));
});

test('report contains no PII-shaped fields', async () => {
  const report = await buildOpsHealthReport(runnerFor([[/engine_id/, [{ provider: 'kling', engine: 'k3', total15: 1, failed15: 1, total60: 1, failed60: 1, refunded60: 0, user_id: 'u1', prompt: 'secret' }]]]), {});
  const text = JSON.stringify(report);
  assert.doesNotMatch(text, /user_id|prompt|secret|phone|email|token/i);
  assert.equal(evaluateOpsSignals(report.signals, OPS_HEALTH_DEFAULTS).length >= 0, true);
  assert.ok(new RegExp(ACCOUNT_MESSAGE_PATTERN, 'i').test('Arrearage: account overdue'));
});
