import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import test from 'node:test';

import { MAX_PROBE_DOWNLOAD_BYTES, runFfprobeOnUrl } from '../frontend/server/media/ffprobe-run.ts';

const URL_TO_PROBE = 'https://media.example/renders/a.mp4';
const probeDirs = () => readdirSync(tmpdir()).filter((name) => name.startsWith('keyvo-probe-'));

test('ffprobe reads a downloaded local copy, never the network address', async () => {
  const before = probeDirs().length;
  let seen: string[] = [];
  const result = await runFfprobeOnUrl(['-v', 'error', '-of', 'json', URL_TO_PROBE], URL_TO_PROBE, {
    timeoutMs: 5000,
    fetchFn: async () => new Response(Buffer.from('mp4-bytes'), { headers: { 'content-length': '9' } }),
    execFn: async (_file, args) => { seen = args; return { stdout: '{"ok":true}' }; },
  });
  assert.equal(result.stdout, '{"ok":true}');
  assert.deepEqual(seen.slice(0, 3), ['-v', 'error', '-of']);
  assert.equal(seen.includes(URL_TO_PROBE), false);
  assert.match(seen[seen.length - 1], /keyvo-probe-[^/\\]+[/\\]media$/);
  assert.equal(probeDirs().length, before, 'the temporary copy is removed');
});

test('a failed or oversized download is reported and leaves nothing behind', async () => {
  const before = probeDirs().length;
  const run = (fetchFn: typeof fetch) => runFfprobeOnUrl(['-i', URL_TO_PROBE], URL_TO_PROBE, {
    timeoutMs: 5000, fetchFn, execFn: async () => { throw new Error('must not probe'); },
  });
  await assert.rejects(run(async () => new Response('nope', { status: 404 })), /download failed \(404\)/);
  await assert.rejects(
    run(async () => new Response('x', { headers: { 'content-length': String(MAX_PROBE_DOWNLOAD_BYTES + 1) } })),
    /too large/,
  );
  assert.equal(probeDirs().length, before);
});

test('the probe error still propagates so callers report a missing fact instead of a wrong one', async () => {
  await assert.rejects(runFfprobeOnUrl(['-i', URL_TO_PROBE], URL_TO_PROBE, {
    timeoutMs: 5000,
    fetchFn: async () => new Response(Buffer.from('x')),
    execFn: async () => { throw new Error('ffprobe exited'); },
  }), /ffprobe exited/);
});
