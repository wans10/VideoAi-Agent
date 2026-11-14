/**
 * Keyvo does not run on fal. These workspace features have no provider behind them on this
 * deployment (their only executors are fal endpoints), so they are hidden from every entry point
 * and refused at their routes and APIs. The code stays in place so upstream syncs do not conflict.
 * Flip this to false once a provider is wired. Typed as boolean so guarded code stays type-checked.
 */
export const KEYVO_FAL_FEATURES_HIDDEN: boolean = true;

const KEYVO_FAL_TOOL_IDS: ReadonlySet<string> = new Set([
  'upscale',
  'background-removal',
  'restore-video',
  'denoise',
  'fix-blur',
  'smooth-motion',
  'angle',
]);

export function isKeyvoToolDisabled(toolId: string | null | undefined): boolean {
  return KEYVO_FAL_FEATURES_HIDDEN && typeof toolId === 'string' && KEYVO_FAL_TOOL_IDS.has(toolId);
}

/**
 * The workspace model chooser already lists every model of a family (Seedance 2.0, Fast, Mini...), so the
 * separate Variant box repeated it with abbreviated labels. Hidden in the video and image workspaces only;
 * marketing selectors keep it. Flip to false to restore the box.
 */
export const KEYVO_WORKSPACE_VARIANT_HIDDEN: boolean = true;

/**
 * Google sign-in is unreachable from mainland China, so the "Continue with Google" button is not offered on the
 * login page. Email/password (and phone one-time code, once enabled) remain. Typed as boolean so guarded code stays
 * type-checked; flip to false to show the button again.
 */
export const KEYVO_GOOGLE_LOGIN_HIDDEN: boolean = true;

export function isKeyvoAudioDisabled(): boolean {
  return KEYVO_FAL_FEATURES_HIDDEN;
}

/**
 * Voice over is the one audio feature with a mainland provider (MiniMax Speech through api.minimax.cn);
 * music, songs, effects and ambience still only exist on fal. While fal features are hidden, the audio
 * workspace is therefore reduced to MiniMax voice over, and only opens when that provider is configured.
 */
export const KEYVO_AUDIO_VOICE_ONLY: boolean = true;

/** Static part of the rule, safe for client code. */
export function isKeyvoAudioVoiceOnly(): boolean {
  // KEYVO_AUDIO_FULL_UI=1 is for tests that exercise the complete audio workspace; it is never set in production.
  try {
    if (process.env.KEYVO_AUDIO_FULL_UI === '1') return false;
  } catch {
    // A plain browser bundle has no `process`; the rule below applies.
  }
  return KEYVO_FAL_FEATURES_HIDDEN && KEYVO_AUDIO_VOICE_ONLY;
}

export function isMinimaxSpeechConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return ['1', 'true', 'yes', 'on'].includes((env.MINIMAX_SPEECH_ENABLED ?? '').trim().toLowerCase())
    && Boolean(env.MINIMAX_API_KEY?.trim());
}

export function isSeedAudioConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return ['1', 'true', 'yes', 'on'].includes((env.SEED_AUDIO_ENABLED ?? '').trim().toLowerCase())
    && Boolean(env.SEED_AUDIO_API_KEY?.trim());
}

/** The audio workspace, its routes and its APIs: hidden unless voice over is available. */
export function isKeyvoAudioWorkspaceDisabled(env: Record<string, string | undefined> = process.env): boolean {
  if (!KEYVO_FAL_FEATURES_HIDDEN) return false;
  return !(KEYVO_AUDIO_VOICE_ONLY && (isMinimaxSpeechConfigured(env) || isSeedAudioConfigured(env)));
}

/** Voice over with MiniMax or Seed Audio (preset voices only; reference voices have no mainland executor). */
export function isKeyvoAudioRequestAllowed(request: {
  pack?: string | null;
  voiceModel?: string | null;
  hasReference?: boolean;
}): boolean {
  if (!isKeyvoAudioVoiceOnly()) return true;
  return request.pack === 'voice_only'
    && (request.voiceModel === 'minimax' || request.voiceModel === 'seed')
    && !request.hasReference;
}

/** True for a workspace or public path that belongs to a hidden tool or to the audio workspace. */
export function isKeyvoHiddenFeaturePath(href: string | null | undefined): boolean {
  if (typeof href !== 'string') return false;
  const path = href.split(/[?#]/)[0] ?? '';
  const tool = /^(?:\/[a-z]{2})?(?:\/app)?\/tools\/([a-z-]+)\/?$/.exec(path);
  if (tool) return isKeyvoToolDisabled(tool[1]);
  // Public navigation keeps audio out; only the in-app menu offers voice over (components/app/app-navigation.ts),
  // and the audio page and API answer 404 until MiniMax Speech is configured (isKeyvoAudioWorkspaceDisabled).
  return isKeyvoAudioDisabled() && /^(?:\/[a-z]{2})?\/app\/audio(?:\/|$)/.test(path);
}

/**
 * The public MCP server's included trial (the first paid-generation trial funded by the platform) is closed for
 * Keyvo: mainland users cannot use the Claude/Codex hosts the server serves, so the trial has no audience. While true,
 * trial eligibility is never offered, quotes never use trial funding, confirmation refuses trial funding before any
 * reservation, and no public copy claims a trial. Historical trial rows still read normally. MCP paid generation is
 * unaffected. Reopening needs a migration widening the funding CHECK guard plus a ceiling/financial decision; see
 * docs/engineering/keyvo-upstream-deviations.md.
 */
export const KEYVO_MCP_TRIAL_DISABLED: boolean = true;
