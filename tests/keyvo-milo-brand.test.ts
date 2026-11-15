// Keyvo white-label: Milo (prompt assistance, Studio director) and the user-visible Studio/render messages
// must speak as Keyvo. The brand comes from PRODUCT_BRAND_NAME; identifiers with the upstream name stay (class C).
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { PRODUCT_BRAND_NAME } from '../frontend/lib/product-brand';

const read = (file: string) => readFileSync(join('frontend', file), 'utf8');
const UPSTREAM = /max\s?video\s?ai/i;

// Files whose strings reach the LLM (system prompts) or an end user (errors, refusals, guidance).
const BRANDED = [
  'src/server/prompt-assistance/provider.ts',
  'src/server/prompt-assistance/profiles.ts',
  'src/server/prompt-assistance/app-guide.ts',
  'src/server/studio/milo-scope.ts',
  'src/server/studio/conversation-director-instructions.ts',
  'src/server/studio/image-conversation-director.ts',
  'src/server/studio/assistance-ledger.ts',
  'src/server/studio/conversation-image-run.ts',
  'src/server/studio/conversation-export-command.ts',
  'src/server/generations/agent-generation-policy.ts',
  'src/server/images/openai-image-output-recovery.ts',
  'src/server/agent-api/studio-export.ts',
  'src/server/agent-api/studio-timeline.ts',
  'src/server/agent-api/generation-actor.ts',
  'src/server/agent-api/resolve-generation-references.ts',
];

test('PRODUCT_BRAND_NAME is Keyvo', () => assert.equal(PRODUCT_BRAND_NAME, 'Keyvo'));

test('Milo and Studio user-facing text never names the upstream brand', () => {
  for (const file of BRANDED) {
    const offending = read(file).split('\n').filter((line) => UPSTREAM.test(line))
      // The Studio conversation export request origin is an internal fetch default (see keyvo-no-upstream-links).
      .filter((line) => !/requestOrigin|https:\/\/maxvideoai\.com|@maxvideoai\/|[a-z]+\.maxvideoai\.com/.test(line));
    assert.deepEqual(offending, [], `${file} still names the upstream brand`);
  }
});

test('Milo system prompt and Studio director use the brand constant', () => {
  assert.match(read('src/server/prompt-assistance/provider.ts'), /You are Milo, \$\{PRODUCT_BRAND_NAME\}'s creative prompt assistant/);
  assert.match(read('src/server/prompt-assistance/profiles.ts'), /\$\{PRODUCT_BRAND_NAME\} editorial synthesis/);
  assert.match(read('src/server/studio/image-conversation-director.ts'), /réalisateur de Studio \$\{PRODUCT_BRAND_NAME\}/);
  assert.match(read('src/server/studio/image-conversation-director.ts'), /bibliothèque \$\{PRODUCT_BRAND_NAME\}/);
  assert.match(read('src/server/studio/milo-scope.ts'), /\$\{PRODUCT_BRAND_NAME\}/);
});

test('render failure copy is branded Keyvo', async () => {
  const policy = read('src/server/generations/agent-generation-policy.ts');
  assert.match(policy, /\$\{PRODUCT_BRAND_NAME\} could not read the reference media/);
  assert.match(policy, /\$\{PRODUCT_BRAND_NAME\} could not start this render/);
  assert.match(policy, /\$\{PRODUCT_BRAND_NAME\} could not prepare the output/);
});

test('persisted and reviewed identifiers keep the upstream spelling', () => {
  // sessionStorage handoff key: renaming would break in-flight handoffs.
  const handoff = [join('frontend', 'lib'), join('frontend', 'src')].flatMap(function walk(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const full = join(dir, name);
      return statSync(full).isDirectory() ? walk(full) : /\.(ts|tsx)$/.test(name) ? [full] : [];
    });
  }).some((file) => readFileSync(file, 'utf8').includes('maxvideoai:media-handoff:v1'));
  assert.equal(handoff, true);
  // Compared against a production env value; never derived from prompt text.
  assert.match(read('src/lib/studio/assistance-contract.ts'), /STUDIO_ASSISTANCE_POLICY_VERSION = 'studio-credits-2026-10-05-v2'/);
  assert.match(read('src/server/prompt-assistance/profiles.ts'), /version:'2026-10-30-v2'/);
  assert.match(read('src/server/studio/milo-scope.ts'), /MILO_SCOPE_VERSION = 'milo-media-scope-v1'/);
  assert.match(read('lib/customer-tariff-revision.ts'), /x-maxvideoai-customer-tariff/);
  assert.match(read('src/lib/membership-policy.ts'), /x-maxvideoai-pricing-policy/);
});
