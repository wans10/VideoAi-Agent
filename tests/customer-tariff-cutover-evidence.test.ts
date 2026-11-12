import assert from 'node:assert/strict';
import test from 'node:test';
import { collectCustomerTariffCutoverCheckpoints, cutoverDigest, assertCustomerTariffCutoverRelease,
  projectInitialCustomerTariffCutoverCells,type CustomerTariffCutoverRelease } from '../frontend/server/pricing/customer-tariff-cutover-evidence';
import { collectSellableManualTariffCoverage } from '../frontend/lib/pricing-audit/manual-tariff-coverage';
import { ENV } from '../frontend/src/lib/env';

test('cutover derives all ordinary, workflow and real input duration checkpoints with unique identities', () => {
  const cases = collectCustomerTariffCutoverCheckpoints();
  const novemberModels = ['kling-v4-flash', 'gpt-image-2-6-flare', 'gpt-image-2-6-sunburst'];
  // Keyvo provider work (2026-11-11): HappyHorse 1.0 (104) and Seedream 5.0 Lite (90) retired, H3 528 -> 288 cells
  // (480P/4K removed, 4 s added), new Hailuo 2.3 (6), Hailuo 2.3 Fast (3) and Seedream 5.0 Flash (2) cells.
  // MiniMax-H3-Max (2026-11-12, MiniMax's own API): its 132 upstream Fal cells (3 resolutions; ref2v sampled at 4096/4097
  // reference tokens) become 3564 official cells: t2v 22 + i2v 22 (5-15 s x 480P/768P) + ref2v 3520 (x 0-9 reference
  // images x 0-15 billed reference-video seconds). Its 6 Recast/Relight new-offer cells stay unsold (Fal-only).
  const h3MaxOfficialCells = 22 + 22 + 11 * 2 * 10 * 16;
  const keyvoProviderDelta = -104 - 90 - 132 + h3MaxOfficialCells - (528 - 288) + 6 + 3 + 2;
  const keyvoProviderNewOfferDelta = -6;
  // Keyvo official list prices (2026-11-13): Wan 2.6 (16), Kling 2.5 Turbo (6) and Kling 2.6 Pro (8) went offline; Kling 3
  // Standard / Pro lost their 26 voice-control variants each (no official surcharge, so they share the audio-on identity);
  // Hailuo 02 512P text-to-video (2) is not sold by MiniMax.
  const keyvoOfficialListDelta = -16 - 6 - 8 - 2 * 26 - 2;
  assert.equal(keyvoOfficialListDelta, -84);
  assert.equal(h3MaxOfficialCells, 3564);
  assert.equal(keyvoProviderDelta, 3009);
  for (const [modelId, count] of [['happy-horse-1-0', 0], ['seedream', 0], ['minimax-h3-max', 3564], ['minimax-h3', 288],
    ['minimax-hailuo-2-3', 6], ['minimax-hailuo-2-3-fast', 3], ['seedream-5-0-flash', 2], ['wan-2-6', 0], ['kling-2-5-turbo', 0],
    ['kling-2-6-pro', 0], ['kling-3-standard', 52], ['kling-3-pro', 52], ['minimax-hailuo-02-text', 6]] as const) {
    assert.equal(cases.filter(row => row.scenario.modelId === modelId).length, count, modelId);
  }
  assert.equal(cases.filter(row => row.kind === 'ordinary' && !['flux-3-max','kling-v4','nano-banana-2-1',...novemberModels].includes(row.scenario.modelId)).length, 20166 + keyvoProviderDelta + keyvoOfficialListDelta);
  assert.deepEqual(novemberModels.map(id => cases.filter(row => row.scenario.modelId === id).length), [72, 1020, 1020]);
  assert.ok(cases.filter(row => novemberModels.includes(row.scenario.modelId)).every(row => row.kind === 'ordinary'));
  const novemberDelta = 72 + 1020 + 1020;
  assert.equal(cases.filter(row => row.scenario.modelId === 'flux-3-max').length, 128);
  assert.equal(cases.filter(row => row.scenario.modelId === 'kling-v4').length, 280);
  const nano = cases.filter(row => row.scenario.modelId === 'nano-banana-2-1');
  assert.equal(nano.length, 6, 'six new fixed-price cells are a genuine financial delta');
  assert.deepEqual(new Set(nano.map(row => row.scenario.selector.mode)), new Set(['t2i', 'i2i']));
  assert.deepEqual(new Set(nano.map(row => row.scenario.selector.resolution)), new Set(['1K', '2K', '4K']));
  assert.equal(cases.filter(row => row.kind === 'ordinary').length, 20286 + 8 + 280 + 6 + novemberDelta + keyvoProviderDelta + keyvoOfficialListDelta);
  assert.equal(cases.filter(row => row.kind === 'local_workflow').length, 324);
  assert.equal(cases.filter(row => row.kind === 'input_stress').length, 6372);
  assert.equal(cases.filter(row => row.kind === 'new_offer').length, 89 + keyvoProviderNewOfferDelta);
  assert.equal(cases.filter(row => row.kind !== 'new_offer').length, 26982 + 8 + 280 + 6 + novemberDelta + keyvoProviderDelta + keyvoOfficialListDelta);
  assert.equal(cases.length, 27071 + 8 + 280 + 6 + novemberDelta + keyvoProviderDelta + keyvoProviderNewOfferDelta + keyvoOfficialListDelta);
  assert.equal(new Set(cases.map(row => row.key)).size, cases.length);
  const lumaModify = cases.filter(row => row.kind === 'ordinary' && row.scenario.modelId === 'luma-ray-3-2' && row.scenario.context.mode === 'v2v');
  assert.deepEqual([...new Set(lumaModify.map(row => row.scenario.context.durationSec))].sort((a, b) => a - b),
    Array.from({ length: 14 }, (_, index) => index + 5));
  assert.equal(cases.filter(row => row.currentStatus === 'unavailable').length, 486);
  assert.ok(cases.filter(row => row.currentStatus === 'unavailable').every(row => row.scenario.selector.engineId === 'seedance-2-5'
    && row.scenario.selector.mode === 'v2v' && row.scenario.selector.resolution === '1080p'));
  assert.ok(cases.some(row => row.kind === 'input_stress' && row.scenario.context.inputVideoDurationSec === 30));
});

