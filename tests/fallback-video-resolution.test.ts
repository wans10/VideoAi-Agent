import assert from 'node:assert/strict';
import test from 'node:test';
import { getVideoWatchPageDataById } from '../frontend/server/video-seo';
import { getPublicVideosByIds, listExampleFamilyPage, listExamplesPage } from '../frontend/server/videos';
import { pickDemoMedia, toGalleryCard, type FeaturedMedia } from '../frontend/app/(localized)/[locale]/(marketing)/models/[slug]/_lib/model-page-media';

test('getVideoWatchPageDataById resolves minimax-h3-wildfire-lookout-rescue without database records', async () => {
  const page = await getVideoWatchPageDataById('minimax-h3-wildfire-lookout-rescue');
  assert.ok(page, 'watch page data should be resolved');
  assert.equal(page.video.id, 'job_87d713f7-9193-4831-a9e5-59ce1e0c668c');
  assert.ok(page.video.videoUrl?.startsWith('https://media.maxvideoai.com/renders/'));
  assert.ok(page.video.thumbUrl?.startsWith('https://media.maxvideoai.com/renders/'));
  assert.equal(page.signals.canonicalSlug, 'minimax-h3-wildfire-lookout-rescue');
  assert.equal(page.isEligible, true);
});

test('getPublicVideosByIds resolves minimax-h3 lighthouse keeper demo render', async () => {
  const map = await getPublicVideosByIds(['job_91c6f549-7b07-45b3-ad45-cbaf67d10959']);
  assert.equal(map.has('job_91c6f549-7b07-45b3-ad45-cbaf67d10959'), true);
  const video = map.get('job_91c6f549-7b07-45b3-ad45-cbaf67d10959')!;
  assert.equal(video.id, 'job_91c6f549-7b07-45b3-ad45-cbaf67d10959');
  assert.ok(video.videoUrl?.startsWith('https://media.maxvideoai.com/renders/'));
  assert.ok(video.thumbUrl?.startsWith('https://media.maxvideoai.com/renders/'));

  // Test pickDemoMedia logic from model page
  const fallbackMedia: FeaturedMedia = {
    id: 'minimax-h3-hero-fallback',
    videoUrl: 'https://media.maxvideoai.com/renders/fallback.mp4',
    posterUrl: 'https://media.maxvideoai.com/renders/fallback.jpg',
    durationSec: null,
    hasAudio: true,
    href: null,
    label: 'MiniMax H3',
  };
  const card = toGalleryCard(video, 'hailuo', 'MiniMax H3', 'minimax-h3', 'minimax-h3');
  const demoMedia = pickDemoMedia([card], 'minimax-h3-hero-fallback', 'job_91c6f549-7b07-45b3-ad45-cbaf67d10959', fallbackMedia);
  assert.ok(demoMedia, 'demoMedia should be picked');
  assert.equal(demoMedia.id, 'job_91c6f549-7b07-45b3-ad45-cbaf67d10959');
  assert.ok(demoMedia.videoUrl?.startsWith('https://media.maxvideoai.com/renders/'));
  assert.ok(demoMedia.posterUrl?.startsWith('https://media.maxvideoai.com/renders/'));
});

test('listExampleFamilyPage resolves veo family gallery without database records', async () => {
  const result = await listExampleFamilyPage('veo', { sort: 'playlist', limit: 30, offset: 0 });
  assert.equal(result.total, 31);
  assert.equal(result.items.length, 30);
  assert.ok(result.items.every((item) => Boolean(item.videoUrl) && Boolean(item.thumbUrl)));
});

test('listExamplesPage resolves hub gallery without database records', async () => {
  const result = await listExamplesPage({ sort: 'playlist', limit: 12, offset: 0 });
  assert.ok(result.total >= 160);
  assert.equal(result.items.length, 12);
  assert.ok(result.items.every((item) => Boolean(item.videoUrl) && Boolean(item.thumbUrl)));
});

