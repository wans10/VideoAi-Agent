import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import {
  assertLlmhubFlareAvailable,
  isLlmhubFlareEngine,
  runLlmhubFlareGeneration,
} from '../frontend/src/server/images/llmhub-flare-generation.ts';

const png = readFileSync('tests/fixtures/llmhub-output.png');

test('legacy Flare-only credential helper stays scoped' , () => {
  assert.equal(isLlmhubFlareEngine('gpt-image-2-5-flare'), true);
  assert.equal(isLlmhubFlareEngine('gpt-image-2-5-sunburst'), false);
  assert.doesNotThrow(() => assertLlmhubFlareAvailable('gpt-image-2-5-sunburst', undefined));
  assert.throws(() => assertLlmhubFlareAvailable('gpt-image-2-5-flare', ''),
    (error: unknown) => Boolean(error && typeof error === 'object' && 'code' in error
      && error.code === 'llmhub_image_unavailable'));
});

test('Flare text to image uses LLM Hub OpenAI-compatible generation API', async () => {
  let called = false;
  const result = await runLlmhubFlareGeneration({
    effectivePrompt: 'A red kite', numImages: 2, mode: 't2i', combinedImageUrls: [],
    providerImageSize: 'landscape_4_3', outputFormat: 'png', quality: 'high',
    background: 'opaque', maskUrl: null, jobId: 'img_test', userId: 'account-1',
  }, {
    apiKey: 'test-only-key',
    upload: async (params) => { assert.equal(params.userId, 'account-1'); assert.deepEqual(params.data, png); return {url: 'https://example.com/output.png', key: 'test', width: 1024, height: 768, size: png.length, mime: 'image/png'}; },
    fetch: async (input, init) => {
      called = true;
      assert.equal(input, 'https://api.llmhub.com.cn/v1/images/generations');
      assert.equal(init?.method, 'POST');
      assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer test-only-key');
      assert.equal(new Headers(init?.headers).get('idempotency-key'), 'img_test');
      assert.deepEqual(JSON.parse(String(init?.body)), {
        model: 'gpt-image-2.5-flare', prompt: 'A red kite', n: 2, size: '1024x768',
        quality: 'high', background: 'opaque', output_format: 'png',
      });
      return Response.json({ data: Array.from({length: 2}, () => ({ b64_json: png.toString('base64') })) }, {
        headers: { 'x-request-id': 'hub-request-1' },
      });
    },
  });
  assert.equal(called, true);
  assert.equal(result.providerMode, 'LLMHUB');
  assert.equal(result.providerJobId, 'hub-request-1');
  assert.deepEqual(result.result.data.images, [{ url: 'https://example.com/output.png' }, { url: 'https://example.com/output.png' }]);
});

test('Flare edit sends source images as multipart files to LLM Hub', async () => {
  let referenceFetches = 0;
  await runLlmhubFlareGeneration({
    effectivePrompt: 'Change the sky', numImages: 1, mode: 'i2i',
    combinedImageUrls: ['https://media.maxvideoai.com/source.png'],
    providerImageSize: 'auto', outputFormat: 'png', quality: 'max',
    background: 'auto', maskUrl: null, jobId: 'img_edit_test', userId: 'account-1',
  }, {
    apiKey: 'test-only-key',
    upload: async () => ({url:'https://example.com/edited.png', key:'test', width:1024, height:1024, size:png.length, mime:'image/png'}),
    fetch: async (input, init) => {
      if (String(input) === 'https://media.maxvideoai.com/source.png') {
        referenceFetches += 1;
        return new Response(new Uint8Array([137, 80, 78, 71]), {
          headers: { 'content-type': 'image/png' },
        });
      }
      assert.equal(input, 'https://api.llmhub.com.cn/v1/images/edits');
      assert.ok(init?.body instanceof FormData);
      assert.equal(init.body.get('model'), 'gpt-image-2.5-flare');
      assert.equal(init.body.get('size'), '1024x1024');
      assert.equal(init.body.get('response_format'), null);
      assert.equal(init.body.get('quality'), 'max');
      assert.equal(init.body.getAll('image').length, 1);
      assert.ok(init.body.get('image') instanceof File);
      return Response.json({ data: [{ b64_json: readFileSync('tests/fixtures/llmhub-square.png').toString('base64') }] });
    },
  });
  assert.equal(referenceFetches, 1);
});

test('Flare cannot persist an output without account ownership', async () => {
  await assert.rejects(runLlmhubFlareGeneration({
    effectivePrompt: 'A red kite', numImages: 1, mode: 't2i', combinedImageUrls: [],
    providerImageSize: 'square', outputFormat: 'png', quality: 'high',
    background: 'auto', maskUrl: null, jobId: 'img_empty_test',
  }, { apiKey: 'test-only-key', fetch: async () => Response.json({ data: [{ b64_json: 'abc' }] }) }),
  /Owned storage requires an image account/);
});
