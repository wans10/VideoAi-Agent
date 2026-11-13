import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(path, 'utf8');
const LOGIN = 'frontend/app/(core)/login';

test('the contact email never becomes a GoTrue identity: no email in OTP, verify, password or update calls', () => {
  const hook = read(`${LOGIN}/_hooks/useLoginPhoneAuth.ts`);
  const setup = read(`${LOGIN}/_hooks/useLoginPhonePasswordSetup.ts`);
  const contact = read(`${LOGIN}/_hooks/useLoginPhoneContactEmail.ts`);
  assert.doesNotMatch(hook, /signInWithOtp\(\{[^}]*\bemail\b/);
  assert.match(hook, /verifyOtp\(\{ phone: toMainlandE164\(codeSentTo\), token: code, type: 'sms' \}\)/);
  assert.doesNotMatch(hook + setup + contact, /updateUser\(\{[^)]*\bemail\b/);
  assert.match(setup, /supabase\.auth\.updateUser\(\{ password \}\)/);
  assert.match(contact, /fetch\('\/api\/account\/contact-email'/);
  assert.doesNotMatch(contact, /supabase/i, 'the contact save uses our route only, not the auth client');
});

test('the contact email route reads its owner from the session and never from the request body', () => {
  const route = read('frontend/app/api/account/contact-email/route.ts');
  assert.match(route, /getRouteAuthContext\(req\)/);
  assert.doesNotMatch(route, /body\??\.userId|\{ ?userId[^}]*\} = body/);
  assert.match(route, /normalizeContactEmail/);
});

test('the shared profile snapshot does not read the contact email, so opt-in readers keep working before the column exists', () => {
  assert.doesNotMatch(read('frontend/server/profile.ts'), /contact_email/);
});

test('the contact email reaches the owner export, the admin identity and the marketing export', () => {
  const dsar = read('frontend/server/dsar.ts');
  assert.match(dsar, /contactEmail/);
  assert.match(dsar, /readProfileContactEmail\(userId\)/);
  const adminUsers = read('frontend/server/admin-users.ts');
  assert.match(adminUsers, /contactEmail: string \| null/);
  assert.match(adminUsers, /readProfileContactEmail\(user\.id\)/);
  assert.match(read('frontend/app/(core)/admin/users/[userId]/_components/AdminUserIdentitySection.tsx'), /profile\.contactEmail/);
  const marketing = read('frontend/server/admin-marketing.ts');
  assert.match(marketing, /p\.contact_email/);
  assert.match(marketing, /emailMap\.get\(row\.user_id\) \?\? row\.contact_email \?\? null/);
});

test('settings show the contact email read-only for phone-only accounts, labelled as not the sign-in email', () => {
  const panel = read('frontend/app/(core)/settings/_components/AccountSettingsPanel.tsx');
  assert.match(panel, /useAccountContactEmail\(Boolean\(maskedPhone\), user\?\.id\)/);
  assert.match(panel, /id="settings-account-contact-email"[^>]*readOnly/);
  const hook = read('frontend/app/(core)/settings/_hooks/useAccountContactEmail.ts');
  assert.match(hook, /fetch\('\/api\/account\/contact-email', \{ credentials: 'include' \}\)/);
});

test('the sign-up form asks for the contact email with no helper text and an unchecked, optional marketing box', () => {
  const panel = read(`${LOGIN}/_components/LoginPhoneAuthPanel.tsx`);
  assert.match(panel, /id="auth-contact-email"/);
  const start = panel.indexOf('htmlFor="auth-contact-email"');
  const end = panel.indexOf('{codeSent ? (', start);
  assert.ok(start > 0 && end > start, 'the contact email field sits between the phone field and the code step');
  const block = panel.slice(start, end).replace(/<p id="auth-contact-email-error"[\s\S]*?<\/p>/, '');
  assert.doesNotMatch(block, /<p/, 'the email field has no helper paragraph, only the error');
  assert.match(panel, /checked=\{phone\.contact\.marketingOptIn\}/);
  assert.match(panel, /\{isSignup \? \(\n          <label className="flex items-start gap-2">/);
  assert.match(read(`${LOGIN}/_hooks/useLoginPhoneContactEmail.ts`), /useState\(false\)/, 'marketing starts unchecked');
});

test('contact email copy exists in zh, en, fr and es, and no helper hint is defined for the field', () => {
  for (const locale of ['zh', 'en', 'fr', 'es'] as const) {
    const messages = JSON.parse(read(`frontend/messages/${locale}.json`));
    const phone = messages.auth.phone;
    for (const [group, key] of [
      ['fields', 'contactEmail'], ['placeholders', 'contactEmail'], ['validation', 'contactEmailRequired'],
      ['validation', 'contactEmailInvalid'], ['feedback', 'contactEmailSaveFailed'],
    ] as const) {
      assert.equal(typeof phone[group][key], 'string', `${locale} auth.phone.${group}.${key}`);
      assert.ok(phone[group][key].length > 0, `${locale} auth.phone.${group}.${key} is not empty`);
    }
    assert.equal(phone.fields.contactEmailHint, undefined, `${locale}: no helper hint for the email field`);
    assert.equal(typeof messages.auth.terms.marketing, 'string', `${locale} marketing opt-in copy`);
    const settings = messages.workspace.settings.account.fields.contactEmail;
    assert.ok(settings.label.length > 0 && settings.readOnly.length > 0, `${locale} settings contact email`);
  }
  assert.equal(JSON.parse(read('frontend/messages/zh.json')).auth.phone.validation.contactEmailRequired, '请输入电子邮箱。');
});

test('the migration is the next numbered file and is additive, idempotent and not a Supabase migration', () => {
  const migration = read('neon/migrations/98_profile_contact_email.sql');
  assert.match(migration, /^begin;/m);
  assert.match(migration, /add column if not exists contact_email text/);
  assert.match(migration, /add column if not exists contact_email_at timestamptz/);
  assert.match(migration, /if not exists \(select 1 from pg_constraint where conname = 'profiles_contact_email_length_check'\)/);
  assert.doesNotMatch(migration, /\b(drop|alter column|not null)\b/i);
});
