import assert from 'node:assert/strict';
import test from 'node:test';
// @ts-expect-error The report script is plain ESM without type declarations.
import { classify } from '../scripts/report-upstream-deviations.mjs';

test('documented kept deviations and deploy infrastructure are recognised before any signal word', () => {
  assert.equal(classify('frontend/config/public-examples.json', 'keyvo'), 'K kept (documented)');
  assert.equal(classify('frontend/server/video-providers/google-vertex-veo/client.ts', ''), 'K kept (documented)');
  assert.equal(classify('.github/workflows/quality.yml', 'keyvo'), 'Y deploy-infra');
});

test('customization signals come from the path or the changed text, lowest bucket number first', () => {
  assert.equal(classify('frontend/lib/pricing.ts', '价格'), '1 zh');
  assert.equal(classify('frontend/lib/format.ts', 'const currency = "CNY"'), '3 cny');
  assert.equal(classify('frontend/server/llmhub-video-poll.ts', ''), '5 llmhub-api');
  assert.equal(classify('content/models/en/x.json', 'runs on VideoAI'), '7 white-label');
  assert.equal(classify('frontend/app/(core)/page.tsx', 'padding: 4px'), '4 ui-redesign');
});

test('a change with no customization signal outside the UI folders is reported as unexplained', () => {
  assert.equal(classify('frontend/server/some-upstream-owner.ts', 'const retries = 3'), 'Z no signal');
});
