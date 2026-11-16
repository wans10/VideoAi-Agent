import type { NextRequest } from 'next/server';
import { authorizeCronRequest } from '@/server/vercel-cron';
import { runAccountPurge, type PurgeReport } from '@/server/account-purge';

type Dependencies = {
  env?: NodeJS.ProcessEnv;
  run?: (options: { dryRun: boolean; limit?: number }) => Promise<PurgeReport>;
};

/**
 * Purges accounts whose 15-day deletion cooling-off elapsed (docs/engineering/account-deletion.md).
 * Always requires CRON_SECRET. Real erasure additionally needs ACCOUNT_PURGE_ENABLED=true;
 * otherwise (or with ?dryRun=1) the run only reports counts.
 */
export async function handleAccountPurgeCron(req: NextRequest | Request, dependencies: Dependencies = {}) {
  const env = dependencies.env ?? process.env;
  const secret = env.CRON_SECRET?.trim();
  if (!secret || !authorizeCronRequest(req.headers, { cronSecret: secret, vercelEnv: env.VERCEL, deploymentId: env.VERCEL_DEPLOYMENT_ID }).ok) {
    return Response.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 });
  }
  const url = new URL(req.url);
  const enabled = env.ACCOUNT_PURGE_ENABLED?.trim() === 'true';
  const dryRun = !enabled || url.searchParams.get('dryRun') === '1';
  const limitParam = Number(url.searchParams.get('limit') ?? '');
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? limitParam : undefined;
  try {
    const report = await (dependencies.run ?? runAccountPurge)({ dryRun, limit });
    return Response.json({
      ok: true,
      dryRun: report.dryRun,
      enabled,
      candidates: report.candidates,
      purged: report.users.filter((user) => user.outcome === 'purged').length,
      skipped: report.users.filter((user) => user.outcome === 'skipped').length,
      failed: report.users.filter((user) => user.outcome === 'failed').length,
      users: report.users,
    });
  } catch {
    return Response.json({ ok: false, error: 'ACCOUNT_PURGE_UNAVAILABLE' }, { status: 503 });
  }
}
