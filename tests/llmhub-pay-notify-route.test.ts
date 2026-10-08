import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import test from 'node:test';

import { POST } from '../frontend/app/api/llmhub-pay/notify/route';

const { NextRequest } = createRequire(resolve('frontend/package.json'))('next/server');

test('optional POST notification accepts only bounded form submissions', async () => {
  const wrongType = await POST(new NextRequest('https://example.com/api/llmhub-pay/notify', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
  }));
  assert.equal(wrongType.status, 415);

  const oversized = await POST(new NextRequest('https://example.com/api/llmhub-pay/notify', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: `data=${'x'.repeat(16_385)}`,
  }));
  assert.equal(oversized.status, 413);
});
