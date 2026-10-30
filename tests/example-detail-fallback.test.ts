import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';
import { Pool } from 'pg';
import snapshot from '../frontend/config/public-examples.json';
import zhPrompts from '../frontend/config/home-showcase-zh.json';
import { isRenderable } from '../frontend/app/(public-watch)/video/[id]/_lib/video-watch-page-utils';
import {
  HOME_SHOWCASE_MAX_BATCH,
  listShowcaseCards,
} from '../frontend/app/(localized)/[locale]/(marketing)/(home)/_lib/home-route-data/showcase';
import { isShowcaseEngine } from '../frontend/server/keyvo-example-eligibility';
import {
  getSeoVideoById,
  getSeoVideosByIds,
  getVideoById,
  getVideosByIds,
} from '../frontend/server/videos';
import { isBundledFallbackVideo } from '../frontend/server/videos-bundled-fallback';
import { getVideoWatchPageDataById } from '../frontend/server/video-seo';

// Keyvo's production database is configured but holds none of the bundled examples. A configured database that
// answers every read with "no rows" is exactly that situation, so the pool's client is the only thing faked.
type SnapshotCard = { id: string; engineIconId: string; engineLabel: string };
const cards = Object.values((snapshot as unknown as { cards: Record<string, SnapshotCard> }).cards);
const originalConnect = Pool.prototype.connect;
const savedEnv = { url: process.env.DATABASE_URL, bundled: process.env.KEYVO_BUNDLED_EXAMPLES };
let databaseRows: Record<string, unknown>[] = [];

before(() => {
  process.env.DATABASE_URL = 'postgres://keyvo:test@127.0.0.1:1/keyvo';
  delete process.env.KEYVO_BUNDLED_EXAMPLES;
  // `query()` borrows a client from the pool, so a fake client that answers every statement stands in for the database.
  (Pool.prototype as unknown as { connect: () => Promise<unknown> }).connect = async () => ({
    query: async () => ({ rows: databaseRows }),
    release: () => undefined,
  });
});

