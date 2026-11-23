import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import allowlist from '../frontend/config/keyvo-model-allowlist.json' with { type: 'json' };
import { buildGenerateRequestOptions } from '../frontend/app/api/generate/_lib/request-options.ts';
import { resolveMediaAwarePreflight } from '../frontend/app/api/preflight/_lib/media-aware-preflight.ts';
import { isBytePlusInputVideoPricingModel } from '../frontend/server/byteplus-accounting.ts';
import { getReadOnlyConfiguredEngine } from '../frontend/src/server/agent-api/read-only-engine-catalog.ts';
import {
  checkRequestedResolutionSupported,
  listSupportedRequestResolutions,
  resolveRuntimeResolutionPolicy,
} from '../frontend/src/server/video-generation/runtime-resolution.ts';

// Production bug: /api/preflight quoted an unsupported resolution at the default resolution's price (kling-v4 + 4k = the
// 720p price). Every explicit resolution outside an engine's supported list must now be refused by preflight and by the
// generate option validator (which runs before any wallet reservation), for every offered video engine and mode.
const CANDIDATES = ['4k', '1080p', '480p', '720p'];
// minimax-h3-max v2v needs an explicit operation and is refused for that first; still a refusal before any price.
const REFUSAL = /^(RESOLUTION_UNSUPPORTED|BYTEPLUS_RESOLUTION_UNSUPPORTED|OPERATION_INVALID)$/;
const IMAGE_MODES = new Set(['t2i', 'i2i']);

async function offeredVideoEngines() {
  const engines = [];
  for (const id of allowlist.offeredEngineIds) {
    const engine = await getReadOnlyConfiguredEngine(id);
    if (engine && engine.modes.some((mode) => !IMAGE_MODES.has(mode))) engines.push(engine);
  }
  return engines;
}

test('every offered video engine and mode refuses unsupported resolutions in preflight and generate options', async () => {
  const engines = await offeredVideoEngines();
  assert.ok(engines.length >= 10);
  let checked = 0;
  for (const engine of engines) {
    for (const mode of engine.modes.filter((entry) => !IMAGE_MODES.has(entry))) {
      if (!resolveRuntimeResolutionPolicy(engine, mode).supportsResolution) continue;
      const supported = listSupportedRequestResolutions(engine, mode);
      const unsupported = CANDIDATES.filter((value) => !supported.includes(value) && !engine.resolutions.includes(value as never));
      for (const resolution of unsupported) {
        const label = `${engine.id}/${mode}/${resolution}`;
        const preflight = await resolveMediaAwarePreflight(
          { request: { engine: engine.id, mode, durationSec: 5, resolution, aspectRatio: '16:9' } as never, viewerIsAdmin: true, userId: 'user-1' },
          { getConfiguredEngineFn: async () => engine, getConfiguredEngineIncludingHiddenFn: async () => engine },
        );
        assert.equal(preflight.ok, false, label);
        assert.match(String(preflight.error?.code), REFUSAL, label);
        const generate = buildGenerateRequestOptions({
          body: { engineId: engine.id, mode, durationSec: 5, resolution, aspectRatio: '16:9', prompt: 'p' } as never,
          engine, mode, isBytePlusV1a: isBytePlusInputVideoPricingModel(engine.id),
        });
        assert.equal(generate.ok, false, label);
        if (!generate.ok) assert.match(String(generate.body.error), /^(RESOLUTION_UNSUPPORTED|BYTEPLUS_RESOLUTION_UNSUPPORTED|ENGINE_CONSTRAINT|Invalid operation)$/, label); // kling-v4-flash's own control gate refuses first
        checked += 1;
      }
    }
  }
  assert.ok(checked > 20, `checked ${checked}`);
});

test('supported resolutions are never refused by the generic gate', async () => {
  for (const engine of await offeredVideoEngines()) {
    for (const mode of engine.modes.filter((entry) => !IMAGE_MODES.has(entry))) {
      for (const resolution of listSupportedRequestResolutions(engine, mode)) {
        assert.deepEqual(checkRequestedResolutionSupported(engine, mode, resolution), { ok: true }, `${engine.id}/${mode}/${resolution}`);
      }
    }
  }
});

test('requests without a resolution, or auto, keep the default behaviour', async () => {
  const engine = (await getReadOnlyConfiguredEngine('kling-v4'))!;
  for (const value of [undefined, '', 'auto', null]) assert.deepEqual(checkRequestedResolutionSupported(engine, 't2v', value), { ok: true });
  const quote = await resolveMediaAwarePreflight(
    { request: { engine: 'kling-v4', mode: 't2v', durationSec: 5, aspectRatio: '16:9' } as never, userId: 'user-1' },
    { getConfiguredEngineFn: async () => engine },
  );
  assert.equal(quote.ok, true);
  assert.equal(quote.total, 50); // 50 USD cents = CNY 4.00 at the Keyvo display rate of 8
});

test('kling-v4 4k is refused in Chinese instead of quoting the 720p price', async () => {
  const engine = (await getReadOnlyConfiguredEngine('kling-v4'))!;
  const result = await resolveMediaAwarePreflight(
    { request: { engine: 'kling-v4', mode: 't2v', durationSec: 5, resolution: '4k', aspectRatio: '16:9' } as never, userId: 'user-1' },
    { getConfiguredEngineFn: async () => engine },
  );
  assert.equal(result.ok, false);
  assert.equal(result.error?.code, 'RESOLUTION_UNSUPPORTED');
  assert.equal(result.error?.message, '该模型不支持所选分辨率，请选择 720p / 1080p。');
});

// Exact live CNY totals (fen) divided by the Keyvo display rate of 8, i.e. the engine-currency cents quoted here.
const PINNED: Array<[string, number, string | undefined, number]> = [
  ['kling-v4', 5, '720p', 50], ['kling-v4', 5, '1080p', 75], ['kling-v4', 10, '720p', 100],
  ['seedance-2-5', 5, '480p', 34], ['seedance-2-5', 5, '720p', 76], ['seedance-2-5', 5, '1080p', 187], ['seedance-2-5', 5, '4k', 301],
  ['seedance-2-5-flash', 5, '480p', 22], ['seedance-2-5-flash', 5, '720p', 50],
  ['kling-3-standard', 5, undefined, 45], ['kling-v4-flash', 5, '720p', 30],
];
test('supported quotes keep their exact totals', async () => {
  for (const [id, durationSec, resolution, total] of PINNED) {
    const engine = (await getReadOnlyConfiguredEngine(id))!;
    const result = await resolveMediaAwarePreflight(
      { request: { engine: id, mode: 't2v', durationSec, ...(resolution ? { resolution } : {}), aspectRatio: '16:9' } as never, userId: 'user-1' },
      { getConfiguredEngineFn: async () => engine },
    );
    assert.equal(result.ok, true, `${id} ${resolution}: ${JSON.stringify(result.error)}`);
    assert.equal(result.total, total, `${id} ${durationSec}s ${resolution}`);
  }
});

test('the generate route validates options before any wallet reservation', () => {
  const route = readFileSync(new URL('../frontend/app/api/generate/route.ts', import.meta.url), 'utf8');
  assert.ok(route.indexOf('buildGenerateRequestOptions({') < route.indexOf('executeVideoGeneration({'));
  assert.match(readFileSync(new URL('../frontend/app/api/generate/_lib/request-options.ts', import.meta.url), 'utf8'), /checkRequestedResolutionSupported/);
});
