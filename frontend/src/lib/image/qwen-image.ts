import { USD_TO_CNY_CUSTOMER_RATE } from '@/lib/customer-currency';

export const QWEN_IMAGE_IDS = ['qwen-image-3-0', 'qwen-image-3-0-pro'] as const;
export const QWEN_IMAGE_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3'] as const;
export function isQwenImageEngineId(id: string): boolean {
  return (QWEN_IMAGE_IDS as readonly string[]).includes(id);
}

/** Fixed area presets keep quotes deterministic; provider auto sizing is deliberately absent. */
export function resolveQwenImageSize(resolution: string, aspectRatio: string | null = '1:1') {
  if (!['1k', '2k'].includes(resolution.toLowerCase())) throw new Error('Unsupported Qwen image resolution.');
  const ratio = aspectRatio ?? '1:1';
  if (!(QWEN_IMAGE_RATIOS as readonly string[]).includes(ratio)) throw new Error('Unsupported Qwen image aspect ratio.');
  const [a, b] = ratio.split(':').map(Number);
  const area = resolution.toLowerCase() === '2k' ? 2048 ** 2 : 1024 ** 2;
  const width = Math.floor(Math.sqrt(area * a / b) / 16) * 16;
  const height = Math.floor(Math.sqrt(area * b / a) / 16) * 16;
  return { width, height, size: `${width}*${height}` };
}

/** Beijing CNY rates supplied from the Bailian console, 2026-10-08. */
export function calculateQwenImageCost(input: {
  engineId: string; resolution: string; aspectRatio?: string | null;
  mode: string; referenceImageCount?: number; outputCount: number;
}) {
  if (!isQwenImageEngineId(input.engineId)) throw new Error('Unsupported Qwen image model.');
  const dimensions = resolveQwenImageSize(input.resolution, input.aspectRatio);
  const outputCount = input.outputCount;
  const referenceCount = input.mode === 'i2i' ? input.referenceImageCount ?? 0 : 0;
  if (!Number.isInteger(outputCount) || outputCount !== 1) throw new Error('Qwen currently requires one output image.');
  if (!Number.isInteger(referenceCount) || referenceCount < 0 || referenceCount > 3) throw new Error('Qwen supports up to three reference images.');
  const tier = dimensions.width * dimensions.height > 2_250_000 ? '2k' : '1k';
  const outputCny = input.engineId === 'qwen-image-3-0' ? 0.18 : tier === '2k' ? 0.50 : 0.25;
  const inputCny = referenceCount * 0.02;
  // The application's canonical pricing facts are USD. Use its explicit accounting rate.
  const outputUsdCents = outputCny * 100 / USD_TO_CNY_CUSTOMER_RATE;
  const referenceUsdCents = inputCny * 100 / USD_TO_CNY_CUSTOMER_RATE;
  return { ...dimensions, tier, referenceCount, outputCny, inputCny, outputUsdCents, referenceUsdCents,
    subtotalUsdCents: outputUsdCents + referenceUsdCents,
    source: 'bailian-cn-beijing-console-2026-10-08', accountingCnyPerUsd: USD_TO_CNY_CUSTOMER_RATE };
}
