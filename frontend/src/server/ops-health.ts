/**
 * Read-only operational health signals for the Keyvo external monitor
 * (scripts/ops/ops-monitor.mjs, docs/operations/monitoring.md).
 *
 * Every query is bounded by a recent created_at window (indexed) or an explicit
 * LIMIT, runs in a READ ONLY transaction with a statement timeout, and only ever
 * returns counts, ages and provider/engine/error-class labels. Never add user ids,
 * prompts, phone numbers, job messages or tokens to a signal.
 */

export type OpsSeverity = 'critical' | 'warning';
export type OpsAlert = { key: string; severity: OpsSeverity; message: string; value: number | string; threshold: number | string };
export type OpsQueryRunner = (sql: string, params?: ReadonlyArray<unknown>) => Promise<Array<Record<string, unknown>>>;

export type OpsHealthThresholds = {
  failureRateWarn: number; // 0..1 over 60 min per provider
  failureRateCritical: number; // 0..1 over 15 min per provider
  failureMinSamples: number;
  failureCount15Critical: number;
  stuckMinutes: number;
  stuckCountWarn: number;
  stuckCountCritical: number;
  unrefundedFailedMinutes: number;
  unrefundedFailedWarn: number;
  providerAccountErrorCritical: number;
  providerRateLimitWarn: number;
  pendingOrderMinutes: number;
  pendingOrderWarn: number;
  failedOrdersWarn: number;
  paidWithoutReceiptCritical: number;
  negativeBalanceWarn: number;
  refundCount60Warn: number;
  assistantFailureWarn: number;
};

export const OPS_HEALTH_DEFAULTS: OpsHealthThresholds = {
  failureRateWarn: 0.4,
  failureRateCritical: 0.7,
  failureMinSamples: 5,
  failureCount15Critical: 8,
  stuckMinutes: 45,
  stuckCountWarn: 3,
  stuckCountCritical: 10,
  unrefundedFailedMinutes: 10,
  unrefundedFailedWarn: 1,
  providerAccountErrorCritical: 1,
  providerRateLimitWarn: 10,
  pendingOrderMinutes: 30,
  pendingOrderWarn: 8,
  failedOrdersWarn: 1,
  paidWithoutReceiptCritical: 1,
  negativeBalanceWarn: 1,
  refundCount60Warn: 20,
  assistantFailureWarn: 5,
};

const ENV_NAMES: Record<keyof OpsHealthThresholds, string> = {
  failureRateWarn: 'OPS_HEALTH_FAILURE_RATE_WARN',
  failureRateCritical: 'OPS_HEALTH_FAILURE_RATE_CRITICAL',
  failureMinSamples: 'OPS_HEALTH_FAILURE_MIN_SAMPLES',
  failureCount15Critical: 'OPS_HEALTH_FAILURE_COUNT_15M_CRITICAL',
  stuckMinutes: 'OPS_HEALTH_STUCK_MINUTES',
  stuckCountWarn: 'OPS_HEALTH_STUCK_COUNT_WARN',
  stuckCountCritical: 'OPS_HEALTH_STUCK_COUNT_CRITICAL',
  unrefundedFailedMinutes: 'OPS_HEALTH_UNREFUNDED_MINUTES',
  unrefundedFailedWarn: 'OPS_HEALTH_UNREFUNDED_WARN',
  providerAccountErrorCritical: 'OPS_HEALTH_PROVIDER_ACCOUNT_ERROR_CRITICAL',
  providerRateLimitWarn: 'OPS_HEALTH_PROVIDER_RATE_LIMIT_WARN',
  pendingOrderMinutes: 'OPS_HEALTH_PENDING_ORDER_MINUTES',
  pendingOrderWarn: 'OPS_HEALTH_PENDING_ORDER_WARN',
  failedOrdersWarn: 'OPS_HEALTH_FAILED_ORDERS_WARN',
  paidWithoutReceiptCritical: 'OPS_HEALTH_PAID_WITHOUT_RECEIPT_CRITICAL',
  negativeBalanceWarn: 'OPS_HEALTH_NEGATIVE_BALANCE_WARN',
  refundCount60Warn: 'OPS_HEALTH_REFUND_COUNT_60M_WARN',
  assistantFailureWarn: 'OPS_HEALTH_ASSISTANT_FAILURE_WARN',
};

