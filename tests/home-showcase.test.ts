import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { NextRequest } from 'next/server';
import snapshot from '../frontend/config/public-examples.json';
import visibleFamilies from '../frontend/config/keyvo-visible-families.json';
import zhShowcasePrompts from '../frontend/config/home-showcase-zh.json';
import { resolveRuntimeEngineInput } from '../frontend/config/model-runtime';
import {
  HOME_SHOWCASE_FIRST_BATCH,
  HOME_SHOWCASE_MAX_BATCH,
  getShowcaseScenePosters,
  isShowcaseEngine,
  listShowcaseCards,
} from '../frontend/app/(localized)/[locale]/(marketing)/(home)/_lib/home-route-data/showcase';
import { galleryVideoRatio } from '../frontend/components/examples/examples-discovery-layout';
import { GET as getShowcaseBatch } from '../frontend/app/api/home-showcase/route';

type SnapshotCard = { id: string; engineIconId: string; engineLabel: string; prompt: string; promptFull?: string; rawPosterUrl?: string };
const cards = Object.values((snapshot as unknown as { cards: Record<string, SnapshotCard> }).cards);
const HIDDEN_VENDOR_NAMES = /LTX|Veo|Luma|Grok|FLUX|Pika|Sora|Gemini|GPT Image|Nano Banana/i;

function allShowcaseCards() {
  const first = listShowcaseCards(0, HOME_SHOWCASE_MAX_BATCH);
  const result = [...first.cards];
  let hasMore = first.hasMore;
  while (hasMore) {
    const next = listShowcaseCards(result.length, HOME_SHOWCASE_MAX_BATCH);
    result.push(...next.cards);
    hasMore = next.hasMore;
  }
  return result;
}

test('the works wall holds only orderable models from the Chinese-vendor families', () => {
  const wall = allShowcaseCards();
  assert.ok(wall.length >= 100, `expected a substantial wall, got ${wall.length}`);
  const byId = new Map(cards.map((card) => [card.id, card]));
  for (const card of wall) {
    const source = byId.get(card.id)!;
    const model = resolveRuntimeEngineInput(source.engineIconId);
    assert.ok(model, `${source.engineIconId} resolves to a model`);
    assert.ok(visibleFamilies.includes(model!.family as string), `${source.engineIconId} (${model!.family}) is a visible family`);
    assert.equal(model!.publication.app.published, true, `${source.engineIconId} can be ordered`);
    assert.ok(model!.lifecycle !== 'retired' && model!.lifecycle !== 'deep_legacy', `${source.engineIconId} is not a retired version`);
    assert.doesNotMatch(`${card.engineLabel} ${card.promptExcerpt}`, HIDDEN_VENDOR_NAMES);
  }
});

test('the wall is exactly the set of eligible bundled examples, with nothing hidden or retired left in', () => {
  const wallIds = new Set(allShowcaseCards().map((card) => card.id));
  const eligible = cards.filter((card) => card.rawPosterUrl && isShowcaseEngine(card.engineIconId) && (
    // family feeds are the wall's source, so an example must also appear in one of them
    (snapshot as unknown as { feeds: Record<string, { playlist: string[] }> }).feeds &&
    visibleFamilies.some((family) => ((snapshot as unknown as { feeds: Record<string, { playlist: string[] }> }).feeds[family]?.playlist ?? []).includes(card.id))
  ));
  assert.deepEqual([...wallIds].sort(), eligible.map((card) => card.id).sort());
  const excluded = cards.filter((card) => !wallIds.has(card.id));
  assert.ok(excluded.some((card) => HIDDEN_VENDOR_NAMES.test(card.engineLabel)), 'hidden-vendor examples exist in the snapshot and are excluded');
  assert.ok(excluded.some((card) => ['wan-2-5', 'seedance-1-5-pro'].includes(card.engineIconId)), 'retired versions of visible families are excluded');
  assert.equal(isShowcaseEngine('veo-3-1'), false);
  assert.equal(isShowcaseEngine('ltx-2-5-pro'), false);
  assert.equal(isShowcaseEngine('seedance-1-5-pro'), false);
  assert.equal(isShowcaseEngine('kling-3-pro'), true);
  assert.equal(isShowcaseEngine('not-a-model'), false);
});

