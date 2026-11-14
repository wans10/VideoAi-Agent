import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getBundledPublicExamplesSnapshot,
  listBundledModelExamples,
  listBundledPublicExamples,
} from '../frontend/server/bundled-public-examples';
import { getBundledExamplePromptZh } from '../frontend/server/public-example-prompts-zh';
import { listRuntimeModels } from '../frontend/config/model-runtime';
import visibleFamilies from '../frontend/config/keyvo-visible-families.json';

const CJK = /[一-鿿]/;
const snapshot = getBundledPublicExamplesSnapshot();

test('every example the zh examples hub and the visible family galleries can show has a Chinese prompt', () => {
  const shown = new Map<string, ReturnType<typeof listBundledPublicExamples>['items'][number]>();
  for (const family of ['', ...visibleFamilies]) {
    for (const video of listBundledPublicExamples(family, 'playlist', 1000, 0).items) shown.set(video.id, video);
  }
  assert.ok(shown.size >= 150, `expected the visible galleries to cover >=150 examples, got ${shown.size}`);
  for (const video of shown.values()) {
    assert.ok(CJK.test(video.prompt), `${video.id} (${video.engineId}) prompt is not Chinese`);
    assert.ok(CJK.test(video.promptExcerpt), `${video.id} excerpt is not Chinese`);
    assert.ok(video.promptOriginal && video.promptOriginal !== video.prompt, `${video.id} lost its English original`);
    assert.ok(video.promptExcerpt.length <= 161);
  }
});

test('every published model of a visible family has Chinese gallery prompts', () => {
  const families = new Set<string>(visibleFamilies);
  let checked = 0;
  for (const model of listRuntimeModels()) {
    if (!model.publication.app.published || !model.family || !families.has(model.family)) continue;
    for (const video of listBundledModelExamples(model.slug, 1000)) {
      checked += 1;
      assert.ok(CJK.test(video.prompt), `${video.id} on ${model.slug} is not Chinese`);
    }
  }
  assert.ok(checked > 0);
});

test('translations keep reference tokens, ratios and durations of the English prompt', () => {
  for (const id of Object.keys(snapshot.cards)) {
    const zh = getBundledExamplePromptZh(id);
    if (!zh) continue;
    // The settings header line ("Kling 3 Pro • Text-to-Video • 15s ...") is dropped from translations.
    const en = (snapshot.cards[id].promptFull ?? snapshot.cards[id].prompt).replace(/^[^\n]* • [^\n]*\n/, '');
    for (const token of en.match(/@Image\d+/g) ?? []) assert.ok(zh.includes(token), `${id} lost ${token}`);
    for (const ratio of new Set(en.match(/\b(?:9:16|16:9|1:1|4:3|3:4|21:9)\b/g) ?? [])) assert.ok(zh.includes(ratio), `${id} lost ${ratio}`);
  }
});

test('examples that stay hidden on Keyvo are left untouched', () => {
  const hidden = Object.values(snapshot.cards).find(card => !getBundledExamplePromptZh(card.id));
  assert.ok(hidden, 'the snapshot still holds untranslated, hidden-vendor examples');
  const video = listBundledPublicExamples('veo', 'playlist', 1000, 0).items.find(item => item.id === hidden!.id);
  if (video) assert.equal(video.prompt, hidden!.promptFull ?? hidden!.prompt);
});
