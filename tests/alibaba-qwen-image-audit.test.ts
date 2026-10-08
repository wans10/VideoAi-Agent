import assert from 'node:assert/strict';
import test from 'node:test';
import { buildQwenImagePayload, extractQwenImageResult, getQwenImageConfig, QwenImageError } from '../frontend/src/server/images/alibaba-qwen-image-client';
import { estimateWebImageGeneration } from '../frontend/src/server/images/estimate-image-generation';
import { POST as estimateRoute } from '../frontend/app/api/images/estimate/route';
import { QWEN_IMAGE_IDS, QWEN_IMAGE_RATIOS, calculateQwenImageCost } from '../frontend/src/lib/image/qwen-image';
import { listFalEngines } from '../frontend/src/config/falEngines';
import { computeCanonicalBillingSnapshot } from '../frontend/server/pricing/quote-billing';

const base = { engineId: 'qwen-image-3-0', resolution: '1k', numImages: 1 };
test('audit: Qwen estimates reject invalid references and ratios with structured 400 errors', async () => {
  for (const input of [
    { mode: 'i2i' as const, referenceImageCount: 0 },
    { mode: 'i2i' as const, referenceImageCount: 4 },
    { mode: 't2i' as const, aspectRatio: 'bogus' },
  ]) {
    await assert.rejects(estimateWebImageGeneration({ ...base, ...input }), (e: { status?: number }) => e.status === 400);
  }
  const response = await estimateRoute(new Request('https://example.com/api/images/estimate', {
    method: 'POST', body: JSON.stringify({ ...base, mode: 'i2i', imageUrls: [] }),
  }) as never);
  assert.equal(response.status, 400);
});

test('audit: 112 actual estimate and billing scenarios agree on input/output cost and final charge', async () => {
  let checked = 0;
  for (const engineId of QWEN_IMAGE_IDS) for (const resolution of ['1k', '2k'])
    for (const aspectRatio of QWEN_IMAGE_RATIOS) for (const referenceImageCount of [0, 1, 2, 3]) {
      const mode = referenceImageCount ? 'i2i' as const : 't2i' as const;
      const engine = listFalEngines().find(x => x.id === engineId)!.engine;
      const estimate = await estimateWebImageGeneration({ engineId, resolution, aspectRatio, mode,
        referenceImageCount, numImages: 1 });
      const billed = await computeCanonicalBillingSnapshot({ engine, resolution, aspectRatio, mode,
        referenceImageCount, durationSec: 1, currency: 'USD' });
      const expected = calculateQwenImageCost({ engineId, resolution, aspectRatio, mode,
        referenceImageCount, outputCount: 1 });
      assert.equal(estimate.pricing.totalCents, billed.totalCents);
      assert.equal(estimate.pricing.currency, billed.currency);
      assert.equal(billed.meta?.output_cny, expected.outputCny);
      assert.equal(billed.meta?.input_cny, expected.inputCny);
      assert.ok(Number.isSafeInteger(billed.totalCents));
      assert.ok(billed.totalCents > 0);
      checked++;
    }
  assert.equal(checked, 112);
});

test('audit: Qwen malformed responses fail as provider errors, including bad measured dimensions', () => {
  const validOutput = { choices: [{ message: { content: [{ image: 'https://example.com/a.png' }] } }] };
  for (const body of [
    null, [], { output: { choices: {} } }, { output: { choices: [null] } },
    { output: { choices: [{ message: { content: {} } }] } },
    { output: validOutput, usage: { output_width: -1, output_height: 'bad' } },
  ]) assert.throws(() => extractQwenImageResult(body as never), QwenImageError);
});

test('audit: provider payload accepts official IDs only and Beijing pricing cannot route to other regions', () => {
  assert.throws(() => buildQwenImagePayload({ modelId: 'qwen-image-3-0', prompt: 'cup', mode: 't2i',
    imageUrls: [], resolution: '1k', aspectRatio: '1:1', numImages: 1, seed: null, watermark: false }), QwenImageError);
  assert.throws(() => getQwenImageConfig({ ALIBABA_MODEL_STUDIO_API_KEY: 'test',
    ALIBABA_MODEL_STUDIO_BASE_URL: 'https://workspace.ap-southeast-1.maas.aliyuncs.com' }), /Beijing/);
});
