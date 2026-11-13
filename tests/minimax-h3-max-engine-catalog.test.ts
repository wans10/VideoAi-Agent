import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MINIMAX_H3_MAX_FAL_ENGINE_REGISTRY,
} from '../frontend/src/config/fal-engines/minimax-h3-max';
import {
  RAW_FAL_ENGINE_REGISTRY,
} from '../frontend/src/config/fal-engines/registry';

const entry = MINIMAX_H3_MAX_FAL_ENGINE_REGISTRY[0];

function field(id: string) {
  assert.ok(entry, 'MiniMax H3 Max private engine should exist');
  const fields = [
    ...(entry.engine.inputSchema?.required ?? []),
    ...(entry.engine.inputSchema?.optional ?? []),
  ];
  const match = fields.find((candidate) => candidate.id === id && candidate.modes?.some(mode => mode !== 'v2v'));
  assert.ok(match, `MiniMax H3 Max field ${id} should exist`);
  return match;
}

test('MiniMax H3 Max keeps its documented runtime identity and capabilities separate from H3', () => {
  assert.ok(entry);
  assert.equal(entry.id, 'minimax-h3-max');
  assert.equal(entry.marketingName, 'MiniMax H3 Max');
  assert.equal(entry.provider, 'MiniMax');
  assert.deepEqual(entry.engine.modes, ['t2v', 'i2v', 'ref2v', 'v2v']);
  // Keyvo: MiniMax's own V2 API offers 480P/768P only (Fal's 1080P is gone).
  assert.deepEqual(entry.engine.resolutions, ['480P', '768P']);
  assert.equal(entry.engine.inputLimits?.promptMaxChars, 7000);
  assert.deepEqual(entry.engine.aspectRatios, ['21:9', '16:9', '4:3', '1:1', '3:4', '9:16', 'auto']);
  assert.equal(entry.engine.maxDurationSec, 15);
  assert.equal(entry.engine.audio, true);
  assert.deepEqual(
    Object.fromEntries(entry.modes.map(({ mode, falModelId }) => [mode, falModelId])),
    {
      t2v: 'minimax/h3-max/text-to-video',
      i2v: 'minimax/h3-max/image-to-video',
      ref2v: 'minimax/h3-max/reference-to-video',
      v2v: 'minimax/h3-max/recast',
    },
  );
  assert.equal(RAW_FAL_ENGINE_REGISTRY.some(({ id }) => id === 'minimax-h3'), true);
});

test('MiniMax H3 Max exposes exact defaults, text ratios, and reference bounds', () => {
  assert.deepEqual(field('duration').values, [
    '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15',
  ]);
  assert.equal(field('duration').min, 5);
  assert.equal(field('duration').max, 15);
  assert.deepEqual(field('resolution').values, ['480P', '768P']);
  assert.equal(field('resolution').default, '768P');
  assert.deepEqual(field('aspect_ratio').values, ['21:9', '16:9', '4:3', '1:1', '3:4', '9:16']);
  assert.deepEqual(field('aspect_ratio').modes, ['t2v']);
  assert.deepEqual(field('prompt_expansion_mode').values, ['disabled', 'balanced', 'quality']);
  assert.equal(field('prompt_expansion_mode').default, 'balanced');
  assert.equal(field('reference_image_urls').maxCount, 9);
  assert.equal(field('reference_video_urls').maxCount, 3);
  assert.equal(field('reference_audio_urls').maxCount, 3);
  assert.equal(entry?.engine.inputSchema?.referenceBudget?.maxTotal, 12);
  assert.equal(entry?.modes.every(({ ui }) => ui.audioToggle === false), true);
});

test('MiniMax H3 Max offers no Fal-only generation controls on Keyvo', () => {
  assert.ok(entry);
  const fields = [...(entry.engine.inputSchema?.required ?? []), ...(entry.engine.inputSchema?.optional ?? [])]
    .filter((candidate) => candidate.modes?.some((mode) => mode !== 'v2v'));
  for (const gone of ['middle_image_url', 'middle_frame_time', 'reference_order', 'target_audio_url', 'seed']) {
    assert.equal(fields.some((candidate) => candidate.id === gone), false, gone);
  }
  // Frames and references cannot be combined on MiniMax's V2 API, so frames belong to image mode only.
  assert.deepEqual(field('image_url').modes, ['i2v']);
  assert.deepEqual(field('end_image_url').modes, ['i2v']);
  assert.equal(entry.engine.inputSchema?.constraints?.maxImageSizeMB, 30);
  assert.equal(entry.engine.inputSchema?.constraints?.maxVideoSizeMB, 50);
  assert.equal(entry.engine.inputSchema?.constraints?.maxAudioSizeMB, 15);
  for (const mode of ['t2v', 'i2v', 'ref2v'] as const) assert.deepEqual(entry.engine.modeCaps?.[mode]?.resolution, ['480P', '768P'], mode);
});

test('MiniMax H3 Max is public without adding excluded products', () => {
  const publicIds = new Set(RAW_FAL_ENGINE_REGISTRY.map(({ id }) => id));

  assert.equal(publicIds.has('minimax-h3-max'), true);
  assert.equal(publicIds.has('minimax-h3-max-turbo'), false);
  assert.equal(publicIds.has('runway-gen-4-turbo'), false);
});
