import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { buildOpsHealthReport, type OpsQueryRunner } from '@/server/ops-health';
import { authorizeCronRequest } from '@/server/vercel-cron';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STATEMENT_TIMEOUT_MS = 4000;

/** Each query runs alone in a READ ONLY transaction with a statement timeout. */
const runReadOnly: OpsQueryRunner = async (sql, params) => {
  const client = await getDb().connect();
  try {
    await client.query('BEGIN READ ONLY');
    await client.query(`SET LOCAL statement_timeout = ${STATEMENT_TIMEOUT_MS}`);
    const result = await client.query(sql, params ? [...params] : undefined);
    await client.query('COMMIT');
    return result.rows as Array<Record<string, unknown>>;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
};

const headers = { 'Cache-Control': 'no-store' };

export async function GET(req: NextRequest) {
  const secret = (process.env.CRON_SECRET ?? '').trim();
  // Fail closed: unlike other cron routes this one never runs without a configured secret.
  if (!secret) return NextResponse.json({ ok: false, error: 'NOT_CONFIGURED' }, { status: 503, headers });
  const auth = authorizeCronRequest(req.headers, {
    cronSecret: secret,
    deploymentId: process.env.VERCEL_DEPLOYMENT_ID,
    overrideHeaderName: 'x-cron-key',
    vercelEnv: process.env.VERCEL,
  });
  if (!auth.ok) return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401, headers });
  if (!process.env.DATABASE_URL) return NextResponse.json({ ok: false, error: 'DATABASE_UNAVAILABLE' }, { status: 503, headers });

  try {
    const report = await buildOpsHealthReport(runReadOnly);
    return NextResponse.json({ ok: report.ok, alerts: report.alerts, signals: report.signals }, { headers });
  } catch {
    return NextResponse.json({ ok: false, error: 'HEALTH_FAILED' }, { status: 500, headers });
  }
}
