import type { GeneratePayload } from '@/lib/fal-types';
import { buildKlingV4FalRequest } from '@/lib/kling-v4';
import { buildKlingV4FlashFalRequest } from '@/lib/kling-v4-flash';
import type { MaxVideoProviderElement } from '@/lib/video-provider-elements';
import { getKlingV4OfficialLimitViolation } from '@/lib/kling-v4-official-limits';
import { isKling3TurboEngineId, normalizeKling3TurboRequest } from '@/lib/kling-3-turbo';
import {
  buildKling3TurboOfficialPrompt,
  getKling3TurboOfficialPromptViolation,
  KLING_3_TURBO_OFFICIAL_LIMITS,
  KLING_3_TURBO_OFFICIAL_RESOLUTION,
} from '@/lib/kling-3-turbo-official-limits';
import { KlingDirectError } from './errors';
import {
  type KlingDirectModelRoute,
  type KlingDirectSubmitMode,
  isKlingDirectV2Route,
  resolveKlingDirectCreatePath,
  resolveKlingDirectModelRoute,
  resolveKlingDirectPollPathPrefix,
  resolveKlingDirectSubmitMode,
} from './model-map';

/**
 * Kling 4.0 / 4.0 Flash new-design request body (contents / settings / options).
 * Docs: https://klingai.com/document-api/api/video/4-0/{text-to-video,image-to-video,video-omni}.md and the
 * 4-0-flash equivalents, fetched 2026-11-11.
 */
export type KlingDirectV2Content =
  | { type: 'prompt'; text: string }
  | { type: 'first_frame' | 'last_frame' | 'refer_image'; url: string; id?: string }
  | { type: 'feature_video' | 'base_video'; url: string; id?: string }
  | { type: 'element'; element_id: string; id: string };

export type KlingDirectV2Settings = {
  resolution?: '720p' | '1080p';
  aspect_ratio?: '21:9' | '16:9' | '9:16' | '1:1' | 'adaptive';
  duration?: number;
};

export type KlingDirectV2PayloadBody = {
  /** Text-to-video takes a top-level prompt; image-to-video and omni take `contents`. */
  prompt?: string;
  contents?: KlingDirectV2Content[];
  settings: KlingDirectV2Settings;
  options: {
    external_task_id: string;
    watermark_info: { enabled: false };
  };
};

export type KlingDirectV2Payload = {
  providerModel: string;
  createPath: string;
  pollPathPrefix: string;
  apiDesign: 'v2';
  resolution: string;
  body: KlingDirectV2PayloadBody;
};

function invalid(message: string): KlingDirectError {
  // A local rejection: no provider task exists, so the caller refunds as a definite rejection.
  return new KlingDirectError(message, { status: 400, code: 'KLING_V2_REQUEST_INVALID' });
}

/** The new API has no multi_prompt field; its guide expresses shots in the prompt ("镜头1:5s。..."). */
export function foldKlingV2ShotPlan(shots: Array<{ prompt: string; duration: number }>): string {
  return shots.map((shot, index) => `镜头${index + 1}:${shot.duration}s。${shot.prompt.trim()}`).join('\n');
}

/**
 * Kling 3.0 Turbo (real Turbo model, not kling-v3): t2v and first-frame i2v only, fixed tier resolution, 3-15 s,
 * no negative prompt / sound / cfg fields (audio is always rendered). Docs and limits: kling-3-turbo-official-limits.ts.
 */
