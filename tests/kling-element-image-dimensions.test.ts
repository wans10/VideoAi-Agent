import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { validateKlingElementImageDimensions } from '../frontend/app/api/generate/_lib/kling-element-image-dimensions';

const referenceUrl = 'https://media.maxvideoai.com/user-assets/user/logo.png';

function dimensionRows(width: number | string | null, height: number | string | null) {
  return [
    {
      asset_id: 'logo_asset',
      url: referenceUrl,
      width,
      height,
    },
  ];
}

function klingElement() {
  return {
    referenceAssetIds: ['logo_asset'],
    referenceImageUrls: [referenceUrl],
  };
}

test('rejects a Kling element image when height is below 300 px', async () => {
  const result = await validateKlingElementImageDimensions({
    engineId: 'kling-3-pro',
    userId: 'user',
    elements: [klingElement()],
    deps: {
      queryFn: async <T>(_sql: string, params?: unknown[]) => {
        assert.equal(params?.[0], 'user');
        return dimensionRows(648, 157) as T[];
      },
    },
  });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.status, 422);
  assert.deepEqual(result.body, {
    ok: false,
    error: 'KLING_ELEMENT_IMAGE_TOO_SMALL',
    message:
      '该图片为 648 x 157 px。Kling 要求宽度至少为 300 px、高度至少为 300 px。请选择更大的图片后重试。',
    actualWidth: 648,
    actualHeight: 157,
    minimumWidth: 300,
    minimumHeight: 300,
  });
  assert.deepEqual(result.metric, {
    errorCode: 'KLING_ELEMENT_IMAGE_TOO_SMALL',
    meta: {
      actualWidth: 648,
      actualHeight: 157,
      minimumWidth: 300,
      minimumHeight: 300,
    },
  });
});

test('rejects a Kling element image when width is below 300 px', async () => {
  const result = await validateKlingElementImageDimensions({
    engineId: 'kling-3-standard',
    userId: 'user',
    elements: [klingElement()],
    deps: {
      queryFn: async <T>() => dimensionRows(299, 600) as T[],
    },
  });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.body.actualWidth, 299);
  assert.equal(result.body.actualHeight, 600);
  assert.equal(
    result.body.message,
    '该图片为 299 x 600 px。Kling 要求宽度至少为 300 px、高度至少为 300 px。请选择更大的图片后重试。'
  );
});

test('accepts a Kling element image at the 300 x 300 boundary', async () => {
  const result = await validateKlingElementImageDimensions({
    engineId: 'kling-3-pro',
    userId: 'user',
    elements: [klingElement()],
    deps: {
      queryFn: async <T>() => dimensionRows('300', '300') as T[],
    },
  });

  assert.deepEqual(result, { ok: true });
});

test('accepts a Kling element image when stored dimensions are unknown', async () => {
  const result = await validateKlingElementImageDimensions({
    engineId: 'kling-3-pro',
    userId: 'user',
    elements: [klingElement()],
    deps: {
      queryFn: async <T>() => dimensionRows(null, null) as T[],
    },
  });

  assert.deepEqual(result, { ok: true });
});

test('skips dimension lookup for non-Kling engines', async () => {
  let queried = false;
  const result = await validateKlingElementImageDimensions({
    engineId: 'seedance-2-0',
    userId: 'user',
    elements: [klingElement()],
    deps: {
      queryFn: async <T>() => {
        queried = true;
        return dimensionRows(100, 100) as T[];
      },
    },
  });

  assert.deepEqual(result, { ok: true });
  assert.equal(queried, false);
});

test('validates all constrained image dimensions before billing preflight', () => {
  const source = readFileSync(
    join(process.cwd(), 'frontend/src/server/video-generation/execute-video-generation.ts'),
    'utf8',
  );

  assert.match(source, /validateGenerationImageDimensions/);
  assert.ok(
    source.indexOf('await validateGenerationImageDimensions') <
      source.indexOf('await resolveGenerateBillingPreflight'),
    'image dimensions must be validated before billing preflight'
  );
});
