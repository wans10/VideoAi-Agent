import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

test('engine catalog CLI works from the repository root without frontend path aliases', () => {
  const env = { ...process.env };
  delete env.TSX_TSCONFIG_PATH;
  const result = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/build-engine-catalog.ts', '--check'], {
    cwd: process.cwd(), env, encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /projection current/);
});
