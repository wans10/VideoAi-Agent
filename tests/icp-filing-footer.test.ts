import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  ICP_FILING_NUMBER,
  ICP_FILING_URL,
  PUBLIC_SECURITY_FILING_NUMBER,
  PUBLIC_SECURITY_FILING_URL,
} from '../frontend/lib/product-brand';

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

test('the Public Security Bureau filing renders right after the ICP number in the same shared component', () => {
  assert.equal(PUBLIC_SECURITY_FILING_NUMBER, '浙公网安备33010902005389号');
  assert.equal(PUBLIC_SECURITY_FILING_URL, 'https://beian.mps.gov.cn/#/query/webSearch?code=33010902005389');
  const component = read('frontend/components/marketing/IcpFiling.tsx');
  assert.ok(component.indexOf('data-icp-filing') < component.indexOf('data-public-security-filing'), 'ICP first, then the Public Security filing');
  assert.match(component, /rel="noreferrer"/);
  assert.doesNotMatch(component, /'use client'/);
  assert.match(read('frontend/app/(core)/legal/mentions/_components/MentionsZh.tsx'), /PUBLIC_SECURITY_FILING_NUMBER/);
});
