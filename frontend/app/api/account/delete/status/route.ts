import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getRouteAuthContext } from '@/lib/supabase-ssr';
import { purgeDateFor } from '@/lib/account-deletion-flag';

export const runtime = 'nodejs';

const NO_STORE = { 'Cache-Control': 'private, no-store' };

/** Reads the cooling-off state from the validated session (no database access). */
export async function GET(req: NextRequest) {
  const { userId, deletionScheduledAt } = await getRouteAuthContext(req, { allowScheduledDeletion: true });
  if (!userId) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401, headers: NO_STORE });
  return NextResponse.json(
    {
      ok: true,
      scheduled: Boolean(deletionScheduledAt),
      markedAt: deletionScheduledAt,
      purgeAt: deletionScheduledAt ? purgeDateFor(deletionScheduledAt).toISOString() : null,
    },
    { headers: NO_STORE },
  );
}
