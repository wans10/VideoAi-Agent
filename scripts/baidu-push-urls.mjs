#!/usr/bin/env node
// Baidu active push ("主动推送") for Keyvo. Submits new or changed public Chinese URLs to
// https://data.zz.baidu.com/urls. Dry run is the default: nothing leaves this machine unless --submit is given.
//
//   node scripts/baidu-push-urls.mjs                       # dry run, reads the live sitemaps
//   node scripts/baidu-push-urls.mjs --sitemap ./a.xml     # dry run from local sitemap files (repeatable)
//   BAIDU_PUSH_TOKEN=... node scripts/baidu-push-urls.mjs --submit
//
// Environment: BAIDU_PUSH_TOKEN (required to submit, never printed), BAIDU_PUSH_SITE (the site as registered in
// Baidu, default: host of SITE), BAIDU_PUSH_MAX (URLs per run, default 10), BAIDU_PUSH_DAILY_MAX (per UTC day, default
// 10; Baidu's real quota is shown in its console), SITE (default https://app.keyvo.cn).
// URL selection reuses the IndexNow allowlist rule (isSlugOfferedToCustomers) so hidden models are never pushed.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { isSlugOfferedToCustomers } from './indexnow-url-selection.mjs';

export const BAIDU_PUSH_ENDPOINT = 'https://data.zz.baidu.com/urls';
export const DEFAULT_SITE = 'https://app.keyvo.cn';
export const DEFAULT_MAX_PER_RUN = 10;
export const DEFAULT_MAX_PER_DAY = 10;

// Mirrors frontend/lib/sitemap/route-discovery.ts HIDDEN_ROUTE_PREFIXES and the robots.txt disallow list.
const NEVER_PUSH_PREFIXES = [
  '/zh/ai-video-engines',
  '/zh/benchmarks',
  '/zh/blog',
  '/zh/mcp',
  '/zh/docs/mcp',
  '/zh/tools/angle',
  '/zh/tools/upscale',
  '/zh/tools/background-removal',
  '/zh/legal/reconsent',
  '/zh/app',
  '/zh/billing',
  '/zh/admin',
  '/zh/api',
  '/zh/video',
  '/zh/v',
];

export function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function decodeXml(value) {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

/** Returns [{ url, lastmod }] for every <url> entry; sitemap index files yield no entries. */
export function parseSitemapEntries(xml) {
  const entries = [];
  for (const block of String(xml).matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const loc = block[1].match(/<loc>\s*([^<]+?)\s*<\/loc>/);
    if (!loc) continue;
    const lastmod = block[1].match(/<lastmod>\s*([^<]+?)\s*<\/lastmod>/);
    entries.push({ url: decodeXml(loc[1]), lastmod: lastmod ? lastmod[1] : null });
  }
  return entries;
}

function isSelectableUrl(rawUrl, site) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }
  const origin = new URL(site).origin;
  if (parsed.origin !== origin || parsed.search || parsed.hash) return false;
  const pathname = parsed.pathname.replace(/\/+$/, '') || '/';
  if (pathname !== '/zh' && !pathname.startsWith('/zh/')) return false;
  if (NEVER_PUSH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) return false;
  const model = pathname.match(/^\/zh\/models\/([^/]+)$/);
  if (model && !['image', 'video'].includes(model[1]) && !isSlugOfferedToCustomers(model[1])) return false;
  return true;
}

/**
 * Picks the URLs worth pushing: public zh pages that are new, or whose sitemap lastmod is newer than the
 * lastmod recorded when they were last pushed. Oldest-first would starve new pages, so new URLs come first.
 */
export function selectPushUrls({ entries, state = {}, site = DEFAULT_SITE, max = DEFAULT_MAX_PER_RUN }) {
  const pushed = state.urls ?? {};
  const seen = new Set();
  const fresh = [];
  const changed = [];
  for (const entry of entries) {
    if (seen.has(entry.url) || !isSelectableUrl(entry.url, site)) continue;
    seen.add(entry.url);
    const previous = pushed[entry.url];
    if (previous === undefined) fresh.push(entry);
    else if (entry.lastmod && entry.lastmod > previous) changed.push(entry);
  }
  const ordered = [...fresh, ...changed];
  return { selected: ordered.slice(0, Math.max(0, max)), pendingAfterCap: Math.max(0, ordered.length - Math.max(0, max)) };
}

/** Per-run cap and the remaining share of the UTC-day budget recorded in the state file. */
export function resolveQuota({ state = {}, today, maxPerRun, maxPerDay }) {
  const usedToday = state.day === today ? Number(state.count) || 0 : 0;
  const remainingToday = Math.max(0, maxPerDay - usedToday);
  return { cap: Math.min(maxPerRun, remainingToday), usedToday, remainingToday };
}

export function buildPushRequest({ site, token, urls }) {
  const hostname = new URL(site).host;
  const registeredSite = hostname;
  return {
    url: `${BAIDU_PUSH_ENDPOINT}?site=${encodeURIComponent(registeredSite)}&token=${encodeURIComponent(token)}`,
    init: { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: urls.join('\n') },
  };
}

