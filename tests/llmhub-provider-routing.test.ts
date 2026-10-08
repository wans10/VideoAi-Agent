import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import { resolveLlmhubImageModel, assertLlmhubImageAvailable } from '../frontend/src/server/images/llmhub-image-models.ts';
import { resolveImageProviderSelection } from '../frontend/src/server/images/image-provider-routing.ts';
import { runLlmhubFlareGeneration } from '../frontend/src/server/images/llmhub-flare-generation.ts';
import { runLlmhubGeminiGeneration } from '../frontend/src/server/images/llmhub-gemini-generation.ts';
import { resolveVideoProviderRoutingPlan } from '../frontend/src/server/video-providers/router.ts';
import { resolveLlmhubVideoModel } from '../frontend/src/server/video-providers/llmhub/model-map.ts';
import { LlmhubVideoClient } from '../frontend/src/server/video-providers/llmhub/client.ts';
import { llmhubVideoSize, matchesLlmhubVideoGeometry } from '../frontend/src/server/video-providers/llmhub/video-size.ts';
import { getFalEngineById } from '../frontend/src/config/falEngines.ts';
import { ENV } from '../frontend/src/lib/env.ts';
import { resolveTrustedPaidGenerateRouteContext } from '../frontend/app/api/generate/_lib/route-context.ts';
import { resolveGenerateRouteContext } from '../frontend/app/api/generate/_lib/route-context.ts';
import { NextRequest } from 'next/server';

test('existing image engines resolve exact LLM Hub models and fail before charging without a key', () => {
  assert.deepEqual(resolveLlmhubImageModel('seedream'), {
    protocol: 'openai-image', modelId: 'doubao-seedream-5.0-lite',
  });
  assert.deepEqual(resolveLlmhubImageModel('nano-banana-2'), {
    protocol: 'gemini', modelId: 'gemini-3.1-flash-image',
  });
  assert.equal(resolveLlmhubImageModel('seedream-5-0-pro'), null);
  assert.throws(() => assertLlmhubImageAvailable('nano-banana-2', ''),
    (error: unknown) => Boolean(error && typeof error === 'object' && 'code' in error
      && error.code === 'llmhub_image_unavailable'));
});

test('configured image direct providers take precedence over LLM Hub', () => {
  const nano = getFalEngineById('nano-banana-2')?.engine;
  const seedream = getFalEngineById('seedream')?.engine;
  assert.ok(nano && seedream);
  const vertex = resolveImageProviderSelection(nano, {
    GOOGLE_VERTEX_PROJECT_ID: 'test-project',
    GOOGLE_VERTEX_SERVICE_ACCOUNT_JSON: '{"client_email":"test@example.com","private_key":"test-key"}',
    GOOGLE_VERTEX_INPUT_GCS_URI: 'gs://test/input',
  });
  assert.equal(vertex.kind, 'direct');
  if (vertex.kind === 'direct') {
    assert.equal(vertex.engine.providerMeta?.provider, 'google_vertex_image');
    assert.equal(vertex.engine.providerMeta?.modelSlug, 'gemini-3.1-flash-image');
  }
  const byteplus = resolveImageProviderSelection(seedream, {
    BYTEPLUS_ARK_ENABLED: 'true', BYTEPLUS_ARK_API_KEY: 'test-key',
  });
  assert.equal(byteplus.kind, 'direct');
  if (byteplus.kind === 'direct') assert.equal(byteplus.engine.providerMeta?.provider, 'byteplus_modelark');
  assert.equal(resolveImageProviderSelection(nano, {}).kind, 'llmhub');
  assert.equal(resolveImageProviderSelection(nano, {
    GOOGLE_VERTEX_PROJECT_ID: 'test-project',
    GOOGLE_VERTEX_SERVICE_ACCOUNT_JSON: '{}',
    GOOGLE_VERTEX_INPUT_GCS_URI: 'gs://test/input',
  }).kind, 'llmhub');
  assert.equal(resolveImageProviderSelection(seedream, {}).kind, 'llmhub');
});