export function resolveOpsHealthThresholds(env: Record<string, string | undefined> = process.env): OpsHealthThresholds {
  const out = { ...OPS_HEALTH_DEFAULTS };
  for (const key of Object.keys(ENV_NAMES) as Array<keyof OpsHealthThresholds>) {
    const raw = env[ENV_NAMES[key]]?.trim();
    if (!raw) continue;
    const value = Number(raw);
    if (Number.isFinite(value) && value >= 0) out[key] = value;
  }
  return out;
}

/** Provider error classes that mean the vendor account itself is the problem (see the provider adapters' errors.ts). */
export const PROVIDER_ACCOUNT_ERROR_CLASSES = [
  'auth_error',
  'provider_account_error',
  'provider_access_denied',
  'insufficient_provider_credits',
] as const;
export const PROVIDER_RATE_LIMIT_ERROR_CLASSES = ['rate_limit', 'rate_limited', 'provider_quota_or_rate_limit', 'concurrent_limit'] as const;

/**
 * Vendor wording for balance/quota/credential problems in a stored job message
 * (Bailian Arrearage, Ark AccountOverdue/SetLimitExceeded, OpenAI insufficient_quota, ...).
 * Only counted in SQL; the text itself is never returned.
 */
export const ACCOUNT_MESSAGE_PATTERN =
  '(arrearage|accountoverdue|setlimitexceeded|quotaexceeded|insufficient[_ ]?(balance|quota|credit)|billing_hard_limit|invalid[_ ]?api[_ ]?key|balance not enough|欠费|余额不足)';

const STUCK_STATUSES = "('pending','queued','running','processing','in_progress')";

export type ProviderWindow = {
  provider: string;
  engine: string;
  total15: number;
  failed15: number;
  total60: number;
  failed60: number;
  refunded60: number;
};

export type OpsSignals = {
  generatedAt: string;
  generation: {
    byProvider: Array<{ provider: string; total15: number; failed15: number; total60: number; failed60: number; refunded60: number; failureRate15: number | null; failureRate60: number | null }>;
    byEngine: Array<{ engine: string; total60: number; failed60: number; failureRate60: number | null }>;
    stuck: { count: number; oldestMinutes: number | null; byProvider: Array<{ provider: string; count: number }> };
    failedWithoutRefund: number;
    refundedJobs60: number;
  };
  providerErrors: {
    byClass: Array<{ provider: string; errorClass: string; count60: number }>;
    accountErrors60: Array<{ provider: string; count: number }>;
    accountMessageHints60: Array<{ provider: string; count: number }>;
  };
  payments: {
    ordersCreated60: number;
    ordersPaid60: number;
    ordersFailed60: number;
    pendingOlderThanThreshold: number;
    paidWithoutReceipt24h: number;
    refundReceipts60: number;
  };
  wallet: { negativeBalanceUsers: number };
  signups: { last60: number | null; last24h: number | null };
  assistant: { requests60: number | null; failed60: number | null };
  collectionErrors: string[];
};

const num = (v: unknown) => (v === null || v === undefined ? 0 : Number(v));
const rate = (failed: number, total: number) => (total > 0 ? Math.round((failed / total) * 1000) / 1000 : null);

