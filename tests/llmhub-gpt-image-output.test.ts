import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runLlmhubFlareGeneration } from '../frontend/src/server/images/llmhub-flare-generation.ts';
import { extractImages } from '../frontend/src/server/images/image-provider-payload.ts';
import { copyGeneratedImagesToStorage } from '../frontend/src/server/images/image-output-storage.ts';
import { storeLlmhubImageOutputs } from '../frontend/src/server/images/llmhub-image-output.ts';
import { resolveGptImage25PricingTier, resolveGptImage2PricingTier } from '../frontend/lib/image/gptImage2.ts';
import { listFalEngines } from '../frontend/src/config/falEngines.ts';

const png = readFileSync('tests/fixtures/llmhub-output.png');
const input = {
  effectivePrompt: 'Test', numImages: 1, mode: 't2i' as const, combinedImageUrls: [],
  providerImageSize: 'landscape_4_3', outputFormat: 'png', quality: 'high',
  background: 'opaque', maskUrl: null, jobId: 'test-job', userId: 'account-1',
};
const stored = { url: 'https://media.maxvideoai.com/owned.png', key: 'renders/images/account-1/test.png',
  width: 1024, height: 768, size: png.length, mime: 'image/png' };

for (const engineId of ['gpt-image-2-5-flare', 'gpt-image-2-5-sunburst']) {
  test(`${engineId} persists Base64 before returning owned results`, async () => {
    let captured: string | null = null;
    let submissions = 0;
    const result = await runLlmhubFlareGeneration({ ...input, engineId,
      onProviderJobId: (id) => { captured = id; },
    }, {
      apiKey: 'test', fetch: async (_url, init) => {
        submissions += 1;
        const request = JSON.parse(String(init?.body));
        assert.equal(request.model, engineId.replace('3-0', '3.0').replace('2-5', '2.5'));
        assert.equal(request.response_format, undefined);
        return Response.json({ data: [{ b64_json: png.toString('base64') }] }, {
          headers: { 'x-request-id': 'accepted-1' },
        });
      }, upload: async (params) => {
        assert.equal(captured, 'accepted-1');
        assert.equal(params.userId, input.userId);
        assert.equal(params.prefix, 'renders/images');
        assert.equal(params.fileName, 'test-job-1.png');
        assert.deepEqual(params.data, png);
        return stored;
      },
    });
    assert.equal(submissions, 1);
    assert.equal(result.providerJobId, 'accepted-1');
    assert.deepEqual(result.result.data.images, [{ url: stored.url, width: 1024, height: 768, content_type: 'image/png' }]);
    const projected = await copyGeneratedImagesToStorage({
      images: extractImages(result.result.data), jobId: input.jobId, userId: input.userId, requireOwnedOutput: true,
      deps: { isStorageConfigured: () => true, extractStorageKeyFromUrl: () => stored.key,
        fetch: async () => { throw new Error('Owned output must not be fetched again'); },
        uploadImageToStorage: async () => { throw new Error('Owned output must not be uploaded again'); } },
    });
    assert.deepEqual(projected, [{ url: stored.url, width: 1024, height: 768, mimeType: 'image/png' }]);
  });
}

test('accepted storage failure retains provider identity and never resubmits', async () => {
  let submissions = 0;
  let captured: string | null = null;
  await assert.rejects(runLlmhubFlareGeneration({ ...input,
    onProviderJobId: (id) => { captured = id; },
  }, {
    apiKey: 'test', fetch: async () => {
      submissions += 1;
      return Response.json({ data: [{ b64_json: png.toString('base64') }] }, { headers: { 'x-request-id': 'accepted-2' } });
    }, upload: async () => { throw new Error('storage unavailable'); },
  }), /storage unavailable/);
  assert.equal(submissions, 1);
  assert.equal(captured, 'accepted-2');
});

test('504 remains an explicit uncertain failure with no repeated POST', async () => {
  let submissions = 0;
  await assert.rejects(runLlmhubFlareGeneration(input, {
    apiKey: 'test', fetch: async () => { submissions += 1; return new Response('<html>504</html>', { status: 504 }); },
  }), (error: unknown) => Boolean(error && typeof error === 'object' && 'status' in error && error.status === 504));
  assert.equal(submissions, 1);
});

test('invalid encoding, wrong format and incomplete batch cannot reach upload', async () => {
  for (const data of [[{ b64_json: 'abc!' }], [{ b64_json: Buffer.from('not an image').toString('base64') }], []]) {
    let uploads = 0;
    await assert.rejects(storeLlmhubImageOutputs({
      payload: { data }, userId: 'account-1', jobId: 'test', outputFormat: 'png', expectedCount: 1,
      expectedSize: { width: 1024, height: 768 }, upload: async () => { uploads += 1; return stored; },
    }));
    assert.equal(uploads, 0);
  }
});

test('wrong stored dimensions cannot complete at the quoted price', async () => {
  await assert.rejects(storeLlmhubImageOutputs({
    payload: { data: [{ b64_json: png.toString('base64') }] }, userId: 'account-1',
    jobId: 'test', outputFormat: 'png', expectedCount: 1, expectedSize: { width: 1024, height: 768 },
    upload: async () => ({ ...stored, height: 1024 }), remove: async () => undefined,
  }), /dimensions do not match/);
});

