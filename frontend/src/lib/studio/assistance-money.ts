import { CUSTOMER_CURRENCY, USD_TO_CNY_CUSTOMER_RATE, formatWalletBalance } from '@/lib/customer-currency';

/**
 * Studio assistance amounts (budget cents, reservations, tariff rates) are USD
 * facts. The wallet debits them at USD_TO_CNY_CUSTOMER_RATE in the CNY build, so
 * customers must see the converted amount. Display only; never use for ledger math.
 */
export function formatAssistanceUsdCents(usdCents: number): string {
  return CUSTOMER_CURRENCY === 'CNY'
    ? formatWalletBalance((usdCents * USD_TO_CNY_CUSTOMER_RATE) / 100, 'CNY')
    : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(usdCents / 100);
}

/** A USD per-million-token tariff rate shown in the customer currency. */
export function formatAssistanceUsdRate(usdPerMillion: number): string {
  return CUSTOMER_CURRENCY === 'CNY'
    ? formatWalletBalance(usdPerMillion * USD_TO_CNY_CUSTOMER_RATE, 'CNY')
    : '$' + usdPerMillion;
}

/** Rewrites the one-dollar credit equivalence in en/fr copy for the CNY build (zh copy already states the CNY value). */
export function customerCreditEquivalenceCopy(text: string): string {
  if (CUSTOMER_CURRENCY !== 'CNY') return text;
  const yuan = formatAssistanceUsdCents(100);
  return text.replace('worth $1 in the USD tariff', `worth ${yuan} at the purchase price`).replace('valant 1 $ au tarif USD', `valant ${yuan} au prix d’achat`);
}
