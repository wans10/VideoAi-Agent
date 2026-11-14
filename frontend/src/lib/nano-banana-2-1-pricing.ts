import {
  assertNano21Scenario,
  NANO21_BUDGET_POLICY_VERSION,
  normalizeNano21Settings,
} from './nano-banana-2-1';

type Nano21ListImageInput = {
  resolution: string;
  durationSec: number;
  mode?: string;
  referenceImageCount?: number;
  aspectRatio?: string | null;
  thinkingLevel?: string | null;
  maxOutputTokens?: number;
  enableWebSearch?: boolean;
  enableImageSearch?: boolean;
};

/** Known image components only; text, reasoning and tools remain variable. */
export function calculateNano21ListImageComponents(input: Nano21ListImageInput, currency: string) {
  if (currency !== 'USD') throw new Error('Nano Banana 2.1 supplier facts require USD.');
  const settings = normalizeNano21Settings(input);
  assertNano21Scenario({ ...settings, mode: input.mode, referenceImageCount: input.referenceImageCount,
    outputCount: input.durationSec, aspectRatio: input.aspectRatio });
  const imageTokens = ({ '1K': 1120, '2K': 1680, '4K': 3780 } as const)[settings.imageSize];
  // Official per-image output list (aistudio.google.com/docs/pricing, read 2026-11-14). The page's 4K figure is $0.113,
  // which is not exactly 3,780 tokens x $30/M ($0.1134), so the stated per-size price is used. Input reference images
  // stay at 1,120 image tokens x $1.50/M (the page's standard input rate for text/image/video).
  const outputListUsd = ({ '1K': 0.0336, '2K': 0.0504, '4K': 0.113 } as const)[settings.imageSize];
  const inputImageTokens = (input.referenceImageCount ?? 0) * 1120;
  const partialListUsd = outputListUsd + (inputImageTokens * 1.5) / 1_000_000;
  return {
    partialListUsd,
    meta: {
      providerCostKind: 'partial-list-image-components', providerCostIncomplete: true,
      providerListImageComponentsUsd: partialListUsd, providerInvoiceCostUsd: null,
      providerBudgetStatus: 'customer_fixed_price_approved_supplier_total_variable',
      providerConfiguredOutputTokenLimit: settings.maxOutputTokens,
      providerInputImageTokens: inputImageTokens, providerOutputImageTokens: imageTokens,
      providerBudgetPolicyVersion: NANO21_BUDGET_POLICY_VERSION, effective_supplier_charge_verified: false,
    },
  };
}