test('video routing prefers configured Alibaba and Vertex over LLM Hub', () => {
  const llmhub = { LLMHUB_INFERENCE_ROUTING_ENABLED: 'true', LLMHUB_API_KEY: 'test-key' };
  assert.equal(resolveVideoProviderRoutingPlan({
    engineId: 'wan-3', mode: 't2v', isAdmin: false,
    env: { ...llmhub, ALIBABA_MODEL_STUDIO_ENABLED: 'true', ALIBABA_MODEL_STUDIO_API_KEY: 'test-direct',
      ALIBABA_MODEL_STUDIO_PUBLIC_ROUTING_ENABLED: 'true', ALIBABA_MODEL_STUDIO_ADMIN_ONLY: 'false' },
  }).kind, 'alibaba_model_studio_primary');
  assert.equal(resolveVideoProviderRoutingPlan({
    engineId: 'wan-3', mode: 't2v', isAdmin: false,
    env: { ...llmhub, ALIBABA_MODEL_STUDIO_ENABLED: 'true', ALIBABA_MODEL_STUDIO_API_KEY: '' },
  }).kind, 'llmhub_primary');
  assert.equal(resolveVideoProviderRoutingPlan({
    engineId: 'veo-3-1-lite', mode: 't2v', isAdmin: false,
    env: { ...llmhub, GOOGLE_VERTEX_VEO_ENABLED: 'true', GOOGLE_VERTEX_PROJECT_ID: 'test-project',
      GOOGLE_VERTEX_SERVICE_ACCOUNT_JSON: '{"client_email":"test@example.com","private_key":"test-key"}', GOOGLE_VERTEX_VEO_PUBLIC_ROUTING_ENABLED: 'true',
      GOOGLE_VERTEX_VEO_ADMIN_ONLY: 'false' },
    request: { durationSec: 8, resolution: '720p', aspectRatio: '16:9' },
  }).kind, 'google_vertex_veo_primary');
  assert.equal(resolveVideoProviderRoutingPlan({
    engineId: 'veo-3-1-lite', mode: 't2v', isAdmin: false, env: llmhub,
    request: { durationSec: 8, resolution: '720p', aspectRatio: '16:9' },
  }).kind, 'llmhub_primary');
});

test('Seedream and Sunburst use their own LLM Hub model IDs', async () => {
  const requested: string[] = [];
  for (const engineId of ['seedream', 'gpt-image-2-5-sunburst']) {
    await runLlmhubFlareGeneration({
      engineId, effectivePrompt: 'tree', numImages: 1, mode: 't2i', combinedImageUrls: [],
      providerImageSize: 'square', outputFormat: 'png', quality: 'high', background: null,
      maskUrl: null, jobId: `img_${engineId}`, userId: 'test-account',
    }, { apiKey: 'test-key',
      upload: async () => ({ url: 'https://example.com/image.png', key: 'owned/test', width: 1024, height: 1024, size: 100, mime: 'image/png' }),
      fetch: async (_url, init) => {
      requested.push(JSON.parse(String(init?.body)).model);
      return Response.json({ data: [engineId === 'seedream' ? { url: 'https://example.com/image.png' }
        : { b64_json: readFileSync('tests/fixtures/llmhub-square.png').toString('base64') }] });
    } });
  }
  assert.deepEqual(requested, ['doubao-seedream-5.0-lite', 'gpt-image-2.5-sunburst']);
});

test('Seedream forwards the quoted size, aspect ratio and watermark choice', async () => {
  await runLlmhubFlareGeneration({
    engineId: 'seedream', effectivePrompt: 'tree', numImages: 1, mode: 't2i',
    combinedImageUrls: [], providerImageSize: '4K', aspectRatio: '16:9',
    outputFormat: 'jpeg', quality: null, background: null, watermark: true,
    maskUrl: null, jobId: 'img_seedream',
  }, { apiKey: 'test-key', fetch: async (_url, init) => {
    const body = JSON.parse(String(init?.body));
    assert.equal(body.size, '5504x3040');
    assert.equal(body.output_format, 'jpeg');
    assert.equal(body.watermark, true);
    return Response.json({ data: [{ url: 'https://example.com/image.png' }] });
  } });
});

