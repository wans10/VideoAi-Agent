import type { GeneratePayload } from '@/lib/fal';
import type { MinimaxOfficialCreateInput } from '@/server/video-providers/minimax-official/client';

export type MinimaxOfficialMedia = Pick<
  MinimaxOfficialCreateInput,
  'endImageUrl' | 'referenceImageUrls' | 'referenceVideoUrls' | 'referenceAudioUrls' | 'promptOptimizer'
>;

function clean(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function addUnique(list: string[], value: unknown): void {
  const url = clean(value);
  if (url && !list.includes(url)) list.push(url);
}

/**
 * Collects the media MiniMax's own API takes beyond the start image (which travels as `imageUrl`):
 * the last frame in image-to-video, and reference image/video/audio in multimodal reference mode.
 * Only consumed by the MiniMax official route; LLM Hub ignores it.
 */
export function resolveMinimaxOfficialMedia(payload: GeneratePayload, mode: string): MinimaxOfficialMedia {
  const media: MinimaxOfficialMedia = {};
  const optimizer = payload.extraInputValues?.prompt_optimizer;
  if (optimizer === 'on' || optimizer === true) media.promptOptimizer = true;
  if (optimizer === 'off' || optimizer === false) media.promptOptimizer = false;
  if (mode === 'i2v') {
    let endImageUrl = clean(payload.endImageUrl);
    for (const input of payload.inputs ?? []) {
      const slot = input.slotId?.trim().toLowerCase() ?? '';
      if (input.kind === 'image' && ['end_image_url', 'last_frame_url'].includes(slot)) {
        endImageUrl ??= clean(input.url);
      }
    }
    if (endImageUrl) media.endImageUrl = endImageUrl;
    return media;
  }
  if (mode !== 'ref2v') return media;
  const images: string[] = [];
  const videos: string[] = [];
  const audio: string[] = [];
  for (const url of payload.referenceImages ?? []) addUnique(images, url);
  for (const input of payload.inputs ?? []) {
    const slot = input.slotId?.trim().toLowerCase() ?? '';
    if (input.kind === 'image' && ['reference_image_urls', 'reference_images', 'image_urls'].includes(slot)) addUnique(images, input.url);
    else if (input.kind === 'video' && slot === 'reference_video_urls') addUnique(videos, input.url);
    else if (input.kind === 'audio' && slot === 'reference_audio_urls') addUnique(audio, input.url);
  }
  if (images.length) media.referenceImageUrls = images;
  if (videos.length) media.referenceVideoUrls = videos;
  if (audio.length) media.referenceAudioUrls = audio;
  return media;
}
