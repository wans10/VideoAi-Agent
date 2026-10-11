import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

// Independent customer inventory: never import the builder's allowlist.
const expected = [
  '.claude-plugin/marketplace.json', '.claude-plugin/plugin.json', '.codex-plugin/plugin.json',
  '.mcp.json', 'CHANGELOG.md', 'LICENSE', 'NOTICE', 'README.md', 'VERSION',
  'docs/connection.md', 'scripts/import-reference-files.mjs',
  'skills/generate/SKILL.md', 'skills/generate/agents/openai.yaml',
  'skills/generate/references/generation-safety.md', 'skills/generate/references/reference-inputs.md',
  'skills/plan/SKILL.md', 'skills/plan/agents/openai.yaml', 'skills/plan/references/budget-planning.md',
  'checksums.json',
].sort();

test('Keyvo candidate archive is reproducible, exact, secret-free and points exclusively to Keyvo', () => {
  const base = mkdtempSync(join(tmpdir(), 'keyvo-plugin-test-'));
  try {
    const outputs = ['first', 'second'].map(name => join(base, name));
    for (const out of outputs) {
      const built = spawnSync(process.execPath, ['scripts/build-maxvideoai-plugin-release.mjs',
        '--profile', 'keyvo', '--source', 'plugins/keyvo', '--out', out], { encoding: 'utf8' });
      assert.equal(built.status, 0, built.stderr);
    }
    const zip = join(outputs[0], 'maxvideoai-plugin-0.1.0.zip');
    assert.deepEqual(readFileSync(zip), readFileSync(join(outputs[1], 'maxvideoai-plugin-0.1.0.zip')));
    const listing = spawnSync('unzip', ['-Z1', zip], { encoding: 'utf8' });
    assert.equal(listing.status, 0, listing.stderr);
    assert.deepEqual(listing.stdout.trim().split('\n').sort(), expected.map(name => `maxvideoai/${name}`).sort());
    const bundle = join(outputs[0], 'maxvideoai-plugin');
    const checksums = JSON.parse(readFileSync(join(bundle, 'checksums.json'), 'utf8'));
    assert.deepEqual(Object.keys(checksums.files).sort(), expected.filter(name => name !== 'checksums.json'));
    for (const name of expected.filter(name => name !== 'checksums.json')) {
      const bytes = readFileSync(join(bundle, name));
      assert.equal(createHash('sha256').update(bytes).digest('hex'), checksums.files[name]);
      if (!['LICENSE', 'NOTICE'].includes(name)) {
        assert.doesNotMatch(bytes.toString('utf8'), /api\.maxvideoai\.com|camgraphe\/maxvideoai-plugin|(?:ghp_|sk-)[A-Za-z0-9_-]{20,}/);
      }
    }
    const endpoint = JSON.parse(readFileSync(join(bundle, '.mcp.json'), 'utf8'));
    assert.deepEqual(endpoint, { mcpServers: { maxvideoai: { type: 'http', url: 'https://app.keyvo.cn/mcp' } } });
    for (const skill of ['plan', 'generate']) {
      const yaml = readFileSync(join(bundle, `skills/${skill}/agents/openai.yaml`), 'utf8');
      assert.match(yaml, /value: "maxvideoai"/);
      assert.match(yaml, /allow_implicit_invocation: true/);
      assert.match(yaml, /https:\/\/app\.keyvo\.cn\/mcp/);
    }
    assert.equal(readFileSync(join(bundle, 'LICENSE'), 'utf8'), readFileSync('LICENSE', 'utf8'));
    assert.match(readFileSync(join(bundle, 'NOTICE'), 'utf8'), /modified 2026-10-11/);
  } finally { rmSync(base, { recursive: true, force: true }); }
});

test('Keyvo package profile cannot silently replace the upstream source profile', () => {
  const result = spawnSync(process.execPath, ['scripts/build-maxvideoai-plugin-release.mjs', '--profile', 'keyvo'], { encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /requires an explicit source/);
});
