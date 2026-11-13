// Keyvo 2026-11-13: phone sign-up names and records the Cookie Policy together with the Terms and Privacy Policy,
// so a new account is not interrupted by the re-consent prompt right after registration.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

test('the consent route records the cookies document only when the client says it was shown', () => {
  const route = read('frontend/app/api/legal/consents/route.ts');
  assert.match(route, /body\.cookiesAccepted === true/);
  assert.match(route, /docKey: 'cookies' as const/);
  assert.doesNotMatch(route, /const REQUIRED_DOCS = \[[^\]]*cookies/);
});

test('only the phone hook sends cookiesAccepted; the email sign-up request is unchanged', () => {
  assert.match(read('frontend/app/(core)/login/_hooks/useLoginPhoneAuth.ts'), /cookiesAccepted: true/);
  assert.doesNotMatch(read('frontend/app/(core)/login/_hooks/useLoginPageController.ts'), /cookiesAccepted/);
});

test('the phone checkbox sentence links all three documents in every locale', () => {
  const surface = read('frontend/app/(core)/login/_components/LoginAuthSurface.tsx');
  assert.match(surface, /termsStatement=\{renderPhoneTermsStatement\(false\)\}/);
  assert.match(surface, /href="\/legal\/cookies"/);
  for (const locale of ['zh', 'en', 'fr', 'es']) {
    const terms = JSON.parse(read(`frontend/messages/${locale}.json`)).auth.terms;
    assert.ok(terms.cookiesLabel && terms.listSeparator, `${locale} has cookiesLabel and listSeparator`);
  }
  assert.equal(JSON.parse(read('frontend/messages/zh.json')).auth.terms.cookiesLabel, 'Cookie 政策');
});
