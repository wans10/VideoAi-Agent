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

export function isKeyvoAudioDisabled(): boolean {
  return KEYVO_FAL_FEATURES_HIDDEN;
}

/** True for a workspace or public path that belongs to a hidden tool or to the audio workspace. */
export function isKeyvoHiddenFeaturePath(href: string | null | undefined): boolean {
  if (typeof href !== 'string') return false;
  const path = href.split(/[?#]/)[0] ?? '';
  const tool = /^(?:\/[a-z]{2})?(?:\/app)?\/tools\/([a-z-]+)\/?$/.exec(path);
  if (tool) return isKeyvoToolDisabled(tool[1]);
  return isKeyvoAudioDisabled() && /^(?:\/[a-z]{2})?\/app\/audio(?:\/|$)/.test(path);
}
