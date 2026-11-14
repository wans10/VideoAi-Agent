// Seedance 2.0 registry mechanism: runs on the unfiltered upstream catalog because the owner allowlist hides Seedance
// 2.0, Fast and Mini. Split out of seedance-prelaunch.test.ts, whose other checks follow the customer-facing catalogue.
import './helpers/keyvo-unfiltered-catalog';
import assert from 'node:assert/strict';
import test from 'node:test';
import { canonicalizeFalModelSlug, getFalEngineBySlug, listFalEngines } from '../frontend/src/config/falEngines.ts';

test('Seedance 2 registry centralizes provisional Fal IDs and keeps both launch surfaces aligned', () => {
  const seedance = listFalEngines().find((entry) => entry.id === 'seedance-2-0');
  const fast = listFalEngines().find((entry) => entry.id === 'seedance-2-0-fast');
  const mini = listFalEngines().find((entry) => entry.id === 'seedance-2-0-mini');

  assert.ok(seedance);
  assert.ok(fast);
  assert.ok(mini);

  assert.equal(seedance.defaultFalModelId, 'bytedance/seedance-2.0/text-to-video');
  assert.equal(seedance.engine.providerMeta?.modelSlug, 'bytedance/seedance-2.0/text-to-video');
  assert.equal(fast.defaultFalModelId, 'bytedance/seedance-2.0/fast/text-to-video');
  assert.equal(fast.engine.providerMeta?.modelSlug, 'bytedance/seedance-2.0/fast/text-to-video');
  assert.equal(seedance.engine.status, 'live');
  assert.equal(fast.engine.status, 'live');
  assert.deepEqual(seedance.engine.modes, ['t2v', 'i2v', 'ref2v', 'v2v', 'extend']);
  assert.deepEqual(fast.engine.modes, ['t2v', 'i2v', 'ref2v', 'v2v', 'extend']);
  assert.equal(seedance.engine.extend, true);
  assert.equal(fast.engine.extend, true);
  assert.equal(seedance.modes.some((mode) => mode.mode === 'ref2v'), true);
  assert.equal(fast.modes.some((mode) => mode.mode === 'ref2v'), true);
  assert.equal(seedance.modes.some((mode) => mode.mode === 'v2v'), true);
  assert.equal(seedance.modes.some((mode) => mode.mode === 'extend'), true);
  assert.equal(fast.modes.some((mode) => mode.mode === 'v2v'), true);
  assert.equal(fast.modes.some((mode) => mode.mode === 'extend'), true);
  assert.deepEqual(seedance.engine.resolutions, ['480p', '720p', '1080p', '4k']);
  assert.deepEqual(fast.engine.resolutions, ['480p', '720p']);
  assert.deepEqual(seedance.engine.aspectRatios, ['auto', '21:9', '16:9', '4:3', '1:1', '3:4', '9:16']);
  assert.deepEqual(fast.engine.aspectRatios, ['auto', '21:9', '16:9', '4:3', '1:1', '3:4', '9:16']);
  // Keyvo 2026-11-13: the token fact is the Volcengine Ark list (CNY 46/M tokens at 720p, 8 CNY/USD), sold at 80%.
  assert.equal(seedance.engine.pricingDetails?.tokenPricing?.unitPriceUsdPer1kTokens, 46 / 8 / 1000);
  assert.equal(seedance.engine.pricingDetails?.tokenPricing?.unitPriceUsdPer1kTokensByResolution?.['1080p'], 51 / 8 / 1000);
  assert.equal(seedance.engine.pricingDetails?.tokenPricing?.unitPriceUsdPer1kTokensByResolution?.['4k'], 26 / 8 / 1000);
  // Ark lists a lower rate for requests with video input (CNY 22/M for Fast).
  assert.equal(fast.engine.pricingDetails?.tokenPricing?.unitPriceUsdPer1kTokensByInputType?.video_input, 22 / 8 / 1000);
  assert.equal(fast.engine.pricingDetails?.tokenPricing?.unitPriceUsdPer1kTokens, 37 / 8 / 1000);
  assert.equal(seedance.engine.pricingDetails?.tokenPricing?.defaultAspectRatio, '16:9');
  assert.equal(fast.engine.pricingDetails?.tokenPricing?.defaultAspectRatio, '16:9');
  assert.equal(mini.defaultFalModelId, 'byteplus/dreamina-seedance-2.0-mini/text-to-video');
  assert.equal(mini.engine.providerMeta?.provider, 'byteplus_modelark');
  assert.equal(mini.engine.providerMeta?.modelSlug, 'doubao-seedance-2-0-mini-260615');
  assert.deepEqual(mini.engine.modes, ['t2v', 'i2v', 'ref2v', 'v2v', 'extend']);
  assert.deepEqual(mini.engine.resolutions, ['480p', '720p']);
  assert.deepEqual(mini.engine.fps, [24]);
  assert.equal(mini.engine.audio, true);
  assert.equal(mini.engine.pricingDetails?.tokenPricing?.unitPriceUsdPer1kTokens, 23 / 8 / 1000);
  assert.equal(mini.engine.pricingDetails?.tokenPricing?.unitPriceUsdPer1kTokensByInputType?.video_input, 14 / 8 / 1000);
  assert.equal(mini.engine.pricingDetails?.tokenPricing?.pricingSource, 'volcengine_ark_cn_beijing_list_2026_11_13');
  assert.deepEqual(Object.keys(mini.engine.pricingDetails?.tokenPricing?.dimensions ?? {}), ['480p', '720p']);

  const seedanceI2v = seedance.modes.find((mode) => mode.mode === 'i2v');
  const seedanceRef2v = seedance.modes.find((mode) => mode.mode === 'ref2v');
  const fastRef2v = fast.modes.find((mode) => mode.mode === 'ref2v');
  assert.ok(seedanceI2v);
  assert.ok(seedanceRef2v);
  assert.ok(fastRef2v);
  assert.deepEqual(seedanceI2v.ui.duration, { options: ['auto', 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], default: 'auto' });
  assert.deepEqual(seedanceI2v.ui.resolution, ['480p', '720p', '1080p', '4k']);
  assert.deepEqual(seedanceI2v.ui.aspectRatio, ['auto', '21:9', '16:9', '4:3', '1:1', '3:4', '9:16']);
  assert.deepEqual(seedanceRef2v.ui.resolution, ['480p', '720p', '1080p', '4k']);
  assert.deepEqual(fastRef2v.ui.resolution, ['480p', '720p']);
  const miniV2v = mini.modes.find((mode) => mode.mode === 'v2v');
  assert.ok(miniV2v);
  assert.deepEqual(miniV2v.ui.duration, { options: ['auto', 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], default: 5 });
  assert.deepEqual(miniV2v.ui.resolution, ['480p', '720p']);
  assert.equal(mini.modes.find((mode) => mode.mode === 't2v')?.ui.maxUploadMB, undefined);
  assert.equal(mini.modes.find((mode) => mode.mode === 'i2v')?.ui.maxUploadMB, 30);
  assert.equal(mini.modes.find((mode) => mode.mode === 'ref2v')?.ui.maxUploadMB, 200);
  assert.equal(mini.modes.find((mode) => mode.mode === 'v2v')?.ui.maxUploadMB, 200);
  assert.equal(mini.modes.find((mode) => mode.mode === 'extend')?.ui.maxUploadMB, 200);

  const seedanceFields = [...(seedance.engine.inputSchema?.required ?? []), ...(seedance.engine.inputSchema?.optional ?? [])];
  const fastFields = [...(fast.engine.inputSchema?.required ?? []), ...(fast.engine.inputSchema?.optional ?? [])];
  assert.ok(seedanceFields.some((field) => field.id === 'end_image_url' && field.modes?.includes('i2v')));
  assert.ok(seedanceFields.some((field) => field.id === 'image_urls' && field.modes?.includes('ref2v') && field.maxCount === 9));
  assert.ok(seedanceFields.some((field) => field.id === 'video_urls' && field.modes?.includes('ref2v') && field.maxCount === 3));
  assert.ok(seedanceFields.some((field) => field.id === 'audio_urls' && field.modes?.includes('ref2v') && field.maxCount === 3));
  assert.equal(seedanceFields.find((field) => field.id === 'image_url')?.label, 'Start image');
  assert.equal(seedanceFields.find((field) => field.id === 'end_image_url')?.label, 'End image');
  assert.equal(seedanceFields.find((field) => field.id === 'image_urls')?.label, 'Reference images (up to 9)');
  assert.equal(seedanceFields.find((field) => field.id === 'video_urls')?.label, 'Reference video clips (up to 3)');
  assert.equal(seedanceFields.find((field) => field.id === 'audio_urls')?.label, 'Reference audio clips (up to 3)');
  const seedanceVideoField = seedanceFields.find((field) => field.id === 'video_urls');
  assert.equal(seedanceVideoField?.minDurationSec, 2);
  assert.equal(seedanceVideoField?.maxDurationSec, 15);
  assert.equal(seedanceFields.some((field) => field.id === 'reference_image_urls' && field.modes?.includes('ref2v')), false);
  assert.ok(fastFields.some((field) => field.id === 'end_image_url' && field.modes?.includes('i2v')));
  assert.ok(fastFields.some((field) => field.id === 'image_urls' && field.modes?.includes('ref2v') && field.maxCount === 9));
  assert.ok(fastFields.some((field) => field.id === 'video_urls' && field.modes?.includes('ref2v') && field.maxCount === 3));
  assert.ok(fastFields.some((field) => field.id === 'audio_urls' && field.modes?.includes('ref2v') && field.maxCount === 3));
  assert.equal(fastFields.find((field) => field.id === 'image_url')?.label, 'Start image');
  assert.equal(fastFields.find((field) => field.id === 'end_image_url')?.label, 'End image');
  assert.equal(fastFields.find((field) => field.id === 'image_urls')?.label, 'Reference images (up to 9)');
  assert.equal(fastFields.find((field) => field.id === 'video_urls')?.label, 'Reference video clips (up to 3)');
  assert.equal(fastFields.find((field) => field.id === 'audio_urls')?.label, 'Reference audio clips (up to 3)');
  const fastVideoField = fastFields.find((field) => field.id === 'video_urls');
  assert.equal(fastVideoField?.minDurationSec, 2);
  assert.equal(fastVideoField?.maxDurationSec, 15);
  assert.equal(fastFields.some((field) => field.id === 'reference_image_urls' && field.modes?.includes('ref2v')), false);
  const miniFields = [...(mini.engine.inputSchema?.required ?? []), ...(mini.engine.inputSchema?.optional ?? [])];
  const miniSourceVideoField = miniFields.find((field) => field.id === 'video_url');
  const miniReferenceVideoField = miniFields.find((field) => field.id === 'video_urls');
  const miniExtensionVideoField = miniFields.find((field) => field.id === 'extension_source_videos');
  const miniReferenceAudioField = miniFields.find((field) => field.id === 'audio_urls');
  assert.ok(miniSourceVideoField);
  assert.equal(miniSourceVideoField.type, 'video');
  assert.equal(miniSourceVideoField.label, 'Source video');
  assert.deepEqual(miniSourceVideoField.modes, ['v2v']);
  assert.deepEqual(miniSourceVideoField.requiredInModes, ['v2v']);
  assert.equal(miniSourceVideoField.maxCount, 1);
  assert.ok(miniReferenceVideoField);
  assert.deepEqual(miniReferenceVideoField.modes, ['ref2v', 'v2v']);
  assert.equal(miniReferenceVideoField.maxCount, 3);
  assert.ok(miniExtensionVideoField);
  assert.equal(miniExtensionVideoField.type, 'video');
  assert.equal(miniExtensionVideoField.label, 'Source clips to extend (up to 3)');
  assert.deepEqual(miniExtensionVideoField.modes, ['extend']);
  assert.deepEqual(miniExtensionVideoField.requiredInModes, ['extend']);
  assert.equal(miniExtensionVideoField.minCount, 1);
  assert.equal(miniExtensionVideoField.maxCount, 3);
  assert.equal(miniExtensionVideoField.slotLabelPattern, 'Source clip {n}');
  assert.ok(miniReferenceAudioField);
  assert.deepEqual(miniReferenceAudioField.modes, ['ref2v', 'v2v', 'extend']);
  assert.ok(miniFields.some((field) => field.id === 'image_urls' && field.modes?.includes('v2v')));

  assert.equal(seedance.availability, 'available');
  assert.equal(fast.availability, 'available');
  assert.equal(mini.availability, 'available');
  assert.equal(mini.engine.availability, 'available');
  assert.equal(seedance.surfaces.app.enabled, true);
  assert.equal(fast.surfaces.app.enabled, true);
  assert.equal(seedance.surfaces.pricing.includeInEstimator, true);
  assert.equal(fast.surfaces.pricing.includeInEstimator, true);
  assert.equal(seedance.surfaces.compare.includeInHub, true);
  assert.equal(fast.surfaces.compare.includeInHub, true);
  assert.equal(seedance.surfaces.modelPage.indexable, true);
  assert.equal(fast.surfaces.modelPage.indexable, true);
  // Seedance 1.5 Pro and Wan 2.5 are retired on Keyvo, so their pairs left both lists. Keyvo 2026-11-13: Wan 2.6, Kling 2.5
  // Turbo and Kling 2.6 Pro went offline too (21 -> 18, 20 -> 17).
  assert.equal(seedance.surfaces.compare.publishedPairs.length, 18);
  assert.equal(fast.surfaces.compare.publishedPairs.length, 17);
  for (const retired of ['wan-2-5', 'wan-2-6', 'kling-2-5-turbo', 'kling-2-6-pro']) {
    assert.equal(seedance.surfaces.compare.publishedPairs.includes(retired), false, retired);
    assert.equal(fast.surfaces.compare.publishedPairs.includes(retired), false, retired);
  }
  assert.equal(mini.surfaces.app.enabled, true);
  assert.equal(mini.surfaces.modelPage.indexable, true);
  assert.equal(mini.surfaces.examples.includeInFamilyResolver, true);
  assert.equal(mini.surfaces.pricing.includeInEstimator, true);
  assert.equal(mini.surfaces.compare.includeInHub, true);
  assert.deepEqual(mini.surfaces.compare.publishedPairs, [
    'seedance-2-0',
    'seedance-2-0-fast',
    'ltx-2-3-fast',
    'veo-3-1-fast',
    'luma-ray-3-2',
  ]);
  ['veo-3-1', 'kling-3-pro', 'sora-2', 'seedance-2-0-fast'].forEach((slug) =>
    assert.ok(seedance.surfaces.compare.publishedPairs.includes(slug), `Seedance 2.0 missing published pair ${slug}`)
  );
  ['veo-3-1-fast', 'ltx-2-3-fast', 'seedance-2-0', 'kling-3-pro'].forEach((slug) =>
    assert.ok(fast.surfaces.compare.publishedPairs.includes(slug), `Seedance 2.0 Fast missing published pair ${slug}`)
  );
});
