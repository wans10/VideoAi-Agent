import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import * as baidu from '../scripts/baidu-push-urls.mjs';

const site = 'https://app.keyvo.cn';
const sitemap = (entries: Array<[string, string?]>) =>
  `<urlset>${entries
    .map(([url, lastmod]) => `<url><loc>${url.replace(/&/g, '&amp;')}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`)
    .join('')}</urlset>`;

test('sitemap parsing decodes entities and ignores index files', () => {
  assert.deepEqual(baidu.parseSitemapEntries(sitemap([[`${site}/zh?a=1&b=2`, '2026-11-01']])), [
    { url: `${site}/zh?a=1&b=2`, lastmod: '2026-11-01' },
  ]);
  assert.deepEqual(baidu.parseSitemapEntries('<sitemapindex><sitemap><loc>https://app.keyvo.cn/sitemap-zh.xml</loc></sitemap></sitemapindex>'), []);
});

test('selection keeps only public zh pages and never hidden models, comparisons or account areas', () => {
  const urls = [
    `${site}/zh`,
    `${site}/zh/pricing`,
    `${site}/zh/models/video`,
    `${site}/zh/models/seedance-2-5`,
    `${site}/zh/models/veo-3-1`, // admin tier: not offered to customers
    `${site}/zh/models/not-a-model`,
    `${site}/zh/ai-video-engines/kling-v4-vs-wan-3`,
    `${site}/zh/blog/post`,
    `${site}/zh/legal/reconsent`,
    `${site}/zh/app`,
    `${site}/en/pricing`,
    `${site}/zh/pricing?x=1`,
    'https://other.example/zh/pricing',
  ];
  const { selected } = baidu.selectPushUrls({ entries: urls.map((url) => ({ url, lastmod: null })), site, max: 100 });
  assert.deepEqual(selected.map((entry: { url: string }) => entry.url), [
    `${site}/zh`,
    `${site}/zh/pricing`,
    `${site}/zh/models/video`,
    `${site}/zh/models/seedance-2-5`,
  ]);
});

test('only new or newer-lastmod URLs are selected, new ones first, and the per-run cap applies', () => {
  const entries = [
    { url: `${site}/zh/about`, lastmod: '2026-11-10' },
    { url: `${site}/zh/pricing`, lastmod: '2026-11-17' },
    { url: `${site}/zh/contact`, lastmod: '2026-10-01' },
    { url: `${site}/zh/docs`, lastmod: '2026-11-11' },
  ];
  const state = { urls: { [`${site}/zh/about`]: '2026-11-10', [`${site}/zh/pricing`]: '2026-11-01', [`${site}/zh/docs`]: '2026-11-11' } };
  const all = baidu.selectPushUrls({ entries, state, site, max: 10 });
  assert.deepEqual(all.selected.map((entry: { url: string }) => entry.url), [`${site}/zh/contact`, `${site}/zh/pricing`]);
  const capped = baidu.selectPushUrls({ entries, state, site, max: 1 });
  assert.deepEqual(capped.selected.map((entry: { url: string }) => entry.url), [`${site}/zh/contact`]);
  assert.equal(capped.pendingAfterCap, 1);
});

test('daily quota guard shrinks the run and resets on a new UTC day', () => {
  assert.deepEqual(baidu.resolveQuota({ state: { day: '2026-11-17', count: 8 }, today: '2026-11-17', maxPerRun: 10, maxPerDay: 10 }), {
    cap: 2,
    usedToday: 8,
    remainingToday: 2,
  });
  assert.equal(baidu.resolveQuota({ state: { day: '2026-11-16', count: 10 }, today: '2026-11-17', maxPerRun: 5, maxPerDay: 10 }).cap, 5);
  assert.equal(baidu.resolveQuota({ state: { day: '2026-11-17', count: 10 }, today: '2026-11-17', maxPerRun: 5, maxPerDay: 10 }).cap, 0);
});

