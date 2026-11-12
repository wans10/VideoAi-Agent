import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { validateModelRegistryDocument } from '../frontend/config/model-registry-validation.ts';
import { buildBytePlusSeedreamPayload } from '../frontend/src/server/images/byteplus-seedream-payload.ts';
import {
  BYTEPLUS_SEEDREAM_DEFAULT_BASE_URL,
  BYTEPLUS_SEEDREAM_FLASH_DEFAULT_MODEL_ID,
  BYTEPLUS_SEEDREAM_PRO_DEFAULT_MODEL_ID,
} from '../frontend/src/server/images/byteplus-seedream-constants.ts';
import { quoteSeedreamListCost, seedreamListModelForEngine } from '../frontend/server/byteplus-list-tariff.ts';
import { DEFAULT_IMAGE_WORKSPACE_ENGINE_ID } from '../frontend/app/(core)/(workspace)/app/image/_lib/image-workspace-engine-options.ts';
import { isSeedreamEngineId } from '../frontend/lib/image/seedream.ts';

const FLASH = 'seedream-5-0-flash';

function registryEntry(id: string) {
  const registry = JSON.parse(readFileSync('frontend/config/model-registry.json', 'utf8'));
  validateModelRegistryDocument(registry);
  const entry = registry.models.find((model: { id: string }) => model.id === id);
  assert.ok(entry, `${id} registry entry`);
  return entry;
}

test('Seedream 5.0 Lite is retired to Seedream 5.0 Pro on every surface', () => {
  const lite = registryEntry('seedream');
  assert.equal(lite.lifecycle, 'retired');
  assert.equal(lite.replacement, 'seedream-5-0-pro');
  assert.equal(lite.label, 'Seedream 5.0 Lite');
  assert.equal(lite.successorId, null);
  const { publication } = lite;
  assert.deepEqual(
    [publication.model.published, publication.model.indexable, publication.examples.published,
      publication.compare.published, publication.app.published, publication.pricing.published,
      publication.sitemap.published],
    [false, false, false, false, false, false, false],
  );
  assert.equal(publication.app.discoveryRank, undefined);
  assert.equal(publication.pricing.featuredScenario, undefined);
  assert.notEqual(DEFAULT_IMAGE_WORKSPACE_ENGINE_ID, 'seedream');
});

test('Seedream 5.0 Flash is a current app and pricing model without a model page', () => {
  const flash = registryEntry(FLASH);
  assert.equal(flash.lifecycle, 'current');
  assert.equal(flash.family, 'seedream');
  assert.equal(flash.category, 'image');
  assert.equal(flash.publication.app.published, true);
  assert.equal(flash.publication.app.variantLabel, '5.0 Flash');
  assert.equal(flash.publication.pricing.published, true);
  assert.equal(flash.publication.model.published, false);
  assert.equal(flash.publication.sitemap.published, false);
  assert.equal(DEFAULT_IMAGE_WORKSPACE_ENGINE_ID, FLASH);
});

// Engine materialization needs the regenerated runtime projection (pnpm model:registry:generate).
test('Seedream 5.0 Flash engine routes directly to Volcengine Ark as a single-image model', async () => {
  const { listFalEngines } = await import('../frontend/src/config/falEngines.ts');
  const { isBytePlusSeedreamEngine } = await import('../frontend/src/server/images/byteplus-seedream-policy.ts');
  const entry = listFalEngines().find((item) => item.id === FLASH);
  assert.ok(entry, 'flash engine is registered');
  assert.equal(entry.engine.providerMeta?.provider, 'byteplus_modelark');
  assert.equal(entry.engine.providerMeta?.modelSlug, BYTEPLUS_SEEDREAM_FLASH_DEFAULT_MODEL_ID);
  assert.equal(BYTEPLUS_SEEDREAM_FLASH_DEFAULT_MODEL_ID, 'doubao-seedream-5-0-flash-260915');
  assert.deepEqual(entry.engine.resolutions, ['2K']);
  assert.equal(entry.engine.inputSchema?.optional?.find((field) => field.id === 'num_images')?.max, 1);
  assert.equal(entry.engine.pricingDetails?.flatCents?.default, 2);
  assert.ok(isBytePlusSeedreamEngine(entry.engine));
  assert.ok(isSeedreamEngineId(FLASH));
  // Mainland defaults; production overrides through BYTEPLUS_ARK_* env values.
  assert.equal(BYTEPLUS_SEEDREAM_DEFAULT_BASE_URL, 'https://ark.cn-beijing.volces.com/api/v3');
  assert.equal(BYTEPLUS_SEEDREAM_PRO_DEFAULT_MODEL_ID, 'doubao-seedream-5-0-pro-260628');
  const pro = listFalEngines().find((item) => item.id === 'seedream-5-0-pro');
  assert.equal(pro?.engine.providerMeta?.modelSlug, BYTEPLUS_SEEDREAM_PRO_DEFAULT_MODEL_ID);
});

test('Seedream 5.0 Flash payload stays single-image and rejects image sets before any call', () => {
  const payload = buildBytePlusSeedreamPayload({
    modelId: BYTEPLUS_SEEDREAM_FLASH_DEFAULT_MODEL_ID,
    prompt: 'Clean product reference image',
    mode: 'i2i',
    imageUrls: ['https://cdn.example.com/a.png'],
    numImages: 1,
    size: '2K',
    aspectRatio: '16:9',
    responseFormat: 'url',
  });
  assert.equal(payload.model, 'doubao-seedream-5-0-flash-260915');
  assert.equal(payload.size, '2848x1600');
  assert.equal(payload.stream, undefined);
  assert.equal(payload.sequential_image_generation, undefined);
  assert.equal(payload.watermark, false);
  assert.throws(
    () => buildBytePlusSeedreamPayload({
      modelId: BYTEPLUS_SEEDREAM_FLASH_DEFAULT_MODEL_ID, prompt: 'x', mode: 't2i', numImages: 2,
      size: '2K', responseFormat: 'url',
    }),
    (error: Error & { code?: string; status?: number }) =>
      error.code === 'IMAGE_COUNT_LIMIT' && error.status === 400 && /Seedream 5.0 Flash/.test(error.message),
  );
});

test('Seedream 5.0 Flash PROVISIONAL list cost is 0.12 CNY (0.015 USD) per image, inputs free', () => {
  assert.equal(seedreamListModelForEngine(FLASH), 'flash');
  assert.equal(seedreamListModelForEngine('seedream'), 'lite');
  assert.equal(seedreamListModelForEngine('seedream-5-0-pro'), 'pro');
  assert.equal(seedreamListModelForEngine('seedance-2-0'), null);
  const quote = quoteSeedreamListCost({ model: 'flash', outputPixels: [2848 * 1600], inputImages: 3 });
  assert.equal(quote.totalUsd, 0.015);
  assert.equal(quote.inputUsd, 0);
  assert.match(quote.source.url, /ark\.volcengine\.com/);
  // Existing models keep their prices.
  assert.equal(quoteSeedreamListCost({ model: 'lite', outputPixels: [1], inputImages: 0 }).totalUsd, 0.035);
  assert.equal(quoteSeedreamListCost({ model: 'pro', outputPixels: [2848 * 1600], inputImages: 2 }).totalUsd, 0.093);
});
