// Mechanism test: runs on the unfiltered upstream catalog (the Keyvo model allowlist hides this fixture engine).
import './helpers/keyvo-unfiltered-catalog';
import assert from 'node:assert/strict';
import test, { afterEach, beforeEach } from 'node:test';
import { collectSellableManualTariffCoverage } from '../frontend/lib/pricing-audit/manual-tariff-coverage';
import { collectCustomerTariffCutoverCheckpoints } from '../frontend/server/pricing/customer-tariff-cutover-evidence';
import { KEYVO_UNSERVED_VIDEO_OPERATIONS, videoOperationTariffContexts } from '../frontend/lib/pricing-audit/video-operation-tariff-inventory';

// The catalogue projection is frozen unfiltered at import (fixture engines such as Veo, Luma and Flux are hidden by the
// owner allowlist), but the Keyvo rule that drops the Fal-only H3-Max Recast/Relight operations is read per call. Each
// test therefore re-enables that single rule while the catalogue stays unfiltered.
beforeEach(() => { delete process.env.KEYVO_MODEL_VISIBILITY; });
afterEach(() => { process.env.KEYVO_MODEL_VISIBILITY = 'off'; });

test('operation inventory distinguishes omitted scope from explicit empty model or mode', () => {
  const full = videoOperationTariffContexts();
  // 77 upstream operation cells minus MiniMax-H3-Max's 6 Recast/Relight cells: H3-Max is app-published on Keyvo
  // (MiniMax's own API), but Recast/Relight run only on Fal, so they are explicitly unsold with a documented reason.
  assert.equal(full.length, 77 - 6);
  assert.deepEqual(Object.keys(KEYVO_UNSERVED_VIDEO_OPERATIONS).sort(), ['h3-recast', 'h3-relight']);
  for (const reason of Object.values(KEYVO_UNSERVED_VIDEO_OPERATIONS)) assert.match(reason!, /only on Fal/);
  assert.equal(full.some(context => context.engine.id === 'minimax-h3-max'), false);
  assert.deepEqual(videoOperationTariffContexts({ modelId: 'minimax-h3-max' }), []);
  assert.deepEqual(videoOperationTariffContexts({ modelId: undefined, mode: undefined }), full);
  for (const scope of [{ modelId: '' }, { modelId: '', mode: 'v2v' }, { mode: '' },
    { modelId: 'flux-3', mode: '' }, { modelId: 'flux-3-draft', mode: '' },
    { modelId: 'missing-model' }, { modelId: 'flux-3', mode: 'missing-mode' }]) {
    assert.deepEqual(videoOperationTariffContexts(scope), [], JSON.stringify(scope));
  }
  for (const modelId of new Set(full.map(context => context.engine.id))) {
    const model = full.filter(context => context.engine.id === modelId);
    assert.deepEqual(videoOperationTariffContexts({ modelId }), model);
    for (const mode of new Set(model.map(context => context.mode))) {
      assert.deepEqual(videoOperationTariffContexts({ modelId, mode }), model.filter(context => context.mode === mode));
    }
  }
});

test('all historical checkpoints and independently enumerated additive operation families are disjoint', () => {
  const coverage = collectSellableManualTariffCoverage();
  const counts: Record<string, number> = {};
  for (const row of coverage.scenarios) if (row.selector.operation) counts[row.selector.operation] = (counts[row.selector.operation] ?? 0) + 1;
  // H3-Max Recast (2) and Relight (4) are absent: Fal-only operations Keyvo does not sell (KEYVO_UNSERVED_VIDEO_OPERATIONS).
  assert.deepEqual(counts, { 'kling-reference': 13, 'kling-edit': 3,
    'luma-extend': 3, 'flux-keyframes': 48, 'flux-fast-edit': 1, 'flux-draft-enhance': 1, 'ltx23-reframe': 2 });
  const cases = collectCustomerTariffCutoverCheckpoints();
  const novemberModels = ['kling-v4-flash', 'gpt-image-2-6-flare', 'gpt-image-2-6-sunburst'];
  // Keyvo provider work (2026-11-11/12), itemized in customer-tariff-cutover-evidence.test.ts: retired HappyHorse 1.0 and
  // Seedream 5.0 Lite, H3-Max's 132 Fal cells replaced by 3564 official MiniMax cells, H3 768P/2K only with 4 s, new
  // Hailuo 2.3 / Fast and Seedream 5.0 Flash cells.
  // Keyvo official list prices (2026-11-13): Wan 2.6 / Kling 2.5 Turbo / Kling 2.6 Pro offline, Kling 3 voice-control
  // variants share the audio-on identity, Hailuo 02 512P text-to-video unsold (customer-tariff-cutover-evidence.test.ts).
  const keyvoProviderDelta = -104 - 90 - 132 + 3564 - (528 - 288) + 6 + 3 + 2 - 84;
  assert.equal(cases.filter(row => row.kind === 'ordinary' && !['kling-v4', 'nano-banana-2-1', ...novemberModels].includes(row.scenario.modelId)).length, 20286 + 8 + keyvoProviderDelta,
    'Keyvo adds 8 ordinary Qwen image cutover checkpoints to the upstream inventory');
  assert.deepEqual(novemberModels.map(id => cases.filter(row => row.scenario.modelId === id).length), [72, 1020, 1020]);
  assert.equal(cases.filter(row => row.scenario.modelId === 'kling-v4').length, 280);
  assert.equal(cases.filter(row => row.scenario.modelId === 'nano-banana-2-1').length, 6,
    'new native fixed image cells remain separate from the old video inventory');
  assert.equal(cases.filter(row => row.kind === 'local_workflow').length, 324);
  assert.equal(cases.filter(row => row.kind === 'input_stress').length, 6372);
  assert.equal(cases.filter(row => String(row.kind) === 'new_offer').length, 89 - 6, 'H3-Max Recast/Relight offers are not sold');
  assert.equal(cases.length, 27071 + 8 + 280 + 6 + 72 + 1020 + 1020 + keyvoProviderDelta - 6);
  assert.equal(new Set(cases.map(row => row.key)).size, cases.length);
  const veo = coverage.scenarios.filter(row => row.modelId === 'veo-3-1' && row.selector.mode === 'i2v');
  assert.equal(veo.length, 18);
  assert.deepEqual(new Set(veo.map(row => `${row.selector.durationSec}:${row.selector.resolution}:${row.selector.audio}`)),
    new Set([4,6,8].flatMap(s => ['720p','1080p','4k'].flatMap(r => ['false','true'].map(a => `${s}:${r}:${a}`)))));
  assert.ok(!coverage.scenarios.some(row => ['h3-extend','h3-insert','h3-reframe'].includes(row.selector.operation)));
});

