// The frozen audit evidence covers the unfiltered upstream catalog (KEYVO_MODEL_VISIBILITY=off), as the generators do.
import './helpers/keyvo-unfiltered-catalog';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

import {
  P0_VIDEO_MODEL_IDS,
  P0_VIDEO_PRICING_SCENARIOS,
} from '../frontend/src/lib/pricing-audit/p0-video-scenarios.ts';

const collectorPath = 'frontend/src/lib/pricing-audit/legacy-collectors.ts';
const fixturePath = 'tests/fixtures/pricing-parity.v1.json';
const launchAdditionsFixturePath = 'tests/fixtures/pricing-shadow-additions.v1.json';
const P1_PUBLIC_VIDEO_MODEL_IDS = [
  'flux-3-max',
  'kling-3-turbo-standard',
  'kling-3-turbo-pro',
  'minimax-h3-max',
] as const;
const LAUNCHED_IMAGE_MODEL_IDS = [
  'flux-3-draft',
  'flux-3',
  'gpt-image-2-5-flare',
  'gpt-image-2-5-sunburst',
] as const;
// Keyvo's 2026-11-11 provider work publishes Seedream 5.0 Flash pricing (PROVISIONAL Volcengine list cost).
const KEYVO_LAUNCHED_IMAGE_MODEL_IDS = ['seedream-5-0-flash'] as const;

function readFixtureRows<T>(path: string): T[] {
  return (JSON.parse(readFileSync(path, 'utf8')) as { rows: T[] }).rows;
}

function resolveLocalImport(fromFile: string, specifier: string): string | null {
  let candidates: string[];
  if (specifier === '@maxvideoai/pricing') {
    candidates = [resolve('packages/pricing/src/index.ts')];
  } else if (specifier.startsWith('@maxvideoai/pricing/')) {
    candidates = [resolve('packages/pricing/src', specifier.slice('@maxvideoai/pricing/'.length))];
  } else if (specifier.startsWith('@/')) {
    candidates = [resolve('frontend/src', specifier.slice(2)), resolve('frontend', specifier.slice(2))];
  } else if (specifier.startsWith('.')) {
    candidates = [resolve(dirname(fromFile), specifier)];
  } else {
    return null;
  }
  for (const candidate of candidates) {
    for (const path of [candidate, `${candidate}.ts`, `${candidate}.tsx`, resolve(candidate, 'index.ts')]) {
      if (existsSync(path) && statSync(path).isFile()) return path;
    }
  }
  return null;
}

function collectLocalDependencies(entryFile: string): Set<string> {
  const visited = new Set<string>();
  const pending = [resolve(entryFile)];
  const importPattern = /(?:import|export)\s+(?:type\s+)?(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]/g;
  while (pending.length) {
    const file = pending.pop();
    if (!file || visited.has(file)) continue;
    visited.add(file);
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(importPattern)) {
      const dependency = resolveLocalImport(file, match[1] ?? '');
      if (dependency && !visited.has(dependency)) pending.push(dependency);
    }
  }
  return visited;
}

