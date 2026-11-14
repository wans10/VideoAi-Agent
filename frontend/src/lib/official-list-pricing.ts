/**
 * Keyvo customer-price rule (owner decision 2026-11-13): every Keyvo-visible model is sold at 80% of the supplier's
 * OFFICIAL mainland list price in CNY, through the route that primarily serves it (Bailian for Kling 3 / 3 Omni /
 * 3 Turbo and MiniMax-H3; the vendor's own API for the others). Promotions are not applied.
 *
 * The provider facts of these engines record the true official list cost (CNY / 8 -> USD cents). The customer price
 * is not a disguised smaller cost: the versioned `official-list-80` compatibility profile in
 * `config/pricing-policy.json` sets `marginPercentOverride: -0.2` with nearest subtotal rounding, so the canonical
 * kernel quotes `round(0.8 x official list cost)` USD cents (then x8 CNY) with a zero platform fee and the whole
 * customer total as vendor share. It replaces the supplier-fact rounding profiles (standard / public-rounded /
 * provider-reference) for these engines unless an engine-specific database rule (admin policy editor) applies; a
 * database-wide rule (the seeded `default`) does not change it.
 * See docs/engineering/pricing-engine.md "Keyvo official list price rule".
 */
export const OFFICIAL_LIST_PRICE_PROFILE_ID = 'official-list-80';
export const OFFICIAL_LIST_CUSTOMER_PRICE_FACTOR = 0.8;

/**
 * Owner decision 2026-11-14: Google's Nano Banana engines are sold at 100% of the official USD list (Gemini API
 * prices equal Vertex prices), converted at 8 CNY/USD with no discount and no margin. `official-list-100` is the same
 * profile as `official-list-80` with `marginPercentOverride: 0`. Source: aistudio.google.com/docs/pricing, read 2026-11-14.
 */
export const OFFICIAL_LIST_100_PRICE_PROFILE_ID = 'official-list-100';
export const OFFICIAL_LIST_100_PRICED_ENGINE_IDS: ReadonlySet<string> = new Set([
  'nano-banana-2',
  'nano-banana-lite',
  'nano-banana-2-1',
]);

export const OFFICIAL_LIST_PRICED_ENGINE_IDS: ReadonlySet<string> = new Set([
  // Alibaba Bailian (cn-beijing)
  'wan-3',
  'wan-3-prime',
  'happy-horse-1-1',
  'qwen-image-3-0',
  'qwen-image-3-0-pro',
  // Kling 3 / 3 Omni / 3 Turbo: Bailian list (primary route); Kling 4.0 / Flash: Kling API list
  'kling-3-standard',
  'kling-3-pro',
  'kling-3-4k',
  'kling-o3-standard',
  'kling-o3-pro',
  'kling-o3-4k',
  'kling-3-turbo-standard',
  'kling-3-turbo-pro',
  'kling-v4',
  'kling-v4-flash',
  // MiniMax-H3: Bailian list (primary route, equal to MiniMax's); H3-Max and Hailuo: MiniMax API list
  'minimax-h3',
  'minimax-h3-max',
  'minimax-hailuo-02-text',
  'minimax-hailuo-2-3',
  'minimax-hailuo-2-3-fast',
  // Volcengine Ark (cn-beijing)
  'seedance-2-0',
  'seedance-2-0-fast',
  'seedance-2-0-mini',
  'seedance-2-5',
  'seedream-5-0-pro',
  'seedream-5-0-flash',
]);

/** Rounding profiles that only describe how supplier facts are rounded; the official-list rule replaces them. */
const VENDOR_FACT_PROFILE_IDS: ReadonlySet<string> = new Set([
  'standard',
  'public-rounded-vendor-current',
  'provider-reference-current',
]);

export function isOfficialListPricedEngine(engineId: string | null | undefined): boolean {
  return typeof engineId === 'string' && OFFICIAL_LIST_PRICED_ENGINE_IDS.has(engineId);
}

/**
 * Selects the official-list profile for a re-priced engine. Fixed products, authored offers and audio profiles are
 * customer amounts or other products and keep their profile. An explicit engine-specific database rule (an admin
 * decision through the policy editor) keeps the margin path; a database-wide rule such as the seeded `default` does not
 * override the owner's official-list rule.
 */
export function resolveOfficialListCompatibilityProfile(
  engineId: string,
  profileId: string,
  policy?: { source: 'database' | 'versioned'; matchedBy: 'precise' | 'engine' | 'global' },
): string {
  if (policy?.source === 'database' && policy.matchedBy !== 'global') return profileId;
  if (!VENDOR_FACT_PROFILE_IDS.has(profileId)) return profileId;
  if (isOfficialList100PricedEngine(engineId)) return OFFICIAL_LIST_100_PRICE_PROFILE_ID;
  return isOfficialListPricedEngine(engineId) ? OFFICIAL_LIST_PRICE_PROFILE_ID : profileId;
}

export function isOfficialList100PricedEngine(engineId: string | null | undefined): boolean {
  return typeof engineId === 'string' && OFFICIAL_LIST_100_PRICED_ENGINE_IDS.has(engineId);
}

/**
 * Mainland voice over (MiniMax Speech, Seed Audio 1.0) is priced from official list prices too. A voice-only request
 * without a voice model is costed as Seed Audio (audio-generation.ts), so it follows the same rule.
 */
export function isOfficialListPricedAudio(input: { pack: string; voiceModel?: string | null }): boolean {
  return input.pack === 'voice_only' && (input.voiceModel == null || input.voiceModel === 'minimax' || input.voiceModel === 'seed');
}
