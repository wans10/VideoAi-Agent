import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getBundledPublicExample,
  listBundledModelExamples,
  listBundledPublicExamples,
  hasBundledPublicExamples,
} from '../frontend/server/bundled-public-examples';

test('bundled public examples provides minimax-h3 hero and demo renders', () => {
  const hero = getBundledPublicExample('job_87d713f7-9193-4831-a9e5-59ce1e0c668c');
  assert.ok(hero);
  assert.equal(hero.id, 'job_87d713f7-9193-4831-a9e5-59ce1e0c668c');
  assert.equal(hero.engineId, 'minimax-h3');
  assert.ok(hero.videoUrl?.startsWith('https://media.maxvideoai.com/renders/'));
  assert.ok(hero.thumbUrl?.startsWith('https://media.maxvideoai.com/renders/'));
  assert.equal(hero.hasAudio, true);

  const demo = getBundledPublicExample('job_91c6f549-7b07-45b3-ad45-cbaf67d10959');
  assert.ok(demo);
  assert.equal(demo.id, 'job_91c6f549-7b07-45b3-ad45-cbaf67d10959');
  assert.equal(demo.engineId, 'minimax-h3');
  assert.ok(demo.videoUrl?.startsWith('https://media.maxvideoai.com/renders/'));
  assert.ok(demo.thumbUrl?.startsWith('https://media.maxvideoai.com/renders/'));
});

test('bundled public examples provides veo showcase feed', () => {
  assert.equal(hasBundledPublicExamples('veo'), true);
  const result = listBundledPublicExamples('veo', 'playlist', 10, 0);
  assert.equal(result.total, 31);
  assert.equal(result.items.length, 10);
  assert.ok(result.items.every((item) => item.videoUrl && item.thumbUrl));
});

test('bundled public examples provides hub showcase feed', () => {
  assert.equal(hasBundledPublicExamples(''), true);
  const result = listBundledPublicExamples('', 'playlist', 12, 0);
  assert.ok(result.total >= 160);
  assert.equal(result.items.length, 12);
});

test('bundled model examples isolates by model slug', () => {
  const minimax = listBundledModelExamples('minimax-h3');
  assert.ok(minimax.length >= 2);
  assert.ok(minimax.every((v) => v.engineId === 'minimax-h3'));
});

