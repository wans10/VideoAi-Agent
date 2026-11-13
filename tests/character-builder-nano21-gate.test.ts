import assert from 'node:assert/strict';
import test from 'node:test';

import { POST as estimateImagePricing } from '../frontend/app/api/images/estimate/route.ts';
import { NANO21_ENGINE_ID } from '../frontend/src/lib/nano-banana-2-1.ts';
import { getQualityEngineId } from '../frontend/src/lib/character-builder.ts';

test('Character Studio quality modes both price through Nano Banana 2.1', () => {
  assert.deepEqual([getQualityEngineId('draft'), getQualityEngineId('final')], [NANO21_ENGINE_ID, NANO21_ENGINE_ID]);
});

async function postEstimate(body: unknown) {
  const response = await estimateImagePricing(
    new Request('http://localhost:3000/api/images/estimate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }) as Parameters<typeof estimateImagePricing>[0],
  );
  return { response, payload: (await response.json()) as { ok?: boolean; error?: string } };
}

test('Nano Banana 2.1 estimate refuses without an active reviewed tariff instead of falling back to a rule price', async () => {
  // Keyvo keeps app_customer_tariff_state inactive (docs/engineering/keyvo-upstream-deviations.md). Nano 2.1 is
  // forced onto the native tariff path, so the estimate has no price source and the route answers pricing_error.
  // This is the production symptom of the Character Builder price failure; the engine id itself is correct.
  const { response, payload } = await postEstimate({
    engineId: NANO21_ENGINE_ID, resolution: '1k', mode: 't2i', referenceImageCount: 0, numImages: 1,
  });
  assert.deepEqual({ status: response.status, ok: payload.ok, error: payload.error },
    { status: 500, ok: false, error: 'pricing_error' });
});
