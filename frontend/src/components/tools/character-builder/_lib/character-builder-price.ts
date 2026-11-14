import type { PricingSnapshot } from '@maxvideoai/pricing';

import { customerTariffRevision } from '@/lib/customer-tariff-revision';

/**
 * Reads a Character Studio image estimate. The Keyvo build quotes in CNY: a customer snapshot keeps its USD source
 * in meta.customerCurrencyConversion, so both currencies are accepted and normalised to the USD cents the workspace
 * keeps internally. Returns null for a failed, non-tariff or inconsistent estimate; the caller must then refuse generation.
 */
export function readCharacterBuilderEstimate(payload: { ok?: unknown; pricing?: unknown } | null | undefined):
  { usd: number; revision: number } | null {
  if (!payload || payload.ok !== true || !payload.pricing || typeof payload.pricing !== 'object') return null;
  const pricing = payload.pricing as PricingSnapshot;
  const revision = customerTariffRevision(pricing);
  if (!revision || !Number.isSafeInteger(pricing.totalCents) || pricing.totalCents < 0) return null;
  if (pricing.currency === 'USD') return { usd: pricing.totalCents / 100, revision };
  const conversion = pricing.meta?.customerCurrencyConversion as
    { sourceCurrency?: unknown; rate?: unknown; sourceTotalCents?: unknown } | undefined;
  if (pricing.currency !== 'CNY' || conversion?.sourceCurrency !== 'USD' || !Number.isSafeInteger(conversion.rate)
    || !Number.isSafeInteger(conversion.sourceTotalCents) || pricing.totalCents !== (conversion.sourceTotalCents as number) * (conversion.rate as number)) {
    return null;
  }
  return { usd: (conversion.sourceTotalCents as number) / 100, revision };
}