test('committed pre-canonical pricing baseline is immutable after legacy deletion', () => {
  assert.equal(existsSync(collectorPath), false, `${collectorPath} should be deleted`);
  assert.equal(existsSync(fixturePath), true, `${fixturePath} should exist`);
  const frozen = JSON.parse(readFileSync(fixturePath, 'utf8')) as { generatedFrom: string; rows: unknown[] };
  assert.equal(frozen.generatedFrom, 'legacy-authoritative-pricing-paths');
  assert.equal(frozen.rows.length, 178);

  assert.equal(existsSync(launchAdditionsFixturePath), true, `${launchAdditionsFixturePath} should exist`);
  const additions = JSON.parse(readFileSync(launchAdditionsFixturePath, 'utf8')) as {
    generatedFrom: string;
    rows: Array<{ scenarioId: string }>;
  };
  assert.equal(additions.generatedFrom, 'registry-publication-shadow-additions');
  assert.equal(
    additions.rows.length,
    LAUNCHED_IMAGE_MODEL_IDS.length * 4
      + KEYVO_LAUNCHED_IMAGE_MODEL_IDS.length * 4
      + P0_VIDEO_PRICING_SCENARIOS.length
      + P0_VIDEO_MODEL_IDS.length * 4
      + P1_PUBLIC_VIDEO_MODEL_IDS.length * 4,
  );
  assert.deepEqual(
    additions.rows.filter((row) => /(?:billing|estimator):(minimax-h3|seedance-2-5):/.test(row.scenarioId)).reduce<Record<string, number>>((counts, row) => {
      const engineId = row.scenarioId.includes('minimax-h3') ? 'minimax-h3' : 'seedance-2-5';
      counts[engineId] = (counts[engineId] ?? 0) + 1;
      return counts;
    }, {}),
    { 'seedance-2-5': 4, 'minimax-h3': 4 },
  );
  assert.deepEqual(
    additions.rows
      .filter((row) => row.scenarioId.startsWith('billing:p0:'))
      .map((row) => row.scenarioId)
      .sort(),
    P0_VIDEO_PRICING_SCENARIOS.map((scenario) => `billing:p0:${scenario.id}`).sort(),
  );
  for (const engineId of P0_VIDEO_MODEL_IDS) {
    assert.equal(
      additions.rows.filter((row) =>
        row.scenarioId.startsWith(`billing:${engineId}:`) || row.scenarioId.startsWith(`estimator:${engineId}:`)
      ).length,
      4,
      engineId,
    );
  }
  for (const engineId of KEYVO_LAUNCHED_IMAGE_MODEL_IDS) {
    assert.equal(
      additions.rows.filter((row) =>
        row.scenarioId.startsWith(`billing:${engineId}:`) || row.scenarioId.startsWith(`estimator:${engineId}:`)
      ).length,
      4,
      engineId,
    );
  }
  for (const engineId of P1_PUBLIC_VIDEO_MODEL_IDS) {
    assert.equal(
      additions.rows.filter((row) =>
        row.scenarioId.startsWith(`billing:${engineId}:`) || row.scenarioId.startsWith(`estimator:${engineId}:`)
      ).length,
      4,
      engineId,
    );
  }
});