function buildKling3TurboDirectPayload(params: {
  engineId: string;
  jobId: string;
  falPayload: GeneratePayload;
  route: KlingDirectModelRoute;
  submitMode: KlingDirectSubmitMode;
  createPath: string;
  pollPathPrefix: string;
}): KlingDirectV2Payload {
  const { route, submitMode } = params;
  if (!isKling3TurboEngineId(params.engineId) || (submitMode !== 't2v' && submitMode !== 'i2v')) {
    throw invalid('Kling 3.0 Turbo supports text-to-video and first-frame image-to-video only.');
  }
  if (params.falPayload.endImageUrl) throw invalid('Kling 3.0 Turbo takes a first frame only (no last frame).');
  if ((params.falPayload.elements?.length ?? 0) > 0) throw invalid('Kling 3.0 Turbo does not take subjects.');
  // Reuse the reviewed Turbo input contract (durations 3-15, ratios, exclusive prompt / shot plan sums).
  let request: ReturnType<typeof normalizeKling3TurboRequest>;
  try {
    request = normalizeKling3TurboRequest({
      engineId: params.engineId,
      mode: submitMode,
      durationSec: params.falPayload.durationSec ?? 5,
      prompt: params.falPayload.prompt,
      multiPrompt: params.falPayload.multiPrompt?.map(({ prompt, duration }) => ({ prompt, durationSec: duration })),
      aspectRatio: params.falPayload.aspectRatio,
      imageUrl: params.falPayload.imageUrl,
    });
  } catch (error) {
    throw invalid(error instanceof Error ? error.message : 'Kling 3.0 Turbo request is invalid.');
  }
  if (request.multiPrompt?.some((shot) => Array.from(shot.prompt).length > KLING_3_TURBO_OFFICIAL_LIMITS.shotPromptMaxChars)) {
    throw invalid('Each Kling 3.0 Turbo shot prompt is limited to 512 characters.');
  }
  const prompt = buildKling3TurboOfficialPrompt({ prompt: request.prompt, shots: request.multiPrompt });
  const promptViolation = getKling3TurboOfficialPromptViolation(submitMode, prompt);
  // The message is user-facing: the submission stores it as the job failure (localized in kling-failure-messages.ts).
  if (promptViolation) throw invalid(promptViolation.message);
  const resolution = route.resolution ?? KLING_3_TURBO_OFFICIAL_RESOLUTION[params.engineId];
  const options = { external_task_id: params.jobId, watermark_info: { enabled: false as const } };
  const base = {
    providerModel: route.providerModel,
    createPath: params.createPath,
    pollPathPrefix: params.pollPathPrefix,
    apiDesign: 'v2' as const,
    resolution,
  };
  if (submitMode === 't2v') {
    return { ...base, body: {
      prompt,
      settings: { resolution, aspect_ratio: request.aspectRatio ?? '16:9', duration: request.durationSec },
      options,
    } };
  }
  if (!request.imageUrl) throw invalid('Kling 3.0 Turbo image-to-video requires an opening image.');
  const contents: KlingDirectV2Content[] = [];
  if (prompt) contents.push({ type: 'prompt', text: prompt });
  contents.push({ type: 'first_frame', url: request.imageUrl });
  // The image-to-video endpoint has no aspect_ratio field; the frame decides.
  return { ...base, body: { contents, settings: { resolution, duration: request.durationSec }, options } };
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0) : [];
}

