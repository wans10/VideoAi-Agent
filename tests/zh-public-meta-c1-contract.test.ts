import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import test from 'node:test';

import { getAboutCopy } from '../frontend/app/(localized)/[locale]/(marketing)/about/_lib/about-copy';
import { BLOG_TITLE_OVERRIDES } from '../frontend/app/(localized)/[locale]/(marketing)/blog/[slug]/_lib/blog-post-data';
import { getEditorialProfile } from '../frontend/lib/editorial/profile';
import { getCanonicalExampleModelSlugs, getExampleModelLanding } from '../frontend/lib/examples/modelLanding';

const root = process.cwd();
const CJK = /[㐀-鿿]/;
const LEFTOVER_BRAND = /MaxVideoAI/;
// Infrastructure hostnames (media CDN) are identifiers, not display text.
const MEDIA_HOST = /media\.maxvideoai\.com/g;

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return listSourceFiles(path);
    return /\.(tsx?|json)$/.test(entry) && !/\.test\./.test(entry) ? [path] : [];
  });
}

test('zh editorial profile bio is Chinese and does not name the retired brand', () => {
  const bio = getEditorialProfile('zh').bio;
  assert.match(bio, CJK);
  assert.doesNotMatch(bio, LEFTOVER_BRAND);
});

test('zh about page metadata is Chinese, branded Keyvo and free of the retired brand', () => {
  const { meta } = getAboutCopy('zh');
  assert.match(meta.title, CJK);
  assert.match(meta.description, CJK);
  assert.match(meta.title, /Keyvo/);
  assert.doesNotMatch(`${meta.title} ${meta.description}`, LEFTOVER_BRAND);
});

test('zh model example landings never fall back to English description templates', () => {
  const slugs = getCanonicalExampleModelSlugs();
  // Keyvo only presents the Chinese-vendor example families (Seedance, Kling, Wan, Happy Horse, MiniMax).
  assert.ok(slugs.length >= 5, 'expected the example family set');
  for (const hidden of ['veo', 'ltx', 'luma', 'grok', 'flux', 'pika', 'sora']) {
    assert.ok(!slugs.includes(hidden as (typeof slugs)[number]), `${hidden} examples must stay hidden`);
  }
  for (const slug of slugs) {
    const landing = getExampleModelLanding('zh', slug);
    assert.ok(landing, `${slug} should have a landing`);
    assert.match(landing.metaDescription, CJK, `${slug} zh description should contain Chinese`);
    assert.doesNotMatch(landing.metaDescription, /examples with prompts|This page includes|current price estimates/, `${slug} zh description must not use the English template`);
    assert.match(landing.metaTitle, CJK, `${slug} zh title should contain Chinese`);
  }
});

test('blog title overrides provide a zh title for the Sora 2 sequenced prompts article', () => {
  const overrides = BLOG_TITLE_OVERRIDES['sora-2-sequenced-prompts'];
  assert.ok(overrides?.zh, 'zh override should exist');
  assert.match(overrides.zh, CJK);
  assert.match(overrides.zh, /Keyvo/);
});

test('blog title override lookup does not fall back to the English string for other locales', () => {
  const source = readFileSync(join(root, 'frontend/app/(localized)/[locale]/(marketing)/blog/[slug]/_lib/blog-post-seo.ts'), 'utf8');
  assert.doesNotMatch(source, /BLOG_TITLE_OVERRIDES\[[^\]]+\]\?\.en/, 'overrides must not inherit the English title');
});

test('user-facing home, engines, best-for and about trees carry no retired brand text', () => {
  const trees = [
    'frontend/app/(localized)/[locale]/(marketing)/(home)',
    'frontend/app/(localized)/[locale]/(marketing)/ai-video-engines',
    'frontend/app/(localized)/[locale]/(marketing)/about',
  ];
  for (const tree of trees) {
    const absolute = join(root, tree);
    const files = statSync(absolute).isDirectory() ? listSourceFiles(absolute) : [absolute];
    for (const file of files) {
      const stripped = readFileSync(file, 'utf8').replace(MEDIA_HOST, '');
      assert.doesNotMatch(stripped, LEFTOVER_BRAND, `${relative(root, file)} still shows the retired brand`);
    }
  }
});
