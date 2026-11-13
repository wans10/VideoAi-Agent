import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import zh from '../frontend/messages/zh.json';
import { AUTH_PASSWORD_MIN_LENGTH, validateAuthForm, validatePasswordSetup } from '../frontend/app/(core)/login/_lib/login-validation';
import {
  PHONE_PASSWORD_SETUP_MAX_AGE_MS,
  PHONE_PASSWORD_SETUP_STORAGE_KEY,
  classifyPhonePasswordSignInError,
  classifyPhoneSetPasswordError,
  clearPhonePasswordSetupState,
  readPhonePasswordSetupState,
  writePhonePasswordSetupState,
} from '../frontend/app/(core)/login/_lib/login-phone-password';

const LOGIN = 'frontend/app/(core)/login';

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
}

test('phone password sign-in errors: wrong number or password is one neutral outcome', () => {
  assert.equal(classifyPhonePasswordSignInError({ status: 400, code: 'invalid_credentials', message: 'Invalid login credentials' }), 'invalidCredentials');
  assert.equal(classifyPhonePasswordSignInError({ status: 400, message: 'Invalid login credentials' }), 'invalidCredentials');
  assert.equal(classifyPhonePasswordSignInError({ status: 429, code: 'over_request_rate_limit' }), 'rateLimited');
  assert.equal(classifyPhonePasswordSignInError({ status: 500, message: 'Database error' }), 'unavailable');
  assert.equal(classifyPhonePasswordSignInError(new Error('network')), 'unavailable');
  assert.equal(classifyPhonePasswordSignInError(null), 'unavailable');
});

test('phone password setup errors map weak, reused, expired and throttled passwords; everything else is unavailable', () => {
  assert.equal(classifyPhoneSetPasswordError({ status: 422, code: 'weak_password', message: 'Password is too weak' }), 'weak');
  assert.equal(classifyPhoneSetPasswordError({ status: 422, code: 'same_password' }), 'same');
  assert.equal(classifyPhoneSetPasswordError({ status: 422, message: 'New password should be different from the old password.' }), 'same');
  assert.equal(classifyPhoneSetPasswordError({ status: 403, code: 'session_not_found' }), 'sessionExpired');
  assert.equal(classifyPhoneSetPasswordError({ status: 401, code: 'reauthentication_needed' }), 'sessionExpired');
  assert.equal(classifyPhoneSetPasswordError({ status: 429, code: 'over_request_rate_limit' }), 'rateLimited');
  assert.equal(classifyPhoneSetPasswordError({ status: 500, message: 'boom' }), 'unavailable');
  assert.equal(classifyPhoneSetPasswordError(undefined), 'unavailable');
});

test('the password setup record survives a reload only for a valid, recent verification', () => {
  const now = 1_800_000_000_000;
  const storage = memoryStorage();
  writePhonePasswordSetupState(storage, { phone: '13812345678', newAccount: true, verifiedAt: now });
  assert.deepEqual(readPhonePasswordSetupState(storage, now + 60_000), { phone: '13812345678', newAccount: true, verifiedAt: now });
  assert.equal(readPhonePasswordSetupState(storage, now + PHONE_PASSWORD_SETUP_MAX_AGE_MS + 1), null, 'an abandoned verification expires');
  assert.equal(storage.data.has(PHONE_PASSWORD_SETUP_STORAGE_KEY), false);

  for (const raw of [
    'not json',
    JSON.stringify({ phone: '12345', newAccount: true, verifiedAt: now }),
    JSON.stringify({ phone: '13812345678', newAccount: 'yes', verifiedAt: now }),
    JSON.stringify({ phone: '13812345678', newAccount: false }),
  ]) {
    const broken = memoryStorage({ [PHONE_PASSWORD_SETUP_STORAGE_KEY]: raw });
    assert.equal(readPhonePasswordSetupState(broken, now), null, raw);
    assert.equal(broken.data.has(PHONE_PASSWORD_SETUP_STORAGE_KEY), false, 'malformed records are dropped');
  }
  assert.equal(readPhonePasswordSetupState(null, now), null);

  writePhonePasswordSetupState(storage, { phone: '13812345678', newAccount: false, verifiedAt: now });
  clearPhonePasswordSetupState(storage);
  assert.equal(readPhonePasswordSetupState(storage, now), null);

  const throwing = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); }, removeItem() { throw new Error('denied'); } };
  assert.equal(readPhonePasswordSetupState(throwing, now), null);
  assert.doesNotThrow(() => writePhonePasswordSetupState(throwing, { phone: '13812345678', newAccount: true, verifiedAt: now }));
  assert.doesNotThrow(() => clearPhonePasswordSetupState(throwing));
});