export async function collectOpsSignals(run: OpsQueryRunner, thresholds: OpsHealthThresholds, now: Date = new Date()): Promise<OpsSignals> {
  const errors: string[] = [];
  const safe = async <T>(name: string, fn: () => Promise<T>, fallback: T): Promise<T> => {
    try {
      return await fn();
    } catch {
      errors.push(name);
      return fallback;
    }
  };

  const windows = await safe(
    'generation_windows',
    async () =>
      (await run(
        `SELECT COALESCE(provider,'unknown') AS provider, engine_id AS engine,
           COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '15 minutes')::int AS total15,
           COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '15 minutes' AND status = 'failed')::int AS failed15,
           COUNT(*)::int AS total60,
           COUNT(*) FILTER (WHERE status = 'failed')::int AS failed60,
           COUNT(*) FILTER (WHERE payment_status = 'refunded_wallet')::int AS refunded60
         FROM app_jobs
         WHERE created_at > NOW() - INTERVAL '60 minutes'
         GROUP BY 1, 2 ORDER BY 5 DESC LIMIT 200`,
      )).map((r) => ({
        provider: String(r.provider),
        engine: String(r.engine),
        total15: num(r.total15),
        failed15: num(r.failed15),
        total60: num(r.total60),
        failed60: num(r.failed60),
        refunded60: num(r.refunded60),
      })),
    [] as ProviderWindow[],
  );

  const providerMap = new Map<string, Omit<ProviderWindow, 'engine'>>();
  for (const w of windows) {
    const p = providerMap.get(w.provider) ?? { provider: w.provider, total15: 0, failed15: 0, total60: 0, failed60: 0, refunded60: 0 };
    p.total15 += w.total15;
    p.failed15 += w.failed15;
    p.total60 += w.total60;
    p.failed60 += w.failed60;
    p.refunded60 += w.refunded60;
    providerMap.set(w.provider, p);
  }

  const stuckRows = await safe(
    'stuck_jobs',
    () =>
      run(
        `SELECT COALESCE(provider,'unknown') AS provider, COUNT(*)::int AS count,
           MAX(EXTRACT(EPOCH FROM (NOW() - created_at)) / 60)::int AS oldest_minutes
         FROM app_jobs
         WHERE created_at > NOW() - INTERVAL '48 hours'
           AND created_at < NOW() - ($1::int * INTERVAL '1 minute')
           AND status IN ${STUCK_STATUSES}
         GROUP BY 1 LIMIT 50`,
        [Math.floor(thresholds.stuckMinutes)],
      ),
    [] as Array<Record<string, unknown>>,
  );

  const unrefunded = await safe(
    'failed_without_refund',
    async () =>
      num(
        (
          await run(
            `SELECT COUNT(*)::int AS count FROM app_jobs
             WHERE created_at > NOW() - INTERVAL '24 hours'
               AND updated_at < NOW() - ($1::int * INTERVAL '1 minute')
               AND status = 'failed' AND payment_status = 'paid_wallet'`,
            [Math.floor(thresholds.unrefundedFailedMinutes)],
          )
        )[0]?.count,
      ),
    0,
  );

  const attemptRows = await safe(
    'provider_attempt_errors',
    () =>
      run(
        `SELECT COALESCE(pa.provider,'unknown') AS provider, pa.error_class AS error_class, COUNT(*)::int AS count
         FROM app_jobs j JOIN provider_attempts pa ON pa.job_id = j.id
         WHERE j.created_at > NOW() - INTERVAL '60 minutes' AND pa.error_class IS NOT NULL
         GROUP BY 1, 2 ORDER BY 3 DESC LIMIT 100`,
      ),
    [] as Array<Record<string, unknown>>,
  );

  const hintRows = await safe(
    'account_message_hints',
    () =>
      run(
        `SELECT COALESCE(provider,'unknown') AS provider, COUNT(*)::int AS count FROM app_jobs
         WHERE created_at > NOW() - INTERVAL '60 minutes' AND status = 'failed' AND message ~* $1
         GROUP BY 1 LIMIT 50`,
        [ACCOUNT_MESSAGE_PATTERN],
      ),
    [] as Array<Record<string, unknown>>,
  );

  const orders = await safe(
    'topup_orders',
    async () =>
      (
        await run(
          `SELECT
             COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '60 minutes')::int AS created60,
             COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '60 minutes' AND status = 'paid')::int AS paid60,
             COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '60 minutes' AND status = 'failed')::int AS failed60,
             COUNT(*) FILTER (WHERE status = 'pending' AND created_at < NOW() - ($1::int * INTERVAL '1 minute'))::int AS pending_old
           FROM llmhub_pay_topup_orders WHERE created_at > NOW() - INTERVAL '24 hours'`,
          [Math.floor(thresholds.pendingOrderMinutes)],
        )
      )[0] ?? {},
    {} as Record<string, unknown>,
  );

  const paidWithoutReceipt = await safe(
    'paid_without_receipt',
    async () =>
      num(
        (
          await run(
            `SELECT COUNT(*)::int AS count FROM llmhub_pay_topup_orders o
             WHERE o.created_at > NOW() - INTERVAL '24 hours' AND o.status = 'paid'
               AND o.updated_at < NOW() - INTERVAL '5 minutes'
               AND NOT EXISTS (SELECT 1 FROM app_receipts r WHERE r.llmhub_pay_out_trade_no = o.out_trade_no)`,
          )
        )[0]?.count,
      ),
    0,
  );

  const refundReceipts = await safe(
    'refund_receipts',
    async () =>
      num(
        (
          await run(
            `SELECT COUNT(*)::int AS count FROM app_receipts
             WHERE created_at > NOW() - INTERVAL '60 minutes' AND type = 'refund'`,
          )
        )[0]?.count,
      ),
    0,
  );

  const negative = await safe(
    'negative_balances',
    async () =>
      num(
        (
          await run(
            `WITH recent AS (
               SELECT DISTINCT user_id FROM app_receipts
               WHERE created_at > NOW() - INTERVAL '60 minutes' AND type IN ('charge','refund') LIMIT 500
             ), balances AS (
               SELECT r.user_id, UPPER(COALESCE(r.currency,'CNY')) AS currency,
                 SUM(CASE r.type WHEN 'topup' THEN r.amount_cents WHEN 'refund' THEN r.amount_cents WHEN 'charge' THEN -r.amount_cents ELSE 0 END) AS balance
               FROM app_receipts r JOIN recent USING (user_id) GROUP BY 1, 2
             )
             SELECT COUNT(*)::int AS count FROM balances WHERE balance < 0`,
          )
        )[0]?.count,
      ),
    0,
  );

  const signups = await safe(
    'signups',
    async () => {
      const row = (
        await run(
          `SELECT COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '60 minutes')::int AS last60, COUNT(*)::int AS last24
           FROM profiles WHERE created_at > NOW() - INTERVAL '24 hours'`,
        )
      )[0];
      return { last60: num(row?.last60), last24h: num(row?.last24) };
    },
    { last60: null as number | null, last24h: null as number | null },
  );

  const assistant = await safe(
    'assistant_requests',
    async () => {
      const row = (
        await run(
          `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE state = 'failed')::int AS failed
           FROM prompt_assistance_requests WHERE created_at > NOW() - INTERVAL '60 minutes'`,
        )
      )[0];
      return { requests60: num(row?.total), failed60: num(row?.failed) };
    },
    { requests60: null as number | null, failed60: null as number | null },
  );

  const engineMap = new Map<string, { total60: number; failed60: number }>();
  for (const w of windows) {
    const e = engineMap.get(w.engine) ?? { total60: 0, failed60: 0 };
    e.total60 += w.total60;
    e.failed60 += w.failed60;
    engineMap.set(w.engine, e);
  }

  const accountClasses = new Set<string>(PROVIDER_ACCOUNT_ERROR_CLASSES);
  const accountByProvider = new Map<string, number>();
  for (const r of attemptRows) {
    if (accountClasses.has(String(r.error_class))) {
      accountByProvider.set(String(r.provider), (accountByProvider.get(String(r.provider)) ?? 0) + num(r.count));
    }
  }

  return {
    generatedAt: now.toISOString(),
    generation: {
      byProvider: [...providerMap.values()].map((p) => ({ ...p, failureRate15: rate(p.failed15, p.total15), failureRate60: rate(p.failed60, p.total60) })),
      byEngine: [...engineMap.entries()].map(([engine, e]) => ({ engine, ...e, failureRate60: rate(e.failed60, e.total60) })),
      stuck: {
        count: stuckRows.reduce((s, r) => s + num(r.count), 0),
        oldestMinutes: stuckRows.length ? Math.max(...stuckRows.map((r) => num(r.oldest_minutes))) : null,
        byProvider: stuckRows.map((r) => ({ provider: String(r.provider), count: num(r.count) })),
      },
      failedWithoutRefund: unrefunded,
      refundedJobs60: windows.reduce((s, w) => s + w.refunded60, 0),
    },
    providerErrors: {
      byClass: attemptRows.map((r) => ({ provider: String(r.provider), errorClass: String(r.error_class), count60: num(r.count) })),
      accountErrors60: [...accountByProvider.entries()].map(([provider, count]) => ({ provider, count })),
      accountMessageHints60: hintRows.map((r) => ({ provider: String(r.provider), count: num(r.count) })),
    },
    payments: {
      ordersCreated60: num(orders.created60),
      ordersPaid60: num(orders.paid60),
      ordersFailed60: num(orders.failed60),
      pendingOlderThanThreshold: num(orders.pending_old),
      paidWithoutReceipt24h: paidWithoutReceipt,
      refundReceipts60: refundReceipts,
    },
    wallet: { negativeBalanceUsers: negative },
    signups: { last60: signups.last60, last24h: signups.last24h },
    assistant,
    collectionErrors: errors,
  };
}

