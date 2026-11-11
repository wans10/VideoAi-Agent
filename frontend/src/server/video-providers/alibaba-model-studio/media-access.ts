import { createOwnedMediaReadUrl } from '@/server/owned-media-read-access';
import { sanitizeProviderMediaDiagnostics } from '@/server/provider-media-diagnostics';
import { AlibabaModelStudioError } from './errors';
import { isBailianHostedModel } from './bailian-models';

type TransportPayload = { model: string; input: { media?: Array<{ type: string; url: string }> } };

/**
 * Short-lived owner-checked read grants for Wan 3 and the Bailian-hosted Kling / MiniMax models (their media
 * may sit in private storage). Durable inputs and HappyHorse payloads stay unchanged.
 */
export async function createWanMediaTransport<P extends TransportPayload>(
  input: { payload: P; userId: string },
  dependencies: { read?: typeof createOwnedMediaReadUrl } = {},
): Promise<{ payload: P; sanitize: (value: unknown) => unknown }> {
  if (input.payload.model !== 'wan3.0-video' && input.payload.model !== 'wan3.0-video-prime'
    && !isBailianHostedModel(input.payload.model)) {
    return { payload: input.payload, sanitize: value => value };
  }
  const canonicalByGrant = new Map<string, string>();
  const reads = new Map<string, Promise<string>>();
  const readUrl = (url: string): Promise<string> => {
    let pending = reads.get(url);
    if (!pending) {
      pending = (dependencies.read ?? createOwnedMediaReadUrl)({ url, userId: input.userId, expiresInSeconds: 3600 })
        .then(grant => {
          if (grant !== url) canonicalByGrant.set(grant, url);
          return grant;
        }).catch(error => {
          const unavailable = error instanceof Error && error.message === 'MEDIA_NOT_AVAILABLE';
          // A local grant failure must never submit the inaccessible original to a fallback provider.
          throw new AlibabaModelStudioError('Reference media could not be read.', {
            status: unavailable ? 400 : 503,
            code: unavailable ? 'REFERENCE_INVALID' : 'REFERENCE_ACCESS_FAILED',
            errorClass: unavailable ? 'invalid_request' : 'provider_error',
          });
        });
      reads.set(url, pending);
    }
    return pending;
  };
  const payload = { ...input.payload, input: { ...input.payload.input } } as P;
  const target = payload.input as TransportPayload['input'];
  if (target.media) target.media = await Promise.all(target.media.map(async media => (
    media.type === 'file' || media.type === 'link' ? { ...media } : { ...media, url: await readUrl(media.url) }
  )));
  return { payload, sanitize: value => sanitizeProviderMediaDiagnostics(value, canonicalByGrant) };
}
