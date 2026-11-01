import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import entity from '../frontend/config/legal-entity.json';
import { legalText, listLegalFactKeys } from '../frontend/lib/legal-entity';

// The app components use the automatic JSX runtime under Next; tsx compiles them with the classic one.
(globalThis as unknown as { React: typeof React }).React = React;

const LEGAL = 'frontend/app/(core)/legal';
// Pages that keep four locales in one file. Their Chinese blocks are checked from the source.
const BLOCK_PAGES = {
  subprocessors: `${LEGAL}/subprocessors/page.tsx`,
  takedown: `${LEGAL}/takedown/page.tsx`,
  acceptableUse: `${LEGAL}/acceptable-use/page.tsx`,
  cookiesList: `${LEGAL}/cookies-list/page.tsx`,
  hub: `${LEGAL}/page.tsx`,
};

// Inherited upstream content: French operator, EU law, Stripe, the upstream's vendors and a named individual.
const FOREIGN = /Stripe|GDPR|CNIL|SIREN|Paris|France|Francia|CCPA|Neon|Vercel|Fal\.ai|Resend|巴黎|法国|欧盟|欧洲经济区|Adrien|Novillers|DPA|SOC 文档/;
const MARKER = /【待(填写|核实)：/;

const textOf = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const cjkRatio = (text: string) => {
  const cjk = (text.match(/[一-鿿]/g) ?? []).length;
  const latin = (text.match(/[A-Za-z]/g) ?? []).length;
  return cjk / Math.max(1, cjk + latin);
};

