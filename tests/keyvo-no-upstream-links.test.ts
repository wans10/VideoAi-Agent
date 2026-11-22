// Keyvo is a white-label of MaxVideoAI: no customer-facing source may send a user to the upstream site
// (maxvideoai.com / www.maxvideoai.com). media.maxvideoai.com (example media the owner will self-host later) is not matched.
// Use the site's own origin (frontend/lib/siteOrigin.ts, https://app.keyvo.cn) or a relative link instead.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const ROOTS = ['app', 'components', 'src', 'lib', 'server', 'hooks'].map((dir) => join('frontend', dir));
const UPSTREAM = /(?:https?:)?\/\/(?:www\.)?maxvideoai\.com\b/;

// Files that still carry the upstream host on purpose. Each entry needs a reason; prefixes match folders.
const ALLOWED: ReadonlyArray<readonly [string, string]> = [
  ['frontend/src/server/mcp/', 'MCP server and protocol layer (hidden from customers by KEYVO_MCP_UI_HIDDEN); migrate when MCP reopens'],
  ['frontend/src/server/agent-api/', 'MCP agent API destinations and trusted account-URL allowlist (protocol layer, same as above)'],
  ['frontend/src/server/studio/audio-generation-service.ts', 'passes the trusted MCP account URL to the shared agent service, never rendered'],
  ['frontend/src/server/studio/image-generation-service.ts', 'passes the trusted MCP account URL to the shared agent service, never rendered'],
  ['frontend/src/server/studio/conversation-image-run.ts', 'default internal request origin for export reads, never rendered'],
  ['frontend/src/server/tools/creator-generation-service.ts', 'default trusted MCP account URL for the shared agent service, never rendered'],
  ['frontend/src/server/timeline-exports/', 'internal fetch origin for media access, not a link'],
  ['frontend/src/server/subtitles/sequence-render.ts', 'internal fetch origin fallback, not a link'],
  ['frontend/src/server/generations/paid-provider-execution.ts', 'synthetic internal request URL, not a link'],
  ['frontend/src/server/editorial/', 'admin editorial pipeline; the blog is not published on Keyvo'],
  ['frontend/lib/editorial/checks.ts', 'admin editorial QA'],
  ['frontend/app/(localized)/[locale]/(marketing)/integrations/_content/shared.ts', 'MCP integration pages, hidden (404) by KEYVO_MCP_UI_HIDDEN'],
  ['frontend/app/(core)/admin/marketing-media/', 'admin-only URL base for parsing'],
  ['frontend/lib/analytics/public-video.ts', 'analytics canonical match, not a link'],
  ['frontend/lib/password-recovery.ts', 'redirect allowlist; upstream stays accepted only as a legacy origin'],
  ['frontend/lib/seo/training-crawl-policy.ts', 'URL parsing base for crawl-policy targets, not emitted'],
  ['frontend/server/local-public-examples', 'identity of the captured example snapshot (owner will self-host the media later)'],
  ['frontend/app/(localized)/[locale]/(marketing)/blog/', 'upstream blog content, hidden on Keyvo (KEYVO_BLOG_HIDDEN returns notFound)'],
  ['frontend/app/(localized)/[locale]/(marketing)/higgsfield-alternative/', 'competitor comparison page, notFound() for zh (Keyvo is zh-only); its embed snippet is never served'],
  ['frontend/app/(localized)/[locale]/(marketing)/openart-alternative/', 'competitor comparison page, notFound() for zh (Keyvo is zh-only)'],
  ['frontend/app/(localized)/[locale]/(marketing)/models/[slug]/_lib/model-page-cinematic-data.ts', 'relative-URL parsing base; only pathname and search are emitted'],
  ['frontend/app/(localized)/[locale]/(marketing)/models/[slug]/_lib/model-page-cinematic-gallery.ts', 'relative-URL parsing base; only pathname and search are emitted'],
  ['frontend/app/(localized)/[locale]/(marketing)/models/[slug]/_lib/model-page-workflow-proofs.ts', 'relative-URL parsing base; only pathname and search are emitted'],
  ['frontend/app/(localized)/[locale]/(marketing)/models/[slug]/_components/ModelCinematicSpecialty.tsx', 'relative-URL parsing base; only pathname and search are emitted'],
  ['frontend/app/api/analytics/openai-registration/', 'ChatGPT app registration origin check for inbound analytics; not a link (no ChatGPT app on Keyvo)'],
  ['frontend/lib/analytics/openai-contract.ts', 'ChatGPT app registration analytics identity; not rendered and not a link'],
  ['frontend/src/server/studio/conversation-actions.ts', 'default trusted account origin for the hidden agent-facing creator tools; the trusted-origin check only accepts the MaxVideoAI account host'],
  ['frontend/src/server/studio/conversation-creator.ts', 'default trusted account origin for the hidden agent-facing creator tools; the trusted-origin check only accepts the MaxVideoAI account host'],
];

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next' || name === 'tests' || name === '__tests__') continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.(?:ts|tsx|js|jsx|mjs|css|json)$/.test(name) && !/\.generated\./.test(name)) out.push(path);
  }
  return out;
}

