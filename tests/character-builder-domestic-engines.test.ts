import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import test from 'node:test';

import { getFalEngineById } from '../frontend/src/config/falEngines';
import {
  CHARACTER_BUILDER_MAX_INPUT_IMAGES,
  CHARACTER_BUILDER_RESOLUTION,
  CHARACTER_DRAFT_ENGINE_ID,
  CHARACTER_FINAL_ENGINE_ID,
  CHARACTER_FORMAT_OPTIONS,
  CHARACTER_QUALITY_OPTIONS,
  createDefaultCharacterBuilderState,
  getAvailableCharacterFormatOptions,
  getCharacterEngineAspectRatio,
  getCharacterFormatResolution,
  getQualityEngineId,
  normalizeCharacterFormatMode,
} from '../frontend/src/lib/character-builder';
import { NANO21_ENGINE_ID } from '../frontend/src/lib/nano-banana-2-1';
import { OFFICIAL_LIST_PRICED_ENGINE_IDS } from '../frontend/src/lib/official-list-pricing';
import { buildBytePlusSeedreamPayload } from '../frontend/src/server/images/byteplus-seedream-payload';
import { estimateImageGeneration } from '../frontend/src/server/images/estimate-image-generation';
import { buildPrompt } from '../frontend/src/server/tools/character-builder/prompt';
import { sanitizeRequest } from '../frontend/src/server/tools/character-builder/sanitize';
import { getAspectRatio } from '../frontend/src/server/tools/character-builder/utils';

const engineIds = [CHARACTER_DRAFT_ENGINE_ID, CHARACTER_FINAL_ENGINE_ID] as const;
const engineOf = (id: string) => getFalEngineById(id)!.engine;
const usdCentsToCustomer = (cents: number, currency: string) => (currency === 'CNY' ? cents * 8 : cents);
const root = process.cwd();
const sourceRoot = join(root, 'frontend/src');

test('Character Builder quality modes use the Seedream engines, both official-list priced', () => {
  assert.deepEqual(CHARACTER_QUALITY_OPTIONS.map((option) => [option.id, option.engineId]), [
    ['draft', 'seedream-5-0-flash'],
    ['final', 'seedream-5-0-pro'],
  ]);
  assert.deepEqual([getQualityEngineId('draft'), getQualityEngineId('final')], ['seedream-5-0-flash', 'seedream-5-0-pro']);
  for (const id of engineIds) {
    assert.ok(OFFICIAL_LIST_PRICED_ENGINE_IDS.has(id), `${id} must be on the official-list rule (no tariff)`);
    assert.equal(getFalEngineById(id)?.engine.id, id);
  }
  assert.notEqual(getQualityEngineId('draft'), NANO21_ENGINE_ID);
  assert.notEqual(getQualityEngineId('final'), NANO21_ENGINE_ID);
});

test('Seedream renders 2K only, so the builder offers only 2K for both modes and never 1K or 4K', () => {
  assert.equal(CHARACTER_BUILDER_RESOLUTION, '2k');
  assert.deepEqual(CHARACTER_FORMAT_OPTIONS.map((option) => option.id), ['2k']);
  for (const qualityMode of ['draft', 'final'] as const) {
    assert.deepEqual(getAvailableCharacterFormatOptions(qualityMode).map((option) => option.id), ['2k']);
    for (const formatMode of ['standard', '2k', '4k'] as const) {
      assert.equal(getCharacterFormatResolution(formatMode, qualityMode), '2k');
      assert.equal(normalizeCharacterFormatMode(formatMode, qualityMode), '2k');
    }
  }
  for (const id of engineIds) {
    const engine = engineOf(id);
    assert.deepEqual(engine.resolutions, ['2K'], `${id} renders 2K only`);
    assert.equal(engine.inputSchema.optional?.find((field) => field.id === 'resolution')?.values?.join(','), '2K');
  }
  assert.deepEqual(createDefaultCharacterBuilderState().formatMode, '2k');
});

test('every aspect ratio the builder asks for is accepted by the engine after mapping', () => {
  const outputModes = ['portrait-reference', 'character-sheet'] as const;
  const actions = ['generate', 'full-body-fix', 'lighting-variant'] as const;
  const seen = new Set<string>();
  for (const id of engineIds) {
    const accepted = new Set(engineOf(id).aspectRatios as string[]);
    for (const outputMode of outputModes) for (const action of actions) for (const fullBody of [true, false]) for (const closeUps of [true, false]) {
      const requested = getAspectRatio(outputMode, action, fullBody, closeUps);
      const mapped = getCharacterEngineAspectRatio(id, requested);
      seen.add(requested);
      assert.ok(accepted.has(mapped), `${id} must accept ${mapped} (builder asked for ${requested})`);
    }
  }
  // The portrait ratio is the only one Seedream lacks; the builder maps it to the closest portrait ratio it accepts.
  assert.ok(seen.has('4:5'));
  assert.ok(!(engineOf(CHARACTER_FINAL_ENGINE_ID).aspectRatios as string[]).includes('4:5'));
  assert.equal(getCharacterEngineAspectRatio(CHARACTER_FINAL_ENGINE_ID, '4:5'), '3:4');
  assert.equal(getCharacterEngineAspectRatio(CHARACTER_DRAFT_ENGINE_ID, '3:2'), '3:2');
});

