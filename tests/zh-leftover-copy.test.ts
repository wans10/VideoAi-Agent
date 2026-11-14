import assert from 'node:assert/strict';
import test from 'node:test';
import { conversationCopy, conversationZhCopy } from '../frontend/lib/studio/conversation-copy';
import { MILO_LEVELS } from '../frontend/src/lib/studio/assistance-contract';
import { localizeCapabilityDetail } from '../frontend/lib/marketing/spec-capability-copy';
import { modelPageAriaLabel } from '../frontend/app/(localized)/[locale]/(marketing)/models/[slug]/_lib/model-page-aria-labels';
import { getStudioLibraryCopy } from '../frontend/src/components/tools/character-builder/_lib/character-studio-library-copy';
import { STUDIO_CHARACTER_TYPES } from '../frontend/src/lib/character-studio-catalog';

const CJK = /[一-鿿]/;

test('Milo level labels read Lite / Standard / Max in Chinese', () => {
  const labels = Object.values(MILO_LEVELS).map(level => conversationCopy('zh', level.label, level.label));
  assert.deepEqual(labels, ['Lite', 'Standard', 'Max']);
  assert.equal(conversationZhCopy['Standard'], 'Standard');
  for (const [en, zh] of Object.entries(conversationZhCopy)) {
    if (/Standard and Max/.test(en)) assert.match(zh, /Standard 和 Max/);
    assert.ok(!/标准和 Max/.test(zh), en);
  }
});

test('spec lines of offered models are Chinese', () => {
  for (const sample of [
    'Image-to-video: 1 source image; optional end frame; Kling Elements in prompt',
    'Text-to-video', 'Image-to-video', 'Reference-to-video', 'Video extension',
    'Opening image only; no end frame',
    'Up to 3 audio references; 2-15s each and 15s combined; audio-only supported',
  ]) {
    const out = localizeCapabilityDetail(sample, 'zh');
    assert.ok(out && CJK.test(out), sample);
    assert.equal(localizeCapabilityDetail(sample, 'en'), null);
  }
});

test('model page screen-reader labels are Chinese only for zh', () => {
  for (const key of ['sections', 'decisionPaths', 'exampleFilters'] as const) {
    assert.match(modelPageAriaLabel(key, 'zh'), CJK);
    assert.doesNotMatch(modelPageAriaLabel(key, 'en'), CJK);
  }
});

test('Character Studio has Chinese library copy and creature labels', () => {
  assert.equal(getStudioLibraryCopy('zh').title, '我的角色');
  assert.equal(getStudioLibraryCopy('zh-CN').title, '我的角色');
  assert.equal(getStudioLibraryCopy(undefined as unknown as string).title, 'My characters');
  const fruit = STUDIO_CHARACTER_TYPES.find(type => type.id === 'fruit');
  assert.equal(fruit?.label.zh, '水果头');
});