test('Gemini image response is persisted before returning a job result', async () => {
  const uploads: string[] = [];
  const result = await runLlmhubGeminiGeneration({
    engine: { id: 'nano-banana-2', label: 'Nano Banana 2' },
    effectivePrompt: 'red kite', numImages: 1, mode: 't2i', combinedImageUrls: [],
    falAspectRatio: '1:1', resolutionEngineParam: undefined, requestedResolution: '1k', enableWebSearch: false,
    userId: 'test-user', jobId: 'img_gemini',
  } as Parameters<typeof runLlmhubGeminiGeneration>[0], {
    apiKey: 'test-key',
    fetch: async (url, init) => {
      assert.match(String(url), /gemini-3\.1-flash-image:generateContent$/);
      assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer test-key');
      assert.equal(JSON.parse(String(init?.body)).generationConfig.imageConfig.imageSize, '1K');
      return Response.json({ responseId: 'hub-1', candidates: [{ content: { parts: [
        { inlineData: { mimeType: 'image/png', data: Buffer.from('image').toString('base64') } },
      ] } }] });
    },
    upload: async (input) => {
      uploads.push(input.fileName ?? '');
      return { url: 'https://media.maxvideoai.com/owned.png', key: 'owned.png',
        width: null, height: null, size: input.data.length, mime: input.mime };
    },
  });
  assert.deepEqual(uploads, ['img_gemini-1-1.png']);
  assert.deepEqual(result.result.data.images, [{ url: 'https://media.maxvideoai.com/owned.png' }]);
});

test('video routing selects only documented basic modes when enabled', () => {
  const enabled = { LLMHUB_INFERENCE_ROUTING_ENABLED: 'true', LLMHUB_API_KEY: 'test-key' };
  for (const [engineId, model] of [
    ['veo-3-1', 'veo-3.1-generate-001'],
    ['veo-3-1-fast', 'veo-3.1-fast-generate-001'],
    ['veo-3-1-lite', 'veo-3.1-lite-generate-001'],
    ['seedance-2-0', 'doubao-seedance-2.0'],
    ['wan-3-prime', 'wan3.0-video-prime'],
  ]) {
    assert.equal(resolveLlmhubVideoModel(engineId, 't2v'), model);
    assert.deepEqual(resolveVideoProviderRoutingPlan({
      engineId, mode: engineId.startsWith('veo-') ? 't2v' : 'i2v', isAdmin: false, env: enabled,
    }),
      { kind: 'llmhub_primary', primaryProvider: 'llmhub', modelId: model });
    assert.equal(resolveLlmhubVideoModel(engineId, 'ref2v'), null);
  }
  assert.equal(resolveVideoProviderRoutingPlan({
    engineId: 'wan-3', mode: 't2v', isAdmin: false,
    env: { LLMHUB_INFERENCE_ROUTING_ENABLED: 'true', LLMHUB_API_KEY: '' },
  }).kind, 'fal_only');
  for (const engineId of ['veo-3-1', 'veo-3-1-fast', 'veo-3-1-lite']) {
    assert.notEqual(resolveVideoProviderRoutingPlan({
      engineId, mode: 'i2v', isAdmin: false, env: enabled,
    }).kind, 'llmhub_primary');
    for (const request of [
      { durationSec: 4, resolution: '720p' },
      { durationSec: 8, resolution: '1080p' },
      { durationSec: 8, resolution: '720p', aspectRatio: '9:16' },
    ]) {
      assert.notEqual(resolveVideoProviderRoutingPlan({
        engineId, mode: 't2v', isAdmin: false, env: enabled, request,
      }).kind, 'llmhub_primary');
    }
  }
});

test('video routing preserves requests with unsupported reference and control inputs', () => {
  const env = { LLMHUB_INFERENCE_ROUTING_ENABLED: 'true', LLMHUB_API_KEY: 'test-key' };
  for (const request of [
    { endImageUrl: 'https://example.com/end.png' },
    { attachments: [{ kind: 'image', slotId: 'last_frame_url', url: 'https://example.com/end.png' }] },
    { extraInputValues: { camera_motion: 'left' } },
    { negativePrompt: 'blur' },
    { audio: false },
  ]) {
    assert.notEqual(resolveVideoProviderRoutingPlan({
      engineId: 'wan-3', mode: 'i2v', isAdmin: false, env, request,
    }).kind, 'llmhub_primary');
  }
  assert.notEqual(resolveVideoProviderRoutingPlan({
    engineId: 'wan-3', mode: 't2v', isAdmin: false, env,
    request: { imageUrl: 'https://example.com/start.png' },
  }).kind, 'llmhub_primary');
  assert.notEqual(resolveVideoProviderRoutingPlan({
    engineId: 'wan-3', mode: 'i2v', isAdmin: false, env,
    request: { attachments: [
      { kind: 'image', slotId: 'image_url', url: 'https://example.com/a.png' },
      { kind: 'image', slotId: 'image_url', url: 'https://example.com/b.png' },
    ] },
  }).kind, 'llmhub_primary');
});

