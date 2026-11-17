import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

import { buildSiteVerificationMetadata, SITE_VERIFICATION_ENV_TAGS } from '../frontend/lib/seo/site-verification.ts';
import { buildRobotsText } from '../frontend/lib/seo/robots-text.ts';

test('nothing is emitted while no verification variable is set', () => {
  assert.equal(buildSiteVerificationMetadata({}), undefined);
  assert.equal(buildSiteVerificationMetadata({ BAIDU_SITE_VERIFICATION: '   ', BING_SITE_VERIFICATION: '' }), undefined);
});

test('each engine maps to the meta name its console documents', () => {
  const env = {
    BAIDU_SITE_VERIFICATION: 'codeva-AbC123',
    BING_SITE_VERIFICATION: 'ABCDEF0123456789',
    SO360_SITE_VERIFICATION: 'a1b2c3d4e5f6',
    SOGOU_SITE_VERIFICATION: 'sg_token-01',
    SHENMA_SITE_VERIFICATION: 'sm_token-02',
  };
  assert.deepEqual(buildSiteVerificationMetadata(env), {
    other: {
      'baidu-site-verification': 'codeva-AbC123',
      'msvalidate.01': 'ABCDEF0123456789',
      '360-site-verification': 'a1b2c3d4e5f6',
      'sogou_site_verification': 'sg_token-01',
      'shenma-site-verification': 'sm_token-02',
    },
  });
  assert.equal(SITE_VERIFICATION_ENV_TAGS.length, 5);
});

test('values that are not plain console tokens are dropped, not rendered', () => {
  assert.equal(buildSiteVerificationMetadata({ BAIDU_SITE_VERIFICATION: '"><script>alert(1)</script>' }), undefined);
  assert.deepEqual(buildSiteVerificationMetadata({ BAIDU_SITE_VERIFICATION: ' codeva-XyZ9 ' }), { other: { 'baidu-site-verification': 'codeva-XyZ9' } });
});

test('the root layout reads the variables at render time and declares both device classes', () => {
  const layout = readFileSync('frontend/app/layout.tsx', 'utf8');
  assert.match(layout, /export function generateMetadata\(\)/);
  assert.match(layout, /buildSiteVerificationMetadata\(\)/);
  assert.match(layout, /<meta name="applicable-device" content="pc,mobile" \/>/);
  assert.doesNotMatch(layout, /export const metadata/);
});

test('verification files in frontend/public bypass the middleware and are not blocked by robots', () => {
  const middleware = readFileSync('frontend/middleware.ts', 'utf8');
  // Every matcher that can catch a root-level file name must exclude any path containing a dot.
  assert.match(middleware, /'\/\(\(\?!_next\|\.\*\\\\\..\*\|api\)\.\*\)'/);
  const pattern = new RegExp('^/((?!_next|.*\\..*|api).*)$');
  for (const name of ['baidu_verify_codeva-AbC123.html', '360-site-verification.txt', 'sogousiteverification.txt', 'BingSiteAuth.xml', 'shenma-site-verification.txt']) {
    assert.equal(pattern.test(`/${name}`), false, `${name} must be served as a static file`);
  }
  const robots = buildRobotsText('public');
  const userAgentAll = robots.slice(robots.indexOf('User-agent: *'));
  assert.doesNotMatch(userAgentAll, /Disallow: \/(baidu_verify|360-site|sogou|BingSite|shenma)/i);
  assert.equal(existsSync('frontend/public/baidu_verify_example.html'), false, 'no placeholder verification file is committed');
});
