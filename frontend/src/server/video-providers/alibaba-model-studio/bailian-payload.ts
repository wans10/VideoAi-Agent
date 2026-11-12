import { normalizeKlingOmniPromptReferences } from '@/lib/kling-provider-limits';
import { AlibabaModelStudioError } from './errors';
import {
  BAILIAN_KLING_OMNI_MODEL,
  BAILIAN_KLING_TURBO_MODEL,
  BAILIAN_MINIMAX_H3_MODEL,
} from './bailian-models';
import { isAlibabaThirdPartyRoute, resolveAlibabaModelRoute, type AlibabaModelRoute } from './model-map';
import { buildAlibabaVideoPayload, type AlibabaVideoPayloadInput } from './payload';
import type {
  AlibabaReferenceAsset,
  AlibabaVideoRequestPayload,
  BailianHostedMedia,
  BailianKlingVideoPayload,
  BailianMinimaxVideoPayload,
} from './types';

/**
 * Request bodies for the Kling and MiniMax models Bailian hosts (cn-beijing, checked 2026-11-11):
 * kling-video-generation-api-reference, kling-v3-turbo-video-generation, minimax-video-generation-api-reference.
 * Every rule below is enforced before the paid call; a local rejection creates no task, so the caller may
 * use the vendor's direct route instead (bailian-routing.ts).
 */
export type BailianHostedPayloadInput = AlibabaVideoPayloadInput & {
  negativePrompt?: string | null;
  multiPrompt?: Array<{ prompt: string; duration: number }> | null;
  shotType?: 'customize' | 'intelligent' | 'intelligence' | null;
  keepAudio?: boolean | null;
};

export const BAILIAN_KLING_ASPECT_RATIOS = ['16:9', '9:16', '1:1'] as const;
export const BAILIAN_KLING_PROMPT_MAX_CHARS = 2_500;
export const BAILIAN_KLING_SHOT_PROMPT_MAX_CHARS = 512;
export const BAILIAN_KLING_DURATION = { min: 3, max: 15, featureMax: 10 } as const;
export const BAILIAN_KLING_REFERENCE_LIMITS = { refer: 7, withFeature: 4 } as const;
export const BAILIAN_MINIMAX_H3_RATIOS = ['16:9', '9:16', '1:1', '4:3', '3:4', '21:9'] as const;
export const BAILIAN_MINIMAX_H3_LIMITS = {
  promptMaxChars: 7_000, minDuration: 4, maxDuration: 15, images: 9, videos: 3, audios: 3, timedMin: 2, timedTotalMax: 15,
} as const;

const KLING_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
const MINIMAX_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const VIDEO_TYPES = ['video/mp4', 'video/quicktime'];
const AUDIO_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/wave'];

function invalid(message: string, code: string): never {
  throw new AlibabaModelStudioError(message, { code, errorClass: 'invalid_request', body: { code, message } });
}

function clean(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function asset(value: string | AlibabaReferenceAsset | null | undefined, kind: string, types: string[]): AlibabaReferenceAsset | null {
  if (value === null || value === undefined) return null;
  const record = typeof value === 'string' ? { url: value } : value;
  const url = clean(record.url);
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    invalid(`${kind} requires a valid HTTPS URL.`, 'ALIBABA_REFERENCE_URL_INVALID');
  }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) {
    invalid(`${kind} requires a valid HTTPS URL.`, 'ALIBABA_REFERENCE_URL_INVALID');
  }
  const mimeType = clean(record.mimeType)?.toLowerCase();
  if (mimeType && !types.includes(mimeType)) invalid(`${kind} type ${mimeType} is not supported.`, 'BAILIAN_MEDIA_TYPE_UNSUPPORTED');
  if (record.hasAlpha === true && kind.includes('image')) invalid(`${kind} must not have transparency.`, 'BAILIAN_MEDIA_TYPE_UNSUPPORTED');
  return { ...record, url };
}

