import { NextRequest, NextResponse } from 'next/server';
import { TOPUP_TIERS } from '@/config/topupTiers';
import { convertUsdToCurrencyAmount } from '@/lib/fxQuote';
import { CUSTOMER_CURRENCY } from '@/lib/customer-currency';
import { normalizeCurrencyCode, resolveCurrency, resolveEnabledCurrencies } from '@/lib/currency';
import { getRouteAuthContext } from '@/lib/supabase-ssr';

export async function POST(req: NextRequest) {
  const { userId } = await getRouteAuthContext(req);
  const body = (await req.json().catch(() => null)) ?? {};
  const requestedCurrency = normalizeCurrencyCode(typeof body.currency === 'string' ? body.currency : null);

  if (requestedCurrency && !resolveEnabledCurrencies().includes(requestedCurrency)) {
    return NextResponse.json({ ok: false, error: 'Unsupported currency' }, { status: 400 });
  }

  const currencyResolution = resolveCurrency(req, requestedCurrency ? { preferred_currency: requestedCurrency } : undefined);
  const targetCurrency = requestedCurrency ?? currencyResolution.currency;

  const rawAmounts: number[] = Array.isArray(body.amounts)
    ? body.amounts
        .map((value: unknown) => (typeof value === 'number' ? Math.round(value) : Number.parseInt(String(value), 10)))
        .filter((value: number): value is number => Number.isFinite(value) && value > 0)
    : [];
  const walletAmounts = rawAmounts.length ? rawAmounts : TOPUP_TIERS.map((tier) => tier.amountCents);

  const quotes = [] as Array<{
    walletAmountCents: number;
    localAmountMinor: number;
    currency: string;
    rate: number;
    rateWithMargin: number;
    source: string;
    marginBps: number;
    rateTimestamp: string;
  }>;

  for (const amount of walletAmounts) {
    try {
      const quote = CUSTOMER_CURRENCY === 'CNY' && targetCurrency === 'cny'
        ? { currency: 'CNY', amountMinor: amount, rate: 1, rateWithMargin: 1, source: 'identity', marginBps: 0, rateTimestamp: new Date().toISOString() }
        : await convertUsdToCurrencyAmount({ usdAmountCents: amount, targetCurrency });
      quotes.push({
        walletAmountCents: amount,
        localAmountMinor: quote.amountMinor,
        currency: quote.currency,
        rate: quote.rate,
        rateWithMargin: quote.rateWithMargin,
        source: quote.source,
        marginBps: quote.marginBps,
        rateTimestamp: quote.rateTimestamp,
      });
    } catch (error) {
      console.warn('[api/topup/quote] failed to convert amount', {
        userId,
        amount,
        targetCurrency,
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  if (!quotes.length) {
    return NextResponse.json({ ok: false, error: 'Unable to compute quotes' }, { status: 500 });
  }

  const latest = quotes[quotes.length - 1];

  return NextResponse.json({
    ok: true,
    currency: latest.currency,
    source: latest.source,
    marginBps: latest.marginBps,
    rateTimestamp: latest.rateTimestamp,
    quotes,
  });
}