test('batches page through the wall without gaps or duplicates, and the batch size is bounded', () => {
  const first = listShowcaseCards(0, HOME_SHOWCASE_FIRST_BATCH);
  assert.equal(first.cards.length, HOME_SHOWCASE_FIRST_BATCH);
  assert.equal(first.hasMore, true);
  const second = listShowcaseCards(HOME_SHOWCASE_FIRST_BATCH, HOME_SHOWCASE_FIRST_BATCH);
  const everything = allShowcaseCards();
  assert.deepEqual([...first.cards, ...second.cards].map((card) => card.id), everything.slice(0, HOME_SHOWCASE_FIRST_BATCH * 2).map((card) => card.id));
  assert.equal(new Set(everything.map((card) => card.id)).size, everything.length);
  assert.equal(listShowcaseCards(0, 10_000).cards.length, HOME_SHOWCASE_MAX_BATCH);
  assert.equal(listShowcaseCards(0, 0).cards.length, HOME_SHOWCASE_FIRST_BATCH);
  const end = listShowcaseCards(everything.length, 24);
  assert.deepEqual([end.cards.length, end.hasMore, end.total], [0, false, everything.length]);
  assert.equal(listShowcaseCards(-5, 3).cards.length, 3);
});

test('families take turns so the first screen of the wall mixes vendors', () => {
  const families = new Set(listShowcaseCards(0, 10).cards.map((card) => resolveRuntimeEngineInput(cards.find((source) => source.id === card.id)!.engineIconId)?.family));
  assert.ok(families.size >= 4, [...families].join(','));
});

