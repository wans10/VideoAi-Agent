import type { CanonicalPricingQuote, PricingSnapshot } from '@maxvideoai/pricing';

// Provider facts and the frozen pricing baselines remain denominated in USD.
// The Docker customer build prices and stores new customer transactions in CNY.
export const CUSTOMER_CURRENCY = process.env.NEXT_PUBLIC_CUSTOMER_CURRENCY === 'CNY' ? 'CNY' : 'USD';
export const USD_TO_CNY_CUSTOMER_RATE = 8;

export function formatWalletBalance(balance: number, currency: string = CUSTOMER_CURRENCY): string {
  const code = currency.toUpperCase();
  try {
    return new Intl.NumberFormat(code === 'CNY' ? 'zh-CN' : 'en-US', {
      style: 'currency',
      currency: code,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(balance);
  } catch {
    return `${code} ${balance.toFixed(2)}`;
  }
}

function convertCents(value: number): number {
  return value * USD_TO_CNY_CUSTOMER_RATE;
}

export function customerQuote(quote: CanonicalPricingQuote): CanonicalPricingQuote {
  if (CUSTOMER_CURRENCY !== 'CNY' || quote.currency !== 'USD') return quote;
  return {
    ...quote,
    currency: 'CNY',
    vendorSubtotalCents: convertCents(quote.vendorSubtotalCents),
    marginCents: convertCents(quote.marginCents),
    surchargeCents: convertCents(quote.surchargeCents),
    discountCents: convertCents(quote.discountCents),
    subtotalBeforeDiscountCents: convertCents(quote.subtotalBeforeDiscountCents),
    customerTotalCents: convertCents(quote.customerTotalCents),
    platformFeeCents: convertCents(quote.platformFeeCents),
    vendorShareCents: convertCents(quote.vendorShareCents),
    breakdown: {
      ...quote.breakdown,
      vendorSubtotalExactCents: convertCents(quote.breakdown.vendorSubtotalExactCents),
      marginFlatCents: convertCents(quote.breakdown.marginFlatCents),
      ...(quote.breakdown.pricingBasisExactCents == null ? {} : { pricingBasisExactCents: convertCents(quote.breakdown.pricingBasisExactCents) }),
      ...(quote.breakdown.minimumCustomerTotalCents == null ? {} : { minimumCustomerTotalCents: convertCents(quote.breakdown.minimumCustomerTotalCents) }),
      ...(quote.breakdown.fixedCustomerCents == null ? {} : { fixedCustomerCents: convertCents(quote.breakdown.fixedCustomerCents) }),
    },
  };
}

export function customerSnapshot(snapshot: PricingSnapshot): PricingSnapshot {
  if (CUSTOMER_CURRENCY !== 'CNY' || snapshot.currency !== 'USD') return snapshot;
  return {
    ...snapshot,
    currency: 'CNY',
    totalCents: convertCents(snapshot.totalCents),
    subtotalBeforeDiscountCents: convertCents(snapshot.subtotalBeforeDiscountCents),
    base: { ...snapshot.base, rate: snapshot.base.rate * USD_TO_CNY_CUSTOMER_RATE, amountCents: convertCents(snapshot.base.amountCents) },
    addons: snapshot.addons.map((addon) => ({ ...addon, amountCents: convertCents(addon.amountCents) })),
    margin: { ...snapshot.margin, amountCents: convertCents(snapshot.margin.amountCents), ...(snapshot.margin.flatCents == null ? {} : { flatCents: convertCents(snapshot.margin.flatCents) }) },
    ...(snapshot.discount ? { discount: { ...snapshot.discount, amountCents: convertCents(snapshot.discount.amountCents) } } : {}),
    ...(snapshot.platformFeeCents == null ? {} : { platformFeeCents: convertCents(snapshot.platformFeeCents) }),
    ...(snapshot.vendorShareCents == null ? {} : { vendorShareCents: convertCents(snapshot.vendorShareCents) }),
    meta: {
      ...(snapshot.meta ?? {}),
      customerCurrencyConversion: { sourceCurrency: 'USD', rate: USD_TO_CNY_CUSTOMER_RATE, sourceTotalCents: snapshot.totalCents },
    },
  };
}

export function providerUsdSnapshot(snapshot: PricingSnapshot): PricingSnapshot {
  if (snapshot.currency !== 'CNY' || snapshot.meta?.customerCurrencyConversion == null) return snapshot;
  const divide = (value: number) => value / USD_TO_CNY_CUSTOMER_RATE;
  return {
    ...snapshot,
    currency: 'USD',
    totalCents: divide(snapshot.totalCents),
    subtotalBeforeDiscountCents: divide(snapshot.subtotalBeforeDiscountCents),
    base: { ...snapshot.base, rate: divide(snapshot.base.rate), amountCents: divide(snapshot.base.amountCents) },
    addons: snapshot.addons.map((addon) => ({ ...addon, amountCents: divide(addon.amountCents) })),
    margin: { ...snapshot.margin, amountCents: divide(snapshot.margin.amountCents), ...(snapshot.margin.flatCents == null ? {} : { flatCents: divide(snapshot.margin.flatCents) }) },
    ...(snapshot.discount ? { discount: { ...snapshot.discount, amountCents: divide(snapshot.discount.amountCents) } } : {}),
    ...(snapshot.platformFeeCents == null ? {} : { platformFeeCents: divide(snapshot.platformFeeCents) }),
    ...(snapshot.vendorShareCents == null ? {} : { vendorShareCents: divide(snapshot.vendorShareCents) }),
  };
}
