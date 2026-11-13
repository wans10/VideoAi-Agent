import { calculateQwenImageCost, isQwenImageEngineId } from '@/lib/image/qwen-image';
import { klingV4PricingUsage, KLING_V4_PRICING_SOURCE } from '@/lib/kling-v4-pricing';
import { klingV4FlashPricingUsage, KLING_V4_FLASH_PRICING_SOURCE } from '@/lib/kling-v4-flash-pricing';
import { calculateMinimaxHailuoCost, isMinimaxHailuoOfficialEngineId } from '@/lib/minimax-hailuo-pricing';
import { isGptImage26EngineId } from '@/lib/image/gptImage26';
import { calculateGptImage26ListOutputComponents } from '@/lib/image/gptImage26Pricing';
import {
  computePricingDefinitionFacts,
  type PricingFacts,
  type PricingSnapshot,
} from '@maxvideoai/pricing';
import { isLumaAgentsImageEngineId, isLumaRay32EngineId, isLumaRay32PublicMode } from '@/lib/luma-agents';
import {
  calculateLumaAgentsImageReferencePrice,
  calculateLumaRay32ReferencePrice,
} from '@/lib/luma-agents-pricing';
import { isLumaRay2EngineId, isLumaRay2GenerateMode } from '@/lib/luma-ray2';
import { calculateLumaRay2Price } from '@/lib/luma-ray2-pricing';
import { buildPricingDefinition } from '@/lib/pricing-definition';
import { isWan3EngineId, withWan3InputVideoPricing } from '@/lib/wan3-pricing';
import { computeSeedance2TokenQuote, isSeedance2TokenPricing } from '@/lib/seedance-2-pricing';
import { normalizeSeedancePricingContext } from '@/lib/seedance-option-pricing';
import { NANO21_ENGINE_ID } from '@/lib/nano-banana-2-1';
import { calculateNano21ListImageComponents } from '@/lib/nano-banana-2-1-pricing';
import {
  isGptImage25EngineId,
  calculateGptImage25ProviderPrice,
  normalizeGptImage2Quality,
  normalizeGptImageQuality,
  resolveGptImage2PricingTier,
} from '@/lib/image/gptImage2';
import type { EngineCaps, Mode } from '@/types/engines';
import { isMinimaxH3EngineId } from '@/lib/minimax-h3';
import { calculateMinimaxH3ProviderPrice, MINIMAX_H3_PRICING_SOURCE } from '@/lib/minimax-h3-pricing';
import { isMinimaxH3MaxEngineId } from '@/lib/minimax-h3-max';
import { calculateMinimaxH3MaxOfficialCost } from '@/lib/minimax-h3-max-pricing';
import {
  calculateGoogleOmniProviderCost,
  GOOGLE_OMNI_PRICING_SOURCE,
  resolveGoogleOmniPricingInput,
} from '@/lib/google-omni-pricing';

export type PublicPricingFactsResult = {
  facts: PricingFacts;
  base: PricingSnapshot['base'];
  addons: PricingSnapshot['addons'];
  meta: Record<string, unknown>;
  compatibilityProfileId: string;
};

export type PublicPricingFactsContext = {
  seedanceSourceAspectRatio?: import('@/types/engines').AspectRatio;
  engine: EngineCaps;
  durationSec: number;
  resolution: string;
  mode?: Mode;
  durationOption?: number | string | null;
  inputAudioDurationSec?: number;
  aspectRatio?: string | null;
  quality?: string | null;
  referenceImageCount?: number;
  referenceTokenBudget?: number;
  verifiedReferenceTokenCount?: number;
  inputImageCount?: number;
  inputVideoDurationSec?: number;
  inheritedDurationSec?: number;
  hasVideoInput?: boolean;
  addons?: Record<string, boolean | number | undefined>;
  lumaRay2BasePriceUsd?: number;
  useFlatImageUnitFacts?: boolean;
  useStandardDefinitionFacts?: boolean;
  thinkingLevel?: string | null;
  maxOutputTokens?: number;
  enableWebSearch?: boolean;
  enableImageSearch?: boolean;
};