function redactToken(text, token) {
  return token ? String(text).split(token).join('***') : String(text);
}

export async function submitToBaidu({ site, token, urls, fetchImpl = fetch }) {
  const request = buildPushRequest({ site, token, urls });
  let response;
  try {
    response = await fetchImpl(request.url, request.init);
  } catch (error) {
    throw new Error(`Baidu push request failed: ${redactToken(error instanceof Error ? error.message : error, token)}`);
  }
  const text = redactToken(await response.text().catch(() => ''), token);
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = null;
  }
  return { ok: response.ok && body !== null && typeof body.error !== 'number', status: response.status, body, text };
}

export function readState(file) {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function recordPush(state, { urls, entries, today, usedToday }) {
  const lastmodByUrl = new Map(entries.map((entry) => [entry.url, entry.lastmod]));
  const next = { ...state, urls: { ...(state.urls ?? {}) }, day: today, count: usedToday + urls.length };
  for (const url of urls) next.urls[url] = lastmodByUrl.get(url) ?? today;
  return next;
}

async function readSource(source, site, readFile, fetchImpl) {
  if (/^https?:\/\//i.test(source)) {
    const response = await fetchImpl(source);
    if (!response.ok) throw new Error(`Cannot read ${source}: HTTP ${response.status}`);
    return response.text();
  }
  return readFile(path.resolve(source));
}

export function parseArguments(argv) {
  const options = { submit: false, sitemaps: [], state: '.baidu-push-state.json', max: undefined };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--submit') options.submit = true;
    else if (argument === '--dry-run') options.submit = false;
    else if (argument === '--sitemap') options.sitemaps.push(argv[++index]);
    else if (argument === '--state') options.state = argv[++index];
    else if (argument === '--max') options.max = positiveInteger(argv[++index], undefined);
    else throw new Error(`Unknown argument: ${argument}`);
  }
  return options;
}

export async function run({
  argv = process.argv.slice(2),
  env = process.env,
  fetchImpl = fetch,
  readFile = (file) => fs.readFileSync(file, 'utf8'),
  writeFile = (file, content) => fs.writeFileSync(file, content),
  now = new Date(),
  log = (line) => process.stdout.write(`${line}\n`),
} = {}) {
  const options = parseArguments(argv);
  const site = (env.SITE || DEFAULT_SITE).replace(/\/+$/, '');
  const sources = options.sitemaps.length ? options.sitemaps : [`${site}/sitemap-zh.xml`, `${site}/sitemap-models.xml`];
  const today = now.toISOString().slice(0, 10);
  const maxPerRun = options.max ?? positiveInteger(env.BAIDU_PUSH_MAX, DEFAULT_MAX_PER_RUN);
  const maxPerDay = positiveInteger(env.BAIDU_PUSH_DAILY_MAX, DEFAULT_MAX_PER_DAY);
  const state = readState(options.state);

  const entries = [];
  for (const source of sources) entries.push(...parseSitemapEntries(await readSource(source, site, readFile, fetchImpl)));

  const quota = resolveQuota({ state, today, maxPerRun, maxPerDay });
  const { selected, pendingAfterCap } = selectPushUrls({ entries, state, site, max: quota.cap });
  const urls = selected.map((entry) => entry.url);
  log(`[baidu-push] mode=${options.submit ? 'submit' : 'dry-run'} candidates=${urls.length} cap=${quota.cap} pending_after_cap=${pendingAfterCap} used_today=${quota.usedToday}`);
  urls.forEach((url) => log(url));

  if (!urls.length) return { submitted: 0, urls };
  if (!options.submit) {
    log('[baidu-push] dry run: nothing was sent. Re-run with --submit and BAIDU_PUSH_TOKEN to push.');
    return { submitted: 0, urls };
  }
  const token = env.BAIDU_PUSH_TOKEN?.trim();
  if (!token) throw new Error('BAIDU_PUSH_TOKEN is not set; refusing to submit.');

  const result = await submitToBaidu({ site, token, urls, fetchImpl });
  if (!result.ok) {
    log(`[baidu-push] failed status=${result.status} ${result.text.slice(0, 300)}`);
    const error = new Error(`Baidu push failed with status ${result.status}`);
    error.result = result;
    throw error;
  }
  const accepted = Number(result.body.success) || 0;
  log(`[baidu-push] success=${accepted} remain=${result.body.remain ?? 'unknown'} not_same_site=${(result.body.not_same_site ?? []).length} not_valid=${(result.body.not_valid ?? []).length}`);
  const rejected = new Set([...(result.body.not_same_site ?? []), ...(result.body.not_valid ?? [])]);
  const acceptedUrls = urls.filter((url) => !rejected.has(url));
  writeFile(options.state, `${JSON.stringify(recordPush(state, { urls: acceptedUrls, entries, today, usedToday: quota.usedToday }), null, 2)}\n`);
  return { submitted: acceptedUrls.length, urls, body: result.body };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().catch((error) => {
    process.stderr.write(`[baidu-push] ${error.message}\n`);
    process.exitCode = 1;
  });
}
