import assert from 'node:assert/strict';
import test from 'node:test';

import { copyGeneratedImagesToStorage } from '../frontend/src/server/images/image-output-storage.ts';

test('copyGeneratedImagesToStorage replaces provider image URLs with stored media URLs', async () => {
  const images = [
    {
      url: 'https://ark-acg-ap-southeast-1.tos-ap-southeast-1.volces.com/seedream-5-0/output.jpeg?X-Tos-Expires=86400',
      thumbUrl: 'https://media.maxvideoai.com/rendersthumbs/user/output.webp',
    },
  ];

  const copied = await copyGeneratedImagesToStorage({
    images,
    jobId: 'img_test',
    userId: 'user_test',
    requireOwnedOutput: true,
    deps: {
      isStorageConfigured: () => true,
      extractStorageKeyFromUrl: (url) =>
        url.startsWith('https://media.maxvideoai.com/') ? 'renders/images/user_test/output.jpeg' : null,
      fetch: async () =>
        new Response(Buffer.from([1, 2, 3]), {
          status: 200,
          headers: { 'content-type': 'image/jpeg' },
        }),
      uploadImageToStorage: async () => ({
        url: 'https://media.maxvideoai.com/renders/images/user_test/output.jpeg',
        key: 'renders/images/user_test/output.jpeg',
        width: 5504,
        height: 3040,
        size: 3,
        mime: 'image/jpeg',
      }),
    },
  });

  assert.equal(copied[0]?.url, 'https://media.maxvideoai.com/renders/images/user_test/output.jpeg');
  assert.equal(copied[0]?.thumbUrl, images[0].thumbUrl);
  assert.equal(copied[0]?.width, 5504);
  assert.equal(copied[0]?.height, 3040);
  assert.equal(copied[0]?.mimeType, 'image/jpeg');
});

test('copyGeneratedImagesToStorage rejects when required ownership cannot be established', async () => {
  await assert.rejects(
    copyGeneratedImagesToStorage({
      images: [{ url: 'https://v3b.fal.media/files/output.png' }],
      jobId: 'img_test',
      userId: 'user_test',
      requireOwnedOutput: true,
      deps: {
        isStorageConfigured: () => true,
        extractStorageKeyFromUrl: () => null,
        fetch: async () => {
          throw new Error('provider download failed');
        },
        uploadImageToStorage: async () => {
          throw new Error('upload should not be reached');
        },
      },
    }),
    /Could not persist generated image to Keyvo storage/
  );
});

test('copyGeneratedImagesToStorage rejects required external outputs when storage is unavailable', async () => {
  await assert.rejects(
    copyGeneratedImagesToStorage({
      images: [{ url: 'https://v3b.fal.media/files/output.png' }],
      jobId: 'img_test',
      userId: 'user_test',
      requireOwnedOutput: true,
      deps: {
        isStorageConfigured: () => false,
        extractStorageKeyFromUrl: () => null,
      },
    }),
    /Keyvo storage is required for generated image outputs/
  );
});

// --- Download retry -------------------------------------------------------------------------------------------------

const SIGNED_URL =
  'https://ark-acg-cn-beijing.tos-cn-beijing.volces.com/doubao-seedream-5-0/output_0.png?X-Tos-Algorithm=TOS4-HMAC-SHA256&X-Tos-Credential=AKLTexample%2F20261031%2Fcn-beijing%2Ftos%2Frequest&X-Tos-Signature=614c249c87c867ff69a367fff035c0a6ba770dc5e8eea21fda708b676142ee19';
const STORED_URL = 'https://media.maxvideoai.com/renders/images/user_test/img_retry-1.png';

function abortError() {
  return new DOMException('This operation was aborted', 'AbortError');
}

function okResponse() {
  return new Response(Buffer.from([1, 2, 3]), { status: 200, headers: { 'content-type': 'image/png' } });
}

function harness(fetchImpl: (url: string, init?: RequestInit) => Promise<Response>, extra: Record<string, unknown> = {}) {
  const calls = { fetch: 0, upload: 0, sleeps: [] as number[] };
  const deps = {
    isStorageConfigured: () => true,
    extractStorageKeyFromUrl: (url: string) => (url.startsWith('https://media.maxvideoai.com/') ? 'renders/images/x' : null),
    fetch: async (url: string, init?: RequestInit) => {
      calls.fetch += 1;
      return fetchImpl(url, init);
    },
    uploadImageToStorage: async () => {
      calls.upload += 1;
      return { url: STORED_URL, key: 'renders/images/user_test/img_retry-1.png', width: 2048, height: 2048, size: 3, mime: 'image/png' };
    },
    sleep: async (ms: number) => {
      calls.sleeps.push(ms);
    },
    ...extra,
  };
  const run = (requireOwnedOutput: boolean) =>
    copyGeneratedImagesToStorage({
      images: [{ url: SIGNED_URL }],
      jobId: 'img_retry',
      userId: 'user_test',
      requireOwnedOutput,
      deps,
    });
  return { calls, run };
}

async function captureWarnings<T>(action: () => Promise<T>): Promise<{ result: PromiseSettledResult<T>; warnings: string[] }> {
  const original = console.warn;
  const warnings: string[] = [];
  console.warn = (...args: unknown[]) => {
    warnings.push(args.map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg, (_k, v) => (v instanceof Error ? { name: v.name, message: v.message } : v)))).join(' '));
  };
  try {
    const [result] = await Promise.allSettled([action()]);
    return { result, warnings };
  } finally {
    console.warn = original;
  }
}

