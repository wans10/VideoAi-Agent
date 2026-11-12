import type { PricingContext } from './pricing-context';

/**
 * Kling's official CNY list price (https://klingai.com/document-api/pricing/base/video.md, checked 2026-11-13):
 * Kling 4.0 1.0 / 1.5 CNY/s (720P / 1080P) without input video, 0.6 / 0.9 CNY/s with input video billed on
 * max(input + output, 2 x output) seconds; 1 credit = CNY 1. Recorded in USD cents at the fixed 8 CNY/USD rate.
 * These are supplier facts, never customer tariffs (official-list-pricing.ts sets the customer price).
 */
export const KLING_V4_PRICING_SOURCE = 'https://klingai.com/document-api/pricing/base/video.md';
const KLING_V4_CENTS_PER_SECOND = {
  none: { '720p': 1.0 * 100 / 8, '1080p': 1.5 * 100 / 8 },
  video: { '720p': 0.6 * 100 / 8, '1080p': 0.9 * 100 / 8 },
} as const;
export function klingV4PricingUsage(context: Pick<PricingContext, 'mode'|'resolution'|'durationSec'|'hasVideoInput'|'inputVideoDurationSec'|'inheritedDurationSec'>) {
  const mode = context.mode ?? 't2v';
  if (!['t2v','i2v','ref2v','v2v'].includes(mode)) throw new Error('Unsupported Kling V4 pricing mode.');
  const hasVideo = mode === 'v2v' || context.hasVideoInput === true;
  if ((mode === 't2v' || mode === 'i2v') && hasVideo) throw new Error('Unexpected Kling V4 video input.');
  if (mode === 'ref2v' && context.hasVideoInput === undefined) throw new Error('Verified Kling V4 input class is required.');
  const input = context.inputVideoDurationSec ?? 0;
  if (!Number.isFinite(input) || (hasVideo ? input < 3 || input > (mode === 'v2v' ? 30.05 : 30) : input !== 0)) {
    throw new Error('Verified Kling V4 video seconds are required.');
  }
  const inherited = context.inheritedDurationSec;
  const output = inherited ?? context.durationSec;
  if (!Number.isFinite(output) || output < 3 || output > (inherited === undefined ? 30 : 30.05)
    || (inherited === undefined && !Number.isInteger(output))
    || (inherited !== undefined && (mode !== 'v2v' || inherited !== input))) throw new Error('Unsupported Kling V4 output duration.');
  const centsPerSecond = (hasVideo ? KLING_V4_CENTS_PER_SECOND.video : KLING_V4_CENTS_PER_SECOND.none)[context.resolution as '720p'|'1080p'];
  if (!centsPerSecond) throw new Error('Unsupported Kling V4 pricing resolution.');
  const billableSeconds = hasVideo ? Math.max(input + output, 2 * output) : output;
  return {inputVideoDurationSec:input,outputDurationSec:output,hasVideoInput:hasVideo,billableSeconds,centsPerSecond,
    supplierExactCents:Number((billableSeconds*centsPerSecond).toFixed(6))};
}
