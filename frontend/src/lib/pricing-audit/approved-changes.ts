export type ApprovedPricingAuditChange = {
  scenarioId: string;
  reason: string;
  fieldDeltas: Record<
    string,
    { current: string | number | undefined; canonical: string | number | undefined }
  >;
};

const KEYVO_OFFICIAL_LIST_REASON = 'Keyvo official list price rule (2026-11-13): supplier facts are the official mainland CNY list price (CNY / 8) and the official-list-80 profile sells at 80% of it with no margin component.';
const KEYVO_OFFICIAL_LIST_100_REASON = 'Keyvo official list 100% price rule (2026-11-14): Nano Banana 2 and Nano Banana Lite supplier facts are the official mainland CNY list price (CNY / 8) and the official-list-100 profile sells at 100% of it with no margin component (4-image presets).';

/**
 * Reviewed differences from the immutable pre-canonical baseline.
 * Exact field deltas are required so a later pricing drift cannot inherit an old approval.
 */
export const APPROVED_PRICING_AUDIT_CHANGES: readonly ApprovedPricingAuditChange[] = [
  {
    scenarioId: 'billing:gemini-omni-flash:t2v:10:720p:member',
    reason: 'Gemini Omni 1.2 uses the verified $12/M output-token supplier rate. These inactive-policy baseline projections do not change active authored customer tariffs.',
    fieldDeltas: {
      vendorSubtotalCents: { current: 100, canonical: 70 },
      marginCents: { current: 30, canonical: 21 },
      customerTotalCents: { current: 130, canonical: 91 },
    },
  },
  {
    scenarioId: 'billing:gemini-omni-flash:t2v:10:720p:plus',
    reason: 'Gemini Omni 1.2 uses the verified $12/M output-token supplier rate. These inactive-policy baseline projections do not change active authored customer tariffs.',
    fieldDeltas: {
      vendorSubtotalCents: { current: 100, canonical: 70 },
      marginCents: { current: 30, canonical: 21 },
      customerTotalCents: { current: 123, canonical: 86 },
    },
  },
  {
    scenarioId: 'billing:gemini-omni-flash:t2v:10:720p:pro',
    reason: 'Gemini Omni 1.2 uses the verified $12/M output-token supplier rate. These inactive-policy baseline projections do not change active authored customer tariffs.',
    fieldDeltas: {
      vendorSubtotalCents: { current: 100, canonical: 70 },
      marginCents: { current: 30, canonical: 21 },
      customerTotalCents: { current: 117, canonical: 82 },
    },
  },
  {
    scenarioId: 'estimator:gemini-omni-flash:10:720p',
    reason: 'Gemini Omni 1.2 uses the verified $12/M output-token supplier rate. These inactive-policy baseline projections do not change active authored customer tariffs.',
    fieldDeltas: {
      vendorSubtotalCents: { current: 100, canonical: 70 },
      marginCents: { current: 30, canonical: 21 },
      customerTotalCents: { current: 130, canonical: 91 },
      displayedAmount: { current: '$1.30', canonical: '$0.91' },
    },
  },
  {
    scenarioId: 'billing:happy-horse-1-1:t2v:5:1080p:member',
    reason: KEYVO_OFFICIAL_LIST_REASON,
    fieldDeltas: {
      vendorSubtotalCents: { current: 90, canonical: 75 },
      marginCents: { current: 27, canonical: 0 },
      customerTotalCents: { current: 117, canonical: 60 },
    },
  },
  {
    scenarioId: 'billing:happy-horse-1-1:t2v:5:1080p:plus',
    reason: KEYVO_OFFICIAL_LIST_REASON,
    fieldDeltas: {
      vendorSubtotalCents: { current: 90, canonical: 75 },
      marginCents: { current: 27, canonical: 0 },
      customerTotalCents: { current: 111, canonical: 57 },
    },
  },
  {
    scenarioId: 'billing:happy-horse-1-1:t2v:5:1080p:pro',
    reason: KEYVO_OFFICIAL_LIST_REASON,
    fieldDeltas: {
      vendorSubtotalCents: { current: 90, canonical: 75 },
      marginCents: { current: 27, canonical: 0 },
      customerTotalCents: { current: 105, canonical: 54 },
    },
  },
  {
    scenarioId: 'billing:kling-3-4k:t2v:5:4k:member',
    reason: KEYVO_OFFICIAL_LIST_REASON,
    fieldDeltas: {
      vendorSubtotalCents: { current: 210, canonical: 188 },
      marginCents: { current: 63, canonical: 0 },
      customerTotalCents: { current: 273, canonical: 150 },
    },
  },
  {
    scenarioId: 'billing:kling-3-4k:t2v:5:4k:plus',
    reason: KEYVO_OFFICIAL_LIST_REASON,
    fieldDeltas: {
      vendorSubtotalCents: { current: 210, canonical: 188 },
      marginCents: { current: 63, canonical: 0 },
      customerTotalCents: { current: 259, canonical: 142 },
    },
  },
  {
    scenarioId: 'billing:kling-3-4k:t2v:5:4k:pro',
    reason: KEYVO_OFFICIAL_LIST_REASON,
    fieldDeltas: {
      vendorSubtotalCents: { current: 210, canonical: 188 },
      marginCents: { current: 63, canonical: 0 },
      customerTotalCents: { current: 246, canonical: 135 },
    },
  },
  {
    scenarioId: 'billing:kling-3-pro:t2v:5:1080p:member',
    reason: KEYVO_OFFICIAL_LIST_REASON,
    fieldDeltas: {
      vendorSubtotalCents: { current: 84, canonical: 75 },
      marginCents: { current: 26, canonical: 0 },
      customerTotalCents: { current: 110, canonical: 60 },
    },
  },
  {
    scenarioId: 'billing:kling-3-pro:t2v:5:1080p:plus',
    reason: KEYVO_OFFICIAL_LIST_REASON,
    fieldDeltas: {
      vendorSubtotalCents: { current: 84, canonical: 75 },
      marginCents: { current: 26, canonical: 0 },
      customerTotalCents: { current: 104, canonical: 57 },
    },
  },
  {
    scenarioId: 'billing:kling-3-pro:t2v:5:1080p:pro',
    reason: KEYVO_OFFICIAL_LIST_REASON,
    fieldDeltas: {
      vendorSubtotalCents: { current: 84, canonical: 75 },
      marginCents: { current: 26, canonical: 0 },
      customerTotalCents: { current: 99, canonical: 54 },
    },
  },
  {
    scenarioId: 'billing:kling-3-standard:t2v:5:1080p:member',
    reason: KEYVO_OFFICIAL_LIST_REASON,
    fieldDeltas: {
      vendorSubtotalCents: { current: 63, canonical: 56 },
      marginCents: { current: 19, canonical: 0 },
      customerTotalCents: { current: 82, canonical: 45 },
    },
  },
  {
    scenarioId: 'billing:kling-3-standard:t2v:5:1080p:plus',
    reason: KEYVO_OFFICIAL_LIST_REASON,
    fieldDeltas: {
      vendorSubtotalCents: { current: 63, canonical: 56 },
      marginCents: { current: 19, canonical: 0 },
      customerTotalCents: { current: 78, canonical: 43 },
    },
  },
  {
    scenarioId: 'billing:kling-3-standard:t2v:5:1080p:pro',
    reason: KEYVO_OFFICIAL_LIST_REASON,
    fieldDeltas: {
      vendorSubtotalCents: { current: 63, canonical: 56 },
      marginCents: { current: 19, canonical: 0 },
      customerTotalCents: { current: 74, canonical: 40 },
    },
  },
  {
    scenarioId: 'billing:kling-o3-4k:t2v:5:4k:member',
    reason: KEYVO_OFFICIAL_LIST_REASON,
    fieldDeltas: {
      vendorSubtotalCents: { current: 210, canonical: 188 },
      marginCents: { current: 63, canonical: 0 },
      customerTotalCents: { current: 273, canonical: 150 },
    },
  },
  {
    scenarioId: 'billing:kling-o3-4k:t2v:5:4k:plus',
    reason: KEYVO_OFFICIAL_LIST_REASON,
    fieldDeltas: {
      vendorSubtotalCents: { current: 210, canonical: 188 },
      marginCents: { current: 63, canonical: 0 },
      customerTotalCents: { current: 259, canonical: 142 },
    },
  },
  {
    scenarioId: 'billing:kling-o3-4k:t2v:5:4k:pro',
    reason: KEYVO_OFFICIAL_LIST_REASON,
    fieldDeltas: {
      vendorSubtotalCents: { current: 210, canonical: 188 },
      marginCents: { current: 63, canonical: 0 },
      customerTotalCents: { current: 246, canonical: 135 },
    },
  },
  {
    scenarioId: 'billing:kling-o3-pro:t2v:5:1080p:member',
    reason: KEYVO_OFFICIAL_LIST_REASON,
    fieldDeltas: {
      vendorSubtotalCents: { current: 84, canonical: 75 },
      marginCents: { current: 26, canonical: 0 },
      customerTotalCents: { current: 110, canonical: 60 },
    },
  },
  {
    scenarioId: 'billing:kling-o3-pro:t2v:5:1080p:plus',
    reason: KEYVO_OFFICIAL_LIST_REASON,
    fieldDeltas: {
      vendorSubtotalCents: { current: 84, canonical: 75 },
      marginCents: { current: 26, canonical: 0 },
      customerTotalCents: { current: 104, canonical: 57 },
    },
  },
  {
    scenarioId: 'billing:kling-o3-pro:t2v:5:1080p:pro',
    reason: KEYVO_OFFICIAL_LIST_REASON,
    fieldDeltas: {
      vendorSubtotalCents: { current: 84, canonical: 75 },
      marginCents: { current: 26, canonical: 0 },
      customerTotalCents: { current: 99, canonical: 54 },
    },
  },
  {
    scenarioId: 'billing:kling-o3-standard:t2v:5:1080p:member',
    reason: KEYVO_OFFICIAL_LIST_REASON,
    fieldDeltas: {
      vendorSubtotalCents: { current: 63, canonical: 56 },
      marginCents: { current: 19, canonical: 0 },
      customerTotalCents: { current: 82, canonical: 45 },
    },
  },
  {
    scenarioId: 'billing:kling-o3-standard:t2v:5:1080p:plus',
    reason: KEYVO_OFFICIAL_LIST_REASON,
    fieldDeltas: {
      vendorSubtotalCents: { current: 63, canonical: 56 },
      marginCents: { current: 19, canonical: 0 },
      customerTotalCents: { current: 78, canonical: 43 },
    },
  },
  {
    scenarioId: 'billing:kling-o3-standard:t2v:5:1080p:pro',
    reason: KEYVO_OFFICIAL_LIST_REASON,
    fieldDeltas: {
      vendorSubtotalCents: { current: 63, canonical: 56 },
      marginCents: { current: 19, canonical: 0 },
      customerTotalCents: { current: 74, canonical: 40 },
    },
  },
  {
    scenarioId: 'billing:minimax-hailuo-02-text:t2v:6:768P:member',
    reason: KEYVO_OFFICIAL_LIST_REASON,
    fieldDeltas: {
      vendorSubtotalCents: { current: 27, canonical: 25 },
      marginCents: { current: 9, canonical: 0 },
      customerTotalCents: { current: 36, canonical: 20 },
    },
  },
  {
    scenarioId: 'billing:minimax-hailuo-02-text:t2v:6:768P:plus',
    reason: KEYVO_OFFICIAL_LIST_REASON,
    fieldDeltas: {
      vendorSubtotalCents: { current: 27, canonical: 25 },
      marginCents: { current: 9, canonical: 0 },
      customerTotalCents: { current: 34, canonical: 19 },
    },
  },
  {
    scenarioId: 'billing:minimax-hailuo-02-text:t2v:6:768P:pro',
    reason: KEYVO_OFFICIAL_LIST_REASON,
    fieldDeltas: {
      vendorSubtotalCents: { current: 27, canonical: 25 },
      marginCents: { current: 9, canonical: 0 },
      customerTotalCents: { current: 32, canonical: 18 },
    },
  },
  {
    scenarioId: 'billing:seedance-2-0-fast:t2v:1:720p:member',
    reason: KEYVO_OFFICIAL_LIST_REASON,
    fieldDeltas: {
      vendorSubtotalCents: { current: 24, canonical: 10 },
      marginCents: { current: 7, canonical: 0 },
      customerTotalCents: { current: 31, canonical: 8 },
    },
  },
  {
    scenarioId: 'billing:seedance-2-0-fast:t2v:1:720p:plus',
    reason: KEYVO_OFFICIAL_LIST_REASON,
    fieldDeltas: {
      vendorSubtotalCents: { current: 24, canonical: 10 },
      marginCents: { current: 7, canonical: 0 },
      customerTotalCents: { current: 29, canonical: 8 },
    },
  },
  {
    scenarioId: 'billing:seedance-2-0-fast:t2v:1:720p:pro',
    reason: KEYVO_OFFICIAL_LIST_REASON,
    fieldDeltas: {
      vendorSubtotalCents: { current: 24, canonical: 10 },
      marginCents: { current: 7, canonical: 0 },
      customerTotalCents: { current: 28, canonical: 7 },
    },
  },
  {
    scenarioId: 'billing:seedance-2-0-mini:t2v:5:720p:member',
    reason: KEYVO_OFFICIAL_LIST_REASON,
    fieldDeltas: {
      vendorSubtotalCents: { current: 73, canonical: 31 },
      marginCents: { current: 22, canonical: 0 },
      customerTotalCents: { current: 95, canonical: 25 },
    },
  },
  {
    scenarioId: 'billing:seedance-2-0-mini:t2v:5:720p:plus',
    reason: KEYVO_OFFICIAL_LIST_REASON,
    fieldDeltas: {
      vendorSubtotalCents: { current: 73, canonical: 31 },
      marginCents: { current: 22, canonical: 0 },
      customerTotalCents: { current: 90, canonical: 24 },
    },
  },
  {
    scenarioId: 'billing:seedance-2-0-mini:t2v:5:720p:pro',
    reason: KEYVO_OFFICIAL_LIST_REASON,
    fieldDeltas: {
      vendorSubtotalCents: { current: 73, canonical: 31 },
      marginCents: { current: 22, canonical: 0 },
      customerTotalCents: { current: 85, canonical: 22 },
    },
  },
  {
    scenarioId: 'billing:seedance-2-0:t2v:1:720p:member',
    reason: KEYVO_OFFICIAL_LIST_REASON,
    fieldDeltas: {
      vendorSubtotalCents: { current: 30, canonical: 12 },
      marginCents: { current: 8, canonical: 0 },
      customerTotalCents: { current: 38, canonical: 10 },
    },
  },
  {
    scenarioId: 'billing:seedance-2-0:t2v:1:720p:plus',
    reason: KEYVO_OFFICIAL_LIST_REASON,
    fieldDeltas: {
      vendorSubtotalCents: { current: 30, canonical: 12 },
      marginCents: { current: 8, canonical: 0 },
      customerTotalCents: { current: 36, canonical: 9 },
    },
  },
  {
    scenarioId: 'billing:seedance-2-0:t2v:1:720p:pro',
    reason: KEYVO_OFFICIAL_LIST_REASON,
    fieldDeltas: {
      vendorSubtotalCents: { current: 30, canonical: 12 },
      marginCents: { current: 8, canonical: 0 },
      customerTotalCents: { current: 34, canonical: 9 },
    },
  },
  {
    scenarioId: 'billing:seedream-5-0-pro:t2i:1:2K:member',
    reason: KEYVO_OFFICIAL_LIST_REASON,
    fieldDeltas: {
      vendorSubtotalCents: { current: 12, canonical: 8 },
      marginCents: { current: 4, canonical: 0 },
      customerTotalCents: { current: 16, canonical: 6 },
    },
  },
  {
    scenarioId: 'billing:seedream-5-0-pro:t2i:1:2K:plus',
    reason: KEYVO_OFFICIAL_LIST_REASON,
    fieldDeltas: {
      vendorSubtotalCents: { current: 12, canonical: 8 },
      marginCents: { current: 4, canonical: 0 },
      customerTotalCents: { current: 15, canonical: 6 },
    },
  },
  {
    scenarioId: 'billing:seedream-5-0-pro:t2i:1:2K:pro',
    reason: KEYVO_OFFICIAL_LIST_REASON,
    fieldDeltas: {
      vendorSubtotalCents: { current: 12, canonical: 8 },
      marginCents: { current: 4, canonical: 0 },
      customerTotalCents: { current: 14, canonical: 5 },
    },
  },
  {
    scenarioId: 'estimator:happy-horse-1-1:5:1080p',
    reason: KEYVO_OFFICIAL_LIST_REASON,
    fieldDeltas: {
      vendorSubtotalCents: { current: 90, canonical: 75 },
      marginCents: { current: 27, canonical: 0 },
      customerTotalCents: { current: 117, canonical: 60 },
      displayedAmount: { current: '$1.17', canonical: '$0.60' },
    },
  },
  {
    scenarioId: 'estimator:kling-3-4k:5:4k',
    reason: KEYVO_OFFICIAL_LIST_REASON,
    fieldDeltas: {
      vendorSubtotalCents: { current: 210, canonical: 188 },
      marginCents: { current: 63, canonical: 0 },
      customerTotalCents: { current: 273, canonical: 150 },
      displayedAmount: { current: '$2.73', canonical: '$1.50' },
    },
  },
  {
    scenarioId: 'estimator:kling-3-pro:5:1080p',
    reason: KEYVO_OFFICIAL_LIST_REASON,
    fieldDeltas: {
      vendorSubtotalCents: { current: 84, canonical: 75 },
      marginCents: { current: 26, canonical: 0 },
      customerTotalCents: { current: 110, canonical: 60 },
      displayedAmount: { current: '$1.10', canonical: '$0.60' },
    },
  },
  {
    scenarioId: 'estimator:kling-3-standard:5:1080p',
    reason: KEYVO_OFFICIAL_LIST_REASON,
    fieldDeltas: {
      vendorSubtotalCents: { current: 63, canonical: 56 },
      marginCents: { current: 19, canonical: 0 },
      customerTotalCents: { current: 82, canonical: 45 },
      displayedAmount: { current: '$0.82', canonical: '$0.45' },
    },
  },
  {
    scenarioId: 'estimator:kling-o3-4k:5:4k',
    reason: KEYVO_OFFICIAL_LIST_REASON,
    fieldDeltas: {
      vendorSubtotalCents: { current: 210, canonical: 188 },
      marginCents: { current: 63, canonical: 0 },
      customerTotalCents: { current: 273, canonical: 150 },
      displayedAmount: { current: '$2.73', canonical: '$1.50' },
    },
  },
  {
    scenarioId: 'estimator:kling-o3-pro:5:1080p',
    reason: KEYVO_OFFICIAL_LIST_REASON,
    fieldDeltas: {
      vendorSubtotalCents: { current: 84, canonical: 75 },
      marginCents: { current: 26, canonical: 0 },
      customerTotalCents: { current: 110, canonical: 60 },
      displayedAmount: { current: '$1.10', canonical: '$0.60' },
    },
  },
  {
    scenarioId: 'estimator:kling-o3-standard:5:1080p',
    reason: KEYVO_OFFICIAL_LIST_REASON,
    fieldDeltas: {
      vendorSubtotalCents: { current: 63, canonical: 56 },
      marginCents: { current: 19, canonical: 0 },
      customerTotalCents: { current: 82, canonical: 45 },
      displayedAmount: { current: '$0.82', canonical: '$0.45' },
    },
  },
  {
    scenarioId: 'estimator:minimax-hailuo-02-text:6:768P',
    reason: KEYVO_OFFICIAL_LIST_REASON,
    fieldDeltas: {
      vendorSubtotalCents: { current: 27, canonical: 25 },
      marginCents: { current: 9, canonical: 0 },
      customerTotalCents: { current: 36, canonical: 20 },
      displayedAmount: { current: '$0.36', canonical: '$0.20' },
    },
  },
  {
    scenarioId: 'estimator:seedance-2-0-fast:1:720p',
    reason: KEYVO_OFFICIAL_LIST_REASON,
    fieldDeltas: {
      vendorSubtotalCents: { current: 24, canonical: 10 },
      marginCents: { current: 7, canonical: 0 },
      customerTotalCents: { current: 31, canonical: 8 },
      displayedAmount: { current: '$0.31', canonical: '$0.08' },
    },
  },
  {
    scenarioId: 'estimator:seedance-2-0-mini:5:720p',
    reason: KEYVO_OFFICIAL_LIST_REASON,
    fieldDeltas: {
      vendorSubtotalCents: { current: 73, canonical: 31 },
      marginCents: { current: 22, canonical: 0 },
      customerTotalCents: { current: 95, canonical: 25 },
      displayedAmount: { current: '$0.95', canonical: '$0.25' },
    },
  },
  {
    scenarioId: 'estimator:seedance-2-0:1:720p',
    reason: KEYVO_OFFICIAL_LIST_REASON,
    fieldDeltas: {
      vendorSubtotalCents: { current: 30, canonical: 12 },
      marginCents: { current: 8, canonical: 0 },
      customerTotalCents: { current: 38, canonical: 10 },
      displayedAmount: { current: '$0.38', canonical: '$0.10' },
    },
  },
  {
    scenarioId: 'estimator:seedream-5-0-pro:1:2K',
    reason: KEYVO_OFFICIAL_LIST_REASON,
    fieldDeltas: {
      vendorSubtotalCents: { current: 12, canonical: 8 },
      marginCents: { current: 4, canonical: 0 },
      customerTotalCents: { current: 16, canonical: 6 },
      displayedAmount: { current: '$0.16', canonical: '$0.06' },
    },
  },
  {
    scenarioId: 'billing:nano-banana-2:t2i:4:1k:member',
    reason: KEYVO_OFFICIAL_LIST_100_REASON,
    fieldDeltas: {
      vendorSubtotalCents: { current: 32, canonical: 27 },
      marginCents: { current: 10, canonical: 0 },
      customerTotalCents: { current: 42, canonical: 27 },
    },
  },
  {
    scenarioId: 'billing:nano-banana-2:t2i:4:1k:plus',
    reason: KEYVO_OFFICIAL_LIST_100_REASON,
    fieldDeltas: {
      vendorSubtotalCents: { current: 32, canonical: 27 },
      marginCents: { current: 10, canonical: 0 },
      customerTotalCents: { current: 40, canonical: 26 },
    },
  },
  {
    scenarioId: 'billing:nano-banana-2:t2i:4:1k:pro',
    reason: KEYVO_OFFICIAL_LIST_100_REASON,
    fieldDeltas: {
      vendorSubtotalCents: { current: 32, canonical: 27 },
      marginCents: { current: 10, canonical: 0 },
      customerTotalCents: { current: 38, canonical: 24 },
    },
  },
  {
    scenarioId: 'billing:nano-banana-lite:t2i:4:1k:member',
    reason: KEYVO_OFFICIAL_LIST_100_REASON,
    fieldDeltas: {
      vendorSubtotalCents: { current: 12, canonical: 13 },
      marginCents: { current: 4, canonical: 0 },
      customerTotalCents: { current: 16, canonical: 13 },
    },
  },
  {
    scenarioId: 'billing:nano-banana-lite:t2i:4:1k:plus',
    reason: KEYVO_OFFICIAL_LIST_100_REASON,
    fieldDeltas: {
      vendorSubtotalCents: { current: 12, canonical: 13 },
      marginCents: { current: 4, canonical: 0 },
      customerTotalCents: { current: 15, canonical: 12 },
    },
  },
  {
    scenarioId: 'billing:nano-banana-lite:t2i:4:1k:pro',
    reason: KEYVO_OFFICIAL_LIST_100_REASON,
    fieldDeltas: {
      vendorSubtotalCents: { current: 12, canonical: 13 },
      marginCents: { current: 4, canonical: 0 },
      customerTotalCents: { current: 14, canonical: 12 },
    },
  },
  {
    scenarioId: 'estimator:nano-banana-2:4:1k',
    reason: KEYVO_OFFICIAL_LIST_100_REASON,
    fieldDeltas: {
      vendorSubtotalCents: { current: 32, canonical: 27 },
      marginCents: { current: 10, canonical: 0 },
      customerTotalCents: { current: 42, canonical: 27 },
      displayedAmount: { current: '$0.42', canonical: '$0.27' },
    },
  },
  {
    scenarioId: 'estimator:nano-banana-lite:4:1k',
    reason: KEYVO_OFFICIAL_LIST_100_REASON,
    fieldDeltas: {
      vendorSubtotalCents: { current: 12, canonical: 13 },
      marginCents: { current: 4, canonical: 0 },
      customerTotalCents: { current: 16, canonical: 13 },
      displayedAmount: { current: '$0.16', canonical: '$0.13' },
    },
  },
];
