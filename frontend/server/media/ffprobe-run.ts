import { execFile } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { promisify } from 'node:util';
import ffprobe from 'ffprobe-static';

const execFileAsync = promisify(execFile);

/** Originals the product accepts are far below this; it only bounds a hostile or runaway response. */
export const MAX_PROBE_DOWNLOAD_BYTES = 200 * 1024 * 1024;
const DOWNLOAD_TIMEOUT_MS = 90_000;

type RunOptions = {
  timeoutMs: number;
  maxBuffer?: number;
  fetchFn?: typeof fetch;
  execFn?: (file: string, args: string[], options: { timeout: number; maxBuffer: number }) => Promise<{ stdout: string }>;
};

/**
 * The ffprobe binary shipped by ffprobe-static is statically linked and crashes (SIGSEGV) as soon as it
 * resolves a hostname inside the production image, so it can never open an https URL itself. Node resolves
 * hosts normally, so the file is fetched here and ffprobe reads a local path, which it handles fine.
 */
export async function runFfprobeOnUrl(
  args: readonly string[],
  url: string,
  options: RunOptions,
): Promise<{ stdout: string }> {
  if (!ffprobe.path) throw new Error('ffprobe binary not available.');
  const exec = options.execFn
    ?? ((file, execArgs, execOptions) => execFileAsync(file, execArgs, execOptions) as Promise<{ stdout: string }>);
  const directory = await mkdtemp(join(tmpdir(), 'keyvo-probe-'));
  const localPath = join(directory, 'media');
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
    try {
      const response = await (options.fetchFn ?? fetch)(url, { signal: controller.signal });
      if (!response.ok || !response.body) throw new Error(`Media download failed (${response.status}).`);
      const declared = Number(response.headers.get('content-length'));
      if (Number.isFinite(declared) && declared > MAX_PROBE_DOWNLOAD_BYTES) throw new Error('Media is too large to probe.');
      let received = 0;
      const limit = new Transform({
        transform(chunk: Buffer, _encoding, callback) {
          received += chunk.length;
          if (received > MAX_PROBE_DOWNLOAD_BYTES) callback(new Error('Media is too large to probe.'));
          else callback(null, chunk);
        },
      });
      await pipeline(Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0]), limit, createWriteStream(localPath));
    } finally {
      clearTimeout(timer);
    }
    const localArgs = args.map((value) => (value === url ? localPath : value));
    return await exec(ffprobe.path, localArgs, { timeout: options.timeoutMs, maxBuffer: options.maxBuffer ?? 1024 * 1024 });
  } finally {
    await rm(directory, { recursive: true, force: true }).catch(() => undefined);
  }
}
