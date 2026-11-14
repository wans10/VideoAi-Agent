import hiddenModelIds from './keyvo-hidden-model-ids.json';
import modelAllowlist from './keyvo-model-allowlist.json';
import visibleFamilies from './keyvo-visible-families.json';

/**
 * Keyvo only presents the engines the owner allowlisted (keyvo-model-allowlist.json). Everything else stays in the
 * upstream registry, so upstream syncs do not conflict, and is projected as unpublished on every customer surface
 * (model pages, App/workspace engine lists, pricing, compare, sitemap, examples, MCP and agent catalogues).
 *
 * Single choke points that read this module:
 * - isKeyvoHiddenModel: model-runtime.ts (page, App and pricing publication), engines.ts buildBaseEngines (workspace
 *   pickers), app/api/generate (refuses a hidden id before any charge), MCP/agent guidance and canary lists.
 * - filterKeyvoVisibleEntries: engine-catalog-visible.ts and the sitemap roster readers.
 */
// The family list and the id lists live in JSON so plain-Node scripts (IndexNow) read the same source.
const KEYVO_VISIBLE_FAMILIES: ReadonlySet<string> = new Set<string>(visibleFamilies);
const KEYVO_OFFERED_ENGINE_IDS: ReadonlySet<string> = new Set<string>(
  modelAllowlist.offeredEngineIds.map((id) => id.trim().toLowerCase()),
);
const KEYVO_HIDDEN_MODEL_IDS: ReadonlySet<string> = new Set<string>(hiddenModelIds);

// Generators and the pricing baseline set KEYVO_MODEL_VISIBILITY=off to see the unfiltered upstream catalog.
// Sandboxed bundles (offline tests, edge runtimes) have no `process`, so the filter then applies.
export function isKeyvoModelVisibilityOff(): boolean {
  return typeof process !== 'undefined' && process.env.KEYVO_MODEL_VISIBILITY === 'off';
}

export function isKeyvoVisibleFamily(family: string | null | undefined): boolean {
  if (isKeyvoModelVisibilityOff()) return true;
  return typeof family === 'string' && KEYVO_VISIBLE_FAMILIES.has(family.trim().toLowerCase());
}

/** True when the owner allowlist offers this registry engine id to customers. */
export function isKeyvoOfferedEngine(id: string | null | undefined): boolean {
  if (isKeyvoModelVisibilityOff()) return true;
  return typeof id === 'string' && KEYVO_OFFERED_ENGINE_IDS.has(id.trim().toLowerCase());
}

/**
 * A registry model Keyvo does not offer: not on the owner allowlist, or listed as a hidden id. Unknown or empty ids
 * are not treated as hidden here; callers resolve those separately.
 */
export function isKeyvoHiddenModel(id: string | null | undefined): boolean {
  if (isKeyvoModelVisibilityOff()) return false;
  if (typeof id !== 'string' || !id.trim()) return false;
  const key = id.trim().toLowerCase();
  return !KEYVO_OFFERED_ENGINE_IDS.has(key) || KEYVO_HIDDEN_MODEL_IDS.has(key);
}

export function filterKeyvoVisibleEntries<T extends { family?: string | null; engineId?: string; id?: string }>(entries: readonly T[]): T[] {
  return entries.filter((entry) => isKeyvoVisibleFamily(entry.family) && !isKeyvoHiddenModel(entry.engineId ?? entry.id));
}

/** Keyvo does not present model comparisons or scores; typed as boolean so guarded code stays type-checked. */
export const KEYVO_COMPARE_HIDDEN: boolean = true;

/** Keyvo does not publish the upstream blog (it covers overseas models); typed as boolean so guarded code stays type-checked. */
export const KEYVO_BLOG_HIDDEN: boolean = true;
