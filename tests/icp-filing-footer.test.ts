import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { ICP_FILING_NUMBER, ICP_FILING_URL } from '../frontend/lib/product-brand';

const read = (path: string) => readFileSync(path, 'utf8');

test('the ICP filing number links to the MIIT registry and renders from one shared component', () => {
  assert.equal(ICP_FILING_NUMBER, '津ICP备2025029271号-2');
  assert.equal(ICP_FILING_URL, 'https://beian.miit.gov.cn/');
  const component = read('frontend/components/marketing/IcpFiling.tsx');
  assert.doesNotMatch(component, /'use client'/, 'the filing must be server-rendered');
  assert.match(component, /rel="noopener noreferrer"/);
  assert.match(component, /target="_blank"/);
});

test('every public page shell shows the filing', () => {
  for (const path of [
    'frontend/components/marketing/MarketingFooter.tsx',
    'frontend/app/(core)/legal/layout.tsx',
    'frontend/app/(localized)/[locale]/return-policy/_components/ReturnPolicyZh.tsx',
    'frontend/app/(core)/login/_components/LoginAuthSurface.tsx',
    'frontend/components/app/AppSiteMenu.client.tsx',
  ]) assert.match(read(path), /<IcpFiling/, path);
});
