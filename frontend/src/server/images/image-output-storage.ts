import { normalizeMediaUrl } from '@/lib/media';
import {
  extractStorageKeyFromUrl,
  isStorageConfigured,
  uploadImageToStorage,
  type UploadResult,
} from '@/server/storage';
import type { GeneratedImage } from '@/types/image-generation';

type ImageOutputStorageDeps = {
  extractStorageKeyFromUrl?: (url: string) => string | null;
  fetch?: (input: string, init?: RequestInit) => Promise<Response>;
  isStorageConfigured?: () => boolean;
  uploadImageToStorage?: typeof uploadImageToStorage;
  /** Waits between download attempts; tests inject an instant one. */
  sleep?: (ms: number) => Promise<void>;
  /** Budget for ONE download attempt, headers and body together. */
  downloadTimeoutMs?: number;
  /** Total download attempts (the first try included). */
  downloadAttempts?: number;
  /** Delay before attempt 2, 3, ...; the last value repeats. */
  retryBackoffMs?: readonly number[];
};

/**
 * Provider result URLs can sit on another continent from this server (for example a mainland Volcengine TOS bucket
 * downloaded from an overseas host), where a 2K PNG took longer than the former 30 s. One attempt may now take 90 s;
 * three attempts plus the 1 s and 2 s backoff bound a single image at 273 s. Images of one generation download in
 * parallel, so the worst case does not add up per image.
 */
export const IMAGE_DOWNLOAD_TIMEOUT_MS = 90_000;
export const IMAGE_DOWNLOAD_ATTEMPTS = 3;
export const IMAGE_DOWNLOAD_BACKOFF_MS: readonly number[] = [1_000, 2_000];

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

class ImageDownloadError extends Error {
  readonly status: number | null;
  readonly retryable: boolean;
  constructor(message: string, options: { status?: number; retryable: boolean }) {
    super(message);
    this.name = 'ImageDownloadError';
    this.status = options.status ?? null;
    this.retryable = options.retryable;
  }
}

function inferImageExtension(mime: string | null, url: string): string {
  const normalizedMime = mime?.split(';')[0]?.trim().toLowerCase();
  if (normalizedMime === 'image/jpeg' || normalizedMime === 'image/jpg') return 'jpg';
  if (normalizedMime === 'image/png') return 'png';
  if (normalizedMime === 'image/webp') return 'webp';
  const cleanPath = url.split('?')[0]?.toLowerCase() ?? '';
  const match = cleanPath.match(/\.([a-z0-9]{2,5})$/);
  return match?.[1] ?? 'jpg';
}

/** Provider URLs are signed: the query string carries the credential and signature, so it is never logged. */
function redactUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return url.split('?')[0]?.split('#')[0] ?? '';
  }
}

function scrubMessage(message: string): string {
  return message.replace(/https?:\/\/[^\s'"<>]+/gi, (match) => redactUrl(match));
}

/** Retry only what can recover: 408, 425, 429 and 5xx. A 4xx on a signed URL (403, 404) will not change. */
function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

const TRANSIENT_NETWORK_CODES = new Set([
  'ECONNRESET',
  'ECONNABORTED',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'EPIPE',
  'EAI_AGAIN',
  'UND_ERR_SOCKET',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_BODY_TIMEOUT',
]);

function readErrorCode(error: unknown): string | null {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === 'string' ? code : null;
}

/** Timeouts (our own abort included), dropped connections and fetch's generic network TypeError are transient. */
function isRetryableDownloadError(error: unknown): boolean {
  if (error instanceof ImageDownloadError) return error.retryable;
  const name = (error as { name?: unknown } | null)?.name;
  if (name === 'AbortError' || name === 'TimeoutError') return true;
  const cause = (error as { cause?: unknown } | null)?.cause;
  const code = readErrorCode(error) ?? readErrorCode(cause);
  if (code && TRANSIENT_NETWORK_CODES.has(code)) return true;
  return error instanceof TypeError;
}

function describeError(error: unknown): { name: string; message: string; status: number | null; code: string | null } {
  const raw = error as { name?: unknown; message?: unknown; status?: unknown } | null;
  return {
    name: typeof raw?.name === 'string' ? raw.name : 'Error',
    message: scrubMessage(typeof raw?.message === 'string' ? raw.message : String(error)),
    status: typeof raw?.status === 'number' ? raw.status : null,
    code: readErrorCode(error) ?? readErrorCode(raw && 'cause' in raw ? (raw as { cause?: unknown }).cause : null),
  };
}

/** One attempt. The abort timer covers the headers and the whole body, so a stall mid-body aborts it too. */
async function fetchImageBuffer(
  url: string,
  fetchImpl: NonNullable<ImageOutputStorageDeps['fetch']>,
  timeoutMs: number
): Promise<{ data: Buffer; mime: string | null }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, { signal: controller.signal });
    if (!response.ok) {
      throw new ImageDownloadError(`FETCH_FAILED:${response.status}`, {
        status: response.status,
        retryable: isRetryableStatus(response.status),
      });
    }
    const data = Buffer.from(await response.arrayBuffer());
    if (!data.length) {
      // An empty body from an otherwise successful response is usually a dropped transfer, so it gets the same retries.
      throw new ImageDownloadError('EMPTY_IMAGE', { retryable: true });
    }
    const mime = response.headers.get('content-type')?.split(';')[0]?.trim() ?? null;
    return { data, mime };
  } finally {
    clearTimeout(timer);
  }
}

