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

/**
 * Models of a visible family that Keyvo cannot serve (no mainland route). They stay in the upstream registry and
 * are projected as unpublished on every surface, including the app. MiniMax-H3-Max: MiniMax's own API offers
 * 480P/768P only with its own input pricing, and none of fal's controls (1080P, middle frame, Recast/Relight);
 * see docs/engineering/minimax-official-provider.md.
 */
const KEYVO_HIDDEN_MODEL_IDS: ReadonlySet<string> = new Set(['minimax-h3-max']);

export function isKeyvoHiddenModel(id: string | null | undefined): boolean {
  if (isKeyvoModelVisibilityOff()) return false;
  return typeof id === 'string' && KEYVO_HIDDEN_MODEL_IDS.has(id.trim().toLowerCase());
}

export function filterKeyvoVisibleEntries<T extends { family?: string | null; engineId?: string; id?: string }>(entries: readonly T[]): T[] {
  return entries.filter((entry) => isKeyvoVisibleFamily(entry.family) && !isKeyvoHiddenModel(entry.engineId ?? entry.id));
}

/** Keyvo does not present model comparisons or scores; typed as boolean so guarded code stays type-checked. */
export const KEYVO_COMPARE_HIDDEN: boolean = true;

/** Keyvo does not publish the upstream blog (it covers overseas models); typed as boolean so guarded code stays type-checked. */
export const KEYVO_BLOG_HIDDEN: boolean = true;