export function buildKlingDirectV2Payload(params: {
  engineId: string;
  jobId: string;
  mode: string;
  falPayload: GeneratePayload;
  /** The payload's subjects after registration, in the same order, each with `providerElementId`. */
  registeredElements?: MaxVideoProviderElement[] | null;
}): KlingDirectV2Payload {
  const route = resolveKlingDirectModelRoute(params.engineId);
  if (!isKlingDirectV2Route(route)) throw new Error(`${params.engineId} does not use the Kling new-design API.`);
  const submitMode = resolveKlingDirectSubmitMode(params.mode);
  const createPath = resolveKlingDirectCreatePath(route, submitMode);
  const pollPathPrefix = resolveKlingDirectPollPathPrefix(route, submitMode);
  if (route.providerModel === 'kling-3.0-turbo') {
    return buildKling3TurboDirectPayload({ ...params, route, submitMode, createPath, pollPathPrefix });
  }

  // Reuse the reviewed V4 / Flash input contract (field set, durations, ratios, shot plan sums).
  let normalized: Record<string, unknown>;
  try {
    const source = { ...params.falPayload, engineId: params.engineId, mode: submitMode };
    normalized = (route.engineId === 'kling-v4-flash' ? buildKlingV4FlashFalRequest(source) : buildKlingV4FalRequest(source)).requestBody;
  } catch (error) {
    throw invalid(error instanceof Error ? error.message : 'Kling 4.0 request is invalid.');
  }

  const shots = Array.isArray(normalized.multi_prompt)
    ? (normalized.multi_prompt as Array<{ prompt: string; duration: number }>)
    : [];
  const prompt = shots.length ? foldKlingV2ShotPlan(shots) : typeof normalized.prompt === 'string' ? normalized.prompt.trim() : '';
  const promptViolation = getKlingV4OfficialLimitViolation({ prompt });
  if (promptViolation) throw invalid(promptViolation.message);

  const resolution = (typeof normalized.resolution === 'string' ? normalized.resolution : route.engineId === 'kling-v4-flash' ? '720p' : '1080p') as '720p' | '1080p';
  const settings: KlingDirectV2Settings = { resolution };
  if (typeof normalized.duration === 'number') settings.duration = normalized.duration;
  const aspectRatio = typeof normalized.aspect_ratio === 'string' ? normalized.aspect_ratio : null;
  if (aspectRatio && (submitMode === 't2v' || submitMode === 'ref2v')) {
    settings.aspect_ratio = (aspectRatio === 'auto' ? 'adaptive' : aspectRatio) as KlingDirectV2Settings['aspect_ratio'];
  }
  const options = { external_task_id: params.jobId, watermark_info: { enabled: false as const } };
  const base = { providerModel: route.providerModel, createPath, pollPathPrefix, apiDesign: 'v2' as const, resolution };

  if (submitMode === 't2v') {
    if (!prompt) throw invalid('Kling 4.0 text-to-video requires a prompt.');
    return { ...base, body: { prompt, settings, options } };
  }

  const contents: KlingDirectV2Content[] = [];
  if (prompt) contents.push({ type: 'prompt', text: prompt });
  const startImage = typeof normalized.start_image_url === 'string' ? normalized.start_image_url : null;
  const endImage = typeof normalized.end_image_url === 'string' ? normalized.end_image_url : null;
  const referenceImages = asStringArray(normalized.image_urls);
  const referenceVideos = asStringArray(normalized.video_urls);
  const baseVideo = typeof normalized.video_url === 'string' ? normalized.video_url : null;

  if (submitMode === 'i2v') {
    if (!startImage) throw invalid('Kling 4.0 image-to-video requires an opening image.');
    contents.push({ type: 'first_frame', url: startImage });
    if (endImage) contents.push({ type: 'last_frame', url: endImage });
    // The dedicated image-to-video endpoint has no aspect_ratio field; the frame decides.
    return { ...base, body: { contents, settings: { resolution, ...(settings.duration ? { duration: settings.duration } : {}) }, options } };
  }

  // Omni: reference generation (ref2v) and editing (v2v, base_video). Ids allow @Image1 / @Video1 / @Element1.
  if (submitMode === 'v2v' && !baseVideo) throw invalid('Kling 4.0 editing requires a source video.');
  if (submitMode === 'v2v' && !prompt) throw invalid('Kling 4.0 editing requires a prompt.');
  if (startImage) contents.push({ type: 'first_frame', url: startImage });
  if (baseVideo) contents.push({ type: 'base_video', url: baseVideo, id: 'Video1' });
  referenceImages.forEach((url, index) => contents.push({ type: 'refer_image', url, id: `Image${index + 1}` }));
  referenceVideos.forEach((url, index) => contents.push({ type: 'feature_video', url, id: `Video${index + 1}` }));

  const sourceElements = params.falPayload.elements ?? [];
  const registered = params.registeredElements ?? [];
  if (sourceElements.length && registered.length !== sourceElements.length) {
    throw new KlingDirectError('Kling subjects were not registered before submission.', { code: 'KLING_ELEMENT_REGISTRATION_INCOMPLETE' });
  }
  let videoElements = 0;
  registered.forEach((element, index) => {
    if (element.providerElementId === undefined || element.providerElementId === null) {
      throw new KlingDirectError('Kling subjects were not registered before submission.', { code: 'KLING_ELEMENT_REGISTRATION_INCOMPLETE' });
    }
    if (element.videoUrl) videoElements += 1;
    contents.push({ type: 'element', element_id: String(element.providerElementId), id: `Element${index + 1}` });
  });

  const limitViolation = getKlingV4OfficialLimitViolation({
    imageCount: referenceImages.length + Number(Boolean(startImage)),
    videoCount: referenceVideos.length + Number(Boolean(baseVideo)),
    elementCount: registered.length,
    videoElementCount: videoElements,
  });
  if (limitViolation) throw invalid(limitViolation.message);
  if (submitMode === 'ref2v' && contents.every((item) => item.type === 'prompt')) {
    throw invalid('Kling 4.0 reference generation requires visual media.');
  }
  return { ...base, body: { contents, settings, options } };
}
