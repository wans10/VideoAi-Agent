import type { ManualTariffCell } from '@maxvideoai/pricing';
import type { PricingContext } from '@/lib/pricing-context';
import { collectSellableManualTariffCoverage, type ManualTariffCoverageScenario } from '@/lib/pricing-audit/manual-tariff-coverage';
import { continuousInputTariffSelector } from '@/lib/pricing-manual-scenario';
import { providerUsdSnapshot } from '@/lib/customer-currency';
import { ENV } from '@/lib/env';
import { normalBytePlusSupplierCost } from '@/server/byteplus-normal-cost';
import { computeCanonicalBillingSnapshot } from './quote-billing';
import { customerTariffCellId } from './customer-tariff-seed';
import { prepareSeedanceInputTariffPrice, seedanceInputTariffRate, validateSeedanceInputTariffDomain } from './seedance-input-tariff';

/** Versioned cells are file-authored and never replaced by a sandbox revision. */
export const SEEDANCE_V2V_VERSIONED_CELL_EFFECTIVE_FROM = '2026-10-19T00:00:00.000Z';
const MODEL_ID = 'seedance-2-5';
const MODE = 'v2v';

export type SeedanceV2vCellRow = {
  scenarioId: string;
  resolution: string;
  aspectRatio: string;
  durationSec: number;
  noVideoCustomerCents: number;
  noVideoSupplierUsd: number;
  minimumSupplierUsd: number;
  minimumCustomerCents: number;
  minimumBillableSeconds: number;
  includedInputSeconds: number;
  ratePerBillableSecondCents: number;
  v2vMarginPercent: number;
  noVideoMarginPercent: number;
};

/** The no-video anchor is the same request as text-to-video, priced by the rule path that production uses
 * before any reviewed tariff cell exists. It removes only the source video and its input-video dimensions. */
export function noVideoAnchorContext(context: PricingContext): PricingContext {
  const { inputVideoDurationSec: _duration, seedanceEditSource: _source, referenceImageCount: _references,
    inputImageCount: _images, ...rest } = context;
  return { ...rest, mode: 't2v', hasVideoInput: false };
}

// The rule path only: no database state, no versioned cells and no tariff-state reader.
const RULE_PATH_DEPENDENCIES = {
  pricingPolicy: { loadOverrides: async () => ({ status: 'loaded' as const, rules: [] }) },
  loadCustomerTariffState: async () => ({ status: 'loaded' as const, active: false, revision: 0, databaseCells: [], versionedCells: [] }),
};

async function noVideoCustomerCents(context: PricingContext): Promise<number> {
  const snapshot = providerUsdSnapshot(await computeCanonicalBillingSnapshot(noVideoAnchorContext(context), RULE_PATH_DEPENDENCIES));
  if (snapshot.currency !== 'USD' || snapshot.meta?.pricingMode !== undefined
    || !Number.isSafeInteger(snapshot.totalCents) || snapshot.totalCents <= 0) {
    throw new Error('The no-video anchor must be a positive whole-cent USD rule-path quote.');
  }
  return snapshot.totalCents;
}

function selectorIdentity(selector: ManualTariffCell['selector']): string {
  return Object.entries(selector).map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('|');
}

/** Keyvo's production Edit route is ModelArk. The default `las` selection would make the authoring
 * no-video cost null, so authoring is pinned to ModelArk and restored afterwards. */
export async function withModelArkEditTransport<T>(work: () => Promise<T>): Promise<T> {
  const previous = ENV.SEEDANCE_2_5_EDIT_TRANSPORT;
  ENV.SEEDANCE_2_5_EDIT_TRANSPORT = 'modelark';
  try { return await work(); } finally { ENV.SEEDANCE_2_5_EDIT_TRANSPORT = previous; }
}

