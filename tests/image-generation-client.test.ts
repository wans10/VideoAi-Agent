import assert from 'node:assert/strict';
import test from 'node:test';
import { submitImageGeneration } from '../frontend/lib/image-generation-client';
import type { JobStatusResult } from '../frontend/lib/api-job-status';

const payload = { jobId: 'img_test', engineId: 'qwen-image-3-0', mode: 't2i' as const, prompt: 'cup', resolution: '1k' };
const done: JobStatusResult = { ok: true, jobId: 'img_test', status: 'completed', progress: 100,
  videoUrl: null, thumbUrl: 'https://example.com/thumb.webp', renderIds: ['https://example.com/image.png'],
  renderThumbUrls: ['https://example.com/thumb.webp'], finalPriceCents: 24, currency: 'CNY', paymentStatus: 'paid_wallet' };

for (const status of [200, 502, 504]) test(`image client recovers completed output after non-JSON HTTP ${status} without resubmitting`, async () => {
  let posts = 0;
  let reads = 0;
  const result = await submitImageGeneration(payload, {
    fetch: async () => { posts++; return new Response('<html>upstream timed out</html>', { status }); },
    getStatus: async jobId => { reads++; assert.equal(jobId, payload.jobId); return done; },
    sleep: async () => {}, isCurrent: () => true,
  });
  assert.equal(posts, 1); assert.equal(reads, 1);
  assert.equal(result.ok, true); assert.equal(result.images[0].url, done.renderIds![0]);
  assert.equal(result.costCents, 24); assert.equal(result.currency, 'CNY');
});

test('image client waits through pending state after a network disconnect', async () => {
  let reads = 0;
  const result = await submitImageGeneration(payload, { fetch: async () => { throw new TypeError('network'); },
    getStatus: async () => ++reads === 1 ? { ...done, status: 'pending', renderIds: [] } : done,
    sleep: async () => {}, isCurrent: () => true });
  assert.equal(reads, 2); assert.equal(result.ok, true);
});

test('image client keeps normal JSON success and provider failure behavior', async () => {
  const normal = { ok: true, mode: 't2i', images: [{ url: 'https://example.com/a.png' }] };
  const result = await submitImageGeneration(payload, { fetch: async () => Response.json(normal),
    getStatus: async () => { assert.fail('must not poll'); } });
  assert.deepEqual(result, normal);
  await assert.rejects(submitImageGeneration(payload, { fetch: async () => Response.json({ ok: false,
    error: { code: 'provider_blocked', message: 'Blocked' } }, { status: 422 }),
    getStatus: async () => { assert.fail('must not poll'); } }), /Blocked/);
});

test('image client bounds recovery, respects account changes and propagates stored failures', async () => {
  let reads = 0;
  const deps = { fetch: async () => new Response('timeout', { status: 504 }), sleep: async () => {}, isCurrent: () => true };
  await assert.rejects(submitImageGeneration(payload, { ...deps,
    getStatus: async () => { reads++; return { ...done, status: 'pending', renderIds: [] }; } }), /history before submitting again/);
  assert.equal(reads, 24);
  await assert.rejects(submitImageGeneration(payload, { ...deps, isCurrent: () => false,
    getStatus: async () => { assert.fail('changed account must not read'); } }), /account changed/);
  await assert.rejects(submitImageGeneration(payload, { ...deps,
    getStatus: async () => ({ ...done, status: 'failed', message: 'Provider rejected input' }) }), /Provider rejected input/);
  await assert.rejects(submitImageGeneration({ ...payload, jobId: undefined }, { ...deps,
    getStatus: async () => { assert.fail('missing id must not poll'); } }), /history/);
});
