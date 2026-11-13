import { OFFICIAL_LIST_PRICED_ENGINE_IDS } from '../frontend/src/lib/official-list-pricing';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { startDisposablePostgres } from './helpers/disposable-postgres';
import { withHistoricalCustomerTariffCatalogue } from './helpers/historical-customer-tariff-catalogue';
import { withDbTransaction } from '../frontend/src/lib/db';
import { ENV } from '../frontend/src/lib/env';
import { loadPricingPolicyOverridesWithExecutor } from '../frontend/src/lib/pricing-rule-store';
import { collectSellableManualTariffCoverage, collectEffectiveCustomerTariffBaseline } from '../frontend/lib/pricing-audit/manual-tariff-coverage';
import { continuousInputTariffSelector } from '../frontend/src/lib/pricing-manual-scenario';
import { auditReviewedCustomerTariffSeed } from '../frontend/server/pricing/customer-tariff-reviewed-seed';
import { computeCanonicalBillingSnapshot } from '../frontend/server/pricing/quote-billing';
import { collectCustomerTariffCutoverCheckpoints, cutoverDigest, type CustomerTariffCutoverRelease,
  type CutoverApprovedChange } from '../frontend/server/pricing/customer-tariff-cutover-evidence';
import { captureCustomerTariffCutoverBindings, activateInitialCustomerTariffGrid,
  rollbackInitialCustomerTariffGrid, withPricingCutoverTransaction } from '../frontend/server/pricing/customer-tariff-cutover';
import { pricingCutoverTarget } from '../frontend/server/pricing/cutover-target';
import { computeCustomerTariffInitializationBaseline } from '../frontend/server/pricing/customer-tariff-initialization-baseline';
import { getRuntimeModelById } from '../frontend/config/model-runtime';

const actor = '11111111-1111-4111-8111-111111111111';
const key = (value: object) => JSON.stringify(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)));
const digest = (value: string) => createHash('sha256').update(value).digest('hex');

