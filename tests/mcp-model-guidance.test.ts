import assert from 'node:assert/strict';
import test from 'node:test';
import { getModelRegistryEntryById } from '../frontend/config/model-registry';
import { getModelFamilyExamplesPageConfig } from '../frontend/config/model-families';

import {
  getAgentModelGuidance,
  listAgentModelGuidance,
  parseAgentModelGuidance,
} from '../frontend/src/server/agent-api/model-guidance';

const knownEngineIds = new Set([
  'gemini-omni-flash',
  'happy-horse-1-1',
  'kling-o3-pro',
  'minimax-h3',
  'seedance-2-5',
]);

function validEntry() {
  return {
    engineId: 'seedance-2-5',
    strengths: ['Cinematic storytelling'],
    bestFor: ['cinematic_story'],
    considerations: ['Review the model details before choosing settings.'],
    evidenceUrls: ['https://maxvideoai.com/models/seedance-2-5'],
    reviewedAt: '2026-08-24',
  };
}

test('guidance exposes exactly the reviewed engine records without pricing data', () => {
  const reviewed = listAgentModelGuidance();

  // Owner allowlist (2026-11-14): guidance for hidden models (FLUX, GPT Image 2, Grok, LTX, Seedance 2.0 Mini) is withheld.
  assert.deepEqual(reviewed.map((entry) => entry.engineId).sort(), [
    'gemini-omni-flash',
    'gpt-image-2-5-flare',
    'gpt-image-2-6-flare',
    'gpt-image-2-6-sunburst',
    'happy-horse-1-1',
    'kling-o3-pro',
    'kling-v4-flash',
    'minimax-h3',
    'minimax-h3-max',
    'seedance-2-5',
    'wan-3',
    'wan-3-prime',
  ]);
  for (const entry of reviewed) {
    assert.match(entry.reviewedAt, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(entry.strengths.length >= 1 && entry.strengths.length <= 4);
    assert.ok(entry.bestFor.length >= 1 && entry.bestFor.length <= 5);
    assert.ok(entry.considerations.length >= 1 && entry.considerations.length <= 4);
    entry.evidenceUrls.forEach((url) => assert.match(url, /^https:\/\/maxvideoai\.com\//));
    assert.doesNotMatch(JSON.stringify(entry), /\$|€|£|priceCents|costTier|provider|0\.13/);
    assert.ok(Object.isFrozen(entry));
    assert.ok(Object.isFrozen(entry.strengths));
  }
  assert.equal(getAgentModelGuidance('seedance-2-5')?.bestFor.includes('product_video'), false);
  // LTX 2.5 Fast is hidden on Keyvo (owner allowlist 2026-11-14), so its guidance is withheld.
  assert.equal(getAgentModelGuidance('ltx-2-5-fast'), null);
  assert.equal(getAgentModelGuidance('gemini-omni-flash') !== null, true);
  assert.equal(getAgentModelGuidance('unknown-model'), null);
  // MiniMax-H3-Max is served on Keyvo (MiniMax's own API); its guidance names only the official 480P/768P tiers.
  const h3Max = getAgentModelGuidance('minimax-h3-max');
  assert.ok(h3Max);
  assert.doesNotMatch(JSON.stringify(h3Max), /1080P|4K|target_audio_url/);
});

test('authored model and example evidence uses published canonical registry routes', () => {
  for (const guidance of listAgentModelGuidance()) {
    const model = getModelRegistryEntryById(guidance.engineId);
    assert.ok(model, guidance.engineId);
    for (const evidence of guidance.evidenceUrls) {
      const url = new URL(evidence);
      if (url.pathname.startsWith('/models/')) {
        assert.equal(model.publication.model.published, true, evidence);
        assert.equal(url.pathname, `/models/${model.slug}`, evidence);
      }
      if (url.pathname.startsWith('/examples/')) {
        assert.ok(model.family, evidence);
        const examples = getModelFamilyExamplesPageConfig(model.family);
        assert.ok(examples && examples.stage !== 'hidden', evidence);
        assert.equal(url.pathname, `/examples/${model.family}`, evidence);
        assert.ok(examples.publishedModelSlugs.includes(model.slug), evidence);
      }
    }
  }
});

test('guidance parser rejects invalid authored entries', () => {
  const inheritedUnknownField = Object.assign(
    Object.create({ unsupported: true }),
    validEntry(),
  );
  const mutations: Array<[string, unknown]> = [
    ['unknown engine ID', [{ ...validEntry(), engineId: 'unknown-model' }]],
    ['unknown field', [{ ...validEntry(), unsupported: true }]],
    ['inherited unknown field', [inheritedUnknownField]],
    ['invalid use case', [{ ...validEntry(), bestFor: ['unsupported_use_case'] }]],
    ['non-owned URL', [{ ...validEntry(), evidenceUrls: ['https://example.com/evidence'] }]],
    ['duplicate URL', [{ ...validEntry(), evidenceUrls: [
      'https://maxvideoai.com/models/seedance-2-5',
      'https://maxvideoai.com/models/seedance-2-5',
    ] }]],
    ['empty string', [{ ...validEntry(), strengths: [''] }]],
    ['too many strengths', [{ ...validEntry(), strengths: ['one', 'two', 'three', 'four', 'five'] }]],
    ['numeric price field', [{ ...validEntry(), priceCents: 13 }]],
  ];

  for (const [description, input] of mutations) {
    assert.throws(
      () => parseAgentModelGuidance(input, knownEngineIds),
      undefined,
      description,
    );
  }
});
