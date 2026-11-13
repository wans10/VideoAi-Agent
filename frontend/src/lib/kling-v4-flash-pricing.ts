import type { PricingContext } from './pricing-context';
export const KLING_V4_FLASH_PRICING_SOURCE = 'https://klingai.com/document-api/pricing/base/video.md';

/**
 * Kling's official CNY list price (checked 2026-11-13): Kling 4.0 Flash 720P 0.6 CNY/s without input video,
 * 0.4 CNY/s with input video on max(input + output, 2 x output) seconds; recorded in USD cents at 8 CNY/USD.
 */
export function klingV4FlashPricingUsage(context: Pick<PricingContext, 'mode' | 'resolution' | 'durationSec' | 'hasVideoInput' | 'inputVideoDurationSec' | 'inheritedDurationSec'>) {
  const mode = context.mode ?? 't2v', output = context.durationSec;
  if (!['t2v', 'i2v', 'ref2v'].includes(mode) || context.resolution !== '720p' || context.inheritedDurationSec !== undefined
    || !Number.isInteger(output) || output < 3 || output > 20) throw new Error('Unsupported Kling Flash pricing scenario.');
  if (mode === 'ref2v' && context.hasVideoInput === undefined) throw new Error('Verified Kling Flash input class is required.');
  const hasVideoInput = context.hasVideoInput === true;
  if (mode !== 'ref2v' && hasVideoInput) throw new Error('Kling Flash video references require reference mode.');
  const inputVideoDurationSec = context.inputVideoDurationSec ?? 0;
  if (!Number.isFinite(inputVideoDurationSec) || (hasVideoInput ? inputVideoDurationSec < 3 || inputVideoDurationSec > 20 : inputVideoDurationSec !== 0)) throw new Error('Exact owned Kling Flash video timing is required.');
  const centsPerSecond = (hasVideoInput ? 0.4 : 0.6) * 100 / 8;
  const billableSeconds = hasVideoInput ? output + Math.max(inputVideoDurationSec, output) : output;
  return { inputVideoDurationSec, outputDurationSec: output, hasVideoInput, billableSeconds, centsPerSecond,
    supplierExactCents: Number((billableSeconds * centsPerSecond).toFixed(10)) };
}
