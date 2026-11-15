// MCP (ChatGPT/Claude/Codex connectors) is not offered to Keyvo customers: see KEYVO_MCP_UI_HIDDEN in
// frontend/config/keyvo-disabled-features.ts and docs/engineering/keyvo-upstream-deviations.md.
// This is a UI/marketing/discovery hide only; the server, OAuth/discovery endpoints and publication JSON stay intact.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import mcpPublication from '../frontend/config/mcp-publication.json' with { type: 'json' };
import { isKeyvoMcpUiHidden, KEYVO_MCP_UI_HIDDEN } from '../frontend/config/keyvo-disabled-features';
import { FEATURES } from '../frontend/content/feature-flags';
import { mcpUiPublication } from '../frontend/config/mcp-ui-publication';
import { getMcpPublicationState } from '../frontend/lib/mcp-publication';
import { getMcpDocsLink, getMcpInternalLink, type McpInternalLinkPlacement } from '../frontend/lib/mcp-internal-links';
import { MARKETING_NAV_ASSISTANTS, MARKETING_NAV_DROPDOWNS, MARKETING_SITE_NAV_LINKS } from '../frontend/config/navigation';
import { SETTINGS_TAB_ITEMS } from '../frontend/lib/settings-navigation';
import { buildLlmsModelDiscoveryProjection, buildLlmsText } from '../frontend/lib/seo/llms-text';
import { getStudioMarketingCopy } from '../frontend/app/(localized)/[locale]/(marketing)/studio/_lib/studio-marketing-copy';
import { ExampleContinuationActions } from '../frontend/components/examples/ExampleContinuationActions.client';

const source = (path: string) => readFileSync(`frontend/${path}`, 'utf8');
const withEnv = async <T>(value: string | undefined, run: () => Promise<T> | T): Promise<T> => {
  const previous = process.env.KEYVO_MCP_FULL_UI;
  if (value === undefined) delete process.env.KEYVO_MCP_FULL_UI; else process.env.KEYVO_MCP_FULL_UI = value;
  try { return await run(); } finally {
    if (previous === undefined) delete process.env.KEYVO_MCP_FULL_UI; else process.env.KEYVO_MCP_FULL_UI = previous;
  }
};

test('the MCP constant is on, and only the test-only env switch reopens the rule', async () => {
  assert.equal(KEYVO_MCP_UI_HIDDEN, true);
  await withEnv(undefined, () => assert.equal(isKeyvoMcpUiHidden(), true));
  await withEnv('1', () => assert.equal(isKeyvoMcpUiHidden(), false));
  await withEnv('0', () => assert.equal(isKeyvoMcpUiHidden(), true));
});

