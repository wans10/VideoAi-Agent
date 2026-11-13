import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { listFalEngines } from '../frontend/src/config/falEngines';

const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
  scripts?: Record<string, string>;
};

test('public pricing has an explicit read-only baseline and intentional generation command', () => {
  assert.equal(
    existsSync('frontend/scripts/pricing-public-baseline.ts'),
    true,
    'the exhaustive public pricing baseline collector should exist'
  );
  assert.equal(
    existsSync('tests/fixtures/pricing-public-projections.v1.json'),
    true,
    'the exhaustive public pricing fixture should exist'
  );
  assert.equal(
    packageJson.scripts?.['pricing:public-baseline'],
    'tsx --tsconfig frontend/tsconfig.json frontend/scripts/pricing-public-baseline.ts'
  );
  assert.equal(
    packageJson.scripts?.['pricing:public-baseline:generate'],
    'tsx --tsconfig frontend/tsconfig.json frontend/scripts/pricing-public-baseline.ts --write'
  );
});

type PublicProjectionFixture = {
  version: number;
  generatedFrom?: string;
  rows: Array<{
    id: string;
    surface: string;
    engineId: string;
    status: 'exact' | 'unavailable';
    currency?: string;
    customerTotalCents?: number;
    quantity?: number;
    structuredDataAmount?: string;
    compatibilityProfile?: string;
  }>;
};

// Later transitions (Keyvo official list prices, 2026-11-13) supersede rows an earlier transition introduced.
const officialListTransition = JSON.parse(readFileSync('tests/fixtures/keyvo-official-list-public-pricing-2026-11-13.json', 'utf8')) as {
  retiredEngineIds: string[]; retiredRowIds: string[];
  changes: Array<{ previous: Record<string, unknown> & { id: string; engineId: string }; current: Record<string, unknown> & { id: string; engineId: string } }>;
  rows: unknown[];
};
const officialListCurrent = new Map(officialListTransition.changes.map((change) => [change.current.id, change.current]));
function latestPublicRow<T extends { id: string }>(row: T): T {
  return (officialListCurrent.get(row.id) as T | undefined) ?? row;
}