test('password setup uses the same minimum length and messages as email sign-up', () => {
  assert.equal(AUTH_PASSWORD_MIN_LENGTH, 6);
  assert.deepEqual(validatePasswordSetup({ password: '', confirm: '' }), { password: 'passwordRequired', confirm: 'confirmRequired' });
  assert.deepEqual(validatePasswordSetup({ password: '12345', confirm: '12345' }), { password: 'passwordTooShort' });
  assert.deepEqual(validatePasswordSetup({ password: '123456', confirm: '' }), { confirm: 'confirmRequired' });
  assert.deepEqual(validatePasswordSetup({ password: '123456', confirm: '123457' }), { confirm: 'passwordMismatch' });
  assert.deepEqual(validatePasswordSetup({ password: '123456', confirm: '123456' }), {});
  // Email sign-up keeps its rule.
  assert.equal(validateAuthForm({ mode: 'signup', email: 'a@b.co', password: '12345', confirm: '12345', acceptTerms: true, ageConfirmed: true }).errors.password, 'passwordTooShort');
  assert.equal(validateAuthForm({ mode: 'signin', email: 'a@b.co', password: '12345', confirm: '', acceptTerms: false, ageConfirmed: false }).errors.password, undefined);
});

test('phone password copy is Keyvo Chinese and never echoes provider wording', () => {
  for (const kind of ['passwordInvalid', 'passwordRateLimited', 'passwordUnavailable', 'passwordWeak', 'passwordSame', 'passwordSessionExpired', 'passwordSetupUnavailable', 'passwordSetupRateLimited'] as const) {
    assert.match(zh.auth.phone.feedback[kind], /[一-鿿]/, `${kind} has Chinese copy`);
    assert.doesNotMatch(zh.auth.phone.feedback[kind], /supabase|gotrue|invalid login|token/i, kind);
  }
});

test('phone password forms and hooks keep Supabase calls in the hooks and never import server code', () => {
  const forms = ['LoginPhoneSignInForm.tsx', 'LoginPhonePasswordSetupForm.tsx', 'LoginPhoneNumberField.tsx'];
  for (const file of forms) {
    const source = readFileSync(`${LOGIN}/_components/${file}`, 'utf8');
    assert.match(source, /^'use client';/, `${file} is a client component`);
    assert.doesNotMatch(source, /supabase/i, `${file} does not talk to Supabase`);
    assert.doesNotMatch(source, /process\.env/, `${file} reads no build flags`);
  }
  for (const file of ['useLoginPhonePasswordSignIn.ts', 'useLoginPhonePasswordSetup.ts', 'useLoginPhoneAuth.ts']) {
    const source = readFileSync(`${LOGIN}/_hooks/${file}`, 'utf8');
    assert.match(source, /^'use client';/, `${file} is a client hook`);
    assert.match(source, /from '@\/lib\/supabaseClientLoader'/, `${file} loads the browser client through the shared loader`);
    assert.doesNotMatch(source, /@\/server\//, `${file} does not import server modules`);
  }
  const phoneHookSource = readFileSync(`${LOGIN}/_hooks/useLoginPhoneAuth.ts`, 'utf8');
  assert.match(phoneHookSource, /authRedirectHoldRef/, 'the redirect hold is owned by the phone hook and passed from the controller');
  assert.match(phoneHookSource, /useLoginPhonePasswordSignIn\(/);
  assert.match(phoneHookSource, /useLoginPhonePasswordSetup\(/);
  const controllerSource = readFileSync(`${LOGIN}/_hooks/useLoginPageController.ts`, 'utf8');
  assert.match(controllerSource, /if \(authRedirectHoldRef\.current \|\| authNavigationStartedRef\.current\) return;/, 'a held redirect is ignored by every caller');
  assert.ok(phoneHookSource.split('\n').length <= 480, 'the phone orchestrator stays a readable size');
});
