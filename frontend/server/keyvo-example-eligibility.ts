import showcasePromptsZh from '@/config/home-showcase-zh.json';
import visibleFamilies from '@/config/keyvo-visible-families.json';
import { resolveRuntimeEngineInput } from '@/config/model-runtime';
import { buildWorkspacePromptHref, WORKSPACE_PROMPT_LINK_MAX_ENCODED } from '@/lib/workspace-prompt-link';
import { getBundledPublicExamplesSnapshot } from './bundled-public-examples';

const VISIBLE_FAMILIES: ReadonlySet<string> = new Set<string>(visibleFamilies);

/**
 * Bundled examples Keyvo may present (the home works wall and its detail pages): work from the Chinese-vendor
 * families, made with a model a visitor can order today. Retired and deep-legacy versions and hidden-vendor models
 * are never shown, so nothing promises results the product cannot produce. This does not read
 * `isKeyvoVisibleFamily` because that helper is deliberately bypassed by the upstream-contract tooling.
 */
export function isShowcaseEngine(engineId: string): boolean {
  const model = resolveRuntimeEngineInput(engineId);
  return Boolean(
    model &&
      model.family &&
      VISIBLE_FAMILIES.has(model.family) &&
      model.publication.app.published &&
      model.lifecycle !== 'retired' &&
      model.lifecycle !== 'deep_legacy',
  );
}

const PROMPTS_ZH: Readonly<Record<string, string>> = showcasePromptsZh;
/** Examples whose prompt only works with the reference files the original run attached. */
const NEEDS_REFERENCE_ASSETS = /@\[[^\]]+\]|@(?:image|video|audio|element|ref)\w*\d*|\b(?:reference image|uploaded image)\b/i;

/**
 * `/app?prompt=` link that opens the workspace with this bundled example's Chinese prompt. Only the prompt travels
 * (not the model, duration, framing or references), so callers must not describe it as reproducing the video.
 * Null when the example has no translation, its original run relied on reference files, or the whole prompt does not fit in a link:
 * a silently shortened prompt would not make the video the visitor looked at.
 */
export function bundledExamplePromptHref(exampleId: string): string | null {
  const promptZh = PROMPTS_ZH[exampleId];
  const original = getBundledPublicExamplesSnapshot().cards?.[exampleId];
  if (!promptZh || !original || NEEDS_REFERENCE_ASSETS.test(original.promptFull ?? original.prompt ?? '')) return null;
  const href = buildWorkspacePromptHref(promptZh, WORKSPACE_PROMPT_LINK_MAX_ENCODED);
  return new URL(href, 'https://example.test').searchParams.get('prompt') === promptZh.trim() ? href : null;
}