function assets(values: Array<string | AlibabaReferenceAsset> | null | undefined, kind: string, types: string[]) {
  return (values ?? []).map((value) => asset(value, kind, types)).filter((item): item is AlibabaReferenceAsset => item !== null);
}

function integerInRange(value: number, min: number, max: number, label: string): number {
  if (!Number.isInteger(value) || value < min || value > max) {
    invalid(`${label} must be an integer from ${min} to ${max} seconds.`, 'BAILIAN_DURATION_UNSUPPORTED');
  }
  return value;
}

function klingRatio(value: string | null | undefined): string {
  const ratio = clean(value);
  if (!ratio || ratio === 'auto' || ratio === 'adaptive') return '16:9';
  if ((BAILIAN_KLING_ASPECT_RATIOS as readonly string[]).includes(ratio)) return ratio;
  invalid('Kling on Bailian supports 16:9, 9:16 and 1:1.', 'BAILIAN_ASPECT_RATIO_UNSUPPORTED');
}

function klingShots(input: BailianHostedPayloadInput, durationSec: number) {
  const shots = (input.multiPrompt ?? [])
    .map((entry) => ({ prompt: clean(entry.prompt) ?? '', duration: Math.trunc(entry.duration || 0) }))
    .filter((entry) => entry.prompt.length > 0);
  if (!shots.length) return null;
  if (shots.length > 6) invalid('Kling multi-shot accepts one to six shots.', 'BAILIAN_MULTI_SHOT_UNSUPPORTED');
  for (const shot of shots) {
    if (shot.duration < 1 || shot.duration > durationSec) {
      invalid('Each Kling shot must last between 1 second and the clip duration.', 'BAILIAN_MULTI_SHOT_UNSUPPORTED');
    }
    if (shot.prompt.length > BAILIAN_KLING_SHOT_PROMPT_MAX_CHARS) {
      invalid('Each Kling shot prompt is limited to 512 characters.', 'BAILIAN_PROMPT_TOO_LONG');
    }
  }
  const shotType = input.shotType === 'intelligent' || input.shotType === 'intelligence' ? 'intelligence' as const : 'customize' as const;
  return { shotType, shots };
}

