import engineCatalog from '../../frontend/config/engine-catalog.json' with { type: 'json' };
import { isKeyvoVisibleFamily } from '../../frontend/config/keyvo-model-visibility.ts';

const FAMILY_BY_MODEL_SLUG = new Map(engineCatalog.map((entry) => [entry.modelSlug, entry.family]));

/** True when the model slug belongs to a family Keyvo hides on the web. Unknown slugs count as visible. */
export function isHiddenKeyvoModelSlug(slug: string): boolean {
  return FAMILY_BY_MODEL_SLUG.has(slug) && !isKeyvoVisibleFamily(FAMILY_BY_MODEL_SLUG.get(slug));
}

/** True when either side of a `<left>-vs-<right>` comparison slug is a hidden model. */
export function comparisonInvolvesHiddenModel(comparisonSlug: string): boolean {
  return comparisonSlug.split('-vs-').some(isHiddenKeyvoModelSlug);
}
