import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import ts from 'typescript';

// Source attribution, actual legal identities and legacy input sanitizers are
// deliberately distinct from the current service's display brand.
const exceptions = new Map([
  ['frontend/app/(localized)/[locale]/(marketing)/integrations/_components/IntegrationHeroSection.tsx', 'Original MCP host evidence and integration identity; publication disabled for Keyvo'],
  ['frontend/app/(localized)/[locale]/(marketing)/integrations/_content/editorial.ts', 'Original MCP host evidence and integration identity; publication disabled for Keyvo'],
  ['frontend/app/(localized)/[locale]/(marketing)/integrations/_content/en.ts', 'Original MCP host evidence and integration identity; publication disabled for Keyvo'],
  ['frontend/app/(localized)/[locale]/(marketing)/integrations/_content/entry.ts', 'Original MCP host evidence and integration identity; publication disabled for Keyvo'],
  ['frontend/app/(localized)/[locale]/(marketing)/integrations/_content/es.ts', 'Original MCP host evidence and integration identity; publication disabled for Keyvo'],
  ['frontend/app/(localized)/[locale]/(marketing)/integrations/_content/fr.ts', 'Original MCP host evidence and integration identity; publication disabled for Keyvo'],
  ['frontend/app/(localized)/[locale]/(marketing)/integrations/_content/n8n.ts', 'Original MCP host evidence and integration identity; publication disabled for Keyvo'],
  ['frontend/app/(localized)/[locale]/(marketing)/integrations/_content/shared.ts', 'Original MCP host evidence and integration identity; publication disabled for Keyvo'],
  ['frontend/app/(localized)/[locale]/(marketing)/mcp/_lib/mcp-host-proof.ts', 'Original MCP host evidence and integration identity; publication disabled for Keyvo'],
  ['frontend/components/marketing/mcp/mcp-editorial-copy.ts', 'Original MCP host evidence and integration identity; publication disabled for Keyvo'],
  ['content/docs/mcp.mdx', 'Original MCP host evidence and integration identity; publication disabled for Keyvo'],
  ['content/fr/docs/mcp.mdx', 'Original MCP host evidence and integration identity; publication disabled for Keyvo'],
  ['content/es/docs/mcp.mdx', 'Original MCP host evidence and integration identity; publication disabled for Keyvo'],

  ['frontend/lib/editorial/profile.ts', 'Original author biography'],
  ['frontend/app/(localized)/[locale]/(marketing)/about/_lib/about-copy.ts', 'Explicit original-project attribution'],
  ['frontend/app/(core)/legal/mentions/page.tsx', 'Operator details await verified replacement information'],
  ['frontend/app/(localized)/[locale]/(marketing)/models/[slug]/_lib/model-page-hero-specs.ts', 'Recognizes legacy input'],
]);

function filesIn(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? filesIn(file) : /\.(tsx?|json|mdx)$/.test(file) ? [file] : [];
  });
}

test('active page copy, dictionaries and onboarding docs do not restore the source brand', () => {
  const roots = ['frontend/app', 'frontend/components', 'frontend/lib', 'frontend/messages',
    'content/docs', 'content/fr/docs', 'content/es/docs', 'content/zh/docs'];
  const unexpected = roots.flatMap(filesIn).filter((file) =>
    !exceptions.has(file) && /\bMaxVideoAI\b/.test(readFileSync(file, 'utf8')));
  assert.deepEqual(unexpected, [], 'Review display branding or document a source-attribution exception');
});

test('published product copy and runtime strings reject the intermediate VideoAI brand', () => {
  const roots = ['frontend/app', 'frontend/components', 'frontend/lib', 'frontend/server',
    'frontend/src', 'frontend/messages', 'content/docs', 'content/fr/docs', 'content/es/docs',
    'content/zh/docs'];
  const offenders: string[] = [];
  for (const file of roots.flatMap(filesIn)) {
    // Frozen MCP documents and host integration evidence retain their original identity.
    if (exceptions.has(file) || file.includes('/mcp/') || file.includes('/integrations/') ||
      file === 'frontend/lib/password-recovery.ts') continue;
    const source = readFileSync(file, 'utf8');
    const blocked = /(?<![\w@./:-])VideoAI(?![\w/-])|videoai\.omninodetech\.com/;
    if (/\.(json|mdx)$/.test(file)) {
      if (blocked.test(source)) offenders.push(file);
      continue;
    }
    const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
    function visit(node: ts.Node) {
      if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) ||
        ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node) ||
        ts.isJsxText(node)) {
        if (blocked.test(node.text)) {
          offenders.push(`${file}:${tree.getLineAndCharacterOfPosition(node.getStart(tree)).line + 1}`);
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(tree);
  }
  assert.deepEqual(offenders, []);
});
