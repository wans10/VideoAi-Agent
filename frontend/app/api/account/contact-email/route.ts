import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { normalizeContactEmail } from '@/lib/contact-email';
import { isDatabaseConfigured } from '@/lib/db';
import { getRouteAuthContext } from '@/lib/supabase-ssr';
import { readProfileContactEmail, saveProfileContactEmail } from '@/server/contact-email';

export const runtime = 'nodejs';

/** The signed-in account's contact email (read-only for settings). Never accepts a user id. */
export async function GET(req: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false, error: 'Database unavailable' }, { status: 503 });
  }
  const { userId } = await getRouteAuthContext(req);
  if (!userId) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  try {
    return NextResponse.json({ ok: true, contactEmail: await readProfileContactEmail(userId) });
  } catch (error) {
    console.error('[contact-email] read failed', error);
    return NextResponse.json({ ok: false, error: 'Failed to load contact email' }, { status: 500 });
  }
}

/**
 * Stores the sign-up contact email for the authenticated account. The owner is taken from the session
 * only; a userId in the body is ignored. Re-sending the same address is a harmless update.
 */
export async function POST(req: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false, error: 'Database unavailable' }, { status: 503 });
  }
  const { userId } = await getRouteAuthContext(req);
  if (!userId) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const email = normalizeContactEmail((body as { email?: unknown } | null)?.email);
  if (!email) {
    return NextResponse.json({ ok: false, error: 'invalid_email' }, { status: 400 });
  }

  try {
    const contactEmail = await saveProfileContactEmail(userId, email);
    return NextResponse.json({ ok: true, contactEmail });
  } catch (error) {
    console.error('[contact-email] save failed', error);
    return NextResponse.json({ ok: false, error: 'save_failed' }, { status: 500 });
  }
}