test('a timed-out first download is retried and the image is stored once', async () => {
  let attempt = 0;
  const { calls, run } = harness(async () => {
    attempt += 1;
    if (attempt === 1) throw abortError();
    return okResponse();
  });
  const { result } = await captureWarnings(() => run(true));
  assert.equal(result.status, 'fulfilled');
  assert.equal((result as PromiseFulfilledResult<Awaited<ReturnType<typeof run>>>).value[0]?.url, STORED_URL);
  assert.equal(calls.fetch, 2);
  assert.equal(calls.upload, 1);
  assert.deepEqual(calls.sleeps, [1000]);
});

test('a download that stalls mid-body is aborted by the attempt timeout and retried', async () => {
  let attempt = 0;
  const { calls, run } = harness(
    async (_url, init) => {
      attempt += 1;
      if (attempt > 1) return okResponse();
      const signal = init?.signal as AbortSignal;
      // Headers arrive at once; the body never finishes until the attempt is aborted.
      const body = new ReadableStream({
        start(controller) {
          signal.addEventListener('abort', () => controller.error(abortError()));
        },
      });
      return new Response(body, { status: 200, headers: { 'content-type': 'image/png' } });
    },
    { downloadTimeoutMs: 30 }
  );
  const { result } = await captureWarnings(() => run(true));
  assert.equal(result.status, 'fulfilled');
  assert.equal(calls.fetch, 2);
  assert.equal(calls.upload, 1);
});

test('three transient failures stop retrying and fail the generation when ownership is required', async () => {
  const { calls, run } = harness(async () => {
    throw abortError();
  });
  const { result } = await captureWarnings(() => run(true));
  assert.equal(result.status, 'rejected');
  const reason = (result as PromiseRejectedResult).reason as Error;
  assert.equal(reason.message, 'Could not persist generated image to Keyvo storage');
  assert.equal((reason.cause as Error).name, 'AbortError');
  assert.equal(calls.fetch, 3);
  assert.equal(calls.upload, 0);
  assert.deepEqual(calls.sleeps, [1000, 2000]);
});

test('three transient failures keep the provider image when ownership is not required', async () => {
  const { calls, run } = harness(async () => {
    throw abortError();
  });
  const { result } = await captureWarnings(() => run(false));
  assert.equal(result.status, 'fulfilled');
  assert.equal((result as PromiseFulfilledResult<Awaited<ReturnType<typeof run>>>).value[0]?.url, SIGNED_URL);
  assert.equal(calls.fetch, 3);
});

test('a 4xx answer is final and is not retried', async () => {
  for (const status of [400, 401, 403, 404]) {
    const { calls, run } = harness(async () => new Response('denied', { status }));
    const { result } = await captureWarnings(() => run(true));
    assert.equal(result.status, 'rejected', `status ${status}`);
    assert.equal(calls.fetch, 1, `status ${status} must not be retried`);
    assert.deepEqual(calls.sleeps, []);
  }
});

test('timeouts, throttling and server errors are retried', async () => {
  for (const status of [408, 425, 429, 500, 503]) {
    let attempt = 0;
    const { calls, run } = harness(async () => {
      attempt += 1;
      return attempt === 1 ? new Response('busy', { status }) : okResponse();
    });
    const { result } = await captureWarnings(() => run(true));
    assert.equal(result.status, 'fulfilled', `status ${status}`);
    assert.equal(calls.fetch, 2, `status ${status}`);
  }
});

test('dropped connections and an empty body are retried, an unknown error is not', async () => {
  let attempt = 0;
  const dropped = harness(async () => {
    attempt += 1;
    if (attempt === 1) throw Object.assign(new TypeError('fetch failed'), { cause: { code: 'ECONNRESET' } });
    if (attempt === 2) return new Response(Buffer.alloc(0), { status: 200 });
    return okResponse();
  });
  assert.equal((await captureWarnings(() => dropped.run(true))).result.status, 'fulfilled');
  assert.equal(dropped.calls.fetch, 3);

  const unknown = harness(async () => {
    throw new Error('provider download failed');
  });
  assert.equal((await captureWarnings(() => unknown.run(true))).result.status, 'rejected');
  assert.equal(unknown.calls.fetch, 1);
});

test('a failure after the download (storage upload) is not retried as a download', async () => {
  const { calls, run } = harness(async () => okResponse(), {
    uploadImageToStorage: async () => {
      throw new Error('S3 unavailable');
    },
  });
  const { result } = await captureWarnings(() => run(true));
  assert.equal(result.status, 'rejected');
  assert.equal(calls.fetch, 1);
});

test('logs never contain the signed query string of the provider URL', async () => {
  const { run } = harness(async () => {
    throw Object.assign(new Error(`request to ${SIGNED_URL} failed`), { name: 'AbortError' });
  });
  const { warnings } = await captureWarnings(() => run(true));
  assert.ok(warnings.length >= 4, 'one warning per attempt plus the final one');
  for (const line of warnings) {
    assert.doesNotMatch(line, /X-Tos-Signature|X-Tos-Credential|AKLT|\?/, line);
    assert.match(line, /ark-acg-cn-beijing\.tos-cn-beijing\.volces\.com\/doubao-seedream-5-0\/output_0\.png/);
  }
});

test('the production budget is 90 s per attempt, 3 attempts and a 1 s, 2 s backoff', async () => {
  const module = await import('../frontend/src/server/images/image-output-storage.ts');
  assert.equal(module.IMAGE_DOWNLOAD_TIMEOUT_MS, 90_000);
  assert.equal(module.IMAGE_DOWNLOAD_ATTEMPTS, 3);
  assert.deepEqual([...module.IMAGE_DOWNLOAD_BACKOFF_MS], [1000, 2000]);
});
