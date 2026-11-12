import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { parseModelDecisionContent } from '../frontend/app/(localized)/[locale]/(marketing)/models/[slug]/_lib/model-page-decision-content.ts';

test('every zh model content decision section satisfies the current decision schema', () => {
  const failures: string[] = [];
  for (const file of readdirSync('content/models/zh').filter((name) => name.endsWith('.json'))) {
    const slug = file.replace(/\.json$/, '');
    const document = JSON.parse(readFileSync(`content/models/zh/${file}`, 'utf8'));
    try {
      parseModelDecisionContent(document.decision, slug, 'zh', `content/models/zh/${file}#decision`);
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    }
  }
  assert.deepEqual(failures, []);
});
