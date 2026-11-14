import { readFileSync } from 'node:fs';

const COMPARISON_PATH_BY_LOCALE = {
  en: '/ai-video-engines',
  fr: '/fr/comparatif',
  es: '/es/comparativa',
  zh: '/zh/ai-video-engines',
};
const comparisonIndexation = JSON.parse(
  readFileSync(new URL('../frontend/config/comparison-indexation.json', import.meta.url), 'utf8'),
);
const runtimeModels = JSON.parse(
  readFileSync(new URL('../frontend/config/model-runtime.json', import.meta.url), 'utf8'),
).models;
// Keyvo 2026-11-14: IndexNow must not submit the comparison URLs of models the owner allowlist hides (they are
// unpublished, so the URLs would 404). Mirrors isKeyvoHiddenModel (non-admin view) in
// frontend/config/keyvo-model-visibility.ts: offered and public tier; admin tier only while KEYVO_ADMIN_TIER_OPEN is on.
const modelAllowlist = JSON.parse(
  readFileSync(new URL('../frontend/config/keyvo-model-allowlist.json', import.meta.url), 'utf8'),
);
const OFFERED_ENGINE_IDS = new Set(modelAllowlist.offeredEngineIds.map((id) => String(id).trim().toLowerCase()));
const ADMIN_TIER_OPEN = ['1', 'true'].includes(String(process.env.KEYVO_ADMIN_TIER_OPEN ?? '').trim().toLowerCase());
const SLUG_TO_ENGINE_ID = new Map(runtimeModels.map((model) => [model.slug, String(model.id).trim().toLowerCase()]));
function isSlugOfferedToCustomers(slug) {
  if (process.env.KEYVO_MODEL_VISIBILITY === 'off') return true;
  const id = SLUG_TO_ENGINE_ID.get(slug);
  if (!id || !OFFERED_ENGINE_IDS.has(id)) return false;
  const tier = modelAllowlist.engineTiers?.[id];
  return tier !== 'admin' || ADMIN_TIER_OPEN;
}
const COMPARISON_NOINDEX_BY_LOCALE = {
  en: new Set(),
  fr: new Set(comparisonIndexation.noindexByLocale.fr),
  es: new Set(comparisonIndexation.noindexByLocale.es),
  zh: new Set(comparisonIndexation.noindexByLocale.zh ?? []),
};

const EXCLUDED_ENGINE_SLUGS = new Set([
  'nano-banana',
  'nano-banana-lite',
  'nano-banana-pro',
  'nano-banana-2',
  'gpt-image-2',
  'seedream',
  'seedream-5-0-pro',
  'luma-uni-1',
  'luma-uni-1-max',
]);

function canonicalCompareSlug(left, right) {
  if (!left || !right || left === right) return null;
  const [canonicalLeft, canonicalRight] = [left.trim(), right.trim()].sort((a, b) => a.localeCompare(b, 'en'));
  if (!canonicalLeft || !canonicalRight) return null;
  return `${canonicalLeft}-vs-${canonicalRight}`;
}

function canonicalizeComparisonSlug(slug) {
  if (typeof slug !== 'string' || !slug.includes('-vs-')) return null;
  const [left, right] = slug.split('-vs-');
  return canonicalCompareSlug(left, right);
}

function toAbsoluteUrl(site, pathname) {
  const normalizedSite = site.replace(/\/+$/, '');
  return `${normalizedSite}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
}

export function getPublishedComparisonSlugs(catalog, publicationModels = runtimeModels) {
  const entries = Array.isArray(catalog) ? catalog : [];
  // The owner allowlist applies to the real runtime models only; callers that inject their own models (tests) bypass it.
  const isOffered = publicationModels === runtimeModels ? isSlugOfferedToCustomers : () => true;
  const indexableSlugs = new Set(publicationModels
    .filter((model) => model.publication.compare.published && model.publication.compare.indexed)
    .map((model) => model.slug));
  const validSlugs = new Set(entries.map((entry) => entry?.modelSlug).filter(Boolean));
  const published = new Set();

  entries.forEach((entry) => {
    const left = entry?.modelSlug;
    if (!left || !indexableSlugs.has(left) || EXCLUDED_ENGINE_SLUGS.has(left) || !isOffered(left)) return;
    const opponents = entry?.surfaces?.compare?.publishedPairs;
    if (!Array.isArray(opponents)) return;

    opponents.forEach((right) => {
      if (!validSlugs.has(right) || !indexableSlugs.has(right) || right === left || EXCLUDED_ENGINE_SLUGS.has(right) || !isOffered(right)) return;
      const slug = canonicalCompareSlug(left, right);
      if (slug) published.add(slug);
    });
  });

  return Array.from(published).sort((a, b) => a.localeCompare(b, 'en'));
}

export function getPublishedComparisonSlugsForModels(catalog, changedModelSlugs, publicationModels = runtimeModels) {
  const changed = changedModelSlugs instanceof Set ? changedModelSlugs : new Set(changedModelSlugs ?? []);
  return getPublishedComparisonSlugs(catalog, publicationModels).filter((slug) => {
    const [left, right] = slug.split('-vs-');
    return changed.has(left) || changed.has(right);
  });
}

export function getIndexableComparisonLocalesForIndexNow(slug) {
  return Object.keys(COMPARISON_PATH_BY_LOCALE).filter(
    (locale) => !COMPARISON_NOINDEX_BY_LOCALE[locale].has(slug),
  );
}

export function addComparisonUrls(urls, site, comparisonSlug) {
  const slug = canonicalizeComparisonSlug(comparisonSlug);
  if (!slug) return;
  getIndexableComparisonLocalesForIndexNow(slug).forEach((locale) => {
    urls.add(toAbsoluteUrl(site, `${COMPARISON_PATH_BY_LOCALE[locale]}/${slug}`));
  });
}

export function addComparisonHubUrls(urls, site) {
  urls.add(toAbsoluteUrl(site, '/ai-video-engines'));
  urls.add(toAbsoluteUrl(site, '/fr/comparatif'));
  urls.add(toAbsoluteUrl(site, '/es/comparativa'));
  urls.add(toAbsoluteUrl(site, '/zh/ai-video-engines'));
}