test('initial cutover is atomic, validates the actual reader, and rollback preserves all financial history', async t => withHistoricalCustomerTariffCatalogue(async () => {
  // Replay the historical catalogue; Kling V4 and Nano21 have separate native tariffs.
  // This synthetic rehearsal checks atomicity, not elapsed CI time. Mock only
  // Date so slow hosts do not expire its fixture; real database timers still run.
  t.mock.timers.enable({ apis: ['Date'], now: Date.now() });
  const db = await startDisposablePostgres('initial-pricing-cutover');
  const previous = { DATABASE_URL: process.env.DATABASE_URL, NODE_ENV: process.env.NODE_ENV, PRICING_SANDBOX: process.env.PRICING_SANDBOX };
  const routes = { SEEDANCE_2_PROVIDER: ENV.SEEDANCE_2_PROVIDER, SEEDANCE_FAST_PROVIDER: ENV.SEEDANCE_FAST_PROVIDER,
    SEEDANCE_2_5_PROVIDER: ENV.SEEDANCE_2_5_PROVIDER, SEEDANCE_2_5_BYTEPLUS_ENABLED: ENV.SEEDANCE_2_5_BYTEPLUS_ENABLED };
  Object.assign(process.env, { DATABASE_URL: db.databaseUrl, NODE_ENV: 'development', PRICING_SANDBOX: '1' });
  Object.assign(ENV, { SEEDANCE_2_PROVIDER: 'byteplus_modelark', SEEDANCE_FAST_PROVIDER: 'byteplus_modelark',
    SEEDANCE_2_5_PROVIDER: 'byteplus_modelark', SEEDANCE_2_5_BYTEPLUS_ENABLED: 'true' });
  const target = pricingCutoverTarget({ DATABASE_URL: db.databaseUrl });
  const transaction = <T>(work: Parameters<typeof withDbTransaction<T>>[0]) => withDbTransaction(work, { pool: db.pool });
  try {
    await db.pool.query(`CREATE TABLE app_pricing_rules (id text PRIMARY KEY, engine_id text, mode text, resolution text,
      margin_percent numeric, margin_flat_cents integer, surcharge_audio_percent numeric, surcharge_upscale_percent numeric,
      currency text, compatibility_profile text, vendor_account_id text, effective_from timestamptz, updated_at timestamptz, updated_by uuid);
      INSERT INTO app_pricing_rules (id,margin_percent,margin_flat_cents,surcharge_audio_percent,surcharge_upscale_percent,currency)
      VALUES ('default',.3,0,.2,.5,'USD');
      CREATE TABLE user_roles (user_id uuid PRIMARY KEY,role text NOT NULL);
      INSERT INTO user_roles VALUES ('${actor}','admin');
      CREATE TABLE app_billing_products (product_key text PRIMARY KEY,surface text,label text,currency text,unit_kind text,unit_price_cents integer,active boolean,metadata jsonb);
      INSERT INTO app_billing_products VALUES ('historic-product','toolbox','Historic product','USD','run',8,true,'{}');
      CREATE TABLE historical_paid_snapshots (id text PRIMARY KEY,snapshot jsonb);
      INSERT INTO historical_paid_snapshots VALUES ('paid-quote','{"totalCents":13,"rule":"old"}');`);
    for (const name of ['08_admin_controls.sql','09_engine_settings.sql','27_pricing_admin_cockpit.sql','54_customer_tariff_cells.sql',
      '55_customer_tariff_versions.sql','58_customer_tariff_bulk_interval_lock.sql','61_customer_tariff_cutover_events.sql']) {
      await db.pool.query(readFileSync(`neon/migrations/${name}`, 'utf8'));
    }
    const bindings = await transaction(e => captureCustomerTariffCutoverBindings(e, target.databaseIdentity));
    const policy = await transaction(loadPricingPolicyOverridesWithExecutor);
    assert.equal(policy.status, 'loaded');
    if (policy.status !== 'loaded') throw new Error('Fixture policy unavailable');
    const coverage = collectSellableManualTariffCoverage();
    assert.deepEqual(coverage.scenarios.filter(row => row.modelId.startsWith('qwen-image-3-0')).map(row => row.id).sort(),
      ['qwen-image-3-0', 'qwen-image-3-0-pro'].flatMap(engineId => ['t2i', 'i2i'].flatMap(mode =>
        ['1k', '2k'].map(resolution => `engineId=${engineId}|mode=${mode}|resolution=${resolution}|durationSec=1`))).sort(),
      'the Keyvo extension must add exactly both Qwen models, modes and resolutions');
    // Keep historical coverage and each reviewed expansion explicit.
    const maxCells = coverage.scenarios.filter(row => row.modelId === 'flux-3-max').length;
    assert.equal(maxCells, 128, 'four modes × sixteen integer durations × two resolutions');
    const lumaModifyExtraCells = coverage.scenarios.filter(row => row.modelId === 'luma-ray-3-2'
      && row.context.mode === 'v2v' && ![5, 10].includes(row.context.durationSec)).length;
    assert.equal(lumaModifyExtraCells, 36, 'twelve additional source-duration classes × three resolutions');
    const additiveCells = 13 + 3 + 48 + 3 + 6 + 4 + 12;
    assert.equal(additiveCells, 89);
    // 26990 less 555 for the provider-completeness sync: Seedance 1.5 / Seedream Lite / HappyHorse 1.0 / Wan 2.5 are offline, MiniMax H3 Max was hidden and the removed H3 480P/4K cells leave the Keyvo catalogue, offset by Hailuo 2.3 (+6), Hailuo 2.3 Fast (+3) and Seedream Flash (+2).
    // 2026-11-12: MiniMax-H3-Max returns on MiniMax's own API with 3564 exact cells (t2v 22 + i2v 22 + ref2v 11 x 2 x 10 reference images x 16 billed reference-video seconds); its Recast/Relight stay unsold.
    const h3MaxOfficialCells = 3564;
    // 2026-11-13 (customer-tariff-cutover-evidence.test.ts): Wan 2.6, Kling 2.5 Turbo, Kling 2.6 Pro offline, Kling 3
    // voice-control variants share the audio-on identity and Hailuo 02 512P text-to-video is unsold: -84 checkpoints.
    const keyvoOfflineDelta = -84;
    assert.equal(collectCustomerTariffCutoverCheckpoints().filter(row => row.kind !== 'new_offer').length, 26435 + h3MaxOfficialCells + keyvoOfflineDelta);
    // -561: 555 ordinary checkpoints and 6 new-offer cells left with the provider-completeness sync (see the comment above).
    const fullCheckedQuotes = 26826 - 561 + h3MaxOfficialCells + maxCells + lumaModifyExtraCells + additiveCells + keyvoOfflineDelta;
    assert.equal(collectCustomerTariffCutoverCheckpoints().length, fullCheckedQuotes,
      'Review inventory changes before running the exhaustive monetary replay');
    assert.equal(collectCustomerTariffCutoverCheckpoints().filter(row => row.scenario.modelId === 'flux-3-max').length, maxCells);
    const quoteLegacy = (scenario: typeof coverage.scenarios[number]) => computeCustomerTariffInitializationBaseline(scenario.context, policy);
    const seedInput = async (scenarios: typeof coverage.scenarios) => {
      const baseline = await collectEffectiveCustomerTariffBaseline({ at: new Date().toISOString(), registryHash: bindings.registryHash,
        databaseIdentity: bindings.databaseIdentity, scenarios, quote: quoteLegacy });
      const captured = { ...baseline, databaseRulesHash: digest(JSON.stringify([...policy.rules].sort((a,b) => a.id.localeCompare(b.id)))) };
      return { baseline: captured, scenarios, registryHash: bindings.registryHash, coverageGaps: coverage.gaps,
        policy, approvedSeedanceMarginPolicy: 'preserve_positive_variant_margin' as const,
        approvedSeedanceLasPolicy: 'reviewed_2_5x_las_list' as const };
    };
    const floorApproval = (input: Awaited<ReturnType<typeof seedInput>>, failures: { scenarioId: string; customerCents: number; referenceCeilCents: number }[]) => ({
      capturedAt: input.baseline.at, registryHash: bindings.registryHash, databaseRulesHash: input.baseline.databaseRulesHash,
      databaseIdentity: bindings.databaseIdentity, changes: failures.map(row => ({ scenarioId: row.scenarioId, currentCustomerCents: row.customerCents,
        proposedCustomerCents: row.referenceCeilCents })) });

    // Keyvo 2026-11-13 (owner decision): Keyvo sells its official-list engines at 80% of the supplier's official list
    // (`official-list-80`), below cost by design. With only the database-wide rule (no engine-specific margin rules, no
    // price changes) the reviewed seed tooling must refuse to freeze those prices into customer tariff cells.
    const officialList = coverage.scenarios.filter(row => OFFICIAL_LIST_PRICED_ENGINE_IDS.has(row.modelId));
    assert.deepEqual([...new Set(officialList.map(row => row.modelId))].sort(), [...OFFICIAL_LIST_PRICED_ENGINE_IDS]
      .filter(id => !['kling-v4', 'kling-v4-flash'].includes(id)).sort(), 'every published official-list engine is in the cutover inventory');
    // The complete seed (the upstream rehearsal's first step) stops at Seedance, the first refused family in inventory order.
    await assert.rejects(auditReviewedCustomerTariffSeed(await seedInput(coverage.scenarios)), { message: 'A positive reviewed variant margin is required.' });
    // Seedance 2.0 / Fast / Mini / 2.5: the current price is below the video-input supplier minimum and the no-video variant
    // is below cost too, so no reviewed proportional margin exists.
    const seedance = officialList.filter(row => row.modelId.startsWith('seedance-'));
    assert.equal(seedance.length, 6210);
    await assert.rejects(auditReviewedCustomerTariffSeed(await seedInput(seedance)), { message: 'A positive reviewed variant margin is required.' });
    // Wan 3 / 3 Prime: the continuous compiler refuses the official-list-80 profile.
    const wan = officialList.filter(row => row.modelId.startsWith('wan-'));
    assert.equal(wan.length, 6192);
    await assert.rejects(auditReviewedCustomerTariffSeed(await seedInput(wan)),
      { message: 'Unsupported Wan continuous tariff profile; explicit review is required.' });
    // Every other official-list engine: each captured point price is a below-cost manual cell (settlement guard), and the
    // only reviewed exception (the GPT Image 2.5 reference floor) cannot approve them.
    const pointEngines = officialList.filter(row => !row.modelId.startsWith('seedance-') && !row.modelId.startsWith('wan-'));
    const pointInput = await seedInput(pointEngines);
    const pointAudit = await auditReviewedCustomerTariffSeed(pointInput);
    assert.equal(pointAudit.checkedScenarios, 4424);
    assert.equal(pointAudit.settlementGuardFailures.length, 4408, 'every fixed official-list point cell is below cost');
    assert.ok(pointAudit.settlementGuardFailures.every(row => row.customerCents < row.referenceCeilCents));
    assert.deepEqual([...new Set(pointAudit.settlementGuardFailures.map(row => row.scenarioId.split('|')[0]!.slice('engineId='.length)))].sort(),
      [...new Set(pointEngines.map(row => row.modelId))].sort());
    await assert.rejects(auditReviewedCustomerTariffSeed({ ...pointInput,
      approvedGptImage25ReferenceFloor: floorApproval(pointInput, pointAudit.settlementGuardFailures) }),
    { message: 'Approved GPT Image 2.5 reference floor does not match captured evidence' });
    t.diagnostic('Official-list engines refused by the reviewed seed under the database-wide rule.');

    // Positive rehearsal: the upstream atomicity / rollback / actual-reader checks on the engines that are NOT
    // official-list priced. The official-list engines are unpublished in this process only (as the historical catalogue
    // helper does for Kling V4 / Nano21); no price and no rule changes.
    const officialModels = [...OFFICIAL_LIST_PRICED_ENGINE_IDS].map(id => getRuntimeModelById(id)!);
    const officialPublished = officialModels.map(model => model.publication.app.published);
    const release = await (async () => {
      try {
        officialModels.forEach(model => { model.publication.app.published = false; });
        return await rehearseWithoutOfficialList();
      } finally {
        officialModels.forEach((model, index) => { model.publication.app.published = officialPublished[index]!; });
      }
    })();
    // Back in the complete Keyvo catalogue the same release is refused: an initial cutover must cover every current
    // checkpoint, so the official-list engines cannot be left out of it.
    assert.equal(collectCustomerTariffCutoverCheckpoints().length, fullCheckedQuotes);
    await assert.rejects(withPricingCutoverTransaction({ DATABASE_URL: db.databaseUrl },'rehearsal',e => activateInitialCustomerTariffGrid(e,
      { release,fingerprint: release.fingerprint,target,actorId: actor,mode: 'rehearsal' })), { message: 'Complete current cutover coverage is required.' });
    assert.deepEqual((await db.pool.query('SELECT revision,active FROM app_customer_tariff_state')).rows,[{ revision: '2',active: false }]);

    async function rehearseWithoutOfficialList(): Promise<CustomerTariffCutoverRelease> {
      const reduced = collectSellableManualTariffCoverage();
      assert.equal(reduced.scenarios.some(row => OFFICIAL_LIST_PRICED_ENGINE_IDS.has(row.modelId)), false);
      assert.equal(reduced.scenarios.length, coverage.scenarios.length - officialList.length);
      const inventory = collectCustomerTariffCutoverCheckpoints();
      const expectedCheckedQuotes = inventory.length;
      assert.deepEqual(Object.fromEntries(['ordinary', 'new_offer', 'local_workflow', 'input_stress'].map(kind =>
        [kind, inventory.filter(row => row.kind === kind).length])), { ordinary: 6247, new_offer: 67, local_workflow: 0, input_stress: 0 },
      'Review the non-official-list inventory before running the monetary replay');
      assert.equal(inventory.filter(row => row.currentStatus === 'unavailable').length, 0, 'the unavailable LAS checkpoints are Seedance 2.5');
      const input = await seedInput(reduced.scenarios);
      const first = await auditReviewedCustomerTariffSeed(input);
      const audited = await auditReviewedCustomerTariffSeed({ ...input, approvedGptImage25ReferenceFloor: floorApproval(input, first.settlementGuardFailures) });
      assert.equal(audited.settlementGuardFailures.length, 0);
      t.diagnostic('Reviewed fixture seed prepared for the non-official-list engines.');
      const cells = [...audited.cells];
      const indexed = new Map(cells.map(cell => [key(cell.selector),cell]));
      const active = { status: 'loaded' as const, active: true, revision: 1, databaseCells: audited.cells, versionedCells: [] };
      const checkpoints: CustomerTariffCutoverRelease['checkpoints'] = [];
      const approvedChanges: CutoverApprovedChange[] = [];
      for (const point of inventory) {
        const continuous = continuousInputTariffSelector(point.scenario.selector);
        const cell = indexed.get(key(point.scenario.selector)) ?? (continuous ? indexed.get(key(continuous)) : undefined);
        assert.ok(cell, point.key);
        const snapshot = await computeCanonicalBillingSnapshot(point.scenario.context, { pricingPolicy: { loadOverrides: async () => policy },
          loadCustomerTariffState: async () => ({ ...active, databaseCells: [cell] }) });
        const beforeCents = point.kind === 'local_workflow' || point.kind === 'new_offer' ? null : (await quoteLegacy(point.scenario)).totalCents;
        checkpoints.push({ key: point.key,beforeCents,customerCents: snapshot.totalCents,currency: snapshot.currency });
        if (beforeCents !== null && beforeCents !== snapshot.totalCents) {
          assert.ok(['gpt-image-2-5-flare','gpt-image-2-5-sunburst'].includes(point.scenario.modelId), point.key);
          approvedChanges.push({ key: point.key,beforeCents,customerCents: snapshot.totalCents,reason: 'gpt_reference_floor' });
        }
      }
      assert.equal(approvedChanges.length, first.settlementGuardFailures.length);
      const body = { schemaVersion: 1 as const, evidenceKind: 'isolated_operation_rehearsal' as const, activationReady: false as const,
        capturedAt: new Date().toISOString(), bindings, deployedSource: { codeRevision: bindings.codeRevision,deploymentId: 'fixture' },
        cells: cells.map(({ id,selector,price,currency }) => ({ id,selector,price,currency })),checkpoints,approvedChanges };
      const release = { ...body,fingerprint: cutoverDigest(body) };
      t.diagnostic(`All ${expectedCheckedQuotes} non-official-list checkpoint amounts prepared.`);
      const cutover = <T>(work: Parameters<typeof withDbTransaction<T>>[0]) => withPricingCutoverTransaction({ DATABASE_URL: db.databaseUrl },'rehearsal',e => work(e,undefined as never));
      const run = (candidate = release, fingerprint = candidate.fingerprint) => cutover(e => activateInitialCustomerTariffGrid(e,
        { release: candidate,fingerprint,target,actorId: actor,mode: 'rehearsal' }));
      await assert.rejects(run(release,'stale'), /stale/i);
      const altered = structuredClone(release);
      altered.cells[0].price = { kind: 'fixed',customerCents: 1 };
      await assert.rejects(run(altered), /integrity/i);
      const wrongQuote = structuredClone(release);
      const pika = wrongQuote.checkpoints.find(row => row.key.startsWith('ordinary:engineId=pika-text-to-video'))!;
      pika.customerCents++;
      wrongQuote.approvedChanges.push({ key: pika.key,beforeCents: pika.beforeCents!,customerCents: pika.customerCents,reason: 'seedance_proportional' });
      const { fingerprint: _wrong, ...wrongBody } = wrongQuote;
      wrongQuote.fingerprint = cutoverDigest(wrongBody);
      await assert.rejects(run(wrongQuote), /outside.*policy/i);
      await db.pool.query("UPDATE app_billing_products SET unit_price_cents=9");
      await assert.rejects(run(), /commercial.*changed/i);
      await db.pool.query("UPDATE app_billing_products SET unit_price_cents=8");
      const readerMismatch = structuredClone(release);
      const pikaCell = readerMismatch.cells.find(row => row.selector.engineId === 'pika-text-to-video')!;
      assert.equal(pikaCell.price.kind,'fixed');
      if (pikaCell.price.kind !== 'fixed') throw new Error('Fixture Pika must be fixed');
      pikaCell.price.customerCents++;
      const { fingerprint: _reader, ...readerBody } = readerMismatch;
      readerMismatch.fingerprint = cutoverDigest(readerBody);
      await assert.rejects(run(readerMismatch), /canonical.*quote.*changed/i);
      assert.equal((await db.pool.query('SELECT count(*)::int AS n FROM app_customer_tariff_cells')).rows[0].n,0);
      await assert.rejects(cutover(async e => { await activateInitialCustomerTariffGrid(e,{ release,fingerprint: release.fingerprint,target,actorId: actor,mode: 'rehearsal' });
        throw new Error('FAIL_AFTER_FULL_ACTIVATION'); }), /FAIL_AFTER_FULL_ACTIVATION/);
      assert.deepEqual((await db.pool.query('SELECT revision,active FROM app_customer_tariff_state')).rows,[{ revision: '0',active: false }]);
      assert.equal((await db.pool.query('SELECT count(*)::int AS n FROM app_customer_tariff_cutover_events')).rows[0].n,0);
      let tariffReads = 0;
      const started = performance.now();
      const applied = await cutover(async executor => {
        const query = executor.query.bind(executor);
        executor.query = (sql, params) => {
          if (/FROM app_customer_tariff_(state|cells|cell_versions)\b/.test(sql)) tariffReads++;
          return query(sql, params);
        };
        return activateInitialCustomerTariffGrid(executor, { release, fingerprint: release.fingerprint, target, actorId: actor, mode: 'rehearsal' });
      });
      assert.ok(tariffReads <= 8, `Full canonical acceptance made ${tariffReads} tariff SQL reads`);
      t.diagnostic(`${expectedCheckedQuotes}-checkpoint acceptance: ${tariffReads} tariff SQL reads; ${Math.round(performance.now() - started)} ms.`);
      assert.equal(applied.revision,1);
      assert.equal(applied.checkedQuotes,expectedCheckedQuotes);
      // No Seedance engine remains, so no legacy fixed Seedance row is archived and no LAS checkpoint is unavailable.
      assert.deepEqual({ candidateCells: applied.candidateCells, archivedLegacyCells: applied.archivedLegacyCells, unavailableQuotes: applied.unavailableQuotes },
        { candidateCells: cells.length, archivedLegacyCells: 0, unavailableQuotes: 0 });
      assert.equal(applied.candidateCells, 6226, 'Review the candidate grid size (continuous classes collapse 6314 scenarios)');
      t.diagnostic('Actual reader activation accepted before commit.');
      await assert.rejects(run(), /initial.*empty|revision/i);
      await assert.rejects(db.pool.query('DELETE FROM app_customer_tariff_cutover_events'), /immutable/i);
      await db.pool.query('UPDATE app_customer_tariff_state SET revision=2');
      const rollback = () => cutover(e => rollbackInitialCustomerTariffGrid(e,{ eventId: applied.eventId,
        fingerprint: release.fingerprint,target,actorId: actor,mode: 'rehearsal' }));
      await assert.rejects(rollback(), /edited|revision/i);
      await db.pool.query('UPDATE app_customer_tariff_state SET revision=1');
      assert.equal((await rollback()).revision,2);
      assert.deepEqual((await db.pool.query('SELECT revision,active FROM app_customer_tariff_state')).rows,[{ revision: '2',active: false }]);
      assert.equal((await db.pool.query('SELECT count(*)::int AS n FROM app_customer_tariff_cells')).rows[0].n,applied.candidateCells);
      const preserved = (await db.pool.query("SELECT certificate FROM app_customer_tariff_cutover_events WHERE operation='activate'")).rows[0].certificate;
      assert.deepEqual(preserved.cells, release.cells);
      assert.equal(preserved.checkpoints.length,expectedCheckedQuotes);
      assert.equal((await db.pool.query('SELECT count(*)::int AS n FROM app_customer_tariff_cutover_events')).rows[0].n,2);
      assert.deepEqual((await db.pool.query('SELECT snapshot FROM historical_paid_snapshots')).rows,[{ snapshot: { totalCents: 13,rule: 'old' } }]);
      assert.equal((await db.pool.query('SELECT unit_price_cents FROM app_billing_products')).rows[0].unit_price_cents,8);
      await assert.rejects(rollback(), /edited|revision/i);
      return release;
    }
  } finally {
    await db.cleanup();
    Object.assign(ENV,routes);
    for (const [name,value] of Object.entries(previous)) { if (value === undefined) delete process.env[name]; else process.env[name] = value; }
  }
}));
