import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { normalizeBytePlusOptions } from '../frontend/app/api/generate/_lib/request-options-byteplus.ts';
import { resolveMediaAwarePreflight } from '../frontend/app/api/preflight/_lib/media-aware-preflight.ts';
import { getBytePlusSeedanceProfile } from '../frontend/src/server/video-providers/byteplus-modelark-profiles.ts';

// Seedance 2.5 flash is 480p/720p only (Volcengine list has no 1080p/4K price): never price or submit another resolution.
test('Seedance 2.5 flash profile offers 480p and 720p only', () => {
  assert.deepEqual([...getBytePlusSeedanceProfile('seedance-2-5-flash')!.resolutions].sort(), ['480p', '720p']);
});

test('generate refuses unsupported flash resolutions before any charge, in Chinese', () => {
  for (const requestedResolution of ['1080p', '4k']) {
    const result = normalizeBytePlusOptions({ engineId: 'seedance-2-5-flash', durationSec: 5, requestedResolution, aspectRatio: '16:9', mode: 't2v' });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.status, 400);
      assert.equal(result.body.error, 'BYTEPLUS_RESOLUTION_UNSUPPORTED');
      assert.match(String(result.body.message), /不支持所选分辨率.*480p \/ 720p/);
    }
  }
  for (const requestedResolution of ['480p', '720p']) {
    assert.equal(normalizeBytePlusOptions({ engineId: 'seedance-2-5-flash', durationSec: 5, requestedResolution, aspectRatio: '16:9', mode: 't2v' }).ok, true);
  }
});

test('preflight refuses unsupported flash resolutions instead of quoting the 480p price', async () => {
  for (const resolution of ['1080p', '4k']) {
    const response = await resolveMediaAwarePreflight({
      request: { engine: 'seedance-2-5-flash', mode: 't2v', durationSec: 5, resolution, aspectRatio: '16:9' } as never,
      viewerIsAdmin: false,
    });
    assert.equal(response.ok, false, resolution);
    assert.equal(response.error?.code, 'BYTEPLUS_RESOLUTION_UNSUPPORTED');
    assert.match(String(response.error?.message), /480p \/ 720p/);
  }
});

// Visibility: flash follows Seedance 2.5's switches when its own variables are unset (no new production env vars).
test('Seedance 2.5 flash switches default to the Seedance 2.5 values', () => {
  const env: NodeJS.ProcessEnv = { ...process.env };
  for (const key of Object.keys(env)) if (key.startsWith('SEEDANCE_2_5_')) delete env[key];
  Object.assign(env, { SEEDANCE_2_5_BYTEPLUS_ENABLED: 'true', SEEDANCE_2_5_PROVIDER: 'byteplus_modelark',
    SEEDANCE_2_5_BYTEPLUS_ADMIN_ONLY: 'false', SEEDANCE_2_5_BYTEPLUS_MODES: 't2v,i2v,ref2v,v2v,extend' });
  const run = spawnSync('frontend/node_modules/.bin/tsx', ['--tsconfig', 'frontend/tsconfig.json', 'tests/helpers/print-flash-env.ts'],
    { encoding: 'utf8', env });
  assert.equal(run.status, 0, run.stderr);
  const values = JSON.parse(run.stdout.trim().split('\n').pop()!);
  assert.deepEqual(values, ['true', 'byteplus_modelark', 'false', 't2v,i2v,ref2v'], 'edit modes need their own Edit tariff and stay off');
});