test('customer-facing source carries no link to the upstream site outside the documented allowlist', () => {
  const offenders: string[] = [];
  for (const file of ROOTS.flatMap((root) => walk(root))) {
    if (ALLOWED.some(([prefix]) => file.startsWith(prefix))) continue;
    readFileSync(file, 'utf8').split('\n').forEach((line, index) => {
      if (UPSTREAM.test(line)) offenders.push(`${file}:${index + 1}: ${line.trim().slice(0, 140)}`);
    });
  }
  assert.deepEqual(offenders, [], 'link to the site origin (lib/siteOrigin.ts) or a relative path instead of the upstream host');
});

test('every allowlist entry still matches a file that carries the upstream host', () => {
  const files = ROOTS.flatMap((root) => walk(root)).filter((file) => UPSTREAM.test(readFileSync(file, 'utf8')));
  for (const [prefix, reason] of ALLOWED) {
    assert.ok(reason.length > 10, prefix);
    assert.ok(files.some((file) => file.startsWith(prefix)), `stale allowlist entry: ${prefix}`);
  }
});

test('the wallet, quote card, login notice and Milo guides link to the site itself', () => {
  const read = (path: string) => readFileSync(`frontend/${path}`, 'utf8');
  assert.match(read('components/header/HeaderWalletStatus.tsx'), /const billingHref = '\/billing';/);
  assert.match(read('app/(core)/(workspace)/app/studio/conversation/[projectId]/_components/ImageQuoteCard.client.tsx'), /href="\/billing"/);
  assert.match(read('src/server/prompt-assistance/app-guide.ts'), /\$\{SITE_ORIGIN\}\/contact/);
  assert.match(read('src/server/studio/conversation-director-instructions.ts'), /\$\{SITE_ORIGIN\}\/contact/);
  assert.doesNotMatch(read('src/server/prompt-assistance/app-guide.ts'), /maxvideoai/i);
  assert.match(read('components/editorial/EditorialReader.tsx'), /\$\{SITE_ORIGIN\}\$\{s\.href\}/);
});

test('IndexNow submits under the site origin, not the upstream host', () => {
  const route = readFileSync('frontend/app/api/indexnow/route.ts', 'utf8');
  assert.match(route, /const HOST = new URL\(SITE_ORIGIN\)\.host;/);
  assert.doesNotMatch(route, /maxvideoai/i);
  const script = readFileSync('scripts/indexnow-submit-changed.mjs', 'utf8');
  assert.match(script, /process\.env\.SITE \|\| 'https:\/\/app\.keyvo\.cn'/);
  assert.doesNotMatch(readFileSync('.github/workflows/indexnow.yml', 'utf8'), /maxvideoai/i);
});
