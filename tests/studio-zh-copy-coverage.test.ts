import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import ts from 'typescript';
import {conversationZhCopy} from '../frontend/lib/studio/conversation-copy';
import {studioConversationLanguage} from '../frontend/src/server/studio/conversation-language';
import {studioFilmComparisonReply} from '../frontend/src/server/studio/conversation-film-reply';
import {studioMarketingStarterMessage} from '../frontend/app/(core)/(workspace)/app/studio/_lib/studio-project-marketing-entry';

const root = process.cwd();
const CJK = /[一-鿿]/;
/** A user-visible string that reads as English: two or more Latin words and no Chinese. */
const FILE_NAME = /^[\w.-]+\.[a-z0-9]{2,4}$/i;
const looksEnglish = (value: string) => !CJK.test(value) && !FILE_NAME.test(value) && (value.match(/[A-Za-z]{2,}/g) ?? []).length >= 2;
/** Brand and technical strings that deliberately stay Latin in the Chinese Studio. */
const ALLOWED_LATIN = new Set([
  'Keyvo Studio',
  'Lite · Included assistance',
]);

function leaves(source: unknown, prefix = ''): Array<[string, string]> {
  if (typeof source === 'string') return [[prefix, source]];
  if (!source || typeof source !== 'object') return [];
  return Object.entries(source as Record<string, unknown>).flatMap(([key, value]) => leaves(value, prefix ? `${prefix}.${key}` : key));
}

test('the zh Studio workbench dictionary has no English-only user-visible string', () => {
  const dictionary = JSON.parse(fs.readFileSync(path.join(root, 'frontend/messages/zh.json'), 'utf8'));
  const english = leaves(dictionary.workspace.studio, 'workspace.studio').filter(([, value]) => looksEnglish(value) && !ALLOWED_LATIN.has(value));
  assert.deepEqual(english, []);
});

test('the Chinese conversation phrase map has no English-only translation', () => {
  const english = Object.entries(conversationZhCopy).filter(([, value]) => looksEnglish(value) && !ALLOWED_LATIN.has(value));
  assert.deepEqual(english, []);
});

const STUDIO_ROOT = 'frontend/app/(core)/(workspace)/app/studio';
function sourceFiles(directory: string): string[] {
  return fs.readdirSync(path.join(root, directory), {withFileTypes: true}).flatMap(entry => {
    const relative = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(relative);
    return /\.tsx?$/.test(entry.name) ? [relative] : [];
  });
}

test('every conversation t() phrase has a Chinese rendering', () => {
  const missing: string[] = [];
  for (const file of [...sourceFiles(STUDIO_ROOT), ...sourceFiles('frontend/lib/studio')]) {
    const text = fs.readFileSync(path.join(root, file), 'utf8');
    const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const literal = (node: ts.Node) => ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateExpression(node) ? node : null;
    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 't' && node.arguments.length >= 2 && literal(node.arguments[0]) && literal(node.arguments[1])) {
        const english = ts.isTemplateExpression(node.arguments[0]) ? node.arguments[0].getText(sf) : (node.arguments[0] as ts.StringLiteral).text;
        const explicit = node.arguments.some(argument => CJK.test(argument.getText(sf)));
        if (!explicit && !(english in conversationZhCopy) && /[A-Za-z]{2,}/.test(english)) missing.push(`${file}: ${english.slice(0, 80)}`);
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  assert.deepEqual(missing, []);
});

test('Studio page titles are Chinese', () => {
  for (const file of [`${STUDIO_ROOT}/page.tsx`, `${STUDIO_ROOT}/conversation/[projectId]/page.tsx`]) {
    const title = /title:\s*['"]([^'"]+)['"]/.exec(fs.readFileSync(path.join(root, file), 'utf8'))?.[1] ?? '';
    assert.match(title, CJK, file);
    assert.ok(title.includes('Keyvo'), file);
  }
});

test('server-authored Studio replies and starters are Chinese for the zh site', () => {
  assert.equal(studioConversationLanguage('帮我做一个视频', [], 'en'), 'zh');
  assert.equal(studioConversationLanguage('ok', [], 'zh'), 'zh');
  assert.equal(studioConversationLanguage('Please reply in French.', [], 'zh'), 'fr');
  assert.equal(studioConversationLanguage('I want a video for my shop with this budget please', [], 'zh'), 'en');
  for (const starter of ['product-ad', 'storyboard-to-video', 'cinematic-scene']) {
    assert.match(studioMarketingStarterMessage(starter, 'zh'), CJK);
  }
  const reply = studioFilmComparisonReply({filmDurationSec: 30, estimatedAt: '2026-01-01', filmPlans: []} as never, 'zh');
  assert.match(reply.reply, CJK);
  assert.ok(!looksEnglish(reply.reply.replace(/\([^)]*\)/g, '')));
});