export function evaluateOpsSignals(signals: OpsSignals, t: OpsHealthThresholds): OpsAlert[] {
  const alerts: OpsAlert[] = [];
  const add = (key: string, severity: OpsSeverity, message: string, value: number | string, threshold: number | string) =>
    alerts.push({ key, severity, message, value, threshold });

  for (const p of signals.generation.byProvider) {
    const r15 = p.failureRate15;
    if (p.total15 >= t.failureMinSamples && r15 !== null && r15 >= t.failureRateCritical && p.failed15 >= t.failureCount15Critical) {
      add(`generation_failures_15m:${p.provider}`, 'critical', `渠道 ${p.provider} 近15分钟生成失败 ${p.failed15}/${p.total15}`, p.failed15, t.failureCount15Critical);
    } else {
      const r60 = p.failureRate60;
      if (p.total60 >= t.failureMinSamples && r60 !== null && r60 >= t.failureRateWarn) {
        add(`generation_failure_rate_60m:${p.provider}`, 'warning', `渠道 ${p.provider} 近60分钟失败率 ${Math.round(r60 * 100)}% (${p.failed60}/${p.total60})`, r60, t.failureRateWarn);
      }
    }
  }
  if (signals.generation.stuck.count >= t.stuckCountWarn) {
    const critical = signals.generation.stuck.count >= t.stuckCountCritical;
    add('stuck_jobs', critical ? 'critical' : 'warning', `${signals.generation.stuck.count} 个任务卡在处理中超过 ${t.stuckMinutes} 分钟（最久 ${signals.generation.stuck.oldestMinutes ?? '?'} 分钟）`, signals.generation.stuck.count, critical ? t.stuckCountCritical : t.stuckCountWarn);
  }
  if (signals.generation.failedWithoutRefund >= t.unrefundedFailedWarn && t.unrefundedFailedWarn > 0) {
    add('failed_without_refund', 'critical', `${signals.generation.failedWithoutRefund} 个失败任务超过 ${t.unrefundedFailedMinutes} 分钟仍未退款`, signals.generation.failedWithoutRefund, t.unrefundedFailedWarn);
  }
  for (const a of signals.providerErrors.accountErrors60) {
    if (a.count >= t.providerAccountErrorCritical && t.providerAccountErrorCritical > 0) {
      add(`provider_account_error:${a.provider}`, 'critical', `渠道 ${a.provider} 近60分钟出现 ${a.count} 次账号/余额/密钥类错误，请检查服务商控制台余额与密钥`, a.count, t.providerAccountErrorCritical);
    }
  }
  for (const h of signals.providerErrors.accountMessageHints60) {
    if (h.count >= t.providerAccountErrorCritical && t.providerAccountErrorCritical > 0 && !signals.providerErrors.accountErrors60.some((a) => a.provider === h.provider)) {
      add(`provider_balance_hint:${h.provider}`, 'critical', `渠道 ${h.provider} 近60分钟有 ${h.count} 个失败任务的报错含欠费/配额/密钥字样`, h.count, t.providerAccountErrorCritical);
    }
  }
  const rateLimits = new Map<string, number>();
  for (const r of signals.providerErrors.byClass) {
    if ((PROVIDER_RATE_LIMIT_ERROR_CLASSES as readonly string[]).includes(r.errorClass)) rateLimits.set(r.provider, (rateLimits.get(r.provider) ?? 0) + r.count60);
  }
  for (const [provider, count] of rateLimits) {
    if (count >= t.providerRateLimitWarn) add(`provider_rate_limit:${provider}`, 'warning', `渠道 ${provider} 近60分钟被限流/并发超限 ${count} 次`, count, t.providerRateLimitWarn);
  }
  const pay = signals.payments;
  if (pay.paidWithoutReceipt24h >= t.paidWithoutReceiptCritical && t.paidWithoutReceiptCritical > 0) {
    add('paid_order_without_receipt', 'critical', `${pay.paidWithoutReceipt24h} 笔已支付订单没有对应的充值入账记录`, pay.paidWithoutReceipt24h, t.paidWithoutReceiptCritical);
  }
  if (pay.ordersFailed60 >= t.failedOrdersWarn && t.failedOrdersWarn > 0) {
    add('topup_orders_failed', 'warning', `近60分钟 ${pay.ordersFailed60} 笔充值订单失败`, pay.ordersFailed60, t.failedOrdersWarn);
  }
  if (pay.pendingOlderThanThreshold >= t.pendingOrderWarn) {
    add('topup_orders_pending', 'warning', `${pay.pendingOlderThanThreshold} 笔充值订单超过 ${t.pendingOrderMinutes} 分钟仍未支付/未回调（近24小时）`, pay.pendingOlderThanThreshold, t.pendingOrderWarn);
  }
  if (pay.refundReceipts60 >= t.refundCount60Warn) {
    add('refund_spike', 'warning', `近60分钟退款 ${pay.refundReceipts60} 笔`, pay.refundReceipts60, t.refundCount60Warn);
  }
  if (signals.wallet.negativeBalanceUsers >= t.negativeBalanceWarn && t.negativeBalanceWarn > 0) {
    add('negative_wallet_balance', 'critical', `${signals.wallet.negativeBalanceUsers} 个近期活跃账户钱包余额为负`, signals.wallet.negativeBalanceUsers, t.negativeBalanceWarn);
  }
  if (signals.assistant.failed60 !== null && signals.assistant.failed60 >= t.assistantFailureWarn) {
    add('assistant_failures', 'warning', `Milo 助手近60分钟失败 ${signals.assistant.failed60}/${signals.assistant.requests60 ?? '?'} 次`, signals.assistant.failed60, t.assistantFailureWarn);
  }
  if (signals.collectionErrors.length) {
    add('ops_health_query_failed', 'warning', `健康检查部分查询失败：${signals.collectionErrors.join(', ')}`, signals.collectionErrors.length, 0);
  }
  return alerts;
}

export async function buildOpsHealthReport(run: OpsQueryRunner, env: Record<string, string | undefined> = process.env, now: Date = new Date()) {
  const thresholds = resolveOpsHealthThresholds(env);
  const signals = await collectOpsSignals(run, thresholds, now);
  const alerts = evaluateOpsSignals(signals, thresholds);
  return { ok: alerts.length === 0, alerts, signals, thresholds };
}