test('public pricing baseline exhaustively covers eligible catalog and public surfaces', () => {
  const fixture = JSON.parse(
    readFileSync('tests/fixtures/pricing-public-projections.v1.json', 'utf8')
  ) as PublicProjectionFixture;
  const launch = JSON.parse(
    readFileSync('tests/fixtures/gpt-image-2-5-public-pricing-launch-2026-09-15.json', 'utf8')
  ) as PublicProjectionFixture;
  const fluxMaxLaunch = JSON.parse(
    readFileSync('tests/fixtures/flux-3-max-public-pricing-launch-2026-10-20.json', 'utf8')
  ) as PublicProjectionFixture;
  const nano21Launch = JSON.parse(
    readFileSync('tests/fixtures/nano21-fixed-public-pricing-launch-2026-10-27.json', 'utf8')
  ) as PublicProjectionFixture;
  const klingPublicDiscovery = JSON.parse(
    readFileSync('tests/fixtures/kling-v4-public-discovery-projections-2026-10-27.json', 'utf8')
  ) as PublicProjectionFixture;
  const klingPricingDiscovery = JSON.parse(
    readFileSync('tests/fixtures/kling-v4-pricing-discovery-projections-2026-10-29.json', 'utf8')
  ) as PublicProjectionFixture;
  const novemberMarketing = JSON.parse(
    readFileSync('tests/fixtures/nov06-model-marketing-public-projections-2026-11-06.json', 'utf8')
  ) as PublicProjectionFixture;
  const novemberImages = JSON.parse(
    readFileSync('tests/fixtures/nov05-functional-image-public-projections-2026-11-06.json', 'utf8')
  ) as PublicProjectionFixture;
  assert.equal(fixture.version, 1);
  assert.equal(fixture.generatedFrom, 'canonical-public-pricing-paths');
  assert.ok(fixture.rows.length >= 250, `expected at least 250 public projection rows, got ${fixture.rows.length}`);

  assert.deepEqual(klingPublicDiscovery.rows, [
    { id: 'json-ld:kling-v4:offer', surface: 'json-ld', engineId: 'kling-v4', status: 'unavailable' },
    { id: 'model-page:kling-v4:default', surface: 'model-page', engineId: 'kling-v4', status: 'unavailable' },
  ]);
  assert.equal(klingPricingDiscovery.rows.length, 10);
  assert.ok(klingPricingDiscovery.rows.every((row) => row.engineId === 'kling-v4' && row.status === 'unavailable'));
  assert.equal(novemberMarketing.rows.length, 28);
  assert.ok(novemberMarketing.rows.every(row => row.status === 'unavailable' && row.customerTotalCents === undefined));
  const keyvoTransition = JSON.parse(
    readFileSync('tests/fixtures/keyvo-provider-transition-public-pricing-2026-11-11.json', 'utf8')
  ) as PublicProjectionFixture;
  const rows = [...fixture.rows, ...launch.rows, ...fluxMaxLaunch.rows, ...nano21Launch.rows, ...klingPublicDiscovery.rows, ...klingPricingDiscovery.rows, ...novemberImages.rows, ...novemberMarketing.rows, ...keyvoTransition.rows];
  const ids = rows.map((row) => row.id);
  assert.equal(new Set(ids).size, ids.length, 'public projection scenario ids must be unique');

  const requiredSurfaces = new Set([
    'pricing-hub-video',
    'pricing-hub-image',
    'pricing-hub-audio',
    'pricing-hub-tool',
    'model-page',
    'estimator',
    'price-chip',
    'json-ld',
    'workspace-preflight',
    'image-estimate',
  ]);
  const actualSurfaces = new Set(rows.map((row) => row.surface));
  for (const surface of requiredSurfaces) {
    assert.equal(actualSurfaces.has(surface), true, `missing public pricing surface ${surface}`);
  }

  for (const row of rows) {
    assert.ok(row.id.trim(), 'scenario id should not be empty');
    assert.ok(row.engineId.trim(), `${row.id}.engineId should not be empty`);
    if (row.status === 'exact') {
      assert.equal(Number.isInteger(row.customerTotalCents), true, `${row.id}.customerTotalCents`);
      assert.ok((row.customerTotalCents ?? -1) >= 0, `${row.id}.customerTotalCents should be non-negative`);
      assert.equal(row.currency, 'USD', `${row.id}.currency should stay USD`);
      assert.equal(typeof row.quantity === 'number' && Number.isFinite(row.quantity) && row.quantity! > 0, true);
      assert.ok(row.compatibilityProfile?.trim(), `${row.id}.compatibilityProfile should be explicit`);
    }
    if (row.structuredDataAmount != null) {
      assert.match(row.structuredDataAmount, /^\d+\.\d{2}$/);
    }
  }

  const estimatorEngineIds = new Set(
    rows.filter((row) => row.surface === 'estimator').map((row) => row.engineId)
  );
  const modelEngineIds = new Set(
    rows.filter((row) => row.surface === 'model-page').map((row) => row.engineId)
  );
  for (const entry of listFalEngines()) {
    if (entry.surfaces.pricing.includeInEstimator) {
      assert.equal(estimatorEngineIds.has(entry.id), true, `missing estimator baseline for ${entry.id}`);
    }
    if (entry.surfaces.modelPage.indexable) {
      assert.equal(modelEngineIds.has(entry.id), true, `missing model-page baseline for ${entry.id}`);
    }
  }
});

test('public pricing baseline freezes the estimator per-image branch actually rendered in the browser', () => {
  const fixture = JSON.parse(
    readFileSync('tests/fixtures/pricing-public-projections.v1.json', 'utf8')
  ) as PublicProjectionFixture;
  const nanoBanana = fixture.rows.find(
    (row) => row.id === 'estimator:nano-banana:member:default'
  );
  assert.equal(nanoBanana?.customerTotalCents, 7);
});

