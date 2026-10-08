import assert from 'node:assert/strict';
import test from 'node:test';
import { listFalEngines } from '../frontend/src/config/falEngines';
import { calculateQwenImageCost, QWEN_IMAGE_IDS, QWEN_IMAGE_RATIOS, resolveQwenImageSize } from '../frontend/src/lib/image/qwen-image';
import { buildQwenImagePayload, callQwenImage, extractQwenImageResult, getQwenImageConfig } from '../frontend/src/server/images/alibaba-qwen-image-client';
import { buildBillingPricingFacts } from '../frontend/src/lib/pricing-billing-facts';
import { buildPublicPricingFacts } from '../frontend/src/lib/pricing-public-facts';
import { resolveImageProviderSelection } from '../frontend/src/server/images/image-provider-routing';

const success = { request_id: 'request-test', output: { choices: [{ message: { content: [{ image: 'https://example.com/image.png?Expires=123' }] } }] }, usage: { output_width: 1024, output_height: 1024 } };
const input = { modelId: 'qwen-image-3.0', prompt: 'A ceramic cup', mode: 't2i' as const,
  imageUrls: [], resolution: '1k', aspectRatio: '1:1', numImages: 1, seed: null, watermark: false };

test('Qwen registrations expose verified application capabilities and direct routing', () => {
  for (const id of QWEN_IMAGE_IDS) {
    const entry = listFalEngines().find(x => x.id === id)!;
    assert.ok(entry);
    assert.equal(entry.surfaces.app.enabled, true);
    assert.equal(entry.surfaces.modelPage.indexable, false);
    assert.equal(entry.engine.providerMeta?.modelSlug, id.replace('3-0', '3.0'));
    assert.equal(resolveImageProviderSelection(entry.engine, {}).kind, 'direct');
    assert.equal(entry.engine.inputSchema?.optional?.find(x => x.id === 'image_urls')?.maxCount, 3);
    assert.equal(entry.engine.inputSchema?.optional?.find(x => x.id === 'num_images')?.max, 1);
  }
});

test('all 28 model/resolution/ratio combinations preserve billing tier and pixel constraints', () => {
  let count = 0;
  for (const engineId of QWEN_IMAGE_IDS) for (const resolution of ['1k', '2k']) for (const aspectRatio of QWEN_IMAGE_RATIOS) {
    const size = resolveQwenImageSize(resolution, aspectRatio);
    assert.ok(size.width * size.height >= 512 ** 2 && size.width * size.height <= 2048 ** 2);
    const cost = calculateQwenImageCost({ engineId, resolution, aspectRatio, mode: 'i2i', referenceImageCount: 3, outputCount: 1 });
    assert.equal(cost.tier, resolution);
    assert.equal(cost.inputCny, 0.06);
    assert.equal(cost.outputCny, engineId.endsWith('-pro') ? resolution === '2k' ? 0.50 : 0.25 : 0.18);
    const engine = listFalEngines().find(x => x.id === engineId)!.engine;
    const context = { engine, resolution, aspectRatio, mode: 'i2i' as const, referenceImageCount: 3, durationSec: 1 };
    const billing = buildBillingPricingFacts(context, engine.pricingDetails, 'USD');
    const publicFacts = buildPublicPricingFacts(context);
    assert.equal(billing.facts.vendorSubtotalExactCents, cost.subtotalUsdCents);
    assert.equal(publicFacts.facts.vendorSubtotalExactCents, cost.subtotalUsdCents);
    count++;
  }
  assert.equal(count, 28);
});

test('Qwen payload uses DashScope size and ordered image/text content', () => {
  const payload = buildQwenImagePayload({ ...input, mode: 'i2i', imageUrls: ['https://example.com/1.png', 'https://example.com/2.png'], seed: 12 });
  assert.equal(payload.parameters.size, '1024*1024');
  assert.equal(payload.parameters.seed, 12);
  assert.deepEqual(payload.input.messages[0].content, [{ image: 'https://example.com/1.png' }, { image: 'https://example.com/2.png' }, { text: input.prompt }]);
  assert.throws(() => buildQwenImagePayload({ ...input, mode: 'i2i' }), /1–3/);
  assert.throws(() => buildQwenImagePayload({ ...input, mode: 'i2i', imageUrls: Array(4).fill('https://example.com/a.png') }), /1–3/);
  assert.throws(() => buildQwenImagePayload({ ...input, numImages: 2 }), /one output/);
  assert.throws(() => buildQwenImagePayload({ ...input, seed: 2147483648 }), /out of range/);
  assert.throws(() => buildQwenImagePayload({ ...input, modelId: 'unknown' }), /Invalid/);
  assert.throws(() => resolveQwenImageSize('4k'), /Unsupported/);
});

test('Qwen client uses the workspace endpoint once and preserves request id and dimensions', async () => {
  const config = getQwenImageConfig({ ALIBABA_MODEL_STUDIO_API_KEY: 'test-key', ALIBABA_MODEL_STUDIO_BASE_URL: 'https://workspace.cn-beijing.maas.aliyuncs.com' });
  let calls = 0;
  const result = await callQwenImage(config, buildQwenImagePayload(input), async (url, init) => {
    calls++;
    assert.equal(url, 'https://workspace.cn-beijing.maas.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation');
    assert.equal((init?.headers as Record<string, string>).Authorization, 'Bearer test-key');
    assert.equal(JSON.parse(init?.body as string).model, 'qwen-image-3.0');
    assert.ok(init?.signal);
    return Response.json(success);
  });
  assert.equal(calls, 1);
  assert.equal(result.requestId, 'request-test');
  assert.equal(result.images[0].width, 1024);
  assert.equal(result.images[0].url, success.output.choices[0].message.content[0].image);
});

test('Qwen rejects provider failures, empty results and non-HTTPS output; never resubmits', async () => {
  const config = { apiKey: 'test', baseUrl: 'https://dashscope.aliyuncs.com' };
  for (const status of [200, 400, 403, 429, 500]) {
    let calls = 0;
    await assert.rejects(callQwenImage(config, buildQwenImagePayload(input), async () => {
      calls++; return Response.json({ code: 'InvalidParameter', message: 'Rejected' }, { status });
    }), /Rejected/);
    assert.equal(calls, 1);
  }
  assert.throws(() => extractQwenImageResult({}), /requested image/);
  assert.throws(() => extractQwenImageResult({ output: { choices: [{ message: { content: [{ image: 'http://example.com/a.png' }] } }] } }), /Invalid/);
  assert.throws(() => getQwenImageConfig({}), /required/);
  assert.throws(() => getQwenImageConfig({ ALIBABA_MODEL_STUDIO_API_KEY: 'test', ALIBABA_MODEL_STUDIO_BASE_URL: 'https://dashscope.aliyuncs.com/api/v1' }), /without a path/);
});
