import visibleFamilies from './keyvo-visible-families.json';

/**
 * Keyvo only presents models from mainland-China vendors. Everything else stays in the
 * upstream registry (so upstream syncs do not conflict) but is projected as unpublished.
 */
// The family list lives in JSON so plain-Node scripts (IndexNow) read the same source.
const KEYVO_VISIBLE_FAMILIES: ReadonlySet<string> = new Set<string>(visibleFamilies);

// Generators and the pricing baseline set KEYVO_MODEL_VISIBILITY=off to see the unfiltered upstream catalog.
// Sandboxed bundles (offline tests, edge runtimes) have no `process`, so the filter then applies.
export function isKeyvoModelVisibilityOff(): boolean {
  return typeof process !== 'undefined' && process.env.KEYVO_MODEL_VISIBILITY === 'off';
}

export function isKeyvoVisibleFamily(family: string | null | undefined): boolean {
  if (isKeyvoModelVisibilityOff()) return true;
  return typeof family === 'string' && KEYVO_VISIBLE_FAMILIES.has(family.trim().toLowerCase());
}

export function filterKeyvoVisibleEntries<T extends { family?: string | null }>(entries: readonly T[]): T[] {
  return entries.filter((entry) => isKeyvoVisibleFamily(entry.family));
}

/** Keyvo does not present model comparisons or scores; typed as boolean so guarded code stays type-checked. */
export const KEYVO_COMPARE_HIDDEN: boolean = true;

/** Keyvo does not publish the upstream blog (it covers overseas models); typed as boolean so guarded code stays type-checked. */
export const KEYVO_BLOG_HIDDEN: boolean = true;