export const DEFAULT_LUMA_RAY2_BASE_PRICE_USD = {
  standard: 0.5,
  flash: 0.2,
} as const;

function booleanAddon(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
  return false;
}

function resultFromExactFacts(params: {
  engineId: string;
  currency: string;
  exactCents: number;
  quantity: number;
  unit: string;
  compatibilityProfileId?: string;
  presentedBaseCents?: number;
  rate?: number;
  meta?: Record<string, unknown>;
  addons?: PricingSnapshot['addons'];
}): PublicPricingFactsResult {
  const presentedBaseCents = params.presentedBaseCents ?? Math.round(params.exactCents);
  return {
    facts: {
      engineId: params.engineId,
      currency: params.currency,
      vendorSubtotalExactCents: params.exactCents,
      unit: params.unit,
      quantity: params.quantity,
    },
    base: {
      seconds: params.quantity,
      rate: params.rate ?? (params.quantity > 0 ? params.exactCents / params.quantity / 100 : 0),
      unit: params.unit,
      amountCents: presentedBaseCents,
    },
    addons: (params.addons ?? []).map((addon) => ({ ...addon })),
    meta: { ...(params.meta ?? {}) },
    compatibilityProfileId: params.compatibilityProfileId ?? 'standard',
  };
}

function buildStandardDefinitionFacts(
  context: PublicPricingFactsContext,
  currency: string
): PublicPricingFactsResult {
  const { engine, durationSec, resolution } = context;
  const definition = buildPricingDefinition(engine);
  if (!definition) throw new Error(`Pricing definition not found for engine ${engine.id}`);
  const factualDefinition = {
    ...definition,
    currency,
  };
  let definitionFacts = computePricingDefinitionFacts(factualDefinition, {
    durationSec,
    resolution,
    ...(context.mode ? { mode: context.mode } : {}),
    ...(typeof context.inputAudioDurationSec === 'number'
      ? { inputAudioDurationSec: context.inputAudioDurationSec }
      : {}),
    ...(typeof context.referenceImageCount === 'number'
      ? { referenceImageCount: context.referenceImageCount }
      : {}),
    ...(context.addons ? { addons: context.addons } : {}),
  });
  if (isWan3EngineId(engine.id)) {
    definitionFacts = withWan3InputVideoPricing(definitionFacts, context);
  }
  return {
    facts: {
      engineId: engine.id,
      currency,
      vendorSubtotalExactCents: definitionFacts.vendorSubtotalExactCents,
      unit: definitionFacts.base.unit ?? 'sec',
      quantity: definitionFacts.base.seconds,
    },
    base: { ...definitionFacts.base },
    addons: definitionFacts.addons.map((addon) => ({ ...addon })),
    meta: { ...definitionFacts.meta },
    compatibilityProfileId: 'standard',
  };
}

