import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';
import { getDb } from '../frontend/src/lib/db';
import { ensureBillingSchema } from '../frontend/src/lib/schema';
import { startDisposablePostgres } from './helpers/disposable-postgres';

test('ops-health route computes signals from synthetic jobs on PostgreSQL without PII or writes', async () => {
  const db = await startDisposablePostgres('ops-health');
  const prev = { url: process.env.DATABASE_URL, secret: process.env.CRON_SECRET, vercel: process.env.VERCEL, role: process.env.SUPABASE_SERVICE_ROLE_KEY };
  process.env.DATABASE_URL = db.databaseUrl;
  process.env.CRON_SECRET = 'pg-secret';
  delete process.env.VERCEL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  try {
    await ensureBillingSchema();
    const insertJob = (id: string, provider: string, status: string, pay: string, minutesAgo: number, message: string | null = null) =>
      db.pool.query(
        `INSERT INTO app_jobs (job_id, user_id, engine_id, engine_label, duration_sec, prompt, thumb_url, provider, status, payment_status, message, created_at, updated_at)
         VALUES ($1,'user-secret-1','kling-3','Kling',5,'SECRET PROMPT','t',$2,$3,$4,$5, NOW() - ($6::int * INTERVAL '1 minute'), NOW() - ($6::int * INTERVAL '1 minute'))`,
        [id, provider, status, pay, message, minutesAgo],
      );
    for (let i = 0; i < 10; i++) await insertJob(`f${i}`, 'kling_direct', 'failed', i < 9 ? 'refunded_wallet' : 'paid_wallet', 20 + i, i === 0 ? 'Arrearage: account overdue 13800000000' : 'x');
    for (let i = 0; i < 4; i++) await insertJob(`s${i}`, 'alibaba_model_studio', 'running', 'paid_wallet', 120);
    await insertJob('old-ok', 'kling_direct', 'completed', 'paid_wallet', 3000);
    await insertJob('good', 'kling_direct', 'completed', 'paid_wallet', 5);
    const first = (await db.pool.query(`SELECT id FROM app_jobs WHERE job_id = 'f0'`)).rows[0].id;
    await db.pool.query(`INSERT INTO provider_attempts (job_id, attempt_index, provider, status, error_class) VALUES ($1,1,'kling_direct','failed','insufficient_provider_credits')`, [first]);
    await db.pool.query(`INSERT INTO llmhub_pay_topup_orders (out_trade_no, user_id, wallet_amount_cents, settlement_amount_fen, payment_type, status, created_at, updated_at)
      VALUES ('paid-no-receipt','user-secret-1',1000,1000,'alipay','paid', NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '20 minutes'),
             ('pending-old','user-secret-1',1000,1000,'wxpay','pending', NOW() - INTERVAL '50 minutes', NOW() - INTERVAL '50 minutes')`);
    await db.pool.query(`INSERT INTO app_receipts (user_id, type, amount_cents, currency) VALUES ('user-secret-2','topup',100,'CNY'),('user-secret-2','charge',500,'CNY')`);

    const { GET } = await import('../frontend/app/api/cron/ops-health/route');
    const before = (await db.pool.query('SELECT count(*)::int AS n FROM app_jobs')).rows[0].n;
    const res = await GET(new NextRequest('http://localhost/api/cron/ops-health', { headers: { authorization: 'Bearer pg-secret' } }));
    assert.equal(res.status, 200);
    const body = await res.json();
    const keys = body.alerts.map((a: { key: string }) => a.key);
    assert.equal(body.ok, false);
    for (const k of ['stuck_jobs', 'failed_without_refund', 'provider_account_error:kling_direct', 'paid_order_without_receipt', 'negative_wallet_balance']) {
      assert.ok(keys.includes(k), `missing ${k}; got ${keys.join(',')}`);
    }
    assert.ok(keys.some((k: string) => k.startsWith('generation_failures_15m:kling_direct')) || keys.some((k: string) => k.startsWith('generation_failure_rate_60m:kling_direct')));
    assert.equal(body.signals.generation.stuck.count, 4);
    assert.equal(body.signals.generation.failedWithoutRefund, 1);
    assert.equal(body.signals.payments.pendingOlderThanThreshold, 1);
    assert.equal(body.signals.wallet.negativeBalanceUsers, 1);
    assert.deepEqual(body.signals.providerErrors.accountMessageHints60, [{ provider: 'kling_direct', count: 1 }]);
    const text = JSON.stringify(body);
    assert.doesNotMatch(text, /user-secret|SECRET PROMPT|13800000000|Arrearage|pg-secret|paid-no-receipt/);
    assert.equal((await db.pool.query('SELECT count(*)::int AS n FROM app_jobs')).rows[0].n, before);
  } finally {
    await getDb().end().catch(() => undefined);
    for (const [k, v] of [['DATABASE_URL', prev.url], ['CRON_SECRET', prev.secret], ['VERCEL', prev.vercel], ['SUPABASE_SERVICE_ROLE_KEY', prev.role]] as const) {
      if (v === undefined) delete process.env[k]; else process.env[k] = v;
    }
    await db.cleanup();
  }
});
