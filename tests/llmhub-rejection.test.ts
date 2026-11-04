import assert from 'node:assert/strict';
import test from 'node:test';

import { isDefiniteLlmhubRejection } from '../frontend/src/server/video-providers/llmhub/rejection.ts';
import { buildInitialWorkspaceFormState } from '../frontend/app/(core)/(workspace)/app/_lib/workspace-hydration.ts';
import { getBaseEngines } from '../frontend/src/lib/engines.ts';
import { narrowToLlmhubMinimax } from '../frontend/src/server/llmhub-minimax-capabilities.ts';

test('a 4xx is always a definite rejection', () => {
  for (const status of [400, 402, 404, 422, 429]) assert.equal(isDefiniteLlmhubRejection(status, undefined), true, String(status));
});

test('a plugin 5xx that says the supplier balance is empty is a definite rejection', () => {
  const plugin = 'plugin hailuo@1.3.0 hook parseSubmitResponse failed: Error: insufficient balance at parseSubmitResponse (hailuo.js:603:39)';
  assert.equal(isDefiniteLlmhubRejection(502, plugin), true);
  assert.equal(isDefiniteLlmhubRejection(500, 'Insufficient_Balance'), true);
  assert.equal(isDefiniteLlmhubRejection(502, 'plugin x failed: invalid params, prompt cannot be empty'), true);
});

test('any other 5xx or a network failure stays ambiguous, so a paid-for job is never refunded twice', () => {
  assert.equal(isDefiniteLlmhubRejection(502, 'bad gateway'), false);
  assert.equal(isDefiniteLlmhubRejection(500, undefined), false);
  assert.equal(isDefiniteLlmhubRejection(503, { message: 'insufficient balance' }), false);
  assert.equal(isDefiniteLlmhubRejection(Number.NaN, 'insufficient balance'), false);
  assert.equal(isDefiniteLlmhubRejection(200, 'insufficient balance'), false);
});

test('a visitor with no saved draft gets the requested engine\'s own defaults, not the fixed 720p/4 s form', () => {
  const engines = getBaseEngines();
  const seed = engines.find((engine) => engine.id === 'seedance-2-5')!;
  const h3 = narrowToLlmhubMinimax(engines.find((engine) => engine.id === 'minimax-h3')!, { LLMHUB_INFERENCE_ROUTING_ENABLED: 'true', LLMHUB_API_KEY: 'k' });
  const hailuo = narrowToLlmhubMinimax(engines.find((engine) => engine.id === 'minimax-hailuo-02-text')!, { LLMHUB_INFERENCE_ROUTING_ENABLED: 'true', LLMHUB_API_KEY: 'k' });
  const open = (engineId: string) => buildInitialWorkspaceFormState({
    engines: [seed, h3, hailuo], storedFormRaw: null,
    effectiveRequestedEngineId: engineId, effectiveRequestedEngineToken: engineId, effectiveRequestedMode: null,
  }).form!;

  const h3Form = open('minimax-h3');
  assert.equal(h3Form.engineId, 'minimax-h3');
  assert.ok(['768P', '2K'].includes(String(h3Form.resolution)), `resolution ${h3Form.resolution}`);
  assert.ok(h3Form.durationSec >= 5 && h3Form.durationSec <= 15, `duration ${h3Form.durationSec}`);

  const hailuoForm = open('minimax-hailuo-02-text');
  assert.equal(hailuoForm.resolution, '768P');
  assert.ok([6, 10].includes(hailuoForm.durationSec), `duration ${hailuoForm.durationSec}`);

  const seedForm = open('seedance-2-5');
  assert.equal(seedForm.engineId, 'seedance-2-5');
});