/** The Chinese parts of a page that keeps four locales in one file. */
function zhBlocks(source: string): string {
  const blocks: string[] = [];
  const keyed = /^ {2}zh: [{[]/gm;
  let match: RegExpExecArray | null;
  while ((match = keyed.exec(source))) {
    const close = source[match.index + 6] === '{' ? '\n  },' : '\n  ],';
    blocks.push(source.slice(match.index, source.indexOf(close, match.index) + close.length));
  }
  const caseStart = source.indexOf("case 'zh':");
  if (caseStart >= 0) blocks.push(source.slice(caseStart, source.indexOf("case 'fr':", caseStart)));
  const fnStart = source.indexOf('function AupArticleZh');
  if (fnStart >= 0) blocks.push(source.slice(fnStart, source.indexOf('\nexport default', fnStart)));
  return blocks.join('\n');
}

async function renderZhDocuments() {
  const { TermsArticleZh } = await import('../frontend/app/(core)/legal/terms/_components/TermsArticleZh');
  const { PrivacyArticleZh } = await import('../frontend/app/(core)/legal/privacy/_components/PrivacyArticleZh');
  const { MentionsZh } = await import('../frontend/app/(core)/legal/mentions/_components/MentionsZh');
  const { ReturnPolicyZh } = await import('../frontend/app/(localized)/[locale]/return-policy/_components/ReturnPolicyZh');
  return {
    terms: renderToStaticMarkup(React.createElement(TermsArticleZh, { version: 'v', effective: 'e', subprocessorsHref: '/zh/legal/subprocessors' })),
    privacy: renderToStaticMarkup(
      React.createElement(PrivacyArticleZh, { links: { mentionsHref: '/zh/legal/mentions', subprocessorsHref: '/zh/legal/subprocessors', cookiesHref: '/zh/legal/cookies-list' } }),
    ),
    mentions: renderToStaticMarkup(React.createElement(MentionsZh)),
    returnPolicy: renderToStaticMarkup(React.createElement(ReturnPolicyZh)),
  };
}

test('no Chinese legal page prints a 【待填写】 marker or inherited foreign-law content', async () => {
  const docs = await renderZhDocuments();
  for (const [name, html] of Object.entries(docs)) {
    const text = textOf(html);
    assert.doesNotMatch(text, MARKER, `${name} prints a placeholder marker`);
    const hit = text.match(FOREIGN);
    assert.equal(hit, null, `${name} still mentions "${hit?.[0]}"`);
  }
  for (const [name, file] of Object.entries(BLOCK_PAGES)) {
    const block = zhBlocks(readFileSync(file, 'utf8'));
    assert.doesNotMatch(block, MARKER, `${name} (zh) prints a placeholder marker`);
    const hit = block.match(FOREIGN);
    assert.equal(hit, null, `${name} (zh) still mentions "${hit?.[0]}"`);
  }
});

test('Supabase appears only in the processor tables and the cookie list', async () => {
  const docs = await renderZhDocuments();
  assert.match(textOf(docs.privacy), /Supabase/, 'the privacy policy processor table lists the authentication provider');
  assert.match(zhBlocks(readFileSync(BLOCK_PAGES.subprocessors, 'utf8')), /Supabase/);
  assert.doesNotMatch(textOf(docs.terms), /Supabase/);
  assert.doesNotMatch(textOf(docs.mentions), /Supabase/);
  assert.doesNotMatch(textOf(docs.returnPolicy), /Supabase/);
  for (const name of ['takedown', 'acceptableUse', 'hub'] as const) {
    assert.doesNotMatch(zhBlocks(readFileSync(BLOCK_PAGES[name], 'utf8')), /Supabase/, `${name} (zh)`);
  }
});

test('every Chinese legal page is Chinese, not the English fallback', async () => {
  const docs = await renderZhDocuments();
  const minimumChars = { terms: 2500, privacy: 2500, mentions: 200, returnPolicy: 300 } as const;
  for (const [name, html] of Object.entries(docs)) {
    const text = textOf(html);
    assert.ok(text.length > minimumChars[name as keyof typeof minimumChars], `${name} is a full document (${text.length} chars)`);
    assert.ok(cjkRatio(text) > 0.6, `${name} is mostly Chinese (ratio ${cjkRatio(text).toFixed(2)})`);
  }
  for (const [name, file] of Object.entries(BLOCK_PAGES)) {
    const blocks = zhBlocks(readFileSync(file, 'utf8')).replace(/`[^`]*`|'[^']*(?:https?|@)[^']*'/g, '');
    assert.ok(cjkRatio(blocks.replace(/[A-Za-z_]+\(|\b[a-zA-Z]+:/g, '')) > 0.4, `${name} (zh) is mostly Chinese`);
  }
});

test('the operator name, address, unified social credit code and ICP number appear on mentions, terms and privacy', async () => {
  const docs = await renderZhDocuments();
  const facts = [legalText('operatorName'), legalText('registeredAddress'), legalText('creditCode'), legalText('icpFilingNumber')];
  assert.deepEqual(facts, ['天津市南开区芊与芊寻信息服务工作室', '天津市南开区士英路19号207', '92120104MA82H8MQ0M', '津ICP备2025029271号-2']);
  for (const name of ['mentions', 'terms', 'privacy'] as const) {
    const text = textOf(docs[name]);
    for (const fact of facts) assert.ok(text.includes(fact), `${name} must show ${fact}`);
  }
  assert.match(docs.mentions, /href="https:\/\/beian\.miit\.gov\.cn\/"/, 'the filing number links to the registry');
});

test('dispute resolution is the defendant’s domicile court under PRC law', async () => {
  const text = textOf((await renderZhDocuments()).terms);
  assert.match(text, /适用中华人民共和国大陆地区法律/);
  assert.match(text, /由被告住所地人民法院管辖/);
});

test('contact is the displayed email and the named contact person, with no other channel invented', async () => {
  const docs = await renderZhDocuments();
  for (const name of ['mentions', 'terms', 'privacy'] as const) {
    const text = textOf(docs[name]);
    assert.ok(text.includes('杨博钧'), `${name} names the personal-information contact person`);
    assert.match(text, /contact \[at\] llmhub\.com\.cn/, `${name} shows the obfuscated contact email`);
  }
  for (const name of ['terms', 'privacy', 'mentions', 'returnPolicy'] as const) {
    assert.doesNotMatch(textOf(docs[name]), /电话|客服热线|在线客服|服务时间|微信|QQ/, `${name} must not invent another channel`);
  }
});

test('clauses that need facts the owner did not provide are not written', async () => {
  const docs = await renderZhDocuments();
  const all = Object.values(docs).map(textOf).join(' ');
  assert.doesNotMatch(all, /最低使用年龄|起充金额|最低充值|余额.{0,8}有效期|有效期.{0,8}余额|不可提现|不可兑换现金/);
  assert.doesNotMatch(textOf(docs.returnPolicy), /一般不予退款|通常不予退款|不予退款|无法退回|不可退款/, 'no refund rule beyond the automatic refund of failed generations');
  assert.match(textOf(docs.returnPolicy), /自动退回您的钱包/);
  assert.doesNotMatch(textOf(docs.privacy), /保存期限为|个月|日历天|\d+ ?天/, 'no invented retention periods');
});

test('the data-location statement is printed plainly, without hedging', async () => {
  const text = textOf((await renderZhDocuments()).privacy);
  assert.ok(text.includes('您的个人信息保存和处理均在中华人民共和国大陆境内，我们不向中华人民共和国境外提供您的个人信息'));
  assert.doesNotMatch(text, /待核实|待确认|可能出境|以实际为准/);
  assert.ok((entity as unknown as Record<string, { ownerStated?: boolean }>).dataStorageStatement.ownerStated, 'the config records it as owner-stated, for the review checklist');
});

test('the generative-AI filing status is never printed or implied on the site', async () => {
  const docs = await renderZhDocuments();
  for (const [name, html] of Object.entries(docs)) {
    assert.doesNotMatch(textOf(html), /(已|已经)(取得|获得|完成|通过|办理).{0,10}(备案|登记)/, `${name} must not imply a filing`);
    assert.doesNotMatch(textOf(html), /生成式人工智能服务(备案|登记)(号|编号)/, `${name}`);
  }
  for (const file of [...Object.values(BLOCK_PAGES), `${LEGAL}/mentions/_components/MentionsZh.tsx`]) {
    assert.doesNotMatch(readFileSync(file, 'utf8'), /genAiFilingStatus/);
  }
});

test('the facts config has no placeholder statuses or markers', () => {
  for (const key of listLegalFactKeys()) {
    const fact = (entity as unknown as Record<string, Record<string, unknown>>)[key];
    assert.equal('status' in fact, false, `${key} must not carry a placeholder/verification status`);
    assert.doesNotMatch(String(fact.value), MARKER, `${key}`);
    assert.ok(String(fact.value).trim().length > 0, `${key} is not empty`);
  }
});

test('the zh dispatch no longer falls back to the English article and the header names no French operator', () => {
  for (const file of [`${LEGAL}/terms/_components/TermsArticle.tsx`, `${LEGAL}/privacy/_components/PrivacyArticle.tsx`]) {
    assert.match(readFileSync(file, 'utf8'), /case 'zh':/, `${file} dispatches the Chinese article`);
  }
  const zhCopy = readFileSync(`${LEGAL}/terms/_lib/terms-page-copy.ts`, 'utf8').split('  zh: {').slice(-1)[0];
  assert.doesNotMatch(zhCopy, /法国|巴黎/);
  assert.match(readFileSync(`${LEGAL}/mentions/page.tsx`, 'utf8'), /if \(locale === 'zh'\) return <MentionsZh \/>/);
});