async function downloadImageWithRetry(params: {
  url: string;
  jobId: string;
  index: number;
  deps: Required<ImageOutputStorageDeps>;
}): Promise<{ data: Buffer; mime: string | null }> {
  const attempts = Math.max(1, Math.floor(params.deps.downloadAttempts));
  const backoff = params.deps.retryBackoffMs;
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await fetchImageBuffer(params.url, params.deps.fetch, params.deps.downloadTimeoutMs);
    } catch (error) {
      const willRetry = attempt < attempts && isRetryableDownloadError(error);
      console.warn('[images] generated image download attempt failed', {
        jobId: params.jobId,
        index: params.index,
        attempt,
        attempts,
        willRetry,
        sourceUrl: redactUrl(params.url),
        error: describeError(error),
      });
      if (!willRetry) throw error;
      const delay = backoff[Math.min(attempt - 1, backoff.length - 1)] ?? 0;
      if (delay > 0) await params.deps.sleep(delay);
    }
  }
}

async function copyImageToStorage(params: {
  image: GeneratedImage;
  index: number;
  jobId: string;
  userId: string;
  requireOwnedOutput: boolean;
  deps: Required<ImageOutputStorageDeps>;
}): Promise<GeneratedImage> {
  const sourceUrl = normalizeMediaUrl(params.image.url) ?? params.image.url;
  if (!/^https?:\/\//i.test(sourceUrl)) return params.image;
  if (params.deps.extractStorageKeyFromUrl(sourceUrl)) return params.image;

  try {
    const source = await downloadImageWithRetry({
      url: sourceUrl,
      jobId: params.jobId,
      index: params.index,
      deps: params.deps,
    });
    const mime = source.mime ?? params.image.mimeType ?? 'image/jpeg';
    const upload: UploadResult = await params.deps.uploadImageToStorage({
      data: source.data,
      mime,
      userId: params.userId,
      prefix: 'renders/images',
      fileName: `${params.jobId}-${params.index + 1}.${inferImageExtension(mime, sourceUrl)}`,
    });
    const storedUrl = normalizeMediaUrl(upload.url) ?? upload.url;
    if (params.requireOwnedOutput && !params.deps.extractStorageKeyFromUrl(storedUrl)) {
      throw new Error('Uploaded image URL is not owned by Keyvo storage');
    }
    return {
      ...params.image,
      url: storedUrl,
      width: upload.width ?? params.image.width ?? null,
      height: upload.height ?? params.image.height ?? null,
      mimeType: upload.mime ?? params.image.mimeType ?? mime,
    };
  } catch (error) {
    console.warn('[images] failed to copy generated image to storage', {
      jobId: params.jobId,
      index: params.index,
      sourceUrl: redactUrl(sourceUrl),
      error: describeError(error),
    });
    if (params.requireOwnedOutput) {
      throw new Error('Could not persist generated image to Keyvo storage', { cause: error });
    }
    return params.image;
  }
}

export async function copyGeneratedImagesToStorage(params: {
  images: GeneratedImage[];
  jobId: string;
  userId: string;
  requireOwnedOutput?: boolean;
  deps?: ImageOutputStorageDeps;
}): Promise<GeneratedImage[]> {
  const deps: Required<ImageOutputStorageDeps> = {
    extractStorageKeyFromUrl: params.deps?.extractStorageKeyFromUrl ?? extractStorageKeyFromUrl,
    fetch: params.deps?.fetch ?? fetch,
    isStorageConfigured: params.deps?.isStorageConfigured ?? isStorageConfigured,
    uploadImageToStorage: params.deps?.uploadImageToStorage ?? uploadImageToStorage,
    sleep: params.deps?.sleep ?? defaultSleep,
    downloadTimeoutMs: params.deps?.downloadTimeoutMs ?? IMAGE_DOWNLOAD_TIMEOUT_MS,
    downloadAttempts: params.deps?.downloadAttempts ?? IMAGE_DOWNLOAD_ATTEMPTS,
    retryBackoffMs: params.deps?.retryBackoffMs ?? IMAGE_DOWNLOAD_BACKOFF_MS,
  };

  if (!params.images.length) {
    return params.images;
  }

  const hasExternalOutput = params.images.some((image) => {
    const sourceUrl = normalizeMediaUrl(image.url) ?? image.url;
    return /^https?:\/\//i.test(sourceUrl) && !deps.extractStorageKeyFromUrl(sourceUrl);
  });
  if (!deps.isStorageConfigured()) {
    if (params.requireOwnedOutput && hasExternalOutput) {
      throw new Error('Keyvo storage is required for generated image outputs');
    }
    return params.images;
  }

  return Promise.all(
    params.images.map((image, index) =>
      copyImageToStorage({
        image,
        index,
        jobId: params.jobId,
        userId: params.userId,
        requireOwnedOutput: params.requireOwnedOutput === true,
        deps,
      })
    )
  );
}
