import visibleFamilies from './keyvo-visible-families.json';

/**
 * Keyvo only presents models from mainland-China vendors. Everything else stays in the
 * upstream registry (so upstream syncs do not conflict) but is projected as unpublished.
 */
// The family list lives in JSON so plain-Node scripts (IndexNow) read the same source.
const KEYVO_VISIBLE_FAMILIES: ReadonlySet<string> = new Set<string>(visibleFamilies);

export function isKeyvoVisibleFamily(family: string | null | undefined): boolean {
  // Generators and the pricing baseline set KEYVO_MODEL_VISIBILITY=off to see the unfiltered upstream catalog.
  if (process.env.KEYVO_MODEL_VISIBILITY === 'off') return true;
  return typeof family === 'string' && KEYVO_VISIBLE_FAMILIES.has(family.trim().toLowerCase());
}

export function filterKeyvoVisibleEntries<T extends { family?: string | null }>(entries: readonly T[]): T[] {
  return entries.filter((entry) => isKeyvoVisibleFamily(entry.family));
}

/** Keyvo does not present model comparisons or scores; typed as boolean so guarded code stays type-checked. */
export const KEYVO_COMPARE_HIDDEN: boolean = true;