test('the builder never sends more reference images than Seedream accepts', () => {
  assert.equal(CHARACTER_BUILDER_MAX_INPUT_IMAGES, 4);
  for (const id of engineIds) {
    const imageField = engineOf(id).inputSchema.optional?.find((field) => field.id === 'image_urls');
    assert.ok(imageField && imageField.maxCount !== undefined && imageField.maxCount >= CHARACTER_BUILDER_MAX_INPUT_IMAGES,
      `${id} must accept ${CHARACTER_BUILDER_MAX_INPUT_IMAGES} input images`);
    assert.equal(engineOf(id).modes.includes('i2i'), true);
  }
});

test('the provider payload carries the mapped 2K size, every reference image and watermark off', () => {
  const urls = ['https://example.invalid/a.png', 'https://example.invalid/b.png', 'https://example.invalid/c.png', 'https://example.invalid/d.png'];
  const payload = buildBytePlusSeedreamPayload({
    modelId: 'doubao-seedream-5-0-pro-260628',
    prompt: 'Character sheet',
    mode: 'i2i',
    imageUrls: urls,
    numImages: 1,
    outputFormat: 'jpeg',
    size: '2K',
    aspectRatio: getCharacterEngineAspectRatio(CHARACTER_FINAL_ENGINE_ID, '4:5'),
    responseFormat: 'url',
    watermark: false,
  });
  assert.equal(payload.size, '1728x2304');
  assert.deepEqual(payload.image, urls);
  assert.equal(payload.watermark, false);
  assert.equal(payload.sequential_image_generation, undefined);
});

test('reference images are named by their position in the request', () => {
  const input = {
    ...createDefaultCharacterBuilderState(),
    userId: 'fixture',
    action: 'generate' as const,
    sourceMode: 'reference-image' as const,
    referenceImages: [
      { id: 'identity-1', role: 'identity' as const, url: 'https://example.invalid/identity.png' },
      { id: 'style-1', role: 'style' as const, url: 'https://example.invalid/style.png' },
    ],
  };
  const sanitized = sanitizeRequest(input);
  const prompt = buildPrompt(sanitized);
  assert.match(prompt, /input image 1 \(the uploaded identity reference image\) as the primary anchor/);
  assert.match(prompt, /Use input image 2 \(the secondary reference image\) only for/);
});

test('Seedream estimates are rule-priced in customer units: Flash 2K and Pro 2K with the first input image free', async () => {
  // Official list (Volcengine Ark cn-beijing, 2026-11-13): Flash 0.12 CNY per image; Pro 0.60 CNY per 2K image with the
  // first input free and 0.02 CNY per further input. Keyvo sells 80% of list, rounded to whole USD cents (x8 for CNY).
  const cases = [
    { engineId: 'seedream-5-0-flash', mode: 't2i', referenceImageCount: 0, usdCents: 1 },
    { engineId: 'seedream-5-0-flash', mode: 'i2i', referenceImageCount: 4, usdCents: 1 },
    { engineId: 'seedream-5-0-pro', mode: 't2i', referenceImageCount: 0, usdCents: 6 },
    { engineId: 'seedream-5-0-pro', mode: 'i2i', referenceImageCount: 1, usdCents: 6 },
    { engineId: 'seedream-5-0-pro', mode: 'i2i', referenceImageCount: 3, usdCents: 6 },
    { engineId: 'seedream-5-0-pro', mode: 'i2i', referenceImageCount: 4, usdCents: 7 },
  ] as const;
  for (const scenario of cases) {
    const { pricing } = await estimateImageGeneration({
      engineId: scenario.engineId, mode: scenario.mode, resolution: CHARACTER_BUILDER_RESOLUTION, numImages: 1,
      aspectRatio: '3:4', referenceImageCount: scenario.referenceImageCount,
    });
    assert.equal(pricing.totalCents, usdCentsToCustomer(scenario.usdCents, pricing.currency),
      `${scenario.engineId} ${scenario.mode} with ${scenario.referenceImageCount} references`);
    assert.notEqual(pricing.meta?.pricingMode, 'manual_tariff');
  }
});

test('the Character Builder source no longer references Nano Banana 2.1 or its tariff', () => {
  const files: string[] = [];
  const walk = (directory: string) => {
    for (const entry of readdirSync(directory)) {
      const full = join(directory, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(entry)) files.push(full);
    }
  };
  walk(join(sourceRoot, 'components/tools/character-builder'));
  walk(join(sourceRoot, 'server/tools/character-builder'));
  files.push(
    join(sourceRoot, 'lib/character-builder.ts'),
    join(sourceRoot, 'components/tools/CharacterBuilderWorkspace.tsx'),
    join(root, 'frontend/app/api/tools/character-builder/route.ts'),
  );
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /NANO21|nano-banana-2-1|Nano Banana 2\.1|nano-banana-pro/, relative(root, file));
  }
});
