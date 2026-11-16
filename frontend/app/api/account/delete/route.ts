import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { isDatabaseConfigured } from '@/lib/db';
import { getRouteAuthContext } from '@/lib/supabase-ssr';
import { ACCOUNT_DELETION_CONFIRMATION_WORD, ACCOUNT_DELETION_COOLING_OFF_DAYS } from '@/lib/account-deletion-flag';
import {
  getPositiveWalletBalances,
  scheduleAccountDeletion,
  verifyAccountPassword,
} from '@/server/account-privacy';
import { getUserIdentity, getSupabaseAdmin } from '@/server/supabase-admin';

export const runtime = 'nodejs';

const NO_STORE = { 'Cache-Control': 'private, no-store' };

function fail(status: number, code: string, message: string) {
  return NextResponse.json({ ok: false, code, error: message }, { status, headers: NO_STORE });
}

/**
 * Requests account deletion: 15-day cooling-off, then the purge job erases the
 * personal data (docs/engineering/account-deletion.md). Requires the typed
 * confirmation word and the account password, and a zero wallet balance.
 */
export async function POST(req: NextRequest) {
  if (!isDatabaseConfigured()) return fail(503, 'database_unavailable', 'Database unavailable');

  const { userId, session, supabase } = await getRouteAuthContext(req, { allowScheduledDeletion: true });
  if (!userId) return fail(401, 'unauthorized', 'Unauthorized');

  const body = (await req.json().catch(() => null)) as { confirm?: unknown; password?: unknown } | null;
  if (typeof body?.confirm !== 'string' || body.confirm.trim() !== ACCOUNT_DELETION_CONFIRMATION_WORD) {
    return fail(400, 'confirmation_required', `请输入“${ACCOUNT_DELETION_CONFIRMATION_WORD}”以确认`);
  }
  const password = typeof body.password === 'string' ? body.password : '';
  if (!password) return fail(400, 'password_required', '请输入登录密码');

  try {
    const identity = await getUserIdentity(userId);
    if (!identity) return fail(503, 'auth_unavailable', '账号服务暂时不可用，请稍后再试');
    if (!(await verifyAccountPassword(identity, password))) {
      return fail(403, 'invalid_password', '密码不正确');
    }

    const positive = await getPositiveWalletBalances(userId);
    if (positive.length > 0) {
      return fail(409, 'wallet_not_empty', '账户余额大于 0，无法注销。请先用完余额，或联系客服办理退款后再申请注销。');
    }

    const result = await scheduleAccountDeletion(userId);
    if (!result.ok) {
      return fail(result.status, result.code, '暂时无法提交注销申请，请稍后再试');
    }

    // Revoke every session (the Auth flag already blocks any token that survives).
    const accessToken = session?.access_token;
    if (accessToken) {
      await getSupabaseAdmin().auth.admin.signOut(accessToken, 'global').catch(() => undefined);
    }
    await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);

    console.info('[account-privacy] deletion scheduled', { userId });
    return NextResponse.json(
      {
        ok: true,
        status: 'scheduled',
        markedAt: result.markedAt,
        purgeAt: result.purgeAt,
        coolingOffDays: ACCOUNT_DELETION_COOLING_OFF_DAYS,
        deletionCompleted: false,
      },
      { headers: NO_STORE },
    );
  } catch (error) {
    console.error('[account-privacy] account delete failed', error);
    return fail(500, 'delete_failed', '暂时无法提交注销申请，请稍后再试');
  }
}