export function buildPublicPricingFacts(context: PublicPricingFactsContext): PublicPricingFactsResult {
  context = normalizeSeedancePricingContext(context);
  const { engine, durationSec, resolution } = context;
  const mode = context.mode ?? (engine.modes.includes('t2i') ? 't2i' : 't2v');
  const currency = (engine.pricingDetails?.currency ?? engine.pricing?.currency ?? 'USD').toUpperCase();
  if (isGptImage26EngineId(engine.id)) {
    const { partialListUsd, meta } = calculateGptImage26ListOutputComponents({ ...context, mode }, currency);
    return resultFromExactFacts({ engineId: engine.id, currency, exactCents: partialListUsd * 100,
      presentedBaseCents: partialListUsd * 100, quantity: durationSec, unit: 'image', rate: partialListUsd / durationSec, meta });
  }
  if (engine.id === NANO21_ENGINE_ID) {
    const { partialListUsd, meta } = calculateNano21ListImageComponents({ ...context, mode }, currency);
    return resultFromExactFacts({ engineId: engine.id, currency, exactCents: partialListUsd * 100,
      presentedBaseCents: partialListUsd * 100, quantity: 1, unit: 'image', rate: partialListUsd, meta });
  }
  if (context.useStandardDefinitionFacts) {
    return buildStandardDefinitionFacts(context, currency);
  }

  if (engine.id === 'kling-v4' || engine.id === 'kling-v4-flash') {
    // Same Kling official list facts as billing (pricing-billing-facts.ts). Public presets without media are
    // priced as requests without input video.
    const flash = engine.id === 'kling-v4-flash';
    const usageContext = { mode, resolution, durationSec,
      hasVideoInput: context.hasVideoInput ?? (mode === 'ref2v' ? false : undefined),
      inputVideoDurationSec: context.inputVideoDurationSec, inheritedDurationSec: context.inheritedDurationSec };
    const usage = flash ? klingV4FlashPricingUsage(usageContext) : klingV4PricingUsage(usageContext);
    return resultFromExactFacts({
      engineId: engine.id, currency: 'USD', exactCents: usage.supplierExactCents,
      quantity: usage.outputDurationSec, unit: 'sec', rate: usage.supplierExactCents / 100 / usage.outputDurationSec,
      meta: { pricing_model: flash ? 'kling_v4_flash_official_cn_list' : 'kling_v4_official_cn_list',
        provider_cost_source: flash ? KLING_V4_FLASH_PRICING_SOURCE : KLING_V4_PRICING_SOURCE,
        billable_seconds: usage.billableSeconds, has_video_input: usage.hasVideoInput },
    });
  }

  if (isQwenImageEngineId(engine.id)) {
    const cost = calculateQwenImageCost({ engineId: engine.id, resolution,
      aspectRatio: context.aspectRatio, mode, referenceImageCount: context.referenceImageCount,
      outputCount: durationSec });
    return resultFromExactFacts({
      engineId: engine.id, currency, exactCents: cost.subtotalUsdCents,
      quantity: durationSec, unit: 'image', rate: cost.outputUsdCents / 100,
      presentedBaseCents: cost.outputUsdCents,
      addons: cost.referenceUsdCents > 0 ? [{ type: 'reference_images', amountCents: cost.referenceUsdCents }] : [],
      meta: { pricing_model: 'qwen_image_input_output', provider_cost_source: cost.source,
        provider_currency: 'CNY', output_cny: cost.outputCny, input_cny: cost.inputCny,
        accounting_cny_per_usd: cost.accountingCnyPerUsd, billing_tier: cost.tier,
        reference_image_count: cost.referenceCount },
    });
  }

  if (isMinimaxHailuoOfficialEngineId(engine.id)) {
    const cost = calculateMinimaxHailuoCost({ engineId: engine.id, mode, resolution, durationSec });
    return resultFromExactFacts({
      engineId: engine.id, currency, exactCents: cost.subtotalUsdCents,
      quantity: durationSec, unit: 'sec', rate: cost.ratePerSecondUsd,
      presentedBaseCents: Math.ceil(cost.subtotalUsdCents - 1e-9),
      meta: { pricing_model: 'minimax_hailuo_per_video', provider_cost_source: cost.source,
        provider_currency: 'CNY', output_cny: cost.outputCny, accounting_cny_per_usd: cost.accountingCnyPerUsd },
    });
  }

  if (engine.id === 'gemini-omni-flash') {
    const pricingInput = resolveGoogleOmniPricingInput({
      outputResolution: resolution,
      outputDurationSec: durationSec,
      inheritedDurationSec: context.inheritedDurationSec,
      mode,
      inputImageCount: context.inputImageCount,
      referenceImageCount: context.referenceImageCount,
      inputVideoDurationSec: context.inputVideoDurationSec,
    });
    const pricing = calculateGoogleOmniProviderCost(pricingInput);
    return resultFromExactFacts({
      engineId: engine.id,
      currency,
      exactCents: pricing.providerCostExactCents,
      presentedBaseCents: pricing.providerCostCents,
      quantity: pricingInput.outputDurationSec,
      unit: 'sec',
      rate: pricing.providerCostUsd / pricingInput.outputDurationSec,
      meta: {
        pricing_model: 'google_omni_tokens',
        provider_cost_source: GOOGLE_OMNI_PRICING_SOURCE,
        mode,
        output_resolution: pricingInput.outputResolution,
        output_duration_sec: pricingInput.outputDurationSec,
        input_image_count: pricingInput.inputImageCount,
        input_video_duration_sec: pricingInput.inputVideoDurationSec,
        cost_breakdown_usd: pricing,
      },
    });
  }

  if (isMinimaxH3MaxEngineId(engine.id)) {
    // Same PROVISIONAL official CNY cost as billing (pricing-billing-facts.ts); public presets carry no media.
    const cost = calculateMinimaxH3MaxOfficialCost({
      mode, durationSec, resolution,
      inputVideoDurationSec: context.inputVideoDurationSec,
      referenceImageCount: context.referenceImageCount,
    });
    const addons: PricingSnapshot['addons'] = [];
    if (cost.inputVideoUsdCents > 0) addons.push({ type: 'reference_video_seconds', amountCents: Math.ceil(cost.inputVideoUsdCents - 1e-9) });
    if (cost.imageUsdCents > 0) addons.push({ type: 'reference_images_above_two', amountCents: Math.ceil(cost.imageUsdCents - 1e-9) });
    return resultFromExactFacts({
      engineId: engine.id,
      currency,
      exactCents: cost.subtotalUsdCents,
      presentedBaseCents: Math.ceil(cost.outputUsdCents - 1e-9),
      quantity: durationSec,
      unit: 'sec',
      rate: cost.ratePerSecondUsd,
      addons,
      compatibilityProfileId: 'provider-reference-current',
      meta: {
        pricing_model: 'minimax_h3_max_official_output_plus_inputs',
        provider_cost_source: cost.source,
        cost_breakdown_usd: cost,
        provider_currency: 'CNY',
        public_provider: 'MiniMax',
        public_family: 'Hailuo',
        mode,
        output_cny: cost.outputCny,
        input_video_seconds: cost.inputVideoSeconds,
        input_video_cny: cost.inputVideoCny,
        reference_image_count: cost.imageCount,
        paid_reference_image_count: cost.paidImageCount,
        reference_image_cny: cost.imageCny,
        accounting_cny_per_usd: cost.accountingCnyPerUsd,
      },
    });
  }

  if (isMinimaxH3EngineId(engine.id)) {
    // Same official list cost as billing (pricing-billing-facts.ts); public presets usually carry no media.
    const reference = calculateMinimaxH3ProviderPrice({
      durationSec,
      resolution: resolution as '480P' | '768P' | '2K' | '4K',
      referenceImageCount: context.referenceImageCount,
      ...(mode === 'ref2v' && typeof context.inputVideoDurationSec === 'number'
        ? { inputVideoDurationSec: context.inputVideoDurationSec } : {}),
    });
    const surchargeCents = Math.round(reference.breakdown.referenceImageSurchargeUsd * 100 * 1000) / 1000;
    const inputVideoCents = Math.round((reference.breakdown.inputVideoSurchargeUsd ?? 0) * 100 * 1000) / 1000;
    return resultFromExactFacts({
      engineId: engine.id,
      currency,
      exactCents: Math.round(reference.subtotalUsd * 100 * 1000) / 1000,
      presentedBaseCents: Math.round(reference.breakdown.baseSubtotalUsd * 100 * 1000) / 1000,
      quantity: durationSec,
      unit: 'sec',
      rate: reference.breakdown.ratePerSecondUsd,
      addons: [
        ...(surchargeCents > 0 ? [{ type: 'reference_images_above_five', amountCents: surchargeCents }] : []),
        ...(inputVideoCents > 0 ? [{ type: 'reference_video_seconds', amountCents: inputVideoCents }] : []),
      ],
      compatibilityProfileId: 'provider-reference-current',
      meta: {
        pricing_model: 'minimax_h3_official_output_plus_inputs',
        provider_cost_source: MINIMAX_H3_PRICING_SOURCE,
        cost_breakdown_usd: reference.breakdown,
        mode,
        reference_image_count: reference.breakdown.referenceImageCount,
        paid_reference_image_count: reference.breakdown.paidReferenceImages,
        reference_image_surcharge_usd: reference.breakdown.referenceImageSurchargeUsd,
      },
    });
  }

  if (isLumaAgentsImageEngineId(engine.id) && (mode === 't2i' || mode === 'i2i')) {
    const reference = calculateLumaAgentsImageReferencePrice({
      engineId: engine.id,
      mode,
      referenceImageCount: Math.max(0, Math.round(context.referenceImageCount ?? 0)),
    });
    return resultFromExactFacts({
      engineId: engine.id,
      currency,
      exactCents: reference.baseSubtotalUsd * 100,
      presentedBaseCents: Math.ceil(reference.baseSubtotalUsd * 100 - 1e-9),
      quantity: 1,
      unit: 'image',
      compatibilityProfileId: 'provider-reference-current',
      meta: { cost_breakdown_usd: reference.breakdown },
    });
  }

  if (isLumaRay32EngineId(engine.id) && isLumaRay32PublicMode(mode)) {
    const reference = calculateLumaRay32ReferencePrice({
      duration: context.durationOption ?? durationSec,
      resolution,
      hdr: booleanAddon(context.addons?.hdr),
      exrExport: booleanAddon(context.addons?.exr_export ?? context.addons?.exrExport),
    });
    return resultFromExactFacts({
      engineId: engine.id,
      currency,
      exactCents: reference.baseSubtotalUsd * 100,
      presentedBaseCents: Math.ceil(reference.baseSubtotalUsd * 100 - 1e-9),
      quantity: reference.breakdown.duration === '10s' ? 10 : 5,
      unit: 'sec',
      compatibilityProfileId: 'provider-reference-current',
      meta: { cost_breakdown_usd: reference.breakdown },
    });
  }

  if (isLumaRay2EngineId(engine.id) && isLumaRay2GenerateMode(mode)) {
    const isFlash = engine.id === 'lumaRay2_flash';
    const baseUsd =
      context.lumaRay2BasePriceUsd ??
      (isFlash ? DEFAULT_LUMA_RAY2_BASE_PRICE_USD.flash : DEFAULT_LUMA_RAY2_BASE_PRICE_USD.standard);
    const reference = calculateLumaRay2Price({
      engineId: isFlash ? 'luma-ray2-flash' : 'luma-ray2',
      baseUsd,
      duration: context.durationOption ?? durationSec,
      resolution,
    });
    return resultFromExactFacts({
      engineId: engine.id,
      currency,
      exactCents: reference.baseSubtotalUsd * 100,
      quantity: durationSec,
      unit: 'sec',
      meta: { cost_breakdown_usd: reference.breakdown },
    });
  }

  if (isGptImage25EngineId(engine.id)) {
    const quality = normalizeGptImageQuality(context.quality, engine.id);
    const quantity = Math.max(1, Math.round(durationSec));
    const price = calculateGptImage25ProviderPrice({
      mode: mode === 'i2i' ? 'i2i' : 't2i',
      imageSize: resolution,
      quality,
      outputCount: quantity,
      referenceImageCount: context.referenceImageCount,
    });
    const { tier } = price;
    return resultFromExactFacts({
      engineId: engine.id,
      currency,
      exactCents: price.providerSubtotalExactCents,
      quantity,
      unit: 'image',
      rate: price.outputUnitExactCents / 100,
      presentedBaseCents: Math.ceil(price.outputSubtotalExactCents - 1e-9),
      addons: price.referenceSubtotalExactCents > 0
        ? [{ type: 'reference_images', amountCents: Math.ceil(price.referenceSubtotalExactCents - 1e-9) }]
        : [],
      meta: {
        quality,
        pricingTier: tier.billingKey,
        pricing_model: 'gpt_image_2_5_quality_size',
        provider_cost_source: 'fal_gpt_image_2_5_pricing_table',
        reference_image_count: price.referenceImageCount,
        provider_reference_image_count: price.providerReferenceImageCount,
        included_reference_image_count: price.includedReferenceImageCount,
        additional_reference_image_count: price.additionalReferenceImageCount,
        paid_reference_image_count: price.additionalReferenceImageCount,
      },
    });
  }

  if (engine.id === 'gpt-image-2') {
    const tier = resolveGptImage2PricingTier(resolution);
    const quality = normalizeGptImage2Quality(context.quality ?? undefined);
    const quantity = Math.max(1, Math.round(durationSec));
    const exactCents = tier.prices[quality] * quantity;
    return resultFromExactFacts({
      engineId: engine.id,
      currency,
      exactCents,
      quantity,
      unit: 'image',
      rate: tier.prices[quality] / 100,
      meta: { quality, pricingTier: tier.billingKey },
    });
  }

  if (
    context.useFlatImageUnitFacts &&
    (mode === 't2i' || mode === 'i2i') &&
    engine.pricingDetails?.flatCents
  ) {
    const flat = engine.pricingDetails.flatCents;
    const unitCents = flat.byResolution?.[resolution] ?? flat.default;
    if (typeof unitCents === 'number' && Number.isFinite(unitCents) && unitCents >= 0) {
      const quantity = Math.max(1, Math.round(durationSec));
      return resultFromExactFacts({
        engineId: engine.id,
        currency,
        exactCents: unitCents * quantity,
        quantity,
        unit: 'image',
        rate: unitCents / 100,
      });
    }
  }

  if (isSeedance2TokenPricing(engine.pricingDetails)) {
    const reference = computeSeedance2TokenQuote({
      details: engine.pricingDetails,
      durationSec,
      resolution,
      aspectRatio: context.aspectRatio ?? engine.pricingDetails.tokenPricing.defaultAspectRatio,
      billingInputType:
        context.hasVideoInput === true
          ? 'video_input'
          : context.hasVideoInput === false
            ? 'no_video_input'
            : undefined,
      ...(typeof context.inputVideoDurationSec === 'number' ? { inputVideoDurationSec: context.inputVideoDurationSec } : {}),
    });
    return resultFromExactFacts({
      engineId: engine.id,
      currency,
      exactCents: reference.legacyRetailBasisUsd * 100,
      presentedBaseCents: Math.ceil(reference.legacyRetailBasisUsd * 100 - 1e-9),
      quantity: durationSec,
      unit: 'sec',
      compatibilityProfileId: 'provider-reference-current',
      meta: { cost_breakdown_usd: reference },
    });
  }

  return buildStandardDefinitionFacts(context, currency);
}

