import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';
// @ts-expect-error plain ESM script without types
import { kinds, renderHtml, renderText, SUPPORT_EMAIL } from '../docs/deployment/supabase-email/build-templates.mjs';
// @ts-expect-error plain ESM script without types
import { render, VALID_VARS, SAMPLE } from '../docs/deployment/supabase-email/preview.mjs';
import { parseRecoveryProof, recoveryEmailDestination, updateRecoveredPassword, verifyRecoveryProof } from '../frontend/lib/password-recovery';
import { requestPasswordReset } from '../frontend/app/(core)/login/_lib/login-password-reset';

const DIR = 'docs/deployment/supabase-email/templates/';
const kindNames = Object.keys(kinds) as string[];

test('committed templates match the generator', () => {
  for (const kind of kindNames) {
    assert.equal(readFileSync(`${DIR}${kinds[kind].file}.html`, 'utf8'), renderHtml(kind), kind);
    assert.equal(readFileSync(`${DIR}${kinds[kind].file}.txt`, 'utf8'), renderText(kind), kind);
  }
  assert.equal(readdirSync(DIR).filter((n) => n.endsWith('.html')).length, kindNames.length);
});

test('every template is Keyvo branded zh text with valid GoTrue variables, safe links and a small size', () => {
  for (const kind of kindNames) {
    for (const ext of ['html', 'txt']) {
      const source = readFileSync(`${DIR}${kinds[kind].file}.${ext}`, 'utf8');
      assert.doesNotMatch(source, /MaxVideoAI|maxvideoai\.com|VideoAI/i, kind);
      assert.match(source, /Keyvo/);
      assert.match(source, /[一-鿿]/);
      assert.ok(Buffer.byteLength(source) < 100_000, kind);
      for (const match of source.matchAll(/\{\{\s*([^}]*?)\s*\}\}/g)) {
        assert.match(match[1], /^\.(\w+)(\s*\|\s*urlquery)?$/, `${kind}: unsupported action ${match[0]}`);
        assert.ok(VALID_VARS.includes(match[1].slice(1).split(/\s/)[0]), `${kind}: ${match[0]}`);
      }
      const rendered = render(source);
      assert.doesNotMatch(rendered, /\{\{/);
      for (const url of rendered.match(/https?:\/\/[^\s"<]+/g) ?? []) {
        const host = new URL(url.replaceAll('&amp;', '&')).host;
        assert.ok(['app.keyvo.cn', 'supabase.keyvo.cn'].includes(host), `${kind}: ${url}`);
      }
      assert.doesNotMatch(source, /<img[^>]+src="http:/i);
    }
  }
});

test('support address is the one used on the site and the right variable is used per template', () => {
  assert.equal(SUPPORT_EMAIL, 'contact@llmhub.com.cn');
  assert.match(readFileSync(`${DIR}reset-password.html`, 'utf8'), /token_hash=\{\{ \.TokenHash \}\}/);
  assert.match(readFileSync(`${DIR}reauthentication.html`, 'utf8'), /\{\{ \.Token \}\}/);
  assert.match(readFileSync(`${DIR}email-change.html`, 'utf8'), /\{\{ \.NewEmail \}\}/);
  for (const kind of ['confirmation', 'magic_link', 'invite', 'email_change']) assert.match(renderHtml(kind), /\{\{ \.ConfirmationURL \}\}/);
});

test('legacy email user: rendered recovery link is accepted by the reset page and the password is saved', async () => {
  const link = new URL(render(renderHtml('recovery')).match(/href="([^"]+)"/)![1].replaceAll('&amp;', '&'));
  assert.equal(link.origin + link.pathname, 'https://app.keyvo.cn/auth/reset-password');
  const proof = parseRecoveryProof(link.search, '');
  assert.deepEqual(proof, { kind: 'tokenHash', value: SAMPLE.TokenHash });
  assert.equal(recoveryEmailDestination(link.searchParams.get('redirect_to') ?? undefined).next, '/app');
  assert.equal(recoveryEmailDestination(link.searchParams.get('redirect_to') ?? undefined).locale, 'zh');
  const calls: unknown[] = [];
  const auth = {
    exchangeCodeForSession: async () => { throw new Error('unused'); },
    setSession: async () => { throw new Error('unused'); },
    verifyOtp: async (input: unknown) => { calls.push(input); return { data: { session: { user: { id: 'legacy' } } }, error: null }; },
    getUser: async () => ({ data: { user: { id: 'legacy' } }, error: null }),
    updateUser: async (input: unknown) => { calls.push(input); return { data: {}, error: null }; },
  } as never;
  assert.equal(await verifyRecoveryProof(auth, proof!), 'legacy');
  assert.equal(await updateRecoveredPassword(auth, 'legacy', 'new-secret', 'new-secret'), 'saved');
  assert.deepEqual(calls, [{ token_hash: SAMPLE.TokenHash, type: 'recovery' }, { password: 'new-secret' }]);
});

test('"email sending not configured" (GoTrue 500) is a generic unavailable result, success is only a clean response', async () => {
  const notConfigured = { status: 500, code: 'unexpected_failure', message: 'Error sending recovery email' };
  assert.equal(await requestPasswordReset(async () => ({ error: notConfigured })), 'unavailable');
  assert.equal(await requestPasswordReset(async () => ({ error: null })), 'sent');
  const zh = readFileSync('frontend/messages/zh.json', 'utf8');
  assert.match(zh.match(/"resetSent": "([^"]+)"/)![1], /收件箱和垃圾邮件/);
  assert.match(zh.match(/"resetUnavailable": "([^"]+)"/)![1], /contact@llmhub\.com\.cn/);
});
