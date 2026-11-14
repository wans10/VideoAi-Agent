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
