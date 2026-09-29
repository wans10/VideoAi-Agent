import assert from 'node:assert/strict';
import test from 'node:test';

import { shouldFallbackImageDirectSubmit } from '../frontend/src/server/images/image-direct-fallback-policy';

test('image direct fallback requires a definite rejection before any provider response id', () => {
  for (const provider of ['google_vertex_image', 'byteplus_modelark'] as const) {
    assert.equal(shouldFallbackImageDirectSubmit({
      provider, providerJobId: null, status: 429, fallbackAvailable: true,
    }), true);
    for (const [providerJobId, status, fallbackAvailable] of [
      ['accepted-id', 429, true],
      [null, null, true],
      [null, 500, true],
      [null, 429, false],
    ] as const) {
      assert.equal(shouldFallbackImageDirectSubmit({
        provider, providerJobId, status, fallbackAvailable,
      }), false);
    }
  }
});