function buildKlingPayload(input: BailianHostedPayloadInput, route: AlibabaModelRoute): BailianKlingVideoPayload {
  const model = route.model as BailianKlingVideoPayload['model'];
  const mode = route.klingMode;
  if (!mode) invalid('Kling tier is missing.', 'ALIBABA_MODEL_MODE_UNSUPPORTED');
  const turbo = model === BAILIAN_KLING_TURBO_MODEL;
  const omni = model === BAILIAN_KLING_OMNI_MODEL;
  if (turbo && mode === '4k') invalid('Kling 3.0 Turbo has no 4K mode.', 'BAILIAN_RESOLUTION_UNSUPPORTED');

  const first = asset(input.startImageUrl, 'start image', KLING_IMAGE_TYPES);
  const last = asset(input.endImageUrl, 'end image', KLING_IMAGE_TYPES);
  const refs = assets(input.referenceImageUrls, 'reference image', KLING_IMAGE_TYPES);
  const videos = assets(input.referenceVideoUrls, 'reference video', VIDEO_TYPES);
  if ((input.referenceAudioUrls ?? []).length || input.fileUrl || input.webUrl) {
    invalid('Kling on Bailian does not take audio, document or webpage references.', 'BAILIAN_INPUT_UNSUPPORTED');
  }
  if (videos.length > 1) invalid('Kling on Bailian takes one reference video.', 'BAILIAN_REFERENCE_LIMIT_EXCEEDED');
  const video = videos[0] ?? null;
  if (!omni && (refs.length || video)) {
    invalid('Only Kling 3.0 Omni takes reference images or videos on Bailian.', 'BAILIAN_INPUT_UNSUPPORTED');
  }
  if (turbo && last) invalid('Kling 3.0 Turbo takes a first frame only (no last frame).', 'BAILIAN_INPUT_UNSUPPORTED');

  const media: BailianHostedMedia[] = [];
  let needsRatio = false;
  if (input.mode === 't2v') {
    if (first || last || refs.length || video) invalid('Text-to-video takes no media.', 'BAILIAN_INPUT_UNSUPPORTED');
    needsRatio = true;
  } else if (input.mode === 'i2v') {
    if (!first) invalid('Image-to-video requires a first frame.', 'ALIBABA_FIRST_FRAME_REQUIRED');
    if (refs.length || video) invalid('Image-to-video takes frames only.', 'BAILIAN_INPUT_UNSUPPORTED');
    media.push({ type: 'first_frame', url: first.url });
    if (last) media.push({ type: 'last_frame', url: last.url });
  } else if (omni && input.mode === 'ref2v') {
    if (last) invalid('Kling Omni reference-to-video on Bailian takes no last frame.', 'BAILIAN_INPUT_UNSUPPORTED');
    if (!video && !refs.length) invalid('Reference-to-video requires reference images or a reference video.', 'ALIBABA_REFERENCE_REQUIRED');
    if (first && (!video || refs.length)) {
      invalid('On Bailian a start frame combines only with one reference video.', 'BAILIAN_INPUT_UNSUPPORTED');
    }
    const limit = video ? BAILIAN_KLING_REFERENCE_LIMITS.withFeature : BAILIAN_KLING_REFERENCE_LIMITS.refer;
    if (refs.length > limit) invalid(`Kling Omni takes at most ${limit} reference images here.`, 'BAILIAN_REFERENCE_LIMIT_EXCEEDED');
    for (const ref of refs) media.push({ type: 'refer', url: ref.url });
    if (video) media.push({ type: 'feature', url: video.url, keep_original_sound: input.keepAudio === true ? 'yes' : 'no' });
    if (first) media.push({ type: 'first_frame', url: first.url });
    needsRatio = !first;
  } else if (omni && input.mode === 'v2v') {
    if (!video) invalid('Video-to-video requires one source video.', 'ALIBABA_SOURCE_VIDEO_REQUIRED');
    if (first || last) invalid('Video-to-video takes no frames.', 'BAILIAN_INPUT_UNSUPPORTED');
    if (refs.length > BAILIAN_KLING_REFERENCE_LIMITS.withFeature) {
      invalid('Kling Omni takes at most 4 reference images with a video.', 'BAILIAN_REFERENCE_LIMIT_EXCEEDED');
    }
    for (const ref of refs) media.push({ type: 'refer', url: ref.url });
    media.push({ type: 'feature', url: video.url, keep_original_sound: input.keepAudio === false ? 'no' : 'yes' });
    needsRatio = true;
  } else {
    invalid(`${input.engineId}/${input.mode} is not supported on Bailian.`, 'ALIBABA_MODEL_MODE_UNSUPPORTED');
  }

  const hasVideoInput = Boolean(video);
  const duration = integerInRange(input.durationSec, BAILIAN_KLING_DURATION.min,
    hasVideoInput ? BAILIAN_KLING_DURATION.featureMax : BAILIAN_KLING_DURATION.max, 'Kling duration');
  const multiShot = klingShots(input, duration);
  if (multiShot && hasVideoInput && multiShot.shotType === 'customize') {
    invalid('Kling reference-video renders support only intelligent multi-shot.', 'BAILIAN_MULTI_SHOT_UNSUPPORTED');
  }
  const customize = multiShot?.shotType === 'customize';
  const rawPrompt = clean(input.prompt);
  if (!rawPrompt && !customize) invalid('Kling requires a prompt.', 'ALIBABA_PROMPT_REQUIRED');
  if ((rawPrompt?.length ?? 0) > BAILIAN_KLING_PROMPT_MAX_CHARS) {
    invalid('Kling prompts are limited to 2,500 characters.', 'BAILIAN_PROMPT_TOO_LONG');
  }
  const references = (value: string) => (omni ? normalizeKlingOmniPromptReferences(value) : value);
  const negativePrompt = turbo ? null : clean(input.negativePrompt);
  if ((negativePrompt?.length ?? 0) > BAILIAN_KLING_PROMPT_MAX_CHARS) {
    invalid('Kling negative prompts are limited to 2,500 characters.', 'BAILIAN_PROMPT_TOO_LONG');
  }

  return {
    model,
    input: {
      ...(rawPrompt && !customize ? { prompt: references(rawPrompt) } : {}),
      ...(negativePrompt ? { negative_prompt: negativePrompt } : {}),
      ...(media.length ? { media } : {}),
      ...(multiShot ? {
        multi_shot: true,
        shot_type: multiShot.shotType,
        ...(customize ? {
          multi_prompt: multiShot.shots.map((shot, index) => ({ index: index + 1, prompt: references(shot.prompt), duration: shot.duration })),
        } : {}),
      } : {}),
    },
    parameters: {
      mode,
      ...(needsRatio ? { aspect_ratio: klingRatio(input.aspectRatio) } : {}),
      duration,
      // Turbo always renders audio (the flag is ignored); any video input requires audio=false.
      ...(turbo ? {} : { audio: !hasVideoInput && input.audioEnabled === true }),
      watermark: false,
    },
  };
}