export function buildPublicUnitPricingFacts(input: {
  engineId: string;
  currency: string;
  unitPriceCents: number;
  quantity?: number;
  unit: string;
}): PublicPricingFactsResult {
  const quantity = Math.max(1, Math.round(input.quantity ?? 1));
  return resultFromExactFacts({
    engineId: input.engineId,
    currency: input.currency.toUpperCase(),
    exactCents: Math.max(0, input.unitPriceCents) * quantity,
    quantity,
    unit: input.unit,
    compatibilityProfileId: isGptImage25EngineId(input.engineId)
      ? 'standard'
      : 'public-rounded-vendor-current',
    rate: input.unitPriceCents / 100,
  });
}

export function buildAuthoredPublicOfferFacts(input: {
  engineId: string;
  currency: string;
  amountCents: number;
}): PublicPricingFactsResult {
  return resultFromExactFacts({
    engineId: input.engineId,
    currency: input.currency.toUpperCase(),
    exactCents: Math.max(0, Math.round(input.amountCents)),
    quantity: 1,
    unit: 'offer',
    compatibilityProfileId: 'schema-current',
  });
}

export function buildFixedPublicProductFacts(input: {
  engineId: string;
  currency: string;
  amountCents: number;
  quantity: number;
  unit: string;
}): PublicPricingFactsResult {
  return resultFromExactFacts({
    engineId: input.engineId,
    currency: input.currency.toUpperCase(),
    exactCents: Math.max(0, Math.round(input.amountCents)),
    quantity: Math.max(1, input.quantity),
    unit: input.unit,
    compatibilityProfileId: 'fixed-product-current',
  });
}