test('push request is a plain-text body, one URL per line, to the registered host', () => {
  const request = baidu.buildPushRequest({ site, token: 'T0KEN', urls: [`${site}/zh`, `${site}/zh/pricing`] });
  assert.equal(request.url, 'http://data.zz.baidu.com/urls?site=app.keyvo.cn&token=T0KEN');
  assert.equal(request.init.method, 'POST');
  assert.equal(request.init.headers['Content-Type'], 'text/plain');
  assert.equal(request.init.body, `${site}/zh\n${site}/zh/pricing`);
});

function harness(overrides: Record<string, unknown> = {}) {
  const logs: string[] = [];
  const written: Record<string, string> = {};
  const requests: Array<{ url: string; body?: string }> = [];
  const files: Record<string, string> = {
    '/tmp/zh.xml': sitemap([[`${site}/zh`, '2026-11-17'], [`${site}/zh/pricing`, '2026-11-16'], [`${site}/zh/about`, '2026-11-15']]),
  };
  return {
    logs,
    written,
    requests,
    options: {
      argv: ['--sitemap', '/tmp/zh.xml', '--state', '/tmp/state.json', ...((overrides.argv as string[]) ?? [])],
      env: { SITE: site, ...((overrides.env as Record<string, string>) ?? {}) },
      now: new Date('2026-11-17T08:00:00Z'),
      readFile: (file: string) => {
        if (files[file]) return files[file];
        throw new Error('missing');
      },
      writeFile: (file: string, content: string) => {
        written[file] = content;
      },
      log: (line: string) => logs.push(line),
      fetchImpl: async (url: string, init?: { body?: string }) => {
        requests.push({ url, body: init?.body });
        return new Response(JSON.stringify((overrides.reply as object) ?? { remain: 3, success: 2 }), { status: (overrides.status as number) ?? 200 });
      },
    },
  };
}

test('dry run is the default: no request, no state write, no token needed', async () => {
  const h = harness();
  const result = await baidu.run(h.options);
  assert.equal(result.submitted, 0);
  assert.equal(h.requests.length, 0);
  assert.deepEqual(h.written, {});
  assert.ok(h.logs.some((line) => line.includes('mode=dry-run')));
});

test('submit refuses without a token and caps the run with BAIDU_PUSH_MAX', async () => {
  const missing = harness({ argv: ['--submit'] });
  await assert.rejects(() => baidu.run(missing.options), /BAIDU_PUSH_TOKEN is not set/);
  assert.equal(missing.requests.length, 0);

  const capped = harness({ argv: ['--submit'], env: { BAIDU_PUSH_TOKEN: 'SECRET123', BAIDU_PUSH_MAX: '2' } });
  const result = await baidu.run(capped.options);
  assert.equal(result.submitted, 2);
  assert.equal(capped.requests.length, 1);
  assert.equal(capped.requests[0].body?.split('\n').length, 2);
  const state = JSON.parse(capped.written['/tmp/state.json']);
  assert.equal(state.day, '2026-11-17');
  assert.equal(state.count, 2);
  assert.ok(!capped.logs.join('\n').includes('SECRET123'), 'the push token is never logged');
});

test('a failed push never prints the token and leaves the state untouched', async () => {
  const h = harness({ argv: ['--submit'], env: { BAIDU_PUSH_TOKEN: 'SECRET123' }, status: 401, reply: { error: 401, message: 'token SECRET123 is invalid' } });
  await assert.rejects(() => baidu.run(h.options), /status 401/);
  assert.ok(!h.logs.join('\n').includes('SECRET123'));
  assert.deepEqual(h.written, {});
});

test('the token is read from the environment only', () => {
  const source = readFileSync('scripts/baidu-push-urls.mjs', 'utf8');
  assert.match(source, /env\.BAIDU_PUSH_TOKEN/);
  assert.doesNotMatch(source, /--token/);
  assert.doesNotMatch(source, /token\s*=\s*['"][A-Za-z0-9]{8,}['"]/);
});
