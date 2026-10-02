import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

// Source attribution, actual legal identities and legacy input sanitizers are
// deliberately distinct from the current service's display brand.
const exceptions = new Map([
  ['frontend/lib/editorial/profile.ts', 'Original author biography'],
  ['frontend/app/(localized)/[locale]/(marketing)/about/_lib/about-copy.ts', 'Explicit original-project attribution'],
  ['frontend/app/(core)/legal/mentions/page.tsx', 'Operator details await verified replacement information'],
  ['frontend/app/(localized)/[locale]/(marketing)/models/[slug]/_lib/model-page-hero-specs.ts', 'Recognizes legacy input'],
]);

function filesIn(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? filesIn(file) : /\.(tsx?|json|mdx)$/.test(file) ? [file] : [];
  });
}

test('active page copy, dictionaries and onboarding docs do not restore the source brand', () => {
  const roots = ['frontend/app', 'frontend/components', 'frontend/lib', 'frontend/messages',
    'content/docs', 'content/fr/docs', 'content/es/docs', 'content/zh/docs'];
  const unexpected = roots.flatMap(filesIn).filter((file) =>
    !exceptions.has(file) && /\bMaxVideoAI\b/.test(readFileSync(file, 'utf8')));
  assert.deepEqual(unexpected, [], 'Review display branding or document a source-attribution exception');
});
