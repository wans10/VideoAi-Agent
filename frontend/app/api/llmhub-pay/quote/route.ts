import { NextRequest, NextResponse } from 'next/server';
import { getRouteAuthContext } from '@/lib/supabase-ssr';
import { getLlmhubPayConfig } from '@/server/llmhub-pay/client';
import { parseLlmhubWalletAmountCents, quoteLlmhubPayTopup } from '@/server/llmhub-pay/quote';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (!getLlmhubPayConfig() || !process.env.DATABASE_URL) return NextResponse.json({ error: 'Unavailable' }, { status: 503 });
  const { userId } = await getRouteAuthContext(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => null);
  const amountCents = parseLlmhubWalletAmountCents(body?.amountCents);
  if (!amountCents) return NextResponse.json({ error: 'Invalid top-up amount' }, { status: 400 });
  try {
    const quote = await quoteLlmhubPayTopup(amountCents);
    return NextResponse.json({ ok: true, amountCents, amountFen: quote.amountMinor, currency: 'CNY', rateTimestamp: quote.rateTimestamp }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return NextResponse.json({ error: 'CNY quote unavailable' }, { status: 503 });
  }
}
