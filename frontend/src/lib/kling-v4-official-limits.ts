/**
 * Kling 4.0 / 4.0 Flash official per-request limits (klingai.com/document-api/api/video/4-0/video-omni.md and
 * 4-0-flash/video-omni.md, fetched 2026-11-11). They apply to the model itself, whichever transport submits it.
 */
export const KLING_V4_OFFICIAL_LIMITS = {
  maxImages: 10,
  maxVideos: 5,
  maxElements: 7,
  maxVideoElements: 3,
  maxReferenceItems: 15,
  promptEnglishChars: 26_000,
  promptNonEnglishChars: 11_000,
} as const;

/** English chars / 26,000 + non-English chars / 11,000 must not exceed 1. */
export function isKlingV4PromptWithinOfficialLimit(prompt: string): boolean {
  let english = 0;
  let other = 0;
  for (const char of prompt) {
    if (char.charCodeAt(0) <= 0x7f) english += 1;
    else other += 1;
  }
  return english / KLING_V4_OFFICIAL_LIMITS.promptEnglishChars + other / KLING_V4_OFFICIAL_LIMITS.promptNonEnglishChars <= 1;
}

/** Counts are of distinct inputs: images include the opening image, videos include an edited source video. */
export function getKlingV4OfficialLimitViolation(input: {
  prompt?: string | null;
  imageCount?: number;
  videoCount?: number;
  elementCount?: number;
  videoElementCount?: number;
}): { field: string; message: string } | null {
  const limits = KLING_V4_OFFICIAL_LIMITS;
  if (input.prompt && !isKlingV4PromptWithinOfficialLimit(input.prompt)) {
    return { field: 'prompt', message: 'Kling 4.0 prompts allow 26,000 English or 11,000 non-English characters; mixed text is prorated.' };
  }
  const images = input.imageCount ?? 0;
  const videos = input.videoCount ?? 0;
  const elements = input.elementCount ?? 0;
  const videoElements = input.videoElementCount ?? 0;
  if (images > limits.maxImages) return { field: 'image_urls', message: 'Kling 4.0 accepts at most 10 images, including the opening image.' };
  if (elements > limits.maxElements) return { field: 'elements', message: 'Kling 4.0 accepts at most 7 subjects.' };
  if (videoElements > limits.maxVideoElements) return { field: 'elements', message: 'Kling 4.0 accepts at most 3 video subjects.' };
  if (videos + videoElements > limits.maxVideos) return { field: 'video_urls', message: 'Kling 4.0 accepts at most 5 videos, including video subjects.' };
  if (images + videos + elements > limits.maxReferenceItems) {
    return { field: 'references', message: 'Kling 4.0 accepts at most 15 images, videos and subjects in total.' };
  }
  return null;
}