async function buildCell(scenario: ManualTariffCoverageScenario, at: string) {
  const context = scenario.context;
  const selector = continuousInputTariffSelector(scenario.selector);
  if (!selector) throw new Error(`Seedance v2v scenario has no continuous selector: ${scenario.id}`);
  const noVideoCents = await noVideoCustomerCents(context);
  const noVideoCost = normalBytePlusSupplierCost(noVideoAnchorContext(context), at);
  const noVideoCostFromSeed = normalBytePlusSupplierCost({ ...context, hasVideoInput: false, inputVideoDurationSec: undefined }, at);
  if (!noVideoCost || !noVideoCostFromSeed || noVideoCost.amountUsd !== noVideoCostFromSeed.amountUsd) {
    throw new Error(`No-video supplier cost differs between anchor and authoring: ${scenario.id}`);
  }
  const minimumCost = normalBytePlusSupplierCost({ ...context, hasVideoInput: true, inputVideoDurationSec: Number.MIN_VALUE }, at);
  if (!minimumCost) throw new Error(`No ModelArk supplier minimum: ${scenario.id}`);
  // Every v2v row uses the no-video margin. Flooring below the video minimum selects that anchor path,
  // so an existing legacy video minimum can never make this row keep a different margin.
  const forcedAnchorCents = Math.floor(minimumCost.amountUsd * 100);
  const prepared = prepareSeedanceInputTariffPrice({ context, currentCustomerCents: forcedAnchorCents,
    noVideoCustomerCents: noVideoCents, at });
  if (prepared.marginSource !== 'no_video_variant') throw new Error(`Seedance v2v margin anchor was not applied: ${scenario.id}`);
  validateSeedanceInputTariffDomain({ context, price: prepared.price, at });
  const cell: ManualTariffCell = {
    id: customerTariffCellId(selectorIdentity(selector)),
    selector,
    source: 'versioned',
    version: 1,
    currency: 'USD',
    effectiveFrom: at,
    price: prepared.price,
  };
  const row: SeedanceV2vCellRow = {
    scenarioId: scenario.id,
    resolution: context.resolution,
    aspectRatio: String(context.aspectRatio),
    durationSec: context.durationSec,
    noVideoCustomerCents: noVideoCents,
    noVideoSupplierUsd: noVideoCost.amountUsd,
    minimumSupplierUsd: minimumCost.amountUsd,
    minimumCustomerCents: prepared.minimumCustomerCents,
    minimumBillableSeconds: prepared.minimumBillableSeconds,
    includedInputSeconds: prepared.includedInputSeconds,
    ratePerBillableSecondCents: seedanceInputTariffRate(context, prepared.price),
    v2vMarginPercent: prepared.marginPercent,
    noVideoMarginPercent: (1 - noVideoCost.amountUsd * 100 / noVideoCents) * 100,
  };
  return { cell, row };
}

/** Deterministic authoring of every reviewed Seedance 2.5 ModelArk v2v selector. Performs no database access. */
export async function buildSeedanceV2vVersionedCells(at: string = SEEDANCE_V2V_VERSIONED_CELL_EFFECTIVE_FROM) {
  // The sellable resolutions follow the Edit transport (ModelArk also admits 1080p), so coverage is
  // collected under the same ModelArk selection that prices it.
  const { scenarios, built } = await withModelArkEditTransport(async () => {
    const coverage = collectSellableManualTariffCoverage({ modelId: MODEL_ID, mode: MODE });
    if (coverage.gaps.length) throw new Error(`Seedance v2v coverage has gaps: ${JSON.stringify(coverage.gaps)}`);
    const sorted = [...coverage.scenarios].sort((a, b) => a.id.localeCompare(b.id));
    if (!sorted.length) throw new Error('No Seedance 2.5 v2v coverage scenarios.');
    const items = [];
    for (const scenario of sorted) items.push(await buildCell(scenario, at));
    return { scenarios: sorted, built: items };
  });
  built.sort((a, b) => a.cell.id.localeCompare(b.cell.id));
  if (new Set(built.map(item => item.cell.id)).size !== built.length) throw new Error('Duplicate Seedance v2v cell identity.');
  return { cells: built.map(item => item.cell), rows: built.map(item => item.row), scenarioCount: scenarios.length };
}

/** Byte-exact document text; the existing file's schema and activation flag are authored here. */
export function customerTariffDocumentText(cells: readonly ManualTariffCell[]): string {
  return `${JSON.stringify({ schemaVersion: 1, active: true, cells }, null, 2)}\n`;
}