after(() => {
  Pool.prototype.connect = originalConnect;
  for (const [key, value] of [['DATABASE_URL', savedEnv.url], ['KEYVO_BUNDLED_EXAMPLES', savedEnv.bundled]] as const) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

function wallCards() {
  const result = [...listShowcaseCards(0, HOME_SHOWCASE_MAX_BATCH).cards];
  for (let more = true; more; ) {
    const next = listShowcaseCards(result.length, HOME_SHOWCASE_MAX_BATCH);
    result.push(...next.cards);
    more = next.hasMore;
  }
  return result;
}

const HIDDEN_VENDOR_ENGINE = /^(veo|ltx|sora|luma|pika|grok|flux|gemini)/i;
const hiddenVendorIds = cards.filter((card) => HIDDEN_VENDOR_ENGINE.test(card.engineIconId)).map((card) => card.id);
const notOrderableIds = cards.filter((card) => !HIDDEN_VENDOR_ENGINE.test(card.engineIconId) && !isShowcaseEngine(card.engineIconId)).map((card) => card.id);

test('the fixtures cover hidden-vendor and retired examples', () => {
  assert.ok(hiddenVendorIds.length > 50, `hidden-vendor examples: ${hiddenVendorIds.length}`);
  assert.ok(notOrderableIds.length > 0, 'a visible family with versions that cannot be ordered today');
});

test('a configured database without rows still serves every example the works wall links to', async () => {
  databaseRows = [];
  const wall = wallCards();
  assert.ok(wall.length > 100);
  const ids = wall.map((card) => card.id);
  const many = await getVideosByIds(ids);
  const manySeo = await getSeoVideosByIds(ids);
  for (const id of ids) {
    const one = await getVideoById(id);
    const seo = await getSeoVideoById(id);
    assert.equal(one?.id, id, `getVideoById ${id}`);
    assert.equal(seo?.id, id, `getSeoVideoById ${id}`);
    assert.equal(many.get(id)?.id, id, `getVideosByIds ${id}`);
    assert.equal(manySeo.get(id)?.id, id, `getSeoVideosByIds ${id}`);
    assert.ok(isBundledFallbackVideo(seo), `${id} is marked as a bundled fallback`);
    assert.equal(seo?.visibility, 'public');
    assert.ok(seo?.videoUrl, `${id} has a video`);
  }
});

test('the fallback carries the Chinese prompt the wall shows, never the English original', async () => {
  databaseRows = [];
  for (const card of wallCards()) {
    const video = await getSeoVideoById(card.id);
    const zh = (zhPrompts as Record<string, string>)[card.id];
    assert.ok(zh, `${card.id} has a Chinese prompt`);
    assert.equal(video?.prompt, zh);
    assert.match(video?.promptExcerpt ?? '', /[一-鿿]/, `${card.id} excerpt is Chinese`);
  }
});

test('hidden-vendor and non-orderable examples stay unavailable, with or without a database', async () => {
  databaseRows = [];
  const probe = [...hiddenVendorIds.slice(0, 40), ...notOrderableIds];
  for (const id of probe) {
    assert.equal(await getVideoById(id), null, `getVideoById ${id}`);
    assert.equal(await getSeoVideoById(id), null, `getSeoVideoById ${id}`);
  }
  assert.equal((await getVideosByIds(probe)).size, 0);
  assert.equal((await getSeoVideosByIds(probe)).size, 0);

  const url = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  try {
    for (const id of probe) {
      assert.equal(await getVideoById(id), null, `no database: getVideoById ${id}`);
      assert.equal(await getSeoVideoById(id), null, `no database: getSeoVideoById ${id}`);
    }
    assert.equal((await getSeoVideosByIds(probe)).size, 0);
  } finally {
    process.env.DATABASE_URL = url;
  }
});

test('every works-wall card resolves to a renderable, non-indexable watch page', async () => {
  databaseRows = [];
  for (const card of wallCards()) {
    const page = await getVideoWatchPageDataById(card.id);
    assert.ok(page, `${card.id} has watch page data`);
    assert.equal(page.video.id, card.id);
    assert.ok(isRenderable(page), `${card.id} renders`);
    assert.equal(page.isEligible, false, `${card.id} is not indexable: it is upstream content`);
  }
});

test('a hidden-vendor example has no watch page', async () => {
  databaseRows = [];
  for (const id of hiddenVendorIds.slice(0, 20)) assert.equal(await getVideoWatchPageDataById(id), null, id);
});

test('upstream behavior is unchanged when KEYVO_BUNDLED_EXAMPLES=off', async () => {
  databaseRows = [];
  const visibleId = wallCards()[0].id;
  const hiddenId = hiddenVendorIds[0];
  process.env.KEYVO_BUNDLED_EXAMPLES = 'off';
  try {
    assert.equal(await getVideoById(visibleId), null, 'a configured database without a row is a miss');
    assert.equal(await getSeoVideoById(visibleId), null);
    assert.equal((await getVideosByIds([visibleId])).size, 0);
    assert.equal((await getSeoVideosByIds([visibleId])).size, 0);

    const url = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    try {
      const legacy = await getSeoVideoById(hiddenId);
      assert.equal(legacy?.id, hiddenId, 'without a database upstream still serves any bundled example');
      assert.equal(isBundledFallbackVideo(legacy), false, 'and it is not marked as a Keyvo fallback');
    } finally {
      process.env.DATABASE_URL = url;
    }
  } finally {
    delete process.env.KEYVO_BUNDLED_EXAMPLES;
  }
});

test('a database row still wins over the bundled example', async () => {
  const id = wallCards()[0].id;
  databaseRows = [{
    job_id: id, user_id: 'user_1', engine_id: 'seedance-2-0', engine_label: 'Seedance 2.0', duration_sec: 5,
    prompt: 'database prompt', thumb_url: 'https://media.example.test/thumb.jpg', video_url: 'https://media.example.test/video.mp4',
    preview_video_url: null, keyframe_urls: null, aspect_ratio: '16:9', has_audio: false, can_upscale: false,
    created_at: '2026-01-01T00:00:00.000Z', visibility: 'public', indexable: true, featured: false, featured_order: null,
    final_price_cents: null, currency: null,
  }];
  try {
    for (const video of [await getVideoById(id), await getSeoVideoById(id), (await getVideosByIds([id])).get(id), (await getSeoVideosByIds([id])).get(id)]) {
      assert.equal(video?.prompt, 'database prompt');
      assert.equal(isBundledFallbackVideo(video), false);
    }
  } finally {
    databaseRows = [];
  }
});