test('2.5 valid landscape and auto dimensions preserve canonical price tiers without changing legacy 2', () => {
  const tier = resolveGptImage25PricingTier('1920x1088');
  assert.equal(tier.width, 1920);
  assert.equal(tier.height, 1088);
  assert.equal(tier.billingKey, '1920x1080');
  assert.equal(tier.prices.high, 3.96);
  const auto = resolveGptImage25PricingTier('auto', { width: 1448, height: 1086 });
  assert.equal(auto.width % 16, 0);
  assert.equal(auto.height % 16, 0);
  assert.equal(resolveGptImage2PricingTier('landscape_16_9').height, 1080);
  for (const id of ['gpt-image-2-5-flare', 'gpt-image-2-5-sunburst']) {
    const engine = listFalEngines().find(e => e.id === id)!.engine;
    assert.deepEqual(engine.inputSchema?.optional?.find(f => f.id === 'output_format')?.values, ['png', 'jpeg']);
    assert.equal(engine.inputSchema?.optional?.find(f => f.id === 'resolution')?.values?.includes('1920x1080'), true);
  }
});

test('16 references and mask retain multipart order and explicit quoted edit size', async () => {
  let reads = 0;
  await runLlmhubFlareGeneration({ ...input, engineId: 'gpt-image-2-5-sunburst', mode: 'i2i',
    combinedImageUrls: Array.from({ length: 16 }, (_, i) => `https://media.maxvideoai.com/ref-${i}.png`),
    maskUrl: 'https://media.maxvideoai.com/mask.png', providerImageSize: {width:1024,height:768},
  }, { apiKey: 'test', upload: async () => stored,
    fetch: async (url, init) => {
      if (String(url).startsWith('https://media.maxvideoai.com/')) {
        reads += 1;
        return new Response(png, { headers: {'content-type':'image/png'} });
      }
      assert.ok(init?.body instanceof FormData);
      assert.equal(init.body.getAll('image').length, 16);
      assert.equal((init.body.getAll('image')[15] as File).name, 'reference-16.png');
      assert.ok(init.body.get('mask') instanceof File);
      assert.equal(init.body.get('size'), '1024x768');
      assert.equal(init.body.get('response_format'), null);
      return Response.json({data:[{b64_json:png.toString('base64')}]});
    },
  });
  assert.equal(reads, 17);
});

test('JPEG bytes are persisted with the correct original mime and extension', async () => {
  const jpeg = readFileSync('tests/fixtures/llmhub-output.jpeg');
  await storeLlmhubImageOutputs({payload:{data:[{b64_json:jpeg.toString('base64')}]},
    userId:'account-1', jobId:'jpeg-job',outputFormat:'jpeg',expectedCount:1,expectedSize:{width:1024,height:768},
    upload:async (params)=>{
      assert.deepEqual(params.data,jpeg);
      assert.equal(params.mime,'image/jpeg');
      assert.equal(params.fileName,'jpeg-job-1.jpg');
      return {...stored,mime:'image/jpeg'};
    },
  });
});

test('full decoding rejects truncated PNG before any upload', async () => {
  for (const damaged of [png.subarray(0, 24), png.subarray(0, Math.floor(png.length / 2))]) {
    let writes = 0;
    await assert.rejects(storeLlmhubImageOutputs({ payload:{data:[{b64_json:damaged.toString('base64')}]},
      userId:'account-1',jobId:'test',outputFormat:'png',expectedCount:1,expectedSize:{width:1024,height:768},
      upload:async()=>{writes++;return stored;},
    }));
    assert.equal(writes,0);
  }
});

test('the entire batch is validated before wrong dimensions can write any object', async () => {
  let writes=0;
  const wrong = readFileSync('tests/fixtures/llmhub-square.png');
  await assert.rejects(storeLlmhubImageOutputs({payload:{data:[png,wrong].map(data=>({b64_json:data.toString('base64')}))},
    userId:'account-1',jobId:'test',outputFormat:'png',expectedCount:2,expectedSize:{width:1024,height:768},
    upload:async()=>{writes++;return stored;},
  }),/dimensions do not match/);
  assert.equal(writes,0);
});

test('batch rollback deletes only keys created by this attempt, including an ambiguous PUT', async () => {
  let writes=0;const removed:string[]=[];
  await assert.rejects(storeLlmhubImageOutputs({payload:{data:[png,png].map(data=>({b64_json:data.toString('base64')}))},
    userId:'account-1',jobId:'test',outputFormat:'png',expectedCount:2,expectedSize:{width:1024,height:768},
    upload:async(params)=>{const key=`new-attempt/${++writes}`;await params.beforeUpload?.(key);if(writes===2)throw Error('PUT disconnected');return {...stored,key};},
    remove:async(key)=>{removed.push(key);},
  }),/PUT disconnected/);
  assert.deepEqual(removed,['new-attempt/1','new-attempt/2']);
});

test('rollback failure exposes exact remaining keys and retains original failure', async () => {
  await assert.rejects(storeLlmhubImageOutputs({payload:{data:[{b64_json:png.toString('base64')}]},
    userId:'account-1',jobId:'test',outputFormat:'png',expectedCount:1,expectedSize:{width:1024,height:768},
    upload:async(params)=>{await params.beforeUpload?.('new-attempt/failed');throw Error('PUT disconnected');},
    remove:async()=>{throw Error('DELETE unavailable');},
  }), (error:unknown)=>{
    assert.deepEqual((error as {cleanupKeys:string[]}).cleanupKeys,['new-attempt/failed']);
    assert.match(String((error as Error).cause),/PUT disconnected/);return true;
  });
});
