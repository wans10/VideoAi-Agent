import type { Kling3TurboEngineId } from '@/src/config/fal-engines/kling-3-turbo-shared';

/**
 * Kling 3.0 Turbo on Kling's official "new design" API (model version in the path), fetched 2026-11-12:
 * https://klingai.com/document-api/api/video/3-0-turbo/text-to-video.md and .../image-to-video.md.
 * - t2v `POST /text-to-video/kling-3.0-turbo`: top-level `prompt` (at most 3072 characters, 2500 recommended),
 *   `settings.resolution` 720p | 1080p, `settings.aspect_ratio` 16:9 | 9:16 | 1:1, `settings.duration` 3..15.
 * - i2v `POST /image-to-video/kling-3.0-turbo`: `contents` = prompt text (at most 2500 characters) + one
 *   `first_frame` (jpg/jpeg/png, <= 50 MB, sides >= 300 px, ratio 1:2.5..2.5:1; no last frame), no aspect ratio.
 * - Neither endpoint has a negative prompt, sound, cfg or multi_prompt field. Audio is always rendered (the price
 *   table lists only "有声"). Shots are written into the prompt as "镜头 n, m, words; ..." (1..6 shots, each at
 *   least 1 s, durations summing to `settings.duration`, words at most 512 characters).
 * These limits belong to this transport; Bailian's Turbo model takes a separate multi_prompt field.
 */
export const KLING_3_TURBO_OFFICIAL_LIMITS = {
  t2vPromptMaxChars: 3072,
  i2vPromptMaxChars: 2500,
  maxShots: 6,
  shotPromptMaxChars: 512,
  minDurationSec: 3,
  maxDurationSec: 15,
} as const;

/** Std renders 720P and Pro 1080P, the same tiers as the Bailian-hosted Turbo model. */
export const KLING_3_TURBO_OFFICIAL_RESOLUTION: Readonly<Record<Kling3TurboEngineId, '720p' | '1080p'>> = {
  'kling-3-turbo-standard': '720p',
  'kling-3-turbo-pro': '1080p',
};

export type Kling3TurboShot = { prompt: string; durationSec: number };

/** Canonical English text; localized in lib/kling-failure-messages.ts. */
export function kling3TurboOfficialPromptLimitMessage(maxChars: number): string {
  return `Kling 3.0 Turbo prompts on the official Kling route are limited to ${maxChars.toLocaleString('en-US')} characters, including the multi-shot layout. Shorten the prompt or shot descriptions and try again.`;
}

export const KLING_3_TURBO_OFFICIAL_PROMPT_LIMIT_PATTERN =
  /^Kling 3\.0 Turbo prompts on the official Kling route are limited to ([\d,]+) characters\b/i;

export function isKling3TurboOfficialPromptLimitMessage(message: string | null | undefined): boolean {
  return KLING_3_TURBO_OFFICIAL_PROMPT_LIMIT_PATTERN.test(message?.trim() ?? '');
}

function characterCount(value: string): number {
  return Array.from(value).length;
}

/**
 * The documented shot syntax ("镜头 n, m, words; 镜头 n, m, words;"). A half-width semicolon inside a shot would
 * end that shot early, so it is written as the full-width "；".
 */
export function foldKling3TurboShotPlan(shots: readonly Kling3TurboShot[]): string {
  return shots
    .map((shot, index) => `镜头 ${index + 1}, ${shot.durationSec}, ${shot.prompt.trim().replace(/;/g, '；')};`)
    .join(' ');
}

/** The text actually sent: the shot plan when present, otherwise the single prompt. */
export function buildKling3TurboOfficialPrompt(input: {
  prompt?: string | null;
  shots?: readonly Kling3TurboShot[] | null;
}): string {
  return input.shots?.length ? foldKling3TurboShotPlan(input.shots) : input.prompt?.trim() ?? '';
}

export function kling3TurboOfficialPromptMaxChars(mode: string): number {
  return mode === 'i2v' ? KLING_3_TURBO_OFFICIAL_LIMITS.i2vPromptMaxChars : KLING_3_TURBO_OFFICIAL_LIMITS.t2vPromptMaxChars;
}

export function getKling3TurboOfficialPromptViolation(
  mode: string,
  prompt: string
): { field: 'prompt'; maxChars: number; message: string } | null {
  const maxChars = kling3TurboOfficialPromptMaxChars(mode);
  if (characterCount(prompt) <= maxChars) return null;
  return { field: 'prompt', maxChars, message: kling3TurboOfficialPromptLimitMessage(maxChars) };
}

/**
 * Router check on the raw generate request (`prompt`, `multiPrompt: [{ prompt, duration }]`): whether the official
 * Turbo route can take it. Only a folded shot plan can exceed the limit; the engine already caps single prompts at
 * 2500 characters. Anything this cannot read is left to the payload builder.
 */
export function isKling3TurboRequestWithinOfficialLimits(mode: string, request?: Record<string, unknown>): boolean {
  if (!request) return true;
  const rawShots = Array.isArray(request.multiPrompt) ? request.multiPrompt : [];
  const shots: Kling3TurboShot[] = [];
  for (const entry of rawShots) {
    if (!entry || typeof entry !== 'object') continue;
    const record = entry as Record<string, unknown>;
    const prompt = typeof record.prompt === 'string' ? record.prompt.trim() : '';
    const duration = Number(record.duration);
    if (prompt) shots.push({ prompt, durationSec: Number.isFinite(duration) ? Math.round(duration) : 0 });
  }
  const prompt = buildKling3TurboOfficialPrompt({
    prompt: typeof request.prompt === 'string' ? request.prompt : null,
    shots,
  });
  return getKling3TurboOfficialPromptViolation(mode, prompt) === null;
}