test('each card has fixed geometry, a poster, a short preview only, and no remix link or price', () => {
  for (const card of allShowcaseCards()) {
    assert.ok(card.ratio > 0.4 && card.ratio < 3, `${card.id} ratio ${card.ratio}`);
    assert.match(card.posterUrl, /^(https:\/\/|\/hero\/)/, 'a CDN poster or a bundled site image');
    // The CDN stores previews under both `renders/previews/` and `renderspreviews/`; both are real paths.
    if (card.previewVideoUrl) assert.match(card.previewVideoUrl, /\/renders\/?previews\//, 'the wall carries the short preview, never the full-length video');
    assert.equal('videoUrl' in card, false, 'the full-length video never reaches the wall');
    assert.equal(card.href, `/video/${encodeURIComponent(card.id)}`);
    assert.equal('makeHref' in card, false, 'the wall offers no one-click remix: only the prompt could travel, not the model or settings');
    assert.equal('priceLabel' in card, false, 'no price chip on the wall');
    assert.ok(card.engineIconId, 'the shared gallery card needs the engine id');
    assert.ok(Number.isFinite(card.ratio) && card.ratio === galleryVideoRatio({ id: card.id, aspectRatio: card.aspectRatio, outputWidth: card.outputWidth, outputHeight: card.outputHeight }),
      `${card.id} the shared card derives the same ratio from the same fields`);
  }
});

test('the four scene cards use real visible examples', () => {
  const posters = getShowcaseScenePosters();
  assert.deepEqual(Object.keys(posters).sort(), ['cinematic', 'creative', 'everyone', 'marketing']);
  const wallPosters = new Set(allShowcaseCards().map((card) => card.posterUrl));
  for (const poster of Object.values(posters)) assert.ok(wallPosters.has(poster.posterUrl), poster.posterUrl);
});

test('the batch endpoint serves the same cards, caps its size and reads no database', async () => {
  const response = getShowcaseBatch(new NextRequest('https://example.test/api/home-showcase?offset=24&limit=24'));
  assert.equal(response.headers.get('Cache-Control'), 'public, max-age=300, s-maxage=3600');
  const body = await response.json() as { ok: boolean; cards: Array<{ id: string }>; total: number; hasMore: boolean };
  assert.equal(body.ok, true);
  assert.deepEqual(body.cards.map((card) => card.id), listShowcaseCards(24, 24).cards.map((card) => card.id));
  const huge = await getShowcaseBatch(new NextRequest('https://example.test/api/home-showcase?offset=0&limit=99999')).json() as { cards: unknown[] };
  assert.equal(huge.cards.length, HOME_SHOWCASE_MAX_BATCH);
  const junk = await getShowcaseBatch(new NextRequest('https://example.test/api/home-showcase?offset=abc&limit=xyz')).json() as { cards: unknown[] };
  assert.equal(junk.cards.length, HOME_SHOWCASE_FIRST_BATCH);
  const source = readFileSync('frontend/app/api/home-showcase/route.ts', 'utf8');
  assert.doesNotMatch(source, /isDatabaseConfigured|quoteCurrentExamplePrices|@\/lib\/db|searchParams\.get\('engine'\)/);
});

test('the general examples endpoint cannot be used to reach hidden-vendor examples through an engine filter', () => {
  const source = readFileSync('frontend/app/api/examples/route.ts', 'utf8');
  assert.match(source, /isKeyvoVisibleFamily\(filterFamily\)/);
  assert.match(source, /engineFilter && !\(filterFamily && isKeyvoVisibleFamily\(filterFamily\)\)[\s\S]*?cards: \[\]/);
  assert.ok(source.indexOf('isKeyvoVisibleFamily(filterFamily)') < source.indexOf('listExampleFamilyPage(engineFilter'));
});

test('the wall reuses the examples gallery card and layout and keeps the media rules', () => {
  const card = readFileSync('frontend/components/examples/ExampleGalleryCard.tsx', 'utf8');
  const studio = readFileSync('frontend/components/marketing/home/HomePromptStudio.client.tsx', 'utf8');
  const wall = readFileSync('frontend/components/marketing/home/HomeShowcaseWall.client.tsx', 'utf8');
  const css = readFileSync('frontend/components/marketing/home/home-showcase.module.css', 'utf8');
  assert.match(wall, /import \{ ExampleGalleryCard \} from '@\/components\/examples\/ExampleGalleryCard'/, 'the original card, not a copy');
  assert.match(wall, /examples-masonry\.module\.css/, 'the original justified-row layout');
  assert.match(wall, /'--video-ratio': card\.ratio/, 'item width follows the aspect ratio, like the examples page');
  assert.match(wall, /prioritizePoster=\{false\}/, 'wall posters are lazy; the first scene card is the only priority image');
  assert.match(wall, /className=\{`\$\{galleryStyles\.gallery\} \$\{styles\.batch\}`\}/, 'one flex container per batch, so load-more never moves earlier rows');
  assert.doesNotMatch(wall, /column-count|columns:/);
  assert.doesNotMatch(css, /column-count/);
  assert.match(card, /preload="none"/);
  assert.match(card, /useExampleCardPlayback\(video\.previewVideoUrl/);
  assert.doesNotMatch(wall, /\bvideoUrl\b|makeHref|\bremix\b/i, 'the wall never carries the full-length video or a remix link');
  assert.match(studio, /priority=\{index === 0\}/);
  assert.doesNotMatch(card + studio + wall, /media\.maxvideoai\.com/, 'no new hard-coded media host');
  assert.match(readFileSync('frontend/lib/home-showcase-media.ts', 'utf8'), /export function showcaseMediaUrl/);
});

test('every wall card carries a Chinese prompt', () => {
  const wall = allShowcaseCards();
  const zhPrompts = zhShowcasePrompts as Record<string, string>;
  assert.ok(wall.length > 100);
  for (const card of wall) {
    const zh = zhPrompts[card.id];
    assert.ok(zh && /[\u4e00-\u9fff]/.test(zh), `${card.id} has a Chinese prompt`);
    assert.match(card.promptExcerpt, /[\u4e00-\u9fff]/, `${card.id} excerpt is Chinese`);
    assert.doesNotMatch(zh, HIDDEN_VENDOR_NAMES, `${card.id} Chinese prompt names no hidden vendor`);
  }
  // Nothing on the wall may be left without a translation: every eligible example is covered.
  assert.equal(wall.every((card) => card.id in zhPrompts), true);
});
