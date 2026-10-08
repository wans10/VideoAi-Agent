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
    queryFn: async () => [],
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

test('Qwen accepted output-copy failure retains its charge and identity for reconciliation', async () => {
  let refunds = 0;
  let calls = 0;
  const queries: { sql: string; values?: readonly unknown[] }[] = [];
  await assert.rejects(executeAlibabaQwenImageGeneration(params, {
    queryFn: async () => [],
    getConfig: () => ({ apiKey: 'test', baseUrl: 'https://dashscope.aliyuncs.com' }),
    signReferences: async urls => urls,
    callProvider: async () => { calls++; return { requestId: 'accepted-request', images: [{ url: 'https://example.com/tmp.png' }] }; },
    copyOutputs: async () => { throw new Error('Could not persist generated image'); },
    complete: async () => { assert.fail('must not complete'); },
    fail: async input => persistFailedImageGeneration(input, {
      queryFn: async (sql, values) => { queries.push({ sql, values }); },
      recordRefundReceiptFn: async receipt => { refunds++; assert.equal(receipt.amountCents, 8); },
    }),
  }), /reconciliation/);
  assert.equal(calls, 1);
  assert.equal(refunds, 0);
  assert.equal(queries.length, 0, 'uncertain acceptance must not mark failed or refunded');
});

test('Qwen timeout leaves a durable pending job without another provider call or refund',async()=>{
  let calls=0,refunds=0;const writes:Array<{sql:string;values?:readonly unknown[]}>=[];
  await assert.rejects(executeAlibabaQwenImageGeneration(params,{
    getConfig:()=>({apiKey:'test',baseUrl:'https://dashscope.aliyuncs.com'}),signReferences:async urls=>urls,
    callProvider:async()=>{calls++;throw new DOMException('Timed out','TimeoutError');},
    queryFn:async(sql,values)=>{writes.push({sql,values});return [];},
    fail:async()=>{refunds++;throw new Error('Unexpected refund');},
  }),/reconciliation/);
  assert.equal(calls,1);assert.equal(refunds,0);
  assert.match(writes[0].sql,/status='pending'/);assert.equal(writes[0].values?.[0],params.jobId);
});

test('failed refund persistence cannot report refunded or terminally fail the job',async()=>{
  let jobWrites=0;
  await assert.rejects(persistFailedImageGeneration({
    ...params,error:new Error('rejected'),falModelId:'qwen-image-3.0',providerJobId:null,providerMode:'alibaba_qwen_image_direct',referenceImageUrls:[],
  },{queryFn:async()=>{jobWrites++;},recordRefundReceiptFn:async()=>{throw new Error('refund DB unavailable');}}),/refund DB unavailable/);
  assert.equal(jobWrites,0);
});
