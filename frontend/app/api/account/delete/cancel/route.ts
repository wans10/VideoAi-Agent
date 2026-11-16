import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { isDatabaseConfigured } from '@/lib/db';
import { getRouteAuthContext } from '@/lib/supabase-ssr';
import { cancelAccountDeletion } from '@/server/account-privacy';

export const runtime = 'nodejs';

const NO_STORE = { 'Cache-Control': 'private, no-store' };

/** Cancels a scheduled deletion during the cooling-off. Works for flagged accounts. */
export async function POST(req: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false, error: 'Database unavailable' }, { status: 503, headers: NO_STORE });
  }
  const { userId } = await getRouteAuthContext(req, { allowScheduledDeletion: true });
  if (!userId) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401, headers: NO_STORE });
  try {
    const result = await cancelAccountDeletion(userId);
    return NextResponse.json({ ok: true, wasScheduled: result.wasScheduled }, { headers: NO_STORE });
  } catch (error) {
    console.error('[account-privacy] cancel failed', error);
    return NextResponse.json({ ok: false, error: 'Failed to cancel deletion' }, { status: 500, headers: NO_STORE });
  }
}
