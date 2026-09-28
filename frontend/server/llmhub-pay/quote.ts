import { convertUsdToCurrencyAmount } from '@/lib/fxQuote';

export function parseLlmhubWalletAmountCents(value: unknown): number | null {
  return Number.isSafeInteger(value) && Number(value) >= 1000 && Number(value) <= 1_000_000 ? Number(value) : null;
}

export async function quoteLlmhubPayTopup(walletAmountCents: number) {
  const quote = await convertUsdToCurrencyAmount({ usdAmountCents: walletAmountCents, targetCurrency: 'CNY' });
  if (quote.currency !== 'CNY' || !Number.isSafeInteger(quote.amountMinor) || quote.amountMinor <= 0) {
    throw new Error('llmhub_invalid_quote');
  }
  return quote;
}