test('the trusted route can select LLM Hub before Mini and Seedance 2.5 BytePlus gates', () => {
  for (const engineId of ['seedance-2-0-mini', 'seedance-2-5']) {
    const entry = getFalEngineById(engineId);
    assert.ok(entry);
    const result = resolveTrustedPaidGenerateRouteContext({
      body: {}, engine: entry.engine, jobId: 'job-1', mode: 't2v',
      providerEnv: { LLMHUB_INFERENCE_ROUTING_ENABLED: 'true', LLMHUB_API_KEY: 'test-key' },
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.context.isBytePlusV1a, false);
      assert.equal(result.context.providerKey, 'llmhub');
    }
  }
});

test('a configured BytePlus Mini route takes precedence over LLM Hub', { concurrency: false }, () => {
  const oldEnabled = ENV.BYTEPLUS_ARK_ENABLED;
  const oldKey = ENV.BYTEPLUS_ARK_API_KEY;
  ENV.BYTEPLUS_ARK_ENABLED = 'true';
  ENV.BYTEPLUS_ARK_API_KEY = 'test-direct-key';
  try {
    const entry = getFalEngineById('seedance-2-0-mini');
    assert.ok(entry);
    const result = resolveTrustedPaidGenerateRouteContext({
      body: {}, engine: entry.engine, jobId: 'job-direct', mode: 't2v',
      providerEnv: { LLMHUB_INFERENCE_ROUTING_ENABLED: 'true', LLMHUB_API_KEY: 'test-hub-key' },
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.context.isBytePlusV1a, true);
      assert.equal(result.context.providerKey, 'byteplus_modelark');
    }
  } finally {
    ENV.BYTEPLUS_ARK_ENABLED = oldEnabled;
    ENV.BYTEPLUS_ARK_API_KEY = oldKey;
  }
});

test('public Seedance 2.5 basic route bypasses the disabled BytePlus gate when LLM Hub is enabled', { concurrency: false }, async () => {
  const entry = getFalEngineById('seedance-2-5');
  assert.ok(entry);
  const oldFlag = process.env.LLMHUB_INFERENCE_ROUTING_ENABLED;
  const oldKey = process.env.LLMHUB_API_KEY;
  process.env.LLMHUB_INFERENCE_ROUTING_ENABLED = 'true';
  process.env.LLMHUB_API_KEY = 'test-key';
  try {
    const result = await resolveGenerateRouteContext({
      body: { engineId: 'seedance-2-5', mode: 't2v' },
      req: new NextRequest('http://localhost/api/generate', { method: 'POST' }),
      boundaryOverrides: {
        getConfiguredEngine: async () => entry.engine,
        isDatabaseConfigured: () => true,
        ensureBillingSchema: async () => {},
      },
    } as Parameters<typeof resolveGenerateRouteContext>[0]);
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.context.providerKey, 'llmhub');
  } finally {
    if (oldFlag === undefined) delete process.env.LLMHUB_INFERENCE_ROUTING_ENABLED;
    else process.env.LLMHUB_INFERENCE_ROUTING_ENABLED = oldFlag;
    if (oldKey === undefined) delete process.env.LLMHUB_API_KEY;
    else process.env.LLMHUB_API_KEY = oldKey;
  }
});

