import assert from 'node:assert/strict';
import test from 'node:test';
import { ENV } from '../frontend/src/lib/env';
import { BytePlusModelArkError } from '../frontend/src/server/video-providers/byteplus-modelark-error';
import { resolveBytePlusTransport, resolveBytePlusPollTransport, assertBytePlusTransportConfigured, getBytePlusModelArkClient, buildBytePlusSeedancePayload } from '../frontend/src/server/video-providers/byteplus-modelark';

// Runtime routing reads ENV.SEEDANCE_2_5_EDIT_TRANSPORT (falls back to the V2V variable only at module load),
// ENV.SEEDANCE_2_5_MODELARK_EDIT_ENABLED for the ModelArk edit gate, and LAS flags for the LAS path.
// Upstream semantics: ModelArk edits are gated; LAS edits keep the requested ratio and duration.
function withEditEnv(t: { after: (fn: () => void) => void }, values: Partial<Record<'SEEDANCE_2_5_EDIT_TRANSPORT' | 'SEEDANCE_2_5_MODELARK_EDIT_ENABLED' | 'SEEDANCE_2_5_LAS_ENABLED' | 'BYTEPLUS_ARK_API_KEY' | 'BYTEPLUS_ARK_BASE_URL' | 'BYTEPLUS_LAS_API_KEY', string | undefined>>) {
  const keys = ['SEEDANCE_2_5_EDIT_TRANSPORT', 'SEEDANCE_2_5_MODELARK_EDIT_ENABLED', 'SEEDANCE_2_5_LAS_ENABLED', 'BYTEPLUS_ARK_API_KEY', 'BYTEPLUS_ARK_BASE_URL', 'BYTEPLUS_LAS_API_KEY'] as const;
  const original = Object.fromEntries(keys.map((key) => [key, ENV[key]]));
  t.after(() => { for (const key of keys) (ENV as Record<string, unknown>)[key] = original[key]; });
  for (const key of keys) (ENV as Record<string, unknown>)[key] = values[key];
}

test('ModelArk Seedance 2.5 edits submit once without LAS credentials and keep video references', async (t) => {
  withEditEnv(t, {
    SEEDANCE_2_5_EDIT_TRANSPORT: 'modelark', SEEDANCE_2_5_MODELARK_EDIT_ENABLED: 'true', SEEDANCE_2_5_LAS_ENABLED: 'false',
    BYTEPLUS_ARK_API_KEY: 'fixture', BYTEPLUS_ARK_BASE_URL: 'https://ark.example.test/api/v3', BYTEPLUS_LAS_API_KEY: undefined,
  });
  const transport = assertBytePlusTransportConfigured('seedance-2-5', 'v2v');
  assert.equal(transport, 'modelark');
  const payload = buildBytePlusSeedancePayload({ modelId: 'doubao-seedance-2-5-260628', prompt: 'Change the lighting', mode: 'v2v', transport, durationSec: 4, resolution: '480p', ratio: '16:9', referenceVideoUrls: ['https://media.example.test/source.mp4'], allowedDurationOptions: [4], allowedModes: ['v2v'], allowedResolutions: ['480p'] });
  assert.equal(payload.duration, -1);
  assert.equal(payload.ratio, 'adaptive');
  assert.equal(payload.omni_reference_task_type, 'edit');
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async (url: string | URL | Request, init?: RequestInit) => {
    calls += 1;
    assert.equal(String(url), 'https://ark.example.test/api/v3/contents/generations/tasks');
    assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer fixture');
    const body = JSON.parse(String(init?.body));
    assert.equal(body.model, 'doubao-seedance-2-5-260628');
    assert.ok(body.content.some((item: any) => item.role === 'reference_video' && item.video_url?.url === 'https://media.example.test/source.mp4'));
    assert.match(body.content[0].text, /Edit Video 1/);
    return Response.json({ id: 'cgt-edit', status: 'queued' });
  });
  assert.equal((await getBytePlusModelArkClient(transport).createSeedanceFastTask(payload)).providerJobId, 'cgt-edit');
  assert.equal(calls, 1);
  assert.equal(resolveBytePlusPollTransport({ providerJobId: 'lsd-old', settingsSnapshot: { byteplusTransport: 'las' } }), 'las');
  assert.equal(resolveBytePlusPollTransport({ providerJobId: 'cgt-new', settingsSnapshot: { byteplusTransport: 'modelark' } }), 'modelark');
});

test('Seedance 2.5 edit routing refuses ModelArk edits until the edit gate opens and reports the LAS disabled state', (t) => {
  withEditEnv(t, {
    SEEDANCE_2_5_EDIT_TRANSPORT: 'modelark', SEEDANCE_2_5_MODELARK_EDIT_ENABLED: 'false', SEEDANCE_2_5_LAS_ENABLED: 'false',
    BYTEPLUS_ARK_API_KEY: 'fixture', BYTEPLUS_ARK_BASE_URL: 'https://ark.example.test/api/v3', BYTEPLUS_LAS_API_KEY: 'las-fixture',
  });
  assert.throws(() => assertBytePlusTransportConfigured('seedance-2-5', 'v2v'), (error: unknown) =>
    error instanceof BytePlusModelArkError && error.code === 'BYTEPLUS_MODELARK_EDIT_EXECUTION_DISABLED');
  ENV.SEEDANCE_2_5_EDIT_TRANSPORT = 'las';
  assert.throws(() => assertBytePlusTransportConfigured('seedance-2-5', 'v2v'), (error: unknown) =>
    error instanceof BytePlusModelArkError && error.code === 'BYTEPLUS_LAS_EXECUTION_DISABLED');
  ENV.SEEDANCE_2_5_LAS_ENABLED = 'true';
  assert.equal(assertBytePlusTransportConfigured('seedance-2-5', 'v2v'), 'las');
});

test('Seedance 2.5 LAS edits keep the requested duration and never receive the ModelArk edit sentinel', () => {
  const payload = buildBytePlusSeedancePayload({ modelId: 'doubao-seedance-2-5-260628', prompt: 'Change the lighting', mode: 'v2v', transport: 'las', durationSec: 4, resolution: '480p', ratio: '16:9', referenceVideoUrls: ['https://media.example.test/source.mp4'], allowedDurationOptions: [4], allowedModes: ['v2v'], allowedResolutions: ['480p'] });
  assert.equal(payload.duration, 4);
  assert.equal(payload.ratio, '16:9');
  assert.equal(payload.omni_reference_task_type, undefined);
});

test('an unrecognized Seedance 2.5 edit transport is rejected with its public error code', (t) => {
  withEditEnv(t, { SEEDANCE_2_5_EDIT_TRANSPORT: 'invalid' });
  assert.throws(() => resolveBytePlusTransport('seedance-2-5', 'v2v'), (error: unknown) =>
    error instanceof BytePlusModelArkError && error.code === 'BYTEPLUS_EDIT_TRANSPORT_UNSUPPORTED');
});
