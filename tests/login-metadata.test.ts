import assert from 'node:assert/strict';
import test from 'node:test';

import { metadata } from '../frontend/app/(core)/login/layout.tsx';

test('login metadata stays explicit and noindexed', () => {
  assert.equal(metadata.title && typeof metadata.title === 'object' ? metadata.title.absolute : undefined, 'Keyvo — 登录');
  assert.equal(metadata.description, '登录 Keyvo 影像工作室，创作视频、图片与声音，管理账户余额和生成作品。');
  assert.deepEqual(metadata.alternates, { canonical: 'https://app.keyvo.cn/login' });
  assert.deepEqual(metadata.robots, { index: false, follow: false });
});
