import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import {
  BLOG_SLUGS_BY_CANONICAL,
  resolveBlogCanonicalSlug,
  resolveLocalizedBlogSlug,
  type BlogSlugLocale,
} from '../frontend/config/blog-slugs.ts';

const locales: BlogSlugLocale[] = ['en', 'fr', 'es', 'zh'];

function readFrontMatterValue(source: string, key: string): string | null {
  const match = source.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
  return match?.[1]?.trim().replace(/^['"]|['"]$/g, '') ?? null;
}

test('blog language switch resolves localized article slugs across locales', () => {
  const canonical = resolveBlogCanonicalSlug(
    'fr',
    'comment-creer-des-personnages-ia-coherents-dans-les-images-et-la-video'
  );

  assert.equal(canonical, 'how-to-create-consistent-ai-characters');
  assert.equal(resolveLocalizedBlogSlug(canonical, 'en'), 'how-to-create-consistent-ai-characters');
  assert.equal(
    resolveLocalizedBlogSlug(canonical, 'es'),
    'como-crear-personajes-de-ia-coherentes-en-imagenes-y-video'
  );
});

test('French compare article keeps its crawlable ASCII slug aligned', () => {
  const slug = 'comment-comparer-les-moteurs-video-dia-sora-vs-veo-vs-pika';
  const source = readFileSync(
    path.join(process.cwd(), 'content', 'fr', 'blog', `${slug}.mdx`),
    'utf8'
  );

  assert.equal(BLOG_SLUGS_BY_CANONICAL['compare-ai-video-engines'].fr, slug);
  assert.equal(readFrontMatterValue(source, 'slug'), slug);
  assert.equal(readFrontMatterValue(source, 'canonical'), `https://maxvideoai.com/fr/blog/${slug}`);
});

test('blog slug switch map covers every localized blog frontmatter slug', () => {
  for (const locale of locales) {
    const dir = path.join(process.cwd(), 'content', locale, 'blog');
    const files = readdirSync(dir).filter((file) => file.endsWith('.mdx'));

    for (const file of files) {
      const source = readFileSync(path.join(dir, file), 'utf8');
      const slug = readFrontMatterValue(source, 'slug');
      const canonicalSlug = readFrontMatterValue(source, 'canonicalSlug') ?? slug;

      assert.ok(slug, `${file} should define a slug`);
      assert.ok(canonicalSlug, `${file} should define or derive a canonicalSlug`);
      assert.equal(
        BLOG_SLUGS_BY_CANONICAL[canonicalSlug]?.[locale],
        slug,
        `${locale}/${file} should be present in BLOG_SLUGS_BY_CANONICAL`
      );
    }
  }
});

test('every published English blog article has authored Chinese content and a local canonical', () => {
  const chineseDir = path.join(process.cwd(), 'content', 'zh', 'blog');
  const chineseFiles = readdirSync(chineseDir).filter((file) => file.endsWith('.mdx'));
  assert.equal(chineseFiles.length, Object.values(BLOG_SLUGS_BY_CANONICAL).filter(slugs => 'zh' in slugs).length);

  for (const [canonicalSlug, localizedSlugs] of Object.entries(BLOG_SLUGS_BY_CANONICAL)) {
    if (!('zh' in localizedSlugs)) {
      assert.equal(resolveLocalizedBlogSlug(canonicalSlug, 'zh'), null, 'untranslated articles must not claim a Chinese canonical');
      continue;
    }
    const slug = localizedSlugs.zh;
    const source = readFileSync(path.join(chineseDir, `${slug}.mdx`), 'utf8');
    assert.equal(readFrontMatterValue(source, 'lang'), 'zh');
    assert.equal(readFrontMatterValue(source, 'slug'), slug);
    assert.equal(readFrontMatterValue(source, 'canonicalSlug'), canonicalSlug);
    const englishSlug = localizedSlugs.en;
    const englishSource = readFileSync(path.join(process.cwd(), 'content/en/blog', `${englishSlug}.mdx`), 'utf8');
    const origin = new URL(readFrontMatterValue(englishSource, 'canonical')!).origin;
    assert.equal(readFrontMatterValue(source, 'canonical'), `${origin}/zh/blog/${slug}`);
    const artifact = source.includes('editorialArtifact:') ? readFileSync(path.join(chineseDir, `${slug}.article.json`), 'utf8') : '';
    assert.ok(((source + artifact).match(/[\u4e00-\u9fff]/g) ?? []).length > 300, `${slug} needs substantive Chinese copy`);
    assert.doesNotMatch(source, /\]\(\/blog\//, `${slug} should not link to English blog paths`);
    for (const [, linkedSlug] of source.matchAll(/\]\(\/zh\/blog\/([^#?)]+)[^)]*\)/g)) {
      assert.ok(chineseFiles.includes(`${linkedSlug}.mdx`), `${slug} links to missing Chinese article ${linkedSlug}`);
    }
  }
});

test('shared marketing locale helper owns localized blog article slugs', () => {
  const source = readFileSync('frontend/lib/i18n/marketing-locale-switch.ts', 'utf8');

  assert.match(source, /resolveBlogCanonicalSlug/);
  assert.match(source, /resolveLocalizedBlogSlug/);
  assert.match(source, /englishFirst !== 'blog'/);
});

test('marketing language toggle no longer forks dynamic route families', () => {
  const source = readFileSync('frontend/components/marketing/LanguageToggle.tsx', 'utf8');

  assert.match(source, /buildMarketingLocaleSwitchHref/);
  assert.doesNotMatch(source, /params\?\.(?:slug|usecase)/);
  assert.doesNotMatch(source, /router\.replace/);
});

test('client i18n provider keeps the document language in sync after locale switches', () => {
  const source = readFileSync('frontend/lib/i18n/I18nProvider.tsx', 'utf8');

  assert.match(source, /document\.documentElement\.lang = locale/);
});