function timedTotal(items: AlibabaReferenceAsset[], kind: string): void {
  const known = items.map((item) => item.durationSec).filter((value): value is number => typeof value === 'number');
  for (const seconds of known) {
    if (!Number.isFinite(seconds) || seconds < BAILIAN_MINIMAX_H3_LIMITS.timedMin || seconds > BAILIAN_MINIMAX_H3_LIMITS.timedTotalMax) {
      invalid(`Each MiniMax-H3 reference ${kind} must last 2 to 15 seconds.`, 'ALIBABA_REFERENCE_DURATION_INVALID');
    }
  }
  if (known.reduce((sum, seconds) => sum + seconds, 0) > BAILIAN_MINIMAX_H3_LIMITS.timedTotalMax) {
    invalid(`MiniMax-H3 reference ${kind} must total 15 seconds or less.`, 'ALIBABA_REFERENCE_DURATION_EXCEEDED');
  }
}

function buildMinimaxPayload(input: BailianHostedPayloadInput): BailianMinimaxVideoPayload {
  const prompt = clean(input.prompt);
  if (!prompt) invalid('MiniMax-H3 needs a prompt.', 'ALIBABA_PROMPT_REQUIRED');
  if ([...prompt].length > BAILIAN_MINIMAX_H3_LIMITS.promptMaxChars) {
    invalid('MiniMax-H3 prompts are limited to 7,000 characters.', 'BAILIAN_PROMPT_TOO_LONG');
  }
  const duration = integerInRange(input.durationSec, BAILIAN_MINIMAX_H3_LIMITS.minDuration, BAILIAN_MINIMAX_H3_LIMITS.maxDuration,
    'MiniMax-H3 duration');
  const rawResolution = (clean(input.resolution) ?? '768P').toUpperCase();
  if (rawResolution !== '768P' && rawResolution !== '2K') {
    invalid('MiniMax-H3 accepts only 768P and 2K.', 'BAILIAN_RESOLUTION_UNSUPPORTED');
  }
  const first = asset(input.startImageUrl, 'start image', MINIMAX_IMAGE_TYPES);
  const last = asset(input.endImageUrl, 'end image', MINIMAX_IMAGE_TYPES);
  const images = assets(input.referenceImageUrls, 'reference image', MINIMAX_IMAGE_TYPES);
  const videos = assets(input.referenceVideoUrls, 'reference video', VIDEO_TYPES);
  const audios = assets(input.referenceAudioUrls, 'reference audio', AUDIO_TYPES);
  if (input.fileUrl || input.webUrl) invalid('MiniMax-H3 takes no document or webpage reference.', 'BAILIAN_INPUT_UNSUPPORTED');
  const hasFrames = Boolean(first || last);
  const hasReferences = images.length + videos.length + audios.length > 0;
  // Image-to-video and multimodal reference are mutually exclusive in one request.
  if (hasFrames && hasReferences) invalid('MiniMax-H3 cannot combine frames with references.', 'ALIBABA_FRAME_REFERENCE_CONFLICT');
  const media: BailianHostedMedia[] = [];
  if (input.mode === 't2v') {
    if (hasFrames || hasReferences) invalid('Text-to-video takes no media.', 'BAILIAN_INPUT_UNSUPPORTED');
  } else if (input.mode === 'i2v') {
    if (!hasFrames) invalid('Image-to-video requires a first or last frame.', 'ALIBABA_FIRST_FRAME_REQUIRED');
    if (first) media.push({ type: 'first_frame', url: first.url });
    if (last) media.push({ type: 'last_frame', url: last.url });
  } else if (input.mode === 'ref2v') {
    if (!hasReferences) invalid('Reference-to-video requires reference media.', 'ALIBABA_REFERENCE_REQUIRED');
    if (images.length > BAILIAN_MINIMAX_H3_LIMITS.images) invalid('MiniMax-H3 accepts at most 9 reference images.', 'BAILIAN_REFERENCE_LIMIT_EXCEEDED');
    if (videos.length > BAILIAN_MINIMAX_H3_LIMITS.videos) invalid('MiniMax-H3 accepts at most 3 reference videos.', 'BAILIAN_REFERENCE_LIMIT_EXCEEDED');
    if (audios.length > BAILIAN_MINIMAX_H3_LIMITS.audios) invalid('MiniMax-H3 accepts at most 3 reference audio clips.', 'BAILIAN_REFERENCE_LIMIT_EXCEEDED');
    timedTotal(videos, 'videos');
    timedTotal(audios, 'audio');
    for (const image of images) media.push({ type: 'image_url', url: image.url });
    for (const video of videos) media.push({ type: 'feature', url: video.url });
    for (const audio of audios) media.push({ type: 'driving_audio', url: audio.url });
  } else {
    invalid(`MiniMax-H3 ${input.mode} is not supported on Bailian.`, 'ALIBABA_MODEL_MODE_UNSUPPORTED');
  }
  const requested = clean(input.aspectRatio);
  const fixed = requested && (BAILIAN_MINIMAX_H3_RATIOS as readonly string[]).includes(requested) ? requested : null;
  if (requested && !fixed && requested !== 'auto' && requested !== 'adaptive') {
    invalid('MiniMax-H3 received an unsupported aspect ratio.', 'BAILIAN_ASPECT_RATIO_UNSUPPORTED');
  }
  // Text-to-video needs a fixed ratio; frames decide it themselves; references default to adaptive.
  const ratio = input.mode === 't2v' ? fixed ?? '16:9' : input.mode === 'ref2v' ? fixed ?? 'adaptive' : null;
  return {
    model: BAILIAN_MINIMAX_H3_MODEL,
    input: { prompt, ...(media.length ? { media } : {}) },
    parameters: {
      resolution: rawResolution,
      ...(ratio ? { ratio } : {}),
      duration,
      watermark: false,
    },
  };
}

export function buildBailianHostedPayload(input: BailianHostedPayloadInput) {
  const route = resolveAlibabaModelRoute(input.engineId, input.mode);
  if (!route || !isAlibabaThirdPartyRoute(route)) {
    invalid(`${input.engineId}/${input.mode} is not hosted on Bailian.`, 'ALIBABA_MODEL_MODE_UNSUPPORTED');
  }
  return route.family === 'minimax_h3' ? buildMinimaxPayload(input) : buildKlingPayload(input, route);
}

/** One entry point for the shared video-synthesis endpoint: Wan/HappyHorse or a Bailian-hosted model. */
export function buildAlibabaRequestPayload(input: BailianHostedPayloadInput): AlibabaVideoRequestPayload {
  const route = resolveAlibabaModelRoute(input.engineId, input.mode);
  return route && isAlibabaThirdPartyRoute(route) ? buildBailianHostedPayload(input) : buildAlibabaVideoPayload(input);
}
