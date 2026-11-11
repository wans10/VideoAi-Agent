import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { getRuntimeModelById } from '../frontend/config/model-runtime';
import { parseModelArchiveContent } from '../frontend/app/(localized)/[locale]/(marketing)/models/[slug]/_lib/model-page-archive-content';

for (const locale of ['en', 'fr', 'es'] as const) {
  test(`Seedance 1.5 ${locale} is retired to Seedance 2.0 Mini instead of rendering an archive page`, () => {
    // Keyvo owner decision (2026-11-11): Seedance 1.5 is offline on every surface. The authored
    // archive content stays on disk for history but no longer renders.
    const model = getRuntimeModelById('seedance-1-5-pro')!;
    assert.equal(model.lifecycle, 'retired');
    assert.equal(model.publicTargetId, 'seedance-2-0-mini');
    assert.equal(model.publication.model.published, false);
    assert.equal(model.publication.app.published, false);
    const document = JSON.parse(readFileSync(`content/models/${locale}/seedance-1-5-pro.json`, 'utf8'));
    assert.doesNotMatch(JSON.stringify(document), /\/app\?engine=seedance-1-5-pro/);
  });

  test(`Sora ${locale} archive source is explicitly authored and stays specific to its announcement`, () => {
    for (const id of ['sora-2', 'sora-2-pro']) {
      const document = JSON.parse(readFileSync(`content/models/${locale}/${id}.json`, 'utf8'));
      const archive = parseModelArchiveContent(document.archive);
      assert.equal(archive.source?.href, 'https://help.openai.com/en/articles/20001152-what-to-know-about-the-sora-discontinuation');
      assert.ok(archive.source?.label);
      assert.throws(() => parseModelArchiveContent({ ...document.archive, source: { label: 'Incomplete source' } }));
    }
  });
}

test('generic archive renderer gets optional source attribution from localized content', () => {
  const source = readFileSync('frontend/app/(localized)/[locale]/(marketing)/models/[slug]/_components/ModelArchivePage.tsx', 'utf8');
  assert.doesNotMatch(source, /help\.openai\.com|sora-discontinuation/);
  assert.match(source, /content\.source\.href/);
  assert.match(source, /content\.source\.label/);
});

test('archive page leaves the main landmark to the marketing layout', () => {
  const archive = readFileSync('frontend/app/(localized)/[locale]/(marketing)/models/[slug]/_components/ModelArchivePage.tsx', 'utf8');
  const layout = readFileSync('frontend/app/(localized)/[locale]/(marketing)/layout.tsx', 'utf8');
  assert.match(layout, /<main(?:\s|>)/);
  assert.doesNotMatch(archive, /<main(?:\s|>)/);
});
