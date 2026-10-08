import { NextRequest, NextResponse } from 'next/server';
import { adminErrorToResponse, requireAdmin } from '@/server/admin';
import { getWalletBalanceCents } from '@/lib/wallet';
import { query } from '@/lib/db';
import { issueManualWalletTopUp } from '@/server/admin-transactions';
import { getUserIdentity } from '@/server/supabase-admin';
import { CUSTOMER_CURRENCY } from '@/lib/customer-currency';
import { getWalletSummary } from '@/server/wallet-summary';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, props: { params: Promise<{ userId: string }> }) {
  const params = await props.params;
  try {
    await requireAdmin(req);
  } catch (error) {
    return adminErrorToResponse(error);
  }

  const userId = params.userId;
  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  const configured = Boolean(process.env.DATABASE_URL);
  const { balanceCents } = configured ? await getWalletSummary(userId) : await getWalletBalanceCents(userId);
  const mock = !configured;

  let stats = null;
  if (process.env.DATABASE_URL) {
    const aggregates = await query<{ type: string; total: number }>(
      `SELECT type, COALESCE(SUM(amount_cents), 0) AS total
       FROM app_receipts
       WHERE user_id = $1 AND (UPPER(currency) = $2 OR (currency IS NULL AND $2 = 'USD'))
       GROUP BY type`,
      [userId, CUSTOMER_CURRENCY]
    );
    stats = aggregates.reduce<Record<string, number>>((acc, row) => {
      acc[row.type] = Number(row.total ?? 0);
      return acc;
    }, {});
  }

  return NextResponse.json({
    ok: true,
    balanceCents,
    balance: balanceCents / 100,
    currency: CUSTOMER_CURRENCY,
    mock,
    stats,
  });
}

export async function POST(req: NextRequest, props: { params: Promise<{ userId: string }> }) {
  const params = await props.params;
  let adminUserId: string;
  try {
    adminUserId = await requireAdmin(req);
  } catch (error) {
    return adminErrorToResponse(error);
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: false, error: 'Database not configured' }, { status: 501 });
  }

  const targetUserId = params.userId?.trim();
  if (!targetUserId) {
    return NextResponse.json({ ok: false, error: 'Missing userId' }, { status: 400 });
  }

  const payload = await req.json().catch(() => null);
  if (!payload || typeof payload !== 'object') {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const amountInput = typeof payload.amountCents === 'number' ? payload.amountCents : Number(payload.amountCents);
  const amountCents = Math.round(Number.isFinite(amountInput) ? amountInput : Number.NaN);
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    return NextResponse.json({ ok: false, error: 'Invalid amount' }, { status: 400 });
  }

  const currency =
    typeof payload.currency === 'string' && payload.currency.trim().length
      ? payload.currency.trim().toUpperCase()
      : CUSTOMER_CURRENCY;
  if (CUSTOMER_CURRENCY === 'CNY' && currency !== CUSTOMER_CURRENCY) {
    return NextResponse.json({ ok: false, error: 'Wallet currency must be CNY' }, { status: 400 });
  }
  const note = typeof payload.note === 'string' && payload.note.trim().length ? payload.note.trim() : null;
  const description = note ? `Manual credit — ${note}` : null;

  let adminEmail: string | null = null;
  try {
    const identity = await getUserIdentity(adminUserId);
    adminEmail = identity?.email ?? null;
  } catch {
    adminEmail = null;
  }

  try {
    const topup = await issueManualWalletTopUp({
      userId: targetUserId,
      amountCents,
      currency,
      description,
      adminUserId,
      adminEmail,
      note,
    });

    const { balanceCents } = await getWalletBalanceCents(targetUserId);

    return NextResponse.json({
      ok: true,
      receiptId: topup.receiptId,
      createdAt: topup.createdAt,
      amountCents: topup.amountCents,
      currency: topup.currency,
      balanceCents,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Manual credit failed';
    const isClientError = /Missing|amount|Invalid|user|wallet|Database/i.test(message);
    console.error('[admin/users] manual wallet credit failed', error);
    return NextResponse.json({ ok: false, error: message }, { status: isClientError ? 400 : 500 });
  }
}