test('the Studio Milo dialog footer offers no MCP, ChatGPT, Claude or Codex link', () => {
  const dialog = source('app/(core)/(workspace)/app/studio/conversation/[projectId]/_components/StudioAssistanceCredits.client.tsx');
  const footer = dialog.slice(dialog.indexOf('<footer'), dialog.indexOf('</footer>'));
  assert.match(footer, /priced and confirmed separately/, 'the credits sentence stays');
  const guarded = footer.slice(footer.indexOf('isKeyvoMcpUiHidden()'));
  assert.match(footer, /\{isKeyvoMcpUiHidden\(\)\?null:<>/, 'the MCP row and note sit behind the rule');
  assert.ok(guarded.includes('styles.mcp') && guarded.includes('styles.mcpNote'), 'both the link row and the plan note are guarded');
  assert.equal(footer.slice(0, footer.indexOf('isKeyvoMcpUiHidden()')).match(/MCP|ChatGPT|Claude|Codex|mcpHref|setupLinks/i), null, 'nothing MCP precedes the guard');
});

test('publication for customer-facing surfaces is closed whatever the publication JSON says', () => {
  const state = getMcpPublicationState(mcpUiPublication);
  assert.equal(state.renderPublicPage, false);
  assert.equal(state.indexable, false);
  assert.equal(state.connectionAvailable, false);
  assert.equal(mcpUiPublication.publicMarketing, false);
  assert.equal(mcpUiPublication.publicIndexing, false);
  // Even if the JSON were opened, the constant keeps the UI publication closed.
  assert.equal(getMcpPublicationState({ ...mcpUiPublication, transport: true, oauth: true, discovery: true }).renderPublicPage, false);
});

test('internal links, navigation and discovery drop MCP', async () => {
  const placements: McpInternalLinkPlacement[] = ['home', 'homeHero', 'footer', 'payg', 'models', 'model', 'comparison', 'examples', 'docs'];
  for (const placement of placements) assert.equal(getMcpInternalLink('zh', placement), null, placement);
  for (const placement of ['footer', 'hub', 'integration'] as const) assert.equal(getMcpDocsLink('zh', placement), null, placement);
  assert.deepEqual(MARKETING_NAV_ASSISTANTS, []);
  assert.equal(MARKETING_SITE_NAV_LINKS.some((item) => item.key === 'pipeline'), false);
  assert.ok(MARKETING_SITE_NAV_LINKS.every((item) => !/mcp|integrations/.test(String(item.href))));
  assert.deepEqual(MARKETING_NAV_DROPDOWNS.connect?.items, []);

  const llms = buildLlmsText(mcpUiPublication, buildLlmsModelDiscoveryProjection());
  assert.doesNotMatch(llms, /\/mcp|\/integrations\/|ChatGPT|Codex|MCP/);

  const { getCanonicalPathEntries } = await import('../frontend/lib/sitemap/route-discovery');
  const paths = (await getCanonicalPathEntries()).map((entry) => JSON.stringify(entry));
  assert.ok(paths.length > 0);
  for (const path of paths) assert.doesNotMatch(path, /"\/(?:mcp|docs\/mcp|integrations\/(?:chatgpt|claude|codex|openclaw|n8n))"/);
});

test('marketing MCP pages and integration pages answer 404', () => {
  // The pages build their state from FEATURES.mcp (the UI publication) and call notFound() unless renderPublicPage is true.
  assert.equal(getMcpPublicationState(FEATURES.mcp).renderPublicPage, false);
  const pages = ['mcp', 'integrations/chatgpt', 'integrations/claude', 'integrations/codex', 'integrations/openclaw', 'integrations/n8n'];
  for (const page of pages) {
    const code = source(`app/(localized)/[locale]/(marketing)/${page}/page.tsx`);
    assert.match(code, /FEATURES\.mcp/, page);
    assert.match(code, /if \(!publication\.renderPublicPage\) notFound\(\);/, page);
  }
  const docs = source('app/(localized)/[locale]/(marketing)/docs/[slug]/page.tsx');
  assert.match(docs, /getMcpPublicationState\(FEATURES\.mcp\)/);
});

test('settings offers no connected-apps entry and the account page answers 404', () => {
  assert.deepEqual(SETTINGS_TAB_ITEMS.map((item) => item.id), ['account', 'privacy', 'notifications']);
  const page = source('app/(core)/account/connections/page.tsx');
  assert.match(page, /if \(isKeyvoMcpUiHidden\(\)\) notFound\(\);/);
});

test('the example hand-off to ChatGPT and Claude is hidden, Studio stays', async () => {
  (globalThis as { React?: unknown }).React = React; // the shared component uses the classic JSX runtime
  const render = () => renderToStaticMarkup(React.createElement(ExampleContinuationActions, {
    source: {
      id: 'e1', title: 'Example', prompt: 'A cat', videoUrl: 'https://example.com/v.mp4', engineLabel: 'Seedance', watchHref: '/video/e1',
      modelHref: null, aspectRatio: '16:9', durationSec: 5, hasAudio: false, scenario: null, references: [],
      context: { negativePrompt: null, details: [], controls: [] },
    } as never, locale: 'zh',
  }));
  const hidden = render();
  assert.doesNotMatch(hidden, /ChatGPT|Claude/);
  assert.match(hidden, /\/app\/studio\?/);
  await withEnv('1', () => assert.match(render(), /ChatGPT/));
});

test('Studio, Milo and tool marketing carry no MCP section or FAQ entry', async () => {
  const faq = (locale: 'zh' | 'en') => getStudioMarketingCopy(locale).faq.items.map((item) => item.question).join('|');
  assert.doesNotMatch(faq('zh'), /MCP/);
  assert.doesNotMatch(faq('en'), /MCP/);
  await withEnv('1', () => assert.match(faq('zh'), /MCP/));
  assert.match(source('app/(localized)/[locale]/(marketing)/studio/_components/StudioMarketingPage.tsx'), /\{!isKeyvoMcpUiHidden\(\) && <section className=\{styles\.mcp\}/);
  assert.match(source('app/(localized)/[locale]/(marketing)/ai-video-prompt-generator/_components/MiloMarketingPage.tsx'), /\{!isKeyvoMcpUiHidden\(\)&&<article>/);
  assert.match(source('app/tools/video-background-changer/_components/VideoBackgroundChangerPage.tsx'), /\{!isKeyvoMcpUiHidden\(\)&&<Link href="\/mcp"/);
});

test('the login MCP staging notice offers no connector guide link', () => {
  assert.match(source('app/(core)/login/_components/LoginAuthSurface.tsx'), /\{!isKeyvoMcpUiHidden\(\) \? <a href=\{`\$\{SITE_ORIGIN\}\/mcp`\}/);
});

test('reopening through the test-only switch restores the publication and settings tab at load time', () => {
  const out = execFileSync(process.execPath, ['--import', 'tsx', 'tests/helpers/keyvo-mcp-reopen-probe.ts'], {
    env: { ...process.env, KEYVO_MCP_FULL_UI: '1', TSX_TSCONFIG_PATH: 'frontend/tsconfig.json' }, encoding: 'utf8',
  });
  assert.deepEqual(JSON.parse(out.trim().split('\n').pop() ?? '{}'), { same: true, tabs: ['account', 'connections', 'privacy', 'notifications'] });
});

test('the MCP server, protocol endpoints and publication data are untouched', async () => {
  const route = await import('../frontend/app/api/mcp/route');
  for (const method of ['GET', 'POST', 'DELETE', 'OPTIONS'] as const) assert.equal(typeof route[method], 'function', method);
  const discovery = await import('../frontend/app/.well-known/oauth-authorization-server/route');
  assert.equal(typeof discovery.GET, 'function');
  assert.ok(existsSync('frontend/app/.well-known/oauth-protected-resource'));
  assert.ok(existsSync('frontend/app/(core)/oauth/consent/page.tsx'));
  assert.ok(existsSync('frontend/app/api/account/mcp-settings/route.ts'));
  assert.ok(existsSync('frontend/app/(localized)/[locale]/(marketing)/mcp/page.tsx'), 'the marketing page code stays for reopening');
  assert.equal(mcpPublication.transport, true);
  assert.equal(mcpPublication.oauth, true);
  assert.equal(mcpPublication.discovery, true);
  assert.equal(mcpPublication.paidGeneration, true);
  assert.equal(mcpPublication.trial, false);
  // The server keeps reading the publication JSON directly, never the UI override.
  assert.doesNotMatch(source('src/server/mcp/server.ts'), /mcp-ui-publication/);
  assert.doesNotMatch(source('src/server/mcp/feature-access.ts'), /mcp-ui-publication/);
});
