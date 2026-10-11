import { normalizeMediaUrl } from '@/lib/media';
import { deleteStorageObjectKey, uploadImageToStorage } from '@/server/storage';
import sharp from 'sharp';

const MAX_IMAGE_BYTES = 32 * 1024 * 1024;

export async function storeLlmhubImageOutputs(params: {
  payload: unknown;
  userId?: string;
  jobId: string;
  outputFormat: string;
  expectedCount: number;
  expectedSize: { width: number; height: number };
  upload?: typeof uploadImageToStorage;
  remove?: typeof deleteStorageObjectKey;
}): Promise<Array<{ url: string; width: number; height: number; content_type: string }>> {
  const items = (params.payload as { data?: unknown } | null)?.data;
  if (!Array.isArray(items) || items.length !== params.expectedCount) {
    throw new Error('LLM Hub returned an unexpected image count.');
  }
  if (!params.userId) throw new Error('Owned storage requires an image account.');
  // Validate every output before persisting any of the batch.
  const buffers = items.map((item) => {
    const encoded = item?.b64_json;
    if (typeof encoded !== 'string' || !encoded.length ||
      encoded.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4 ||
      encoded.length % 4 !== 0) {
      throw new Error('LLM Hub returned invalid or oversized image data.');
    }
    const data = Buffer.from(encoded, 'base64');
    if (data.toString('base64') !== encoded) throw new Error('LLM Hub returned invalid image encoding.');
    const png = data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const jpeg = data[0] === 255 && data[1] === 216 && data[2] === 255;
    if (!data.length || data.length > MAX_IMAGE_BYTES ||
      !(params.outputFormat === 'jpeg' ? jpeg : png)) {
      throw new Error('LLM Hub returned an unexpected image format.');
    }
    return data;
  });
  for (const data of buffers) {
    const decoder = sharp(data, { failOn: 'warning', limitInputPixels: 8_294_400 });
    const metadata = await decoder.metadata();
    if (metadata.format !== params.outputFormat || (metadata.pages ?? 1) !== 1) {
      throw new Error('LLM Hub returned an unexpected image format.');
    }
    if (metadata.width !== params.expectedSize.width || metadata.height !== params.expectedSize.height) {
      throw new Error('LLM Hub output dimensions do not match the quoted size.');
    }
    // metadata() only reads headers. Force full pixel decoding before any write.
    await decoder.raw().toBuffer();
  }
  const images: Array<{ url: string; width: number; height: number; content_type: string }> = [];
  const createdKeys = new Set<string>();
  try {
    for (const [index, data] of buffers.entries()) {
      const stored = await (params.upload ?? uploadImageToStorage)({
        data, mime: params.outputFormat === 'jpeg' ? 'image/jpeg' : 'image/png',
        userId: params.userId, prefix: 'renders/images',
        fileName: `${params.jobId}-${index + 1}.${params.outputFormat === 'jpeg' ? 'jpg' : 'png'}`,
        // Storage allocates a new random key. Track it before PUT, including
        // ambiguous transfer failures that might already have created the object.
        beforeUpload: async (key) => { createdKeys.add(key); },
      });
      createdKeys.add(stored.key);
      if (stored.width !== params.expectedSize.width || stored.height !== params.expectedSize.height) {
        throw new Error('LLM Hub output dimensions do not match the quoted size.');
      }
      // Owned outputs bypass the later copy step, so carry the measured facts
      // through the provider payload into response and persistence projections.
      images.push({
        url: normalizeMediaUrl(stored.url) ?? stored.url,
        width: stored.width,
        height: stored.height,
        content_type: params.outputFormat === 'jpeg' ? 'image/jpeg' : 'image/png',
      });
    }
    return images;
  } catch (error) {
    const keys = [...createdKeys];
    const results = await Promise.allSettled(keys.map(key => (params.remove ?? deleteStorageObjectKey)(key)));
    const failedKeys = keys.filter((_, index) => results[index].status === 'rejected');
    if (failedKeys.length) {
      throw Object.assign(new Error('Image storage failed and rollback is incomplete.', { cause: error }), {
        cleanupKeys: failedKeys,
        detail: { cleanupKeys: failedKeys, storageFailure: error instanceof Error ? error.message : String(error) },
      });
    }
    throw error;
  }
}
