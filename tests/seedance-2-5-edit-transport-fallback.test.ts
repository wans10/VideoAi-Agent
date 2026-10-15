import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';

// ENV is evaluated at module load, so each case runs in a fresh child process with a clean environment.
const TSX = resolve('frontend/node_modules/.bin/tsx');
const TSCONFIG = resolve('frontend/tsconfig.json');
const ENV_MODULE = resolve('frontend/src/lib/env.ts');
const TRANSPORT_MODULE = resolve('frontend/src/server/video-providers/byteplus-modelark-transport.ts');

const CASES: ReadonlyArray<{ name: string; env: Record<string, string>; expected: 'modelark' | 'las' }> = [
  { name: 'legacy V2V variable alone is honoured as a fallback', env: { SEEDANCE_2_5_V2V_TRANSPORT: 'modelark' }, expected: 'modelark' },
  { name: 'EDIT variable takes precedence over the legacy V2V variable', env: { SEEDANCE_2_5_EDIT_TRANSPORT: 'las', SEEDANCE_2_5_V2V_TRANSPORT: 'modelark' }, expected: 'las' },
  { name: 'with neither variable set the transport defaults to las', env: {}, expected: 'las' },
];

test('Seedance 2.5 edit transport falls back from the legacy V2V variable only when EDIT is unset', () => {
  const folder = mkdtempSync(join(tmpdir(), 'seedance-edit-transport-'));
  try {
    const probe = join(folder, 'probe.ts');
    writeFileSync(probe, [
      `import { ENV } from ${JSON.stringify(ENV_MODULE)};`,
      `import { resolveBytePlusTransport } from ${JSON.stringify(TRANSPORT_MODULE)};`,
      `console.log(JSON.stringify({ transport: resolveBytePlusTransport('seedance-2-5', 'v2v'), edit: ENV.SEEDANCE_2_5_EDIT_TRANSPORT }));`,
    ].join('\n'));
    for (const testCase of CASES) {
      const child = spawnSync(TSX, ['--tsconfig', TSCONFIG, probe], {
        env: { PATH: process.env.PATH ?? '', NODE_ENV: 'test', ...testCase.env },
        encoding: 'utf8',
      });
      assert.equal(child.status, 0, `${testCase.name}: ${child.stderr}`);
      const result = JSON.parse(child.stdout.trim().split('\n').at(-1) ?? '{}') as { transport?: string };
      assert.equal(result.transport, testCase.expected, testCase.name);
    }
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});
