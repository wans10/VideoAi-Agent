import hiddenModelIds from './keyvo-hidden-model-ids.json';
import modelAllowlist from './keyvo-model-allowlist.json';
import modelRegistry from './model-registry.json';
import visibleFamilies from './keyvo-visible-families.json';

/**
 * Keyvo only presents the engines the owner allowlisted (keyvo-model-allowlist.json). Everything else stays in the
 * upstream registry, so upstream syncs do not conflict, and is projected as unpublished on every customer surface
 * (model pages, App/workspace engine lists, pricing, compare, sitemap, examples, MCP and agent catalogues).
 *
 * Single choke points that read this module:
 * - isKeyvoHiddenModelForViewer: the one choke point for admin-tier engines (generate route, engine picker, estimate).
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

/**
 * Keyvo admin-tier override. KEYVO_ADMIN_TIER_OPEN=true (or 1) treats every admin-tier engine as public on every
 * surface. It lives here, not in lib/env.ts, so sandboxed bundles that import this module do not pull in the
 * process-reading ENV module. It is read on each call, never cached, and only on the server: browser bundles never see a non-public
 * variable, so they report false. Static pages and sitemaps keep the value they were built with (rebuild needed).
 */
export function isKeyvoAdminTierOpen(): boolean {
  if (typeof process === 'undefined' || typeof window !== 'undefined') return false;
  const raw = (process.env.KEYVO_ADMIN_TIER_OPEN ?? '').trim().toLowerCase();
  return raw === 'true' || raw === '1';
}

export type KeyvoEngineTier = 'public' | 'admin';
const KEYVO_ENGINE_TIERS: ReadonlyMap<string, KeyvoEngineTier> = new Map<string, KeyvoEngineTier>(
  Object.entries(modelAllowlist.engineTiers).map(([id, tier]) => [id.trim().toLowerCase(), tier as KeyvoEngineTier]),
);

// Generators and the pricing baseline set KEYVO_MODEL_VISIBILITY=off to see the unfiltered upstream catalog.
// Sandboxed bundles (offline tests, edge runtimes) have no `process`, so the filter then applies.
export function isKeyvoModelVisibilityOff(): boolean {
  return typeof process !== 'undefined' && process.env.KEYVO_MODEL_VISIBILITY === 'off';
}

// Families of the admin-tier engines (veo, gpt-image, nano-banana). They are not on the visible-family list, so the
// family gate is opened per engine only while KEYVO_ADMIN_TIER_OPEN is on.
const KEYVO_ADMIN_TIER_FAMILIES: ReadonlySet<string> = new Set<string>(
  modelRegistry.models
    .filter((model) => modelAllowlist.engineTiers[model.id as keyof typeof modelAllowlist.engineTiers] === 'admin')
    .map((model) => model.family.trim().toLowerCase()),
);

function isOpenedAdminTierEngine(id: string | null | undefined): boolean {
  if (typeof id !== 'string' || !id.trim() || !isKeyvoAdminTierOpen()) return false;
  return KEYVO_ENGINE_TIERS.get(id.trim().toLowerCase()) === 'admin';
}

/** Family gate for a registry entry: its family is listed, or the entry is an admin-tier engine the override opens. */
export function isKeyvoVisibleEntry(family: string | null | undefined, id: string | null | undefined): boolean {
  return isKeyvoVisibleFamily(family) || isOpenedAdminTierEngine(id);
}

/** Family gate for a family-only filter (examples API): listed families, plus admin-tier families while opened. */
export function isKeyvoVisibleOrOpenedFamily(family: string | null | undefined): boolean {
  if (isKeyvoVisibleFamily(family)) return true;
  return typeof family === 'string' && isKeyvoAdminTierOpen() && KEYVO_ADMIN_TIER_FAMILIES.has(family.trim().toLowerCase());
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
 * The owner tier of an offered engine: "public" for every customer, "admin" for administrators only. Undefined for
 * engines that are not offered at all.
 */
export function keyvoEngineTier(id: string | null | undefined): KeyvoEngineTier | undefined {
  if (typeof id !== 'string' || !id.trim()) return undefined;
  const tier = KEYVO_ENGINE_TIERS.get(id.trim().toLowerCase());
  // KEYVO_ADMIN_TIER_OPEN=true opens every admin-tier engine to all viewers. This is the only place it applies, so
  // every surface that reads the tier (pickers, generate, estimate, pages, sitemap, MCP) switches together.
  if (tier === 'admin' && isKeyvoAdminTierOpen()) return 'public';
  return tier;
}

/**
 * THE single Keyvo access choke point for a registry model. True when the viewer must not see or run it: not on the
 * owner allowlist, listed as a hidden id, or an admin-tier engine for a non-admin viewer. Unknown or empty ids are
 * not treated as hidden here; callers resolve those separately. Server routes pass the verified admin flag; every
 * public surface (pages, sitemap, pricing, MCP, examples) uses isKeyvoHiddenModel, which is the non-admin view.
 */
export function isKeyvoHiddenModelForViewer(id: string | null | undefined, viewer: { isAdmin: boolean }): boolean {
  if (isKeyvoModelVisibilityOff()) return false;
  if (typeof id !== 'string' || !id.trim()) return false;
  const key = id.trim().toLowerCase();
  if (!KEYVO_OFFERED_ENGINE_IDS.has(key) || KEYVO_HIDDEN_MODEL_IDS.has(key)) return true;
  return keyvoEngineTier(key) === 'admin' && viewer.isAdmin !== true;
}

/** A registry model Keyvo does not offer to ordinary customers (the non-admin view). */
export function isKeyvoHiddenModel(id: string | null | undefined): boolean {
  return isKeyvoHiddenModelForViewer(id, { isAdmin: false });
}

export function filterKeyvoVisibleEntries<T extends { family?: string | null; engineId?: string; id?: string }>(entries: readonly T[]): T[] {
  return entries.filter((entry) => isKeyvoVisibleEntry(entry.family, entry.engineId ?? entry.id) && !isKeyvoHiddenModel(entry.engineId ?? entry.id));
}

/** Keyvo does not present model comparisons or scores; typed as boolean so guarded code stays type-checked. */
export const KEYVO_COMPARE_HIDDEN: boolean = true;

/** Keyvo does not publish the upstream blog (it covers overseas models); typed as boolean so guarded code stays type-checked. */
export const KEYVO_BLOG_HIDDEN: boolean = true;
