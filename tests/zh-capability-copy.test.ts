import assert from 'node:assert/strict';
import test from 'node:test';
import { localizeCapabilityDetail } from '../frontend/lib/marketing/spec-capability-copy';
import { localizeSpecStatus } from '../frontend/app/(localized)/[locale]/(marketing)/models/[slug]/_lib/model-page-spec-status';

const CJK = /[一-鿿]/;

test('zh watermark and route phrases localize with Keyvo as the visible brand', () => {
  assert.equal(localizeCapabilityDetail('No visible Keyvo watermark', 'zh'), '无可见 Keyvo 水印');
  assert.equal(localizeCapabilityDetail('No visible VideoAI watermark', 'zh'), '无可见 Keyvo 水印');
  assert.equal(
    localizeCapabilityDetail('No visible VideoAI watermark; provider provenance markers may apply', 'zh'),
    '无可见 Keyvo 水印；可能保留提供商标注',
  );
  assert.equal(localizeCapabilityDetail('Not exposed in current VideoAI route', 'zh'), '当前 Keyvo 路线暂未开放');
  assert.equal(localizeCapabilityDetail('Not exposed in current Fal 4K route', 'zh'), '当前 Fal 4K 路线暂未开放');
});

test('zh numeric templates keep their values verbatim', () => {
  assert.equal(localizeCapabilityDetail('Up to 15s (per generation)', 'zh'), '单次生成最长 15 秒');
  assert.equal(localizeCapabilityDetail('Up to 1080p', 'zh'), '最高 1080p');
  assert.equal(localizeCapabilityDetail('Up to 4K', 'zh'), '最高 4K');
  assert.equal(localizeCapabilityDetail('Up to 4K canonical sizes', 'zh'), '最高 4K 标准尺寸');
  assert.equal(
    localizeCapabilityDetail('Generate 6–10s; Audio/Extend/Retake up to 20s', 'zh'),
    '生成 6–10 秒；音频 / 延长 / 重拍最长 20 秒',
  );
});

test('zh-only phrases are case-insensitive and produce Chinese', () => {
  const samples = [
    'Image-to-video: 1 source image; optional end frame',
    'Reference-to-video: @Image references plus Kling Elements; I2V: one start image',
    'Optional generated audio',
    'Related image-start workflow',
    'camera_fixed + prompt-based controls',
    'Single start image; optional end frame in I2V',
  ];
  for (const sample of samples) {
    const out = localizeCapabilityDetail(sample, 'zh');
    assert.ok(out, sample);
    assert.match(out, CJK, sample);
  }
});

test('zh-only phrases return null for fr, es and en so their existing behaviour is unchanged', () => {
  const sample = 'Optional generated audio';
  assert.equal(localizeCapabilityDetail(sample, 'fr'), null);
  assert.equal(localizeCapabilityDetail(sample, 'es'), null);
  assert.equal(localizeCapabilityDetail(sample, 'en'), null);
  assert.equal(localizeCapabilityDetail('Up to 15s (per generation)', 'fr'), null);
});

test('unknown phrases still fall through untouched', () => {
  assert.equal(localizeCapabilityDetail('Some unrecognised provider wording', 'zh'), null);
});

test('spec status localizes nested detail phrases in zh', () => {
  assert.equal(
    localizeSpecStatus('Supported (one start image in image-to-video mode)', 'zh'),
    '支持 (图生视频模式下支持单张首帧图)',
  );
  assert.equal(localizeSpecStatus('No visible Keyvo watermark', 'zh'), '无可见 Keyvo 水印');
});