test('Sora and Seedance 1.5 retirement removes purchasable projections without replacing the frozen workspace sample', async () => {
  const { collectPublicPricingProjectionRows } = await import('../frontend/scripts/pricing-public-baseline-collector');
  const rows = await collectPublicPricingProjectionRows();
  assert.deepEqual(rows.filter((row) => row.surface === 'workspace-preflight').map((row) => row.engineId).sort(), [
    'gemini-omni-flash', 'luma-ray-3-2', 'pika-text-to-video', 'veo-3-1', 'veo-3-1-fast', 'veo-3-1-lite',
  ]);
  for (const engineId of ['sora-2', 'sora-2-pro', 'seedance-1-5-pro']) {
    assert.equal(rows.some((row) => row.engineId === engineId
      && ['estimator', 'pricing-hub-video', 'workspace-preflight'].includes(row.surface)), false);
    // Keyvo retired Seedance 1.5 Pro entirely: no model page, so no Product offer row at all.
    assert.deepEqual(rows.find((row) => row.id === `json-ld:${engineId}:offer`), engineId === 'seedance-1-5-pro' ? undefined : {
      id: `json-ld:${engineId}:offer`, surface: 'json-ld', engineId, status: 'unavailable',
    });
  }
});

test('public pricing baseline ignores machine-specific pricing environment overrides', () => {
  const result = spawnSync('pnpm', ['--silent', 'pricing:public-baseline'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: {
      ...process.env,
      DATABASE_URL: 'postgresql://baseline-must-not-connect.invalid/maxvideoai',
      LUMARAY2_BASE_5S_540P_USD: '99.99',
      LUMARAY2_FLASH_BASE_5S_540P_USD: '88.88',
    },
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  // Keyvo's public baseline is a subset of upstream's rows; the exact count follows the merged registry projection.
  assert.match(result.stdout, /current \(\d+ rows\)/);
});

test('Keyvo provider transition retires four models, keeps H3 per-second rates and adds only Seedream Flash rows', async () => {
  const transition = JSON.parse(readFileSync('tests/fixtures/keyvo-provider-transition-public-pricing-2026-11-11.json', 'utf8')) as {
    retiredEngineIds: string[]; retiredRowIds: string[];
    changes: Array<{ previous: PublicProjectionFixture['rows'][number] & { vendorSubtotalCents?: number }; current: PublicProjectionFixture['rows'][number] & { vendorSubtotalCents?: number } }>;
    rows: PublicProjectionFixture['rows'];
  };
  const { collectPublicPricingProjectionRows } = await import('../frontend/scripts/pricing-public-baseline-collector');
  const current = await collectPublicPricingProjectionRows();
  assert.deepEqual(transition.retiredEngineIds, ['happy-horse-1-0', 'seedance-1-5-pro', 'seedream', 'wan-2-5']);
  for (const engineId of transition.retiredEngineIds) assert.equal(current.some(row => row.engineId === engineId), false, engineId);
  assert.ok(transition.retiredRowIds.every(id => !current.some(row => row.id === id)));
  // H3's 10 s default moves from 480P (USD 0.05/s) to 768P (unchanged USD 0.06/s); 4K is no longer an H3 tier.
  assert.equal(transition.changes.length, 4);
  for (const change of transition.changes.filter(row => row.previous.surface === 'estimator')) {
    assert.equal(change.previous.vendorSubtotalCents, 50);
    assert.equal(change.current.vendorSubtotalCents, 60);
    assert.equal(change.current.quantity, 10);
  }
  assert.deepEqual(transition.changes.find(row => row.previous.id === 'pricing-hub-video:minimax-h3:4k-route')?.current,
    { id: 'pricing-hub-video:minimax-h3:4k-route', surface: 'pricing-hub-video', engineId: 'minimax-h3', status: 'unavailable' });
  for (const change of transition.changes) assert.deepEqual(current.find(row => row.id === change.current.id), latestPublicRow(change.current));
  assert.equal(transition.rows.length, 7);
  for (const row of transition.rows) {
    assert.equal(row.engineId, 'seedream-5-0-flash');
    assert.deepEqual(current.find(candidate => candidate.id === row.id), latestPublicRow(row));
  }
});

test('Keyvo MiniMax-H3-Max transition reprices only H3-Max at the official CNY cost and drops its 1080P presets', async () => {
  const transition = JSON.parse(readFileSync('tests/fixtures/keyvo-h3-max-official-public-pricing-2026-11-12.json', 'utf8')) as {
    changes: Array<{ previous: PublicProjectionFixture['rows'][number] & { vendorSubtotalCents?: number };
      current: PublicProjectionFixture['rows'][number] & { vendorSubtotalCents?: number } }>;
  };
  const { collectPublicPricingProjectionRows } = await import('../frontend/scripts/pricing-public-baseline-collector');
  const current = await collectPublicPricingProjectionRows();
  assert.equal(transition.changes.length, 9);
  // A later reviewed transition (the 2026-11-13 official-list rule) may re-price these rows; it must then start from
  // exactly this transition's result.
  const laterPath = 'tests/fixtures/keyvo-official-list-public-pricing-2026-11-13.json';
  const later = existsSync(laterPath) ? (JSON.parse(readFileSync(laterPath, 'utf8')) as {
    changes: Array<{ previous: PublicProjectionFixture['rows'][number]; current: PublicProjectionFixture['rows'][number] }> }).changes : [];
  for (const change of transition.changes) {
    assert.equal(change.previous.engineId, 'minimax-h3-max');
    const next = later.find(row => row.previous.id === change.current.id);
    if (next) assert.deepEqual(next.previous, change.current, change.current.id);
    assert.deepEqual(current.find(row => row.id === change.current.id), next?.current ?? change.current);
  }
  const byId = new Map(transition.changes.map(change => [change.current.id, change.current]));
  // 5 s at 480P: CNY 1.65 = USD 0.20625 (vendor 21 cents) plus the 30% margin.
  for (const tier of ['member', 'plus', 'pro']) {
    assert.deepEqual([byId.get(`estimator:minimax-h3-max:${tier}:default`)?.vendorSubtotalCents,
      byId.get(`estimator:minimax-h3-max:${tier}:default`)?.customerTotalCents], [21, 28]);
  }
  // 5 s at 768P: CNY 2.50 = USD 0.3125; 10 s at 768P (entry route): CNY 5.00.
  assert.equal(byId.get('model-page:minimax-h3-max:default')?.customerTotalCents, 41);
  assert.equal(byId.get('json-ld:minimax-h3-max:offer')?.structuredDataAmount, '0.41');
  assert.equal(byId.get('pricing-hub-video:minimax-h3-max:entry-route')?.customerTotalCents, 82);
  for (const preset of ['8s-1080p', '10s-1080p', '10s-1080p-audio']) {
    assert.deepEqual(byId.get(`pricing-hub-video:minimax-h3-max:${preset}`), {
      id: `pricing-hub-video:minimax-h3-max:${preset}`, surface: 'pricing-hub-video', engineId: 'minimax-h3-max', status: 'unavailable' });
  }
});

test('Keyvo official list transition sells every Keyvo model at 80% of its list price and retires models without a mainland route', async () => {
  const { collectPublicPricingProjectionRows } = await import('../frontend/scripts/pricing-public-baseline-collector');
  const current = await collectPublicPricingProjectionRows();
  assert.deepEqual(officialListTransition.retiredEngineIds, ['kling-2-5-turbo', 'kling-2-6-pro', 'wan-2-6']);
  for (const engineId of officialListTransition.retiredEngineIds) assert.equal(current.some(row => row.engineId === engineId), false, engineId);
  assert.equal(officialListTransition.retiredRowIds.length, 37);
  assert.deepEqual(officialListTransition.rows, []);
  assert.equal(officialListTransition.changes.length, 201);
  for (const change of officialListTransition.changes) {
    assert.equal(change.previous.engineId, change.current.engineId);
    assert.deepEqual(current.find(row => row.id === change.current.id), change.current, change.current.id);
    // Supplier-cost rows carry no margin component any more; customer totals never rise (Kling 4 rows open instead).
    if (change.current.status === 'exact' && typeof change.current.marginCents === 'number') assert.equal(change.current.marginCents, 0, change.current.id);
    if (change.previous.status === 'exact' && change.current.status === 'exact') {
      assert.ok((change.current.customerTotalCents as number) <= (change.previous.customerTotalCents as number), change.current.id);
    }
  }
  const byId = new Map(current.map(row => [row.id, row]));
  // Wan 3 720P 10 s: CNY 6.00 list -> USD 0.75 -> 60 cents (CNY 4.80). Kling 4.0 720P 5 s: CNY 5.00 -> 50 cents.
  assert.equal(byId.get('model-page:wan-3:default')?.customerTotalCents, 60);
  assert.equal(byId.get('pricing-hub-video:kling-v4:5s-720p')?.customerTotalCents, 50);
  // Voice over, 60 s at the Seed Audio list CNY 1.00/min -> 12.5 cents -> 10 cents (CNY 0.80).
  assert.equal(byId.get('pricing-hub-audio:audio-voice-only:60')?.customerTotalCents, 10);
});

test('Character Studio static rows retire only four fixed prices and require a current native quote', async () => {
  const frozen = JSON.parse(readFileSync('tests/fixtures/pricing-public-projections.v1.json', 'utf8')) as PublicProjectionFixture;
  const transition = JSON.parse(readFileSync('tests/fixtures/character-studio-public-pricing-transition-2026-11-05.json', 'utf8')) as {
    rows: Array<{ previous: PublicProjectionFixture['rows'][number]; current: PublicProjectionFixture['rows'][number] }>;
  };
  const { collectPublicPricingProjectionRows } = await import('../frontend/scripts/pricing-public-baseline-collector');
  const current = await collectPublicPricingProjectionRows();
  assert.equal(transition.rows.length, 4);
  for (const change of transition.rows) {
    assert.deepEqual(change.previous, frozen.rows.find(row => row.id === change.previous.id));
    assert.equal(change.previous.status, 'exact');
    assert.deepEqual(change.current, { id: change.previous.id, surface: 'pricing-hub-tool', engineId: change.previous.engineId, status: 'unavailable' });
    assert.deepEqual(current.find(row => row.id === change.current.id), change.current);
  }
});

test('Max launch adds only normal-list-plus-30-percent public projections and reproduces offline', () => {
  const launch = JSON.parse(readFileSync('tests/fixtures/flux-3-max-public-pricing-launch-2026-10-20.json', 'utf8')) as PublicProjectionFixture;
  assert.equal(launch.rows.length, 12);
  assert.ok(launch.rows.every((row) => row.engineId === 'flux-3-max'));
  const rows = new Map(launch.rows.map((row) => [row.id, row]));
  for (const tier of ['member', 'plus', 'pro']) {
    assert.equal(rows.get(`estimator:flux-3-max:${tier}:default`)?.customerTotalCents, 111);
  }
  assert.equal(rows.get('pricing-hub-video:flux-3-max:5s-720p')?.customerTotalCents, 111);
  assert.equal(rows.get('pricing-hub-video:flux-3-max:10s-720p')?.customerTotalCents, 221);
  assert.equal(rows.get('pricing-hub-video:flux-3-max:10s-1080p')?.customerTotalCents, 377);
  assert.equal(rows.get('pricing-hub-video:flux-3-max:4k-route')?.status, 'unavailable');
  const result = spawnSync('pnpm', ['exec', 'tsx', '--tsconfig', 'frontend/tsconfig.json', 'frontend/scripts/pricing-flux-3-max-launch.ts'], {
    cwd: process.cwd(), encoding: 'utf8', env: { ...process.env, DATABASE_URL: 'postgresql://must-not-connect.invalid/test' },
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});

test('canonical public pricing adapters exist and stay browser safe', () => {
  const browserModules = [
    'frontend/src/lib/pricing-public-facts.ts',
    'frontend/src/lib/pricing-public-quote.ts',
  ];
  for (const path of browserModules) {
    assert.equal(existsSync(path), true, `${path} should exist`);
    const source = readFileSync(path, 'utf8');
    for (const forbidden of [
      "@/server",
      'pricing-rule-store',
      "@/lib/db",
      "@/lib/schema",
      "@/lib/env",
      'node:',
      'next/headers',
      'quote-billing',
      '/admin/',
    ]) {
      assert.equal(source.includes(forbidden), false, `${path} should not import ${forbidden}`);
    }
  }
  assert.equal(existsSync('frontend/server/pricing/quote-public.ts'), true);
});

test('canonical public quote owns policy, override precedence, discount, and snapshot projection', async () => {
  const publicQuote = await import('../frontend/src/lib/pricing-public-quote');
  assert.equal(typeof publicQuote.quotePublicPricing, 'function');
  assert.equal(typeof publicQuote.projectPublicPricingSnapshot, 'function');

  const facts = {
    engineId: 'public-test-engine',
    currency: 'USD',
    vendorSubtotalExactCents: 42.5,
    unit: 'sec',
    quantity: 5,
  };
  const standard = publicQuote.quotePublicPricing({
    facts,
    scenario: {
      id: 'public:test:standard',
      engineId: facts.engineId,
      resolution: '1080p',
      membershipTier: 'plus',
    },
    compatibilityProfileId: 'standard',
  });
  assert.equal(standard.marginCents, 13);
  assert.equal(standard.discountCents, 0);
  assert.equal(standard.customerTotalCents, 56);
  assert.equal(standard.policyProvenance.source, 'versioned');

  const overridden = publicQuote.quotePublicPricing({
    facts,
    scenario: {
      id: 'public:test:override',
      engineId: facts.engineId,
      resolution: '1080p',
      membershipTier: 'member',
    },
    compatibilityProfileId: 'standard',
    pricingRules: [
      { id: 'global-public', marginPercent: 0.4, marginFlatCents: 0, currency: 'USD' },
      { id: 'engine-public', engineId: facts.engineId, marginPercent: 0.45, marginFlatCents: 0, currency: 'USD' },
      {
        id: 'exact-public',
        engineId: facts.engineId,
        resolution: '1080p',
        marginPercent: 0.5,
        marginFlatCents: 0,
        currency: 'USD',
      },
    ],
  });
  assert.equal(overridden.marginCents, 22);
  assert.equal(overridden.customerTotalCents, 65);
  assert.equal(overridden.policyProvenance.source, 'database');
  assert.equal(overridden.policyProvenance.sourceRuleId, 'exact-public');

  const snapshot = publicQuote.projectPublicPricingSnapshot({
    quote: standard,
    base: { seconds: 5, rate: 0.085, unit: 'sec', amountCents: 42.5 },
    addons: [],
    meta: { surface: 'public-test' },
  });
  assert.equal(snapshot.totalCents, standard.customerTotalCents);
  assert.equal(snapshot.margin.amountCents, standard.marginCents);
  assert.deepEqual(snapshot.meta?.pricingPolicy, standard.policyProvenance);
});

test('public factual adapters expose provider costs without commercial fields', async () => {
  const publicFacts = await import('../frontend/src/lib/pricing-public-facts');
  assert.equal(typeof publicFacts.buildPublicPricingFacts, 'function');
  assert.equal(typeof publicFacts.buildAuthoredPublicOfferFacts, 'function');
  assert.equal(typeof publicFacts.buildFixedPublicProductFacts, 'function');

  const entries = listFalEngines();
  const standardEntry = entries.find((entry) => entry.id === 'veo-3-1-fast');
  assert.ok(standardEntry);
  const standard = publicFacts.buildPublicPricingFacts({
    engine: standardEntry.engine,
    durationSec: 8,
    resolution: '1080p',
    mode: 't2v',
  });
  assert.equal(standard.compatibilityProfileId, 'standard');
  assert.ok(standard.facts.vendorSubtotalExactCents > 0);
  assert.equal(standard.facts.engineId, standardEntry.engine.id);
  assert.equal('marginCents' in standard.facts, false);
  assert.equal('customerTotalCents' in standard.facts, false);

  const seedanceEntry = entries.find((entry) => entry.id === 'seedance-2-0');
  assert.ok(seedanceEntry);
  const providerReference = publicFacts.buildPublicPricingFacts({
    engine: seedanceEntry.engine,
    durationSec: 5,
    resolution: '720p',
    mode: 't2v',
  });
  assert.equal(providerReference.compatibilityProfileId, 'provider-reference-current');
  assert.ok(providerReference.facts.vendorSubtotalExactCents > 0);

  const authored = publicFacts.buildAuthoredPublicOfferFacts({
    engineId: standardEntry.id,
    currency: 'USD',
    amountCents: 168,
  });
  assert.equal(authored.compatibilityProfileId, 'schema-current');
  assert.equal(authored.facts.vendorSubtotalExactCents, 168);

  const fixed = publicFacts.buildFixedPublicProductFacts({
    engineId: 'upscale-video-topaz',
    currency: 'USD',
    amountCents: 80,
    quantity: 1,
    unit: 'run',
  });
  assert.equal(fixed.compatibilityProfileId, 'fixed-product-current');
  assert.equal(fixed.facts.vendorSubtotalExactCents, 80);
});

test('pricing audit reuses production public provider facts', () => {
  const source = readFileSync('frontend/src/lib/pricing-audit/canonical-facts.ts', 'utf8');
  assert.match(source, /from '@\/lib\/pricing-public-facts'/);
  assert.match(source, /buildPublicPricingFacts/);
  assert.doesNotMatch(source, /function standardFacts\(/);
  assert.doesNotMatch(source, /function engineFacts\(/);
});

test('pricing hub delegates every customer total to canonical public pricing', () => {
  const source = readFileSync(
    'frontend/app/(localized)/[locale]/(marketing)/pricing/_lib/pricingHubData.ts',
    'utf8'
  );
  assert.match(source, /pricing-public-facts/);
  assert.match(source, /pricing-public-quote/);
  assert.match(source, /quotePublicPricing/);
  assert.doesNotMatch(source, /applyDisplayedPriceMarginCents/);
  assert.doesNotMatch(source, /DISPLAY_PRICE_MARGIN_PERCENT/);
  assert.doesNotMatch(source, /applyFalReferenceDisplayMarginCents/);
  assert.doesNotMatch(source, /function displayedScenarioCents\(/);
});

test('canonical quote scaling preserves historical per-unit rounding for public batches', async () => {
  const publicQuote = await import('../frontend/src/lib/pricing-public-quote');
  assert.equal(typeof publicQuote.scalePublicPricingQuote, 'function');
  const unit = publicQuote.quotePublicPricing({
    facts: {
      engineId: 'public-image-unit',
      currency: 'USD',
      vendorSubtotalExactCents: 4,
      unit: 'image',
      quantity: 1,
    },
    scenario: {
      id: 'public:image:unit',
      engineId: 'public-image-unit',
      membershipTier: 'member',
    },
    compatibilityProfileId: 'standard',
  });
  assert.equal(unit.customerTotalCents, 6);
  const batch = publicQuote.scalePublicPricingQuote(unit, 4);
  assert.equal(batch.vendorSubtotalCents, 16);
  assert.equal(batch.marginCents, 8);
  assert.equal(batch.customerTotalCents, 24);
  assert.equal(batch.quantity, 4);
});

test('browser estimator and price chip delegate commercial totals to the public canonical adapter', () => {
  const estimator = readFileSync('frontend/components/marketing/PriceEstimator.tsx', 'utf8');
  const chip = readFileSync('frontend/components/marketing/PriceChip.tsx', 'utf8');
  const options = readFileSync(
    'frontend/components/marketing/price-estimator/price-estimator-options.ts',
    'utf8'
  );
  for (const [path, source] of [
    ['PriceEstimator.tsx', estimator],
    ['PriceChip.tsx', chip],
  ] as const) {
    assert.match(source, /fetchCurrentPrice/, `${path} should request the effective server quote`);
    assert.doesNotMatch(source, /buildPublicPricingFacts|quotePublicPricing/, `${path} should not calculate commercial totals in the browser`);
    assert.doesNotMatch(source, /computePricingSnapshot/, `${path} should not call the legacy client kernel`);
    assert.doesNotMatch(source, /platformFeePct:/, `${path} should not mutate commercial policy`);
  }
  assert.doesNotMatch(options, /applyPerImageDisplayMargin/);
  assert.doesNotMatch(options, /defaultMultiplier/);
  assert.doesNotMatch(options, /platformMultiplier/);
});

test('model price rows and Product Offer JSON-LD use canonical public owners', () => {
  const modelPricing = readFileSync(
    'frontend/app/(localized)/[locale]/(marketing)/models/[slug]/_lib/model-page-pricing.ts',
    'utf8'
  );
  const modelSchema = readFileSync(
    'frontend/app/(localized)/[locale]/(marketing)/models/[slug]/_lib/model-page-schema.ts',
    'utf8'
  );
  assert.match(modelPricing, /server\/pricing\/quote-public/);
  assert.match(modelPricing, /computeCurrentPublicSnapshot/);
  assert.doesNotMatch(modelPricing, /from '@\/lib\/pricing'/);
  assert.match(modelSchema, /pricing-public-facts/);
  assert.match(modelSchema, /pricing-public-quote/);
  assert.doesNotMatch(modelSchema, /DEFAULT_SCHEMA_MARGIN_PERCENT/);
  assert.doesNotMatch(modelSchema, /roundUsdUpToCents/);
});
