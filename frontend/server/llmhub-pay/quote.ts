import { convertUsdToCurrencyAmount } from '@/lib/fxQuote';
import { CUSTOMER_CURRENCY } from '@/lib/customer-currency';
import { TOPUP_TIERS } from '@/config/topupTiers';

export function parseLlmhubWalletAmountCents(value: unknown): number | null {
  return Number.isSafeInteger(value) && Number(value) >= TOPUP_TIERS[0].amountCents && Number(value) <= 8_000_000 ? Number(value) : null;
}

export async function quoteLlmhubPayTopup(walletAmountCents: number) {
  const quote = CUSTOMER_CURRENCY === 'CNY'
    ? { currency: 'CNY', amountMinor: walletAmountCents, rate: 1, rateWithMargin: 1, source: 'identity', marginBps: 0, rateTimestamp: new Date().toISOString() }
    : await convertUsdToCurrencyAmount({ usdAmountCents: walletAmountCents, targetCurrency: 'CNY' });
  if (quote.currency !== 'CNY' || !Number.isSafeInteger(quote.amountMinor) || quote.amountMinor <= 0) {
    throw new Error('llmhub_invalid_quote');
  }
  return quote;
}
