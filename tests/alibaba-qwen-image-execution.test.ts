import assert from 'node:assert/strict';
import test from 'node:test';
import { listFalEngines } from '../frontend/src/config/falEngines';
import { executeAlibabaQwenImageGeneration } from '../frontend/src/server/images/alibaba-qwen-image-execution';
import { persistFailedImageGeneration } from '../frontend/src/server/images/image-generation-failure';
import type { PricingSnapshot } from '../frontend/types/engines';

const entry = listFalEngines().find(x => x.id === 'qwen-image-3-0')!;
const pricing = { totalCents: 8, currency: 'CNY' } as PricingSnapshot;
const params: Parameters<typeof executeAlibabaQwenImageGeneration>[0] = {
  billingProductKey: null, characterReferenceCount: 0, combinedImageUrls: ['https://example.com/input.png'],
  costBreakdownJson: null, effectivePrompt: 'Edit the cup', engine: entry.engine, engineEntry: entry,
  indexable: false, jobId: 'img_test', jobSurface: 'image', limitGenerations: false, maskUrl: null,
  mode: 'i2i', normalizedSeed: null, numImages: 1, outputFormat: 'png', priceOnlyReceipts: true,
  pricing, pricingSnapshotJson: JSON.stringify(pricing), quality: null, refundDescription: 'Refund image',
  resolvedAspectRatio: '1:1', resolution: '1k', thinkingLevel: null, userId: 'user_test',
  vendorAccountId: null, visibility: 'private', watermark: false,
  pendingReceipt: { userId: 'user_test', amountCents: 8, currency: 'CNY', description: 'Image', jobId: 'img_test',
    surface: 'image', billingProductKey: null, snapshot: pricing, applicationFeeCents: null, vendorAccountId: null },
};

test('Qwen completes only after owned output copy and thumbnail preparation', async () => {
  const events: string[] = [];
  const result = await executeAlibabaQwenImageGeneration(params, {
    getConfig: () => ({ apiKey: 'test', baseUrl: 'https://dashscope.aliyuncs.com' }),
    signReferences: async () => ['https://example.com/signed.png?signature=test'],
    callProvider: async (_, payload) => {
      events.push('provider');
      assert.equal(payload.model, 'qwen-image-3.0');
      assert.equal((payload.input.messages[0].content[0] as { image: string }).image, 'https://example.com/signed.png?signature=test');
      return { requestId: 'request-test', images: [{ url: 'https://example.com/temporary.png' }] };
    },
    copyOutputs: async input => {
      events.push('copy'); assert.equal(input.requireOwnedOutput, true);
      return [{ url: 'https://cdn.example.com/owned.png' }];
    },
    createThumbnails: async () => { events.push('thumbnail'); return ['https://cdn.example.com/thumb.webp']; },
    complete: async input => {
      events.push('complete');
      assert.equal(input.providerMode, 'alibaba_qwen_image_direct');
      assert.equal(input.images[0].url, 'https://cdn.example.com/owned.png');
      assert.equal(input.pricing, pricing);
      return { hero: input.images[0].url, heroThumb: 'https://cdn.example.com/thumb.webp', renderIdsJson: '[]', storedRenderEntries: [] };
    },
    fail: async () => { assert.fail('must not fail'); },
  });
  assert.equal(result.ok, true);
  assert.deepEqual(events, ['provider', 'copy', 'thumbnail', 'complete']);
});

test('Qwen output-copy failure records provider request id and refunds the reservation exactly once', async () => {
  let refunds = 0;
  let calls = 0;
  const queries: { sql: string; values?: readonly unknown[] }[] = [];
  await assert.rejects(executeAlibabaQwenImageGeneration(params, {
    getConfig: () => ({ apiKey: 'test', baseUrl: 'https://dashscope.aliyuncs.com' }),
    signReferences: async urls => urls,
    callProvider: async () => { calls++; return { requestId: 'accepted-request', images: [{ url: 'https://example.com/tmp.png' }] }; },
    copyOutputs: async () => { throw new Error('Could not persist generated image'); },
    complete: async () => { assert.fail('must not complete'); },
    fail: async input => persistFailedImageGeneration(input, {
      queryFn: async (sql, values) => { queries.push({ sql, values }); },
      recordRefundReceiptFn: async receipt => { refunds++; assert.equal(receipt.amountCents, 8); },
    }),
  }), /Could not persist/);
  assert.equal(calls, 1);
  assert.equal(refunds, 1);
  assert.equal(queries[0].values?.[2], 'accepted-request');
  assert.equal(queries[0].values?.[3], 'refunded_wallet');
  assert.equal(queries[1].values?.[1], 'alibaba_qwen_image_direct');
});
