import type { PricingContext } from '@/lib/pricing-context';
import { resolveSeedreamProviderSize, seedreamPricingInputCount, SEEDREAM_ASPECT_RATIO_VALUES } from './seedream';

/** Public direct ModelArk LIST, separate from account discounts and customer tariffs. */
export const SEEDREAM_NOVEMBER_LIST_SOURCE = {
  url: 'https://ark.volcengine.com/region:cn-beijing/docs/model-pricing.md',
  checkedAt: '2026-11-22',
  currency: 'USD',
} as const;

export type SeedreamListModel = 'lite' | 'pro' | 'flash' | '5.5';
// Keyvo: Seedream 5.0 Flash is Volcengine-direct and priced by the official-list x0.8 rule in CNY, so only
// 5.5 follows upstream's USD single-image pricing branch (docs/engineering/keyvo-upstream-deviations.md).
export type NewSeedreamEngineId = 'seedream-5-5';

export function isNewSeedreamEngineId(id: string): id is NewSeedreamEngineId {
  return id === 'seedream-5-5';
}

export function seedreamListModelForEngine(id: string): SeedreamListModel | null {
  return ({ seedream: 'lite', 'seedream-5-0-pro': 'pro', 'seedream-5-0-flash': 'flash',
    'seedream-5-5': '5.5' } as const)[id as 'seedream' | 'seedream-5-0-pro' | 'seedream-5-0-flash' | NewSeedreamEngineId] ?? null;
}

/** The 5.5 tier boundary is 1536² × 1.05²; it is distinct from Pro's 2.61M boundary. */
export function quoteNewSeedreamListCost(input: {
  model: 'flash' | '5.5'; outputPixels: number[]; inputImages: number;
}) {
  if (!Number.isSafeInteger(input.inputImages) || input.inputImages < 0 || input.inputImages > 10
    || input.outputPixels.length > 1 || input.outputPixels.some(pixels => !Number.isSafeInteger(pixels)
      || pixels < 921_600 || pixels > 4_624_220)) throw new Error('Invalid Seedream single-image usage.');
  // Keyvo: Volcengine Ark cn-beijing list in CNY (https://ark.volcengine.com/region:cn-beijing/docs/model-pricing.md,
  // checked 2026-11-22): Seedream 5.5 output CNY 0.13 up to 2.61 MP and CNY 0.23 up to 4.63 MP, every input image
  // CNY 0.05; accounting rate 8 CNY/USD like every Keyvo engine. Keyvo sells at 80% (official-list-pricing.ts).
  const outputUsd = input.outputPixels.reduce((sum, pixels) => sum + (input.model === 'flash'
    ? 0.12 / 8 : pixels <= 2_610_000 ? 0.13 / 8 : 0.23 / 8), 0);
  const inputUsd = input.model === '5.5' && input.outputPixels.length ? input.inputImages * 0.05 / 8 : 0;
  return { outputUsd: Number(outputUsd.toFixed(6)), inputUsd: Number(inputUsd.toFixed(6)),
    totalUsd: Number((outputUsd + inputUsd).toFixed(6)), effectiveUsd: null,
    status: 'published_list' as const, source: SEEDREAM_NOVEMBER_LIST_SOURCE };
}

type SeedreamPricingContext = Pick<PricingContext, 'engine' | 'mode' | 'durationSec' | 'resolution'
  | 'aspectRatio' | 'inputImageCount' | 'referenceImageCount'>;

/** Exact supported new-model domain used by billing, public facts and tariff selectors. */
export function seedreamNewModelPricingUsage(context: SeedreamPricingContext, currency = 'USD') {
  const id = context.engine.id;
  const mode = context.mode ?? 't2i';
  const resolution = context.resolution.trim().toUpperCase();
  const aspectRatio = context.aspectRatio == null || context.aspectRatio === 'auto' ? '1:1' : context.aspectRatio;
  if (!isNewSeedreamEngineId(id) || currency !== 'USD' || !['t2i', 'i2i'].includes(mode)
    || context.durationSec !== 1 || !['1K', '1.5K', '2K'].includes(resolution)
    || !SEEDREAM_ASPECT_RATIO_VALUES.includes(aspectRatio as (typeof SEEDREAM_ASPECT_RATIO_VALUES)[number])
    || [context.inputImageCount, context.referenceImageCount].some(count => count !== undefined
      && (!Number.isSafeInteger(count) || count < 0))
    || (mode === 't2i' && ((context.inputImageCount ?? 0) !== 0 || (context.referenceImageCount ?? 0) !== 0))) {
    throw new Error('Unsupported Seedream single-image pricing scenario.');
  }
  const inputImages = seedreamPricingInputCount({ ...context, mode });
  const dimensions = /^(\d+)x(\d+)$/.exec(resolveSeedreamProviderSize(resolution, aspectRatio, id));
  if (!dimensions) throw new Error('Unsupported Seedream image resolution.');
  const outputPixels = Number(dimensions[1]) * Number(dimensions[2]);
  const list = quoteNewSeedreamListCost({ model: id === 'seedream-5-5' ? '5.5' : 'flash',
    inputImages, outputPixels: [outputPixels] });
  return { ...list, engineId: id, mode, resolution, inputImages, outputPixels,
    meta: { pricing_model: 'seedream_direct_list_2026_11_13',
      provider_cost_source: SEEDREAM_NOVEMBER_LIST_SOURCE.url, provider_cost_checked_at: SEEDREAM_NOVEMBER_LIST_SOURCE.checkedAt,
      effective_supplier_charge_verified: false, provider_input_image_count: inputImages,
      provider_output_pixels: outputPixels, provider_output_usd: list.outputUsd, provider_input_usd: list.inputUsd } };
}
