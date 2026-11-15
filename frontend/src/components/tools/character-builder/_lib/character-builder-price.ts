import { CUSTOMER_CURRENCY, USD_TO_CNY_CUSTOMER_RATE, formatWalletBalance } from '@/lib/customer-currency';
import type { PricingSnapshot } from '@maxvideoai/pricing';

import { customerTariffRevision } from '@/lib/customer-tariff-revision';

/**
 * Reads a Character Studio image estimate. The Keyvo build quotes in CNY: a customer snapshot keeps its USD source
 * in meta.customerCurrencyConversion, so both currencies are accepted and normalised to the USD cents the workspace
 * keeps internally. A manual-tariff snapshot must name its revision. A rule-priced snapshot (the official-list engines
 * the builder uses) has no revision: the server charges its own current quote, so `revision` is null and no
 * revision header is sent. Returns null for a failed or inconsistent estimate; the caller must then refuse generation.
 */
export function readCharacterBuilderEstimate(payload: { ok?: unknown; pricing?: unknown } | null | undefined):
  { usd: number; revision: number | null } | null {
  if (!payload || payload.ok !== true || !payload.pricing || typeof payload.pricing !== 'object') return null;
  const pricing = payload.pricing as PricingSnapshot;
  const manual = pricing.meta?.pricingMode === 'manual_tariff';
  const revision = customerTariffRevision(pricing);
  if (manual && !revision) return null;
  if (!Number.isSafeInteger(pricing.totalCents) || pricing.totalCents < 0) return null;
  if (pricing.currency === 'USD') return { usd: pricing.totalCents / 100, revision: manual ? revision : null };
  const conversion = pricing.meta?.customerCurrencyConversion as
    { sourceCurrency?: unknown; rate?: unknown; sourceTotalCents?: unknown } | undefined;
  if (pricing.currency !== 'CNY' || conversion?.sourceCurrency !== 'USD' || !Number.isSafeInteger(conversion.rate)
    || !Number.isSafeInteger(conversion.sourceTotalCents) || pricing.totalCents !== (conversion.sourceTotalCents as number) * (conversion.rate as number)) {
    return null;
  }
  return { usd: (conversion.sourceTotalCents as number) / 100, revision: manual ? revision : null };
}

/**
 * The generate button price. The estimate reader returns a USD amount; the Keyvo build charges in CNY (8 CNY per USD),
 * so the button must show the CNY amount (not "$0.01"). Other builds keep the USD display in the page locale.
 */
export function formatCharacterPrice(usdAmount: number, locale: string, currency: string = CUSTOMER_CURRENCY): string {
  if (currency === 'CNY') return formatWalletBalance(usdAmount * USD_TO_CNY_CUSTOMER_RATE, 'CNY');
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' }).format(usdAmount);
}