test('video client submits documented multipart fields and polls status', async () => {
  const calls: string[] = [];
  const client = new LlmhubVideoClient('test-key', async (url, init) => {
    calls.push(`${init?.method ?? 'GET'} ${url}`);
    if (init?.method === 'POST') {
      assert.ok(init.body instanceof FormData);
      assert.equal(init.body.get('model'), 'wan3.0-video');
      assert.equal(init.body.get('seconds'), '5');
      return Response.json({ id: 'task-1', status: 'queued' });
    }
    return Response.json({ id: 'task-1', status: 'in_progress', progress: 42 });
  });
  assert.equal((await client.create({ model: 'wan3.0-video', prompt: 'sky', seconds: 5, jobId: 'job-1' })).id, 'task-1');
  assert.equal((await client.status('task-1')).status, 'running');
  assert.deepEqual(calls, [
    'POST https://api.llmhub.com.cn/v1/videos',
    'GET https://api.llmhub.com.cn/v1/videos/task-1',
  ]);
});

test('all three Veo text models use the accepted JSON video request shape', async () => {
  for (const model of ['veo-3.1-generate-001', 'veo-3.1-fast-generate-001', 'veo-3.1-lite-generate-001']) {
    const client = new LlmhubVideoClient('test-key', async (url, init) => {
      assert.equal(url, 'https://api.llmhub.com.cn/v1/videos');
      assert.equal(new Headers(init?.headers).get('content-type'), 'application/json');
      assert.deepEqual(JSON.parse(String(init?.body)), {
        model, prompt: 'misty forest', seconds: 8, resolution: '720p',
      });
      return Response.json({ id: 'task-veo', status: 'queued' });
    });
    assert.equal((await client.create({
      model, prompt: 'misty forest', seconds: 8,
      size: '1280x720', resolution: '720p', aspectRatio: '16:9', jobId: 'job-veo',
    })).id, 'task-veo');
  }
});

test('Seedance and Wan send a URL reference with provider metadata', async () => {
  for (const model of ['doubao-seedance-2.0-mini', 'wan3.0-video']) {
    const client = new LlmhubVideoClient('test-key', async (_url, init) => {
      assert.ok(init?.body instanceof FormData);
      const form = init.body as FormData;
      assert.equal(form.get('input_reference'), 'https://media.maxvideoai.com/owned.png');
      const metadata = JSON.parse(String(form.get('metadata')));
      assert.equal(metadata.resolution, model.startsWith('doubao-') ? '480p' : undefined);
      assert.equal(metadata.ratio, undefined);
      assert.equal(metadata.content[1].image_url.url, 'https://media.maxvideoai.com/owned.png');
      return Response.json({ id: 'task-1', status: 'queued' });
    });
    assert.equal((await client.create({
      model, prompt: 'sky', seconds: 5, size: model.startsWith('wan') ? '832x480' : '854x480',
      resolution: '480p', aspectRatio: '16:9', imageUrl: 'https://media.maxvideoai.com/owned.png',
      jobId: `job-${model}`,
    })).id, 'task-1');
  }
});

test('Seedance text generation carries its selected resolution and ratio in metadata', async () => {
  const client = new LlmhubVideoClient('test-key', async (_url, init) => {
    const form = init?.body as FormData;
    const metadata = JSON.parse(String(form.get('metadata')));
    assert.equal(metadata.resolution, '480p');
    assert.equal(metadata.ratio, '16:9');
    assert.equal(form.get('input_reference'), null);
    return Response.json({ id: 'task-1', status: 'queued' });
  });
  await client.create({ model: 'doubao-seedance-2.0-mini', prompt: 'sky', seconds: 5,
    resolution: '480p', aspectRatio: '16:9', jobId: 'job-text' });
});

test('video geometry follows the charged resolution and rejects a mismatched output', () => {
  assert.equal(llmhubVideoSize('480p', '16:9', 'wan-3'), '832x480');
  assert.equal(llmhubVideoSize('480p', 'auto', 'wan-3-prime'), '832x480');
  assert.equal(llmhubVideoSize('1080p', '16:9'), '1920x1080');
  assert.equal(llmhubVideoSize('720p', '9:16'), '720x1280');
  assert.equal(matchesLlmhubVideoGeometry({ resolution: '1080p', aspectRatio: '16:9', width: 1920, height: 1080 }), true);
  assert.equal(matchesLlmhubVideoGeometry({ resolution: '4k', aspectRatio: '16:9', width: 1920, height: 1080 }), false);
  assert.equal(matchesLlmhubVideoGeometry({ resolution: '720p', aspectRatio: '9:16', width: 1280, height: 720 }), false);
});
