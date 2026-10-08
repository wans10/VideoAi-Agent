import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { parseMarkdownFile } from '../frontend/lib/content/markdown';
import { getComparePageOverride } from '../frontend/app/(localized)/[locale]/(marketing)/ai-video-engines/[slug]/_lib/compare-page-overrides';

const read = (file: string) => JSON.parse(readFileSync(file, 'utf8'));

test('every comparison has a readable Chinese projection with localized editorial prose', () => {
  for (const file of readdirSync('content/comparisons').filter(file => file.endsWith('.json'))) {
    const document = read(`content/comparisons/${file}`);
    const zh = getComparePageOverride('zh', document.slug)!;
    assert.ok(zh, file);
    for (const value of [zh.heroIntro, zh.quickVerdict?.body, zh.meta?.title, zh.meta?.description].filter(Boolean)) {
      assert.match(value!, /[\u3400-\u9fff]/, file);
    }
    assert.equal(zh.faq?.items.length, document.en.faq?.items.length, file);
  }
});

test('Chinese articles parse through the production loader and preserve media, prompts and publication provenance', async () => {
  for (const file of readdirSync('content/en/blog').filter(file => file.endsWith('.article.json'))) {
    const en = read(`content/en/blog/${file}`);
    const entry = await parseMarkdownFile(path.resolve('content/zh/blog', file.replace('.article.json', '.mdx')));
    const zh = entry.editorial!;
    assert.equal(zh.article.locale, 'zh');
    assert.deepEqual(zh.assets, en.assets);
    assert.deepEqual(zh.sources, en.sources);
    assert.deepEqual(zh.publication, en.publication);
    assert.deepEqual(zh.article.blocks.map(b => [b.id, b.type]), en.article.blocks.map((b: {id: string; type: string}) => [b.id, b.type]));
    for (const [index, block] of zh.article.blocks.entries()) {
      const original = en.article.blocks[index];
      if (block.heading) assert.match(block.heading, /[\u3400-\u9fff]/, `${file} ${block.id}`);
      if (block.type === 'prompt') assert.equal(block.template, original.template);
      if (block.type === 'comparison') {
        assert.equal(block.rows.length, original.rows.length);
        assert.equal(block.columns.length, original.columns.length);
      }
    }
  }
});

test('every English guide and document has substantial Chinese content', async () => {
  for (const [english, chinese] of [['content/en/best-for', 'content/zh/best-for'], ['content/docs', 'content/zh/docs']]) {
    for (const file of readdirSync(english).filter(file => /\.mdx?$/.test(file))) {
      const en = await parseMarkdownFile(path.resolve(english, file));
      const zh = await parseMarkdownFile(path.resolve(chinese, file));
      assert.equal(zh.slug, en.slug);
      assert.equal(zh.lang, 'zh');
      assert.match(zh.title, /[\u3400-\u9fff]/);
      assert.ok((zh.content.match(/[\u3400-\u9fff]/g) ?? []).length > 150, file);
    }
  }
});

test('Chinese model and tool copy has no corrupted currency or incorrect eight-view terminology', () => {
  const files = ['frontend/messages/zh.json', ...readdirSync('content/models/zh').map(file => `content/models/zh/${file}`)];
  for (const file of files) assert.doesNotMatch(readFileSync(file, 'utf8'), /\/bin\/(?:zsh|bash)|8\s*宫格角色三视图|局部重拍/, file);
  const kling = read('content/models/zh/kling-2-5-turbo.json');
  assert.match(kling.technicalOverview[6].body, /\$0\.35/);
  assert.match(kling.technicalOverview[6].body, /\$0\.70/);
});
