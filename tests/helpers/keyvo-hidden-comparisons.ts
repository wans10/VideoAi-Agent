import engineCatalog from '../../frontend/config/engine-catalog.json' with { type: 'json' };
import { isKeyvoHiddenModel, isKeyvoVisibleFamily } from '../../frontend/config/keyvo-model-visibility.ts';

const ENTRY_BY_MODEL_SLUG = new Map(engineCatalog.map((entry) => [entry.modelSlug, entry]));

/**
 * Models Keyvo took offline on every surface (owner decision 2026-11-11). Their registry entries are
 * unpublished, so no comparison toward them is published either.
 */
export const KEYVO_OFFLINE_MODEL_SLUGS: ReadonlySet<string> = new Set([
  'seedance-1-5-pro',
  'seedream',
  'wan-2-5',
  'happy-horse-1-0',
  // 2026-11-13: no mainland route.
  'wan-2-6',
  'kling-2-5-turbo',
  'kling-2-6-pro',
]);

/**
 * True when the model slug is not shown by Keyvo: a hidden family, a visible-family model without a mainland
 * route (KEYVO_HIDDEN_MODEL_IDS) or a model taken offline. Unknown slugs count as visible.
 */
export function isHiddenKeyvoModelSlug(slug: string): boolean {
  if (KEYVO_OFFLINE_MODEL_SLUGS.has(slug)) return true;
  const entry = ENTRY_BY_MODEL_SLUG.get(slug);
  if (!entry) return false;
  return !isKeyvoVisibleFamily(entry.family) || isKeyvoHiddenModel(entry.engineId);
}

/** True when either side of a `<left>-vs-<right>` comparison slug is a hidden model. */
export function comparisonInvolvesHiddenModel(comparisonSlug: string): boolean {
  return comparisonSlug.split('-vs-').some(isHiddenKeyvoModelSlug);
}
