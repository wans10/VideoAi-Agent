import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getComparePerVideoLabel,
  getCompareQuoteUnavailableLabel,
  getCompareScenarioLabel,
  getCompareScoreLabel,
} from '../frontend/app/(localized)/[locale]/(marketing)/ai-video-engines/[slug]/_lib/compare-pricing-copy';

const CJK = /[一-鿿]/;

test('zh scenario label localizes mode, duration unit and audio while keeping numeric values', () => {
  assert.equal(
    getCompareScenarioLabel('zh', { durationSec: 5, aspectRatio: '16:9', audio: true }),
    '文生视频 · 5 秒 · 16:9 · 开启音频',
  );
  assert.equal(
    getCompareScenarioLabel('zh', { durationSec: 10, aspectRatio: null, audio: false }),
    '文生视频 · 10 秒 · 关闭音频',
  );
});

test('English, French and Spanish scenario labels are unchanged', () => {
  const scenario = { durationSec: 6, aspectRatio: '16:9', audio: true };
  assert.equal(getCompareScenarioLabel('en', scenario), 'Text to video · 6 s · 16:9 · audio on');
  assert.equal(getCompareScenarioLabel('fr', scenario), 'Texte vers vidéo · 6 s · 16:9 · audio activé');
  assert.equal(getCompareScenarioLabel('es', scenario), 'Texto a vídeo · 6 s · 16:9 · audio activado');
  const silent = { durationSec: 4, aspectRatio: '16:9', audio: false };
  assert.equal(getCompareScenarioLabel('en', silent), 'Text to video · 4 s · 16:9 · audio off');
});

test('missing scenario yields no label', () => {
  assert.equal(getCompareScenarioLabel('zh', null), null);
  assert.equal(getCompareScenarioLabel('zh', undefined), null);
});

test('zh panel labels are Chinese and other locales keep their existing wording', () => {
  assert.equal(getCompareScoreLabel('zh'), '评分参考价格');
  assert.equal(getCompareScoreLabel('en'), 'Scorecard price references');
  assert.equal(getComparePerVideoLabel('zh'), '每个视频');
  assert.equal(getComparePerVideoLabel('en'), 'per video');
  assert.equal(getComparePerVideoLabel('fr'), 'par vidéo');
  assert.equal(getComparePerVideoLabel('es'), 'por vídeo');
  assert.match(getCompareQuoteUnavailableLabel('zh'), CJK);
  assert.equal(
    getCompareQuoteUnavailableLabel('en'),
    'The current quote could not be confirmed. Check your settings in the app before generating.',
  );
});

test('every zh panel label contains Chinese characters', () => {
  for (const label of [
    getCompareScoreLabel('zh'),
    getComparePerVideoLabel('zh'),
    getCompareQuoteUnavailableLabel('zh'),
    getCompareScenarioLabel('zh', { durationSec: 8, aspectRatio: '9:16', audio: true }) ?? '',
  ]) {
    assert.match(label, CJK, label);
  }
});