test('exact additive selectors and default identities match the separately enumerated commercial inventory', async () => {
  const { videoOperationInitializationScenarios } = await import('../frontend/server/pricing/video-operation-tariffs');
  const { continuousInputTariffSelector } = await import('../frontend/src/lib/pricing-manual-scenario');
  const { buildManualTariffCoverageScenario } = await import('../frontend/lib/pricing-audit/manual-tariff-coverage');
  const expected: Record<string,string>[] = [];
  const add=(engineId:string,mode:string,operation:string,endpoint:string,resolutions:string[],durations:(number|string)[])=>{
    for(const resolution of resolutions)for(const duration of durations)expected.push({engineId,mode,operation,endpoint,
      transport:operation==='luma-extend'?'luma_agents_direct':'fal',resolution,durationSec:String(duration)});
  };
  add('kling-o3-4k','v2v','kling-reference','fal-ai/kling-video/o3/4k/video-to-video/reference',['4k'],Array.from({length:13},(_,i)=>i+3));
  for(const [tier,resolution] of [['standard','720p'],['pro','1080p'],['4k','4k']])
    add(`kling-o3-${tier}`,'v2v','kling-edit',`fal-ai/kling-video/o3/${tier}/video-to-video/edit`,[resolution],['continuous']);
  // Upstream also enumerates H3-Max Recast (768P/1080P) and Relight (480P/768P/1080P/2K); Keyvo does not sell these
  // Fal-only operations (KEYVO_UNSERVED_VIDEO_OPERATIONS).
  add('luma-ray-3-2','extend','luma-extend','ray-3.2/video/generation-anchor',['540p','720p','1080p'],[5]);
  for(const [engine,resolutions,suffix] of [['flux-3',['720p','1080p'],''],['flux-3-draft',['720p'],'/draft']] as const)
    add(engine,'ref2v','flux-keyframes',`blackforestlabs/flux-3/keyframes-to-video${suffix}`,[...resolutions],Array.from({length:16},(_,i)=>i+5));
  add('flux-3','v2v','flux-fast-edit','blackforestlabs/flux-3/edit-video',['720p'],['continuous']);
  add('flux-3-draft','v2v','flux-draft-enhance','blackforestlabs/flux-3/draft-enhance',['1080p'],['continuous']);
  add('ltx-2-3','reframe','ltx23-reframe','fal-ai/ltx-2.3/reframe',['720p','1080p'],['continuous']);
  for(const duration of [4,6])for(const resolution of ['720p','1080p','4k'])for(const audio of ['false','true'])
    expected.push({engineId:'veo-3-1',mode:'i2v',resolution,audio,durationSec:String(duration)});
  const key=(value:Record<string,string>)=>JSON.stringify(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)));
  const scenarios=videoOperationInitializationScenarios();
  assert.deepEqual(new Set(scenarios.map(s=>key(continuousInputTariffSelector(s.selector)??s.selector))),new Set(expected.map(key)));
  for(const scenario of scenarios.filter(s=>['kling-reference','luma-extend','ltx23-reframe','flux-keyframes'].includes(s.context.operation??''))) {
    assert.deepEqual(buildManualTariffCoverageScenario({...scenario.context,operation:undefined},'default').selector,scenario.selector);
  }
  for(const engine of ['kling-o3-standard','kling-o3-pro']) {
    const historical=collectSellableManualTariffCoverage({modelId:engine,mode:'v2v'}).scenarios.filter(s=>!s.context.operation);
    assert.ok(historical.length>0);
    for(const scenario of historical)assert.deepEqual(buildManualTariffCoverageScenario({...scenario.context,operation:'kling-reference'},'explicit').selector,scenario.selector);
  }
  // H3-Max sells creation on MiniMax's own API (5-15 s, 480P/768P) and no source operation.
  const h3Max=collectSellableManualTariffCoverage({modelId:'minimax-h3-max'});
  assert.equal(h3Max.scenarios.some(s=>s.context.mode==='v2v'||s.selector.operation),false);
  const maxCreation=h3Max.scenarios.filter(s=>['t2v','i2v'].includes(s.context.mode!));
  assert.deepEqual(new Set(maxCreation.map(s=>s.context.durationSec)),new Set(Array.from({length:11},(_,i)=>i+5)));
  assert.deepEqual(new Set(h3Max.scenarios.map(s=>s.selector.resolution)),new Set(['480P','768P']));
  // H3 creation now spans MiniMax's own 4-15 s range.
  const creation=collectSellableManualTariffCoverage({modelId:'minimax-h3'}).scenarios.filter(s=>['t2v','i2v'].includes(s.context.mode!));
  assert.deepEqual(new Set(creation.map(s=>s.context.durationSec)),new Set(Array.from({length:12},(_,i)=>i+4)));
});
