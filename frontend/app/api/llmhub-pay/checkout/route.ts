import { randomBytes } from 'node:crypto';
import { isIP } from 'node:net';
import { NextRequest, NextResponse } from 'next/server';
import { getRouteAuthContext } from '@/lib/supabase-ssr';
import { ensureBillingSchema } from '@/lib/schema';
import { buildRestrictedAccountPayload, getActiveAccountRestriction } from '@/server/fraud-cleanup';
import { evaluateWalletCheckoutGuard, markCheckoutAttemptLlmhubOrderCreated, markCheckoutAttemptSessionFailed, resolveCheckoutClientIp } from '@/server/checkout-guard';
import { findTopupTier } from '@/config/topupTiers';
import { getWalletSummary } from '@/server/wallet-summary';
import { createLlmhubPayOrder, getLlmhubPayConfig, getLlmhubPaySiteOrigin, type LlmhubPayType } from '@/server/llmhub-pay/client';
import { createPendingLlmhubPayOrder, formatFenAsYuan, markLlmhubPayOrderCreated, markLlmhubPayOrderFailed } from '@/server/llmhub-pay/orders';
import { parseLlmhubWalletAmountCents, quoteLlmhubPayTopup } from '@/server/llmhub-pay/quote';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const config = getLlmhubPayConfig();
  const origin = getLlmhubPaySiteOrigin();
  if (!config || !origin || !process.env.DATABASE_URL) return NextResponse.json({ error: 'Unavailable' }, { status: 503 });
  const { userId } = await getRouteAuthContext(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (await getActiveAccountRestriction(userId)) return NextResponse.json(buildRestrictedAccountPayload(), { status: 403 });
  const body = await request.json().catch(() => null);
  const amountCents = parseLlmhubWalletAmountCents(body?.amountCents);
  const type = body?.type as LlmhubPayType | undefined;
  if (!amountCents || (type !== 'alipay' && type !== 'wxpay')) return NextResponse.json({ error: 'Invalid checkout request' }, { status: 400 });
  const clientIp = resolveCheckoutClientIp(request.headers);
  if (!clientIp || !isIP(clientIp)) return NextResponse.json({ error: 'Client IP unavailable' }, { status: 503 });

  let attemptId: number | null = null;
  let outTradeNo: string | null = null;
  let providerCreated = false;
  try {
    await ensureBillingSchema();
    const wallet = await getWalletSummary(userId);
    const guard = await evaluateWalletCheckoutGuard({
      userId, clientIp, amountCents, mode: 'hosted',
      hasCompletedTopUp: wallet.hasCompletedTopUp,
      isPresetTopupTier: Boolean(findTopupTier({ amountCents })),
      captchaToken: typeof body.captchaToken === 'string' ? body.captchaToken : null,
      metadata: { provider: 'llmhub_pay', type, currency: 'CNY' },
    });
    attemptId = guard.attemptId;
    if (guard.action === 'captcha_required') return NextResponse.json({ error: 'captcha_required', captchaRequired: true }, { status: 403 });
    if (guard.action === 'rate_limited') return NextResponse.json({ error: 'too_many_attempts', retryAfterSeconds: guard.retryAfterSeconds }, { status: 429 });

    const quote = await quoteLlmhubPayTopup(amountCents);
    if (body.expectedAmountFen !== quote.amountMinor) {
      await markCheckoutAttemptSessionFailed(attemptId, 'llmhub_quote_changed');
      return NextResponse.json({ error: 'quote_changed', amountFen: quote.amountMinor, currency: 'CNY' }, { status: 409 });
    }
    outTradeNo = `mv${randomBytes(16).toString('hex')}`;
    await createPendingLlmhubPayOrder({
      outTradeNo, userId, walletAmountCents: amountCents, settlementAmountFen: quote.amountMinor,
      paymentType: type, checkoutAttemptId: attemptId,
      quoteMetadata: { rate: quote.rate, rateWithMargin: quote.rateWithMargin, source: quote.source, rateTimestamp: quote.rateTimestamp, marginBps: quote.marginBps },
    });
    const created = await createLlmhubPayOrder({
      outTradeNo, type, money: formatFenAsYuan(quote.amountMinor), clientIp,
      notifyUrl: `${origin}/api/llmhub-pay/notify`,
      returnUrl: `${origin}/api/llmhub-pay/return`,
    }, config);
    providerCreated = true;
    await markLlmhubPayOrderCreated(outTradeNo, created.tradeNo);
    await markCheckoutAttemptLlmhubOrderCreated(attemptId, outTradeNo);
    return NextResponse.json({ ok: true, url: created.url, outTradeNo, amountFen: quote.amountMinor, currency: 'CNY' }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('[llmhub-pay] checkout creation failed', error);
    if (outTradeNo && !providerCreated) await markLlmhubPayOrderFailed(outTradeNo).catch(() => undefined);
    if (attemptId && !providerCreated) await markCheckoutAttemptSessionFailed(attemptId, 'llmhub_checkout_failed').catch(() => undefined);
    return NextResponse.json({ error: 'Payment unavailable' }, { status: 503 });
  }
}
