import assert from 'node:assert/strict';
import test from 'node:test';

import { metadata } from '../frontend/app/(core)/login/layout.tsx';

test('login metadata stays explicit and noindexed', () => {
  assert.equal(metadata.title && typeof metadata.title === 'object' ? metadata.title.absolute : undefined, 'VideoAI — Log in');
  assert.equal(metadata.description, 'Create your VideoAI workspace account to generate videos with Sora, Veo, Pika, Kling and more. Sign in, manage credits, and keep every render in one hub.');
  assert.deepEqual(metadata.alternates, { canonical: 'https://videoai.omninodetech.com/login' });
  assert.deepEqual(metadata.robots, { index: false, follow: false });
});