test('registry publication shadow additions are reproducible through the canonical audit generator', () => {
  const result = spawnSync('pnpm', ['--silent', 'pricing:shadow-additions'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});

test('the pricing audit reports the reviewed Gemini refresh and Keyvo official list changes without failing the release gate', () => {
  const result = spawnSync('pnpm', ['--silent', 'pricing:audit'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  // 48 Keyvo official list price rows (2026-11-13) 8 Nano Banana 2 / Lite official-list-100 rows (2026-11-14) and 16 Veo 3.1 / Fast / Lite and Gemini Omni Flash official-list-100 rows (2026-11-15; the GPT Image 2.5 launch additions are regenerated at the new price).
  assert.match(result.stdout, /72 approved changes; 0 mismatches/u);
});

test('the real offline audit CLI replays every frozen Pika row while current admission remains closed', async () => {
  const { getFalEngineById } = await import('../frontend/src/config/falEngines');
  const { getRuntimeModelById } = await import('../frontend/config/model-runtime');
  const { buildPricingAuditScenarios } = await import('../frontend/src/lib/pricing-audit/scenarios');
  const { resolvePublicModelScenario } = await import('../frontend/server/pricing/quote-public-model-scenario');
  const { collectCanonicalPricingOutputs } = await import('../frontend/src/lib/pricing-audit/canonical-collectors');
  type AuditRow = Parameters<typeof collectCanonicalPricingOutputs>[0][number];
  type Matrix = Awaited<ReturnType<typeof import('../frontend/src/lib/pricing-audit/matrix').buildPricingAuditMatrix>>;
  const frozen = [...readFixtureRows<AuditRow>(fixturePath), ...readFixtureRows<AuditRow>(launchAdditionsFixturePath)];
  const historicalPika = frozen.filter(row => row.scenarioId.includes(':pika-text-to-video:'));
  assert.equal(frozen.length, 270);
  assert.equal(historicalPika.length, 14);
  const assertClosed = () => {
    const model = getRuntimeModelById('pika-text-to-video')!;
    const entry = getFalEngineById(model.id)!;
    assert.equal(model.publication.app.published, false);
    assert.equal(model.publication.pricing.published, false);
    assert.equal(entry.surfaces.app.enabled, false);
    assert.equal(entry.surfaces.pricing.includeInEstimator, false);
    assert.equal(resolvePublicModelScenario({ modelId: model.id, mode: 't2v', durationSec: 5, resolution: '720p' }), null);
  };
  assertClosed();
  assert.equal(buildPricingAuditScenarios().some(row => row.engineId === 'pika-text-to-video'), false);
  assert.deepEqual(
    buildPricingAuditScenarios({ scope: 'historical' }).filter(row => row.engineId === 'pika-text-to-video').map(row => row.id).sort(),
    historicalPika.map(row => row.scenarioId).sort(),
  );
  const result = spawnSync('pnpm', ['--silent', 'pricing:audit', '--', '--json'], {
    cwd: process.cwd(), encoding: 'utf8',
    env: { ...process.env, DATABASE_URL: 'postgresql://offline-audit-must-not-connect.invalid/test' },
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  const matrix = JSON.parse(result.stdout) as Matrix;
  assert.deepEqual(matrix.summary, { scenarios: 270, matches: 266, approvedChanges: 4, mismatches: 0, compatibilityProfiles: 4 });
  assert.deepEqual(new Set(matrix.rows.map(row => row.scenarioId)), new Set(frozen.map(row => row.scenarioId)));
  for (const expected of historicalPika) {
    const actual = matrix.rows.find(row => row.scenarioId === expected.scenarioId)!;
    assert.equal(actual.status, 'match');
    assert.equal(actual.currentTotalCents, expected.customerTotalCents);
    assert.equal(actual.canonicalTotalCents, expected.customerTotalCents);
    assert.deepEqual(actual.fieldDeltas, {});
  }
  assertClosed();
});

test('historical Sora and Seedance 1.5 billing and estimator evidence remains independently reproducible after retirement', async () => {
  const { collectCanonicalPricingOutputs } = await import('../frontend/src/lib/pricing-audit/canonical-collectors');
  const { buildPricingAuditScenarios } = await import('../frontend/src/lib/pricing-audit/scenarios');
  const { quoteHistoricalCanonicalAuditScenarios } = await import('../frontend/server/pricing-admin/canonical-scenarios');
  type AuditRow = Parameters<typeof collectCanonicalPricingOutputs>[0][number];
  const frozen = [
    ...readFixtureRows<AuditRow>(fixturePath),
    ...readFixtureRows<AuditRow>(launchAdditionsFixturePath),
  ];
  const historical = frozen.filter((row) => /^(billing|estimator):(sora-2(?:-pro)?|seedance-1-5-pro):/.test(row.scenarioId));
  assert.equal(historical.length, 12);
  const scenarios = buildPricingAuditScenarios().filter((row) => ['sora-2', 'sora-2-pro', 'seedance-1-5-pro'].includes(row.engineId));
  const quotes = new Map(quoteHistoricalCanonicalAuditScenarios({ databaseRules: [], scenarios })
    .map((row) => [row.scenarioId, row]));
  const reproduced = new Map(collectCanonicalPricingOutputs(frozen).map((row) => [row.scenarioId, row]));
  for (const expected of historical) {
    assert.equal(quotes.get(expected.scenarioId)?.status, 'quoted', 'historical evidence must be calculated, not copied by the unsupported fallback');
    const actual = reproduced.get(expected.scenarioId);
    assert.ok(actual, expected.scenarioId);
    for (const [field, value] of Object.entries(expected)) {
      assert.deepEqual(actual[field as keyof typeof actual], value, `${expected.scenarioId}.${field}`);
    }
  }
});

test('canonical shadow quotes match frozen outputs except the Omni 1.2 refresh and Keyvo official list prices', async () => {
  const matrixPath = 'frontend/src/lib/pricing-audit/matrix.ts';
  assert.equal(existsSync(matrixPath), true, `${matrixPath} should exist`);
  const { buildPricingAuditMatrix } = await import('../frontend/src/lib/pricing-audit/matrix.ts');
  type AuditRows = Parameters<typeof buildPricingAuditMatrix>[0];
  const rows = [
    ...readFixtureRows<AuditRows[number]>(fixturePath),
    ...readFixtureRows<AuditRows[number]>(launchAdditionsFixturePath),
  ];
  const matrix = await buildPricingAuditMatrix(rows);
  assert.equal(matrix.rows.length > 0, true);
  // Keyvo's official list price rule (2026-11-13) adds 48 reviewed changes on the frozen rows of its 12 re-priced
  // engines (approved-changes.ts); each carries exact field deltas and lowers the customer total.
  const keyvoOfficial = matrix.rows.filter((row) => row.status === 'approved-change'
    && row.approvalReason?.startsWith('Keyvo official list price rule'));
  assert.equal(keyvoOfficial.length, 48);
  assert.ok(keyvoOfficial.every((row) => row.deltaCents < 0 && row.fieldDeltas.marginCents?.canonical === 0), 'official-list rows');
  assert.deepEqual([...new Set(keyvoOfficial.map((row) => row.engineId))].sort(), ['happy-horse-1-1', 'kling-3-4k', 'kling-3-pro',
    'kling-3-standard', 'kling-o3-4k', 'kling-o3-pro', 'kling-o3-standard', 'minimax-hailuo-02-text', 'seedance-2-0',
    'seedance-2-0-fast', 'seedance-2-0-mini', 'seedream-5-0-pro']);
  // The 2026-11-15 official-list-100 extension (Veo 3.1 / Fast / Lite, Gemini Omni Flash 1.2, GPT Image 2.5) approves 16 rows
  // with zero margin; its four Omni rows supersede the 2026-11-05 Omni 1.2 refresh approvals. The GPT Image 2.5 4-image rows are
  // regenerated launch additions (pricing:shadow-additions:generate) and need no approval.
  const keyvoAdmin = matrix.rows.filter((row) => row.status === 'approved-change'
    && row.approvalReason?.startsWith('Keyvo official list 100% price rule extension'));
  assert.equal(keyvoAdmin.length, 16);
  assert.ok(keyvoAdmin.every((row) => row.deltaCents < 0 && row.fieldDeltas.marginCents?.canonical === 0), 'official-list-100 admin rows');
  assert.deepEqual([...new Set(keyvoAdmin.map((row) => row.engineId))].sort(), ['gemini-omni-flash', 'veo-3-1', 'veo-3-1-fast', 'veo-3-1-lite']);
  assert.equal(matrix.summary.approvedChanges, 48 + 8 + 16);
  assert.equal(matrix.summary.mismatches, 0);
  assert.deepEqual(
    matrix.rows
      .filter((row) => row.status !== 'match' && !keyvoOfficial.includes(row) && !keyvoAdmin.includes(row))
      .map((row) => ({
        scenarioId: row.scenarioId,
        currentTotalCents: row.currentTotalCents,
        canonicalTotalCents: row.canonicalTotalCents,
        deltaCents: row.deltaCents,
        status: row.status,
      })),
    [
      {
        scenarioId: 'billing:nano-banana-2:t2i:4:1k:member',
        currentTotalCents: 42,
        canonicalTotalCents: 27,
        deltaCents: -15,
        status: 'approved-change',
      },
      {
        scenarioId: 'billing:nano-banana-2:t2i:4:1k:plus',
        currentTotalCents: 40,
        canonicalTotalCents: 26,
        deltaCents: -14,
        status: 'approved-change',
      },
      {
        scenarioId: 'billing:nano-banana-2:t2i:4:1k:pro',
        currentTotalCents: 38,
        canonicalTotalCents: 24,
        deltaCents: -14,
        status: 'approved-change',
      },
      {
        scenarioId: 'billing:nano-banana-lite:t2i:4:1k:member',
        currentTotalCents: 16,
        canonicalTotalCents: 13,
        deltaCents: -3,
        status: 'approved-change',
      },
      {
        scenarioId: 'billing:nano-banana-lite:t2i:4:1k:plus',
        currentTotalCents: 15,
        canonicalTotalCents: 12,
        deltaCents: -3,
        status: 'approved-change',
      },
      {
        scenarioId: 'billing:nano-banana-lite:t2i:4:1k:pro',
        currentTotalCents: 14,
        canonicalTotalCents: 12,
        deltaCents: -2,
        status: 'approved-change',
      },
      {
        scenarioId: 'estimator:nano-banana-2:4:1k',
        currentTotalCents: 42,
        canonicalTotalCents: 27,
        deltaCents: -15,
        status: 'approved-change',
      },
      {
        scenarioId: 'estimator:nano-banana-lite:4:1k',
        currentTotalCents: 16,
        canonicalTotalCents: 13,
        deltaCents: -3,
        status: 'approved-change',
      },
    ]
  );
});

test('canonical audit delegates to the explicit historical projector without changing the live admin default', () => {
  const collectorSource = readFileSync('frontend/src/lib/pricing-audit/canonical-collectors.ts', 'utf8');
  const projectorSource = readFileSync('frontend/server/pricing-admin/canonical-scenarios.ts', 'utf8');

  assert.match(collectorSource, /quoteHistoricalCanonicalAuditScenarios/);
  assert.doesNotMatch(collectorSource, /quoteCanonicalPricing|resolvePricingPolicy|buildCanonicalPricingFacts|collectLegacyPricingOutputs/);
  assert.match(projectorSource, /buildCanonicalPricingFacts/);
  assert.match(projectorSource, /quoteCanonicalPricing/);
  assert.doesNotMatch(projectorSource, /@\/lib\/db|pricing-rule-store|process\.env|collectLegacyPricingOutputs/);
});

test('canonical admin scenario projection has no transitive dependency on the broad ENV object', () => {
  const dependencies = collectLocalDependencies('frontend/server/pricing-admin/canonical-scenarios.ts');
  const envPath = resolve('frontend/src/lib/env.ts');

  assert.equal(dependencies.has(resolve('frontend/src/lib/pricing-audit/canonical-facts.ts')), true);
  assert.equal(dependencies.has(envPath), false, `canonical scenario dependency graph reaches ${envPath}`);
});

test('every cross-surface pricing difference is explicitly profiled', async () => {
  const { findUnprofiledCrossSurfaceDifferences } = await import('../frontend/src/lib/pricing-audit/matrix.ts');
  type AuditRows = Parameters<typeof findUnprofiledCrossSurfaceDifferences>[0];
  const rows = [
    ...readFixtureRows<AuditRows[number]>(fixturePath),
    ...readFixtureRows<AuditRows[number]>(launchAdditionsFixturePath),
  ];
  assert.deepEqual(findUnprofiledCrossSurfaceDifferences(rows), []);
});

test('matrix validation rejects missing scenarios and invalid quote fields with stable codes', async () => {
  const { PricingAuditError, buildPricingAuditMatrixFromOutputs } = await import(
    '../frontend/src/lib/pricing-audit/matrix.ts'
  );
  const current = {
    scenarioId: 'one',
    surface: 'billing' as const,
    currency: 'USD',
    vendorSubtotalCents: 10,
    marginCents: 3,
    surchargeCents: 0,
    customerTotalCents: 13,
    unit: 'run',
    quantity: 1,
  };
  const canonical = {
    ...current,
    engineId: 'engine-a',
    policySource: 'versioned' as const,
    policyRuleId: 'default',
  };

  assert.throws(
    () => buildPricingAuditMatrixFromOutputs([current], []),
    (error: unknown) => error instanceof PricingAuditError && error.code === 'missing_scenario'
  );
  assert.throws(
    () =>
      buildPricingAuditMatrixFromOutputs(
        [{ ...current, customerTotalCents: Number.NaN }],
        [{ ...canonical, customerTotalCents: Number.NaN }]
      ),
    (error: unknown) => error instanceof PricingAuditError && error.code === 'invalid_quote'
  );
});

test('matrix validation rejects unapproved compatibility profiles', async () => {
  const { PricingAuditError, buildPricingAuditMatrixFromOutputs } = await import(
    '../frontend/src/lib/pricing-audit/matrix.ts'
  );
  const current = {
    scenarioId: 'one',
    surface: 'billing' as const,
    currency: 'USD',
    vendorSubtotalCents: 10,
    marginCents: 3,
    surchargeCents: 0,
    customerTotalCents: 13,
    unit: 'run',
    quantity: 1,
    compatibilityProfile: 'unapproved',
  };
  assert.throws(
    () =>
      buildPricingAuditMatrixFromOutputs(
        [current],
        [{ ...current, engineId: 'engine-a', policySource: 'versioned', policyRuleId: 'default' }],
        new Set(['standard'])
      ),
    (error: unknown) => error instanceof PricingAuditError && error.code === 'unapproved_compatibility_profile'
  );
});