test('transport coverage keeps every historical checkpoint and admits 1080p only for ModelArk normal Edit', () => {
  const previous = ENV.SEEDANCE_2_5_EDIT_TRANSPORT;
  try {
    ENV.SEEDANCE_2_5_EDIT_TRANSPORT = 'las';
    const las = collectCustomerTariffCutoverCheckpoints();
    assert.ok(collectSellableManualTariffCoverage({ modelId: 'seedance-2-5', mode: 'v2v' }).scenarios
      .every(s => s.context.resolution !== '1080p'));
    ENV.SEEDANCE_2_5_EDIT_TRANSPORT = 'modelark';
    const modelark = collectCustomerTariffCutoverCheckpoints();
    assert.deepEqual(modelark.map(row => row.key).sort(), las.map(row => row.key).sort());
    assert.equal(modelark.filter(row => row.currentStatus === 'unavailable').length, 0);
    assert.ok(collectSellableManualTariffCoverage({ modelId: 'seedance-2-5', mode: 'v2v' }).scenarios
      .some(s => s.context.resolution === '1080p'));
    assert.ok(modelark.filter(row => row.kind === 'local_workflow').every(row => row.scenario.context.mode === 't2v'),
      'The historical initializer must not author independent multimodal stage prices.');
  } finally {
    ENV.SEEDANCE_2_5_EDIT_TRANSPORT = previous;
  }
});

test('initial projection archives obsolete no-duration Seedance staging and refuses unrelated unused prices', () => {
  const cases = collectCustomerTariffCutoverCheckpoints();
  const pika = cases.find(row => row.scenario.modelId === 'pika-text-to-video')!.scenario.selector;
  const video = cases.find(row => row.scenario.modelId === 'seedance-2-0-mini' && row.scenario.selector.billingInputType === 'video_input')!.scenario.selector;
  const { inputVideoDurationSec: _duration,...old } = video;
  const rows: CustomerTariffCutoverRelease['cells'] = [
    { id: 'current',selector: pika,price: { kind: 'fixed',customerCents: 26 },currency: 'USD' },
    { id: 'obsolete',selector: old,price: { kind: 'fixed',customerCents: 57 },currency: 'USD' },
  ];
  const result = projectInitialCustomerTariffCutoverCells(rows);
  assert.deepEqual(result.cells,[rows[0]]);
  assert.deepEqual(result.archivedLegacyCells,[rows[1]]);
  assert.deepEqual(rows.map(row => row.id),['current','obsolete']);
  assert.throws(() => projectInitialCustomerTariffCutoverCells([{ ...rows[0],selector: { engineId: 'unknown' } }]), /unknown unused/i);
});

test('a fingerprint of a reduced inventory, expired capture or local provenance cannot certify production', t => {
  const capturedAt = Date.now();
  t.mock.timers.enable({ apis: ['Date'], now: capturedAt });
  const cases = collectCustomerTariffCutoverCheckpoints();
  const body = { schemaVersion: 1, evidenceKind: 'isolated_operation_rehearsal', activationReady: false,
    capturedAt: new Date().toISOString(), bindings: { databaseIdentity: 'a'.repeat(64), commercialHash: 'b'.repeat(64),
      codeRevision: 'c'.repeat(40), registryHash: 'd'.repeat(64), factualEnvironmentHash: 'e'.repeat(64) },
    deployedSource: { codeRevision: 'f'.repeat(40), deploymentId: 'local-fixture' },
    cells: [], checkpoints: cases.slice(0, 1).map(row => ({ key: row.key, beforeCents: 30, customerCents: 31, currency: 'USD' })),
    approvedChanges: [] };
  const release = { ...body, fingerprint: cutoverDigest(body) } as CustomerTariffCutoverRelease;
  assert.throws(() => assertCustomerTariffCutoverRelease(release, release.fingerprint, 'rehearsal'), /complete.*coverage/i);
  t.mock.timers.tick(16 * 60_000);
  assert.throws(() => assertCustomerTariffCutoverRelease(release, release.fingerprint, 'rehearsal'), /capture expired/i);
  t.mock.timers.setTime(capturedAt);
  assert.throws(() => assertCustomerTariffCutoverRelease(release, release.fingerprint, 'rehearsal'), /complete.*coverage/i);
  assert.throws(() => assertCustomerTariffCutoverRelease(release, release.fingerprint, 'production'), /production.*provenance/i);
});
