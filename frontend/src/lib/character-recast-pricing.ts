import type { PricingPolicyRule } from '@maxvideoai/pricing';

export const RECAST_PRODUCT_ID = 'character-recast' as const;
export const RECAST_PRICING_SELECTOR = { engineId: RECAST_PRODUCT_ID, mode: 'recast', resolution: 'video' } as const;
/**
 * Keyvo 2026-11-13 (owner): Recast costs exactly twice the ordinary Wan 3 Prime customer price, which is
 * round(0.8 x official list) under `official-list-80`. With the scoped coefficient x1.6 (marginPercent 0.6),
 * this profile rounds supplier cost x coefficient once to an even number of cents, i.e. 2 x round(0.8 x list).
 * The scoped rule keeps `standard` (or null) as its stored profile; every Recast quote and preview applies this one.
 */
export const RECAST_COMPATIBILITY_PROFILE_ID = 'recast-even-cents' as const;

/** Recast has an explicit product rule; generic model/global policies cannot price it. */
export function isValidRecastPricingRule(rule: PricingPolicyRule): boolean {
  return rule.engineId === RECAST_PRICING_SELECTOR.engineId && rule.mode === RECAST_PRICING_SELECTOR.mode
    && rule.resolution === RECAST_PRICING_SELECTOR.resolution && rule.currency === 'USD'
    && (rule.compatibilityProfile == null || rule.compatibilityProfile === 'standard')
    && Number.isFinite(rule.marginPercent) && rule.marginPercent >= 0 && rule.marginPercent <= 9
    && rule.marginFlatCents === 0 && rule.surchargeAudioPercent === 0 && rule.surchargeUpscalePercent === 0;
}
