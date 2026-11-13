import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import zh from '../frontend/messages/zh.json';
import {
  PHONE_COOLDOWN_STORAGE_KEY,
  PHONE_RESEND_COOLDOWN_SECONDS,
  classifyPhoneSendError,
  classifyPhoneVerifyError,
  isNewPhoneAccount,
  isPhoneLoginEnabled,
  isValidMainlandMobile,
  maskMainlandMobile,
  normalizeMainlandMobile,
  readPhoneOtpState,
  remainingCooldownSeconds,
  sanitizeOtpInput,
  toMainlandE164,
  writePhoneOtpState,
} from '../frontend/app/(core)/login/_lib/login-phone';
import { PHONE_PASSWORD_SETUP_STORAGE_KEY } from '../frontend/app/(core)/login/_lib/login-phone-password';
import { bundleClientFlow, createClientFlowDom } from './helpers/client-flow-dom';
import { deferred } from './helpers/auth-legal-client-fixture';

const phoneCopy = zh.auth.phone;

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
}

test('phone login flag is off unless NEXT_PUBLIC_PHONE_LOGIN_ENABLED is explicitly on', () => {
  for (const value of [undefined, '', 'false', '0', 'off', 'no', 'enabled?']) assert.equal(isPhoneLoginEnabled(value), false, String(value));
  for (const value of ['1', 'true', 'TRUE', ' yes ', 'on']) assert.equal(isPhoneLoginEnabled(value), true, value);
  const controller = readFileSync('frontend/app/(core)/login/_hooks/useLoginPageController.ts', 'utf8');
  const lib = readFileSync('frontend/app/(core)/login/_lib/login-phone.ts', 'utf8');
  // Next inlines NEXT_PUBLIC_* only for the literal member expression.
  assert.match(lib, /process\.env\.NEXT_PUBLIC_PHONE_LOGIN_ENABLED/);
  assert.match(controller, /const PHONE_LOGIN_ENABLED = isPhoneLoginEnabled\(\)/);
  assert.match(readFileSync('Dockerfile', 'utf8'), /ARG NEXT_PUBLIC_PHONE_LOGIN_ENABLED=false/);
  assert.match(readFileSync('Dockerfile', 'utf8'), /NEXT_PUBLIC_PHONE_LOGIN_ENABLED=\$NEXT_PUBLIC_PHONE_LOGIN_ENABLED/);
  assert.match(readFileSync('.env.production.example', 'utf8'), /^NEXT_PUBLIC_PHONE_LOGIN_ENABLED=false$/m);
  assert.match(readFileSync('.github/workflows/docker-build-push.yml', 'utf8'), /NEXT_PUBLIC_PHONE_LOGIN_ENABLED=\$\{\{ vars\.NEXT_PUBLIC_PHONE_LOGIN_ENABLED \|\| 'false' \}\}/);
});

test('only mainland China mobile numbers are accepted and sent as +86 E.164', () => {
  for (const valid of ['13812345678', '19912345678', '138 1234 5678', '138-1234-5678', '+8613812345678', '8613812345678', '008613812345678']) {
    assert.equal(isValidMainlandMobile(valid), true, valid);
    assert.equal(normalizeMainlandMobile(valid).length, 11, valid);
    assert.equal(toMainlandE164(valid), `+86${normalizeMainlandMobile(valid)}`);
  }
  for (const invalid of ['', '1381234567', '138123456789', '12812345678', '23812345678', '+85291234567', '+1 415 555 0100', 'abc', '1381234567x']) {
    assert.equal(isValidMainlandMobile(invalid), false, invalid);
  }
  assert.equal(maskMainlandMobile('13812345678'), '138****5678');
  assert.equal(maskMainlandMobile('bogus'), '***');
  assert.equal(sanitizeOtpInput(' 12a3-45 678 '), '123456');
});

test('resend cooldown survives a reload through sessionStorage and expires cleanly', () => {
  const now = 1_800_000_000_000;
  const storage = memoryStorage();
  writePhoneOtpState(storage, { phone: '13812345678', sentAt: now, cooldownUntil: now + 60_000 });
  assert.deepEqual(readPhoneOtpState(storage, now + 15_000), { phone: '13812345678', sentAt: now, cooldownUntil: now + 60_000 });
  assert.equal(remainingCooldownSeconds(now + 60_000, now + 15_000), 45);
  assert.equal(remainingCooldownSeconds(now + 60_000, now + 60_001), 0);
  assert.equal(remainingCooldownSeconds(null, now), 0);
  // A forged far-future value never blocks for more than the cooldown.
  assert.equal(remainingCooldownSeconds(now + 3_600_000, now), PHONE_RESEND_COOLDOWN_SECONDS);
  assert.equal(readPhoneOtpState(storage, now + 11 * 60_000), null, 'state older than the code lifetime is dropped');
  assert.equal(storage.data.has(PHONE_COOLDOWN_STORAGE_KEY), false);
  for (const raw of ['not json', '{"phone":"12345","sentAt":1,"cooldownUntil":2}', JSON.stringify({ phone: '13812345678', sentAt: now, cooldownUntil: now + 3_600_000 })]) {
    const broken = memoryStorage({ [PHONE_COOLDOWN_STORAGE_KEY]: raw });
    assert.equal(readPhoneOtpState(broken, now), null, raw);
  }
  assert.equal(readPhoneOtpState(null, now), null);
  const throwing = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); }, removeItem() {} };
  assert.equal(readPhoneOtpState(throwing, now), null);
  assert.doesNotThrow(() => writePhoneOtpState(throwing, { phone: '13812345678', sentAt: now, cooldownUntil: now }));
});

test('Supabase send errors map to specific localized feedback without provider details', () => {
  assert.equal(classifyPhoneSendError({ status: 429, code: 'over_sms_send_rate_limit', message: 'For security purposes…' }), 'rateLimited');
  assert.equal(classifyPhoneSendError({ status: 429, message: 'hook said slow down' }), 'rateLimited');
  assert.equal(classifyPhoneSendError({ status: 422, code: 'signup_disabled' }), 'signupDisabled');
  assert.equal(classifyPhoneSendError({ status: 422, code: 'otp_disabled', message: 'Signups not allowed for otp' }), 'signupDisabled');
  assert.equal(classifyPhoneSendError({ status: 400, code: 'phone_provider_disabled' }), 'phoneDisabled');
  assert.equal(classifyPhoneSendError({ status: 400, message: 'Unsupported phone provider' }), 'phoneDisabled');
  assert.equal(classifyPhoneSendError({ status: 400, code: 'validation_failed', message: 'Invalid phone number format' }), 'invalidPhone');
  assert.equal(classifyPhoneSendError({ status: 500, code: 'sms_send_failed', message: 'Error sending sms: InvalidAccessKeyId' }), 'providerUnavailable');
  assert.equal(classifyPhoneSendError({ status: 500, code: 'hook_timeout' }), 'providerUnavailable');
  assert.equal(classifyPhoneSendError(new Error('network')), 'providerUnavailable');
  assert.equal(classifyPhoneSendError(null), 'providerUnavailable');
  for (const kind of ['rateLimited', 'signupDisabled', 'phoneDisabled', 'invalidPhone', 'providerUnavailable'] as const) {
    assert.equal(typeof phoneCopy.feedback[kind], 'string');
    assert.match(phoneCopy.feedback[kind], /[一-鿿]/, `${kind} has Chinese copy`);
  }
});

test('Supabase verify errors distinguish wrong/expired codes from throttling and outages', () => {
  assert.equal(classifyPhoneVerifyError({ status: 403, code: 'otp_expired', message: 'Token has expired or is invalid' }), 'codeInvalid');
  assert.equal(classifyPhoneVerifyError({ status: 400, message: 'Invalid token' }), 'codeInvalid');
  assert.equal(classifyPhoneVerifyError({ status: 429, code: 'over_request_rate_limit' }), 'rateLimited');
  assert.equal(classifyPhoneVerifyError({ status: 422, code: 'signup_disabled' }), 'signupDisabled');
  assert.equal(classifyPhoneVerifyError({ status: 500, message: 'Database error' }), 'unavailable');
  assert.equal(classifyPhoneVerifyError(undefined), 'unavailable');
});

test('consents are recorded only for an account created by this code', () => {
  const now = Date.parse('2026-11-13T10:00:00Z');
  assert.equal(isNewPhoneAccount({ created_at: '2026-11-13T09:58:00Z' }, now), true);
  assert.equal(isNewPhoneAccount({ created_at: '2026-10-01T00:00:00Z' }, now), false);
  assert.equal(isNewPhoneAccount({ created_at: null }, now), false);
  assert.equal(isNewPhoneAccount(null, now), false);
});

const boundaries = {
  'next/navigation': 'export const useRouter=()=>({replace(){},push(){},back(){}});',
  '@/lib/analytics-client': 'export const dispatchAnalyticsEvent=(e)=>{(window.events??=[]).push(e)};export const persistPendingAnalyticsEvent=(e,p)=>{(window.events??=[]).push(e+":"+(p&&p.method))};',
  '@/lib/analytics/commercial-client': 'export const resolveBrowserCommercialAnalyticsAuthContext=async()=>{};',
  '@/lib/last-known': 'export const writeLastKnownUserId=(id)=>{window.lastUser=id};',
  '@/lib/supabaseClientLoader': 'export const loadSupabaseClient=()=>window.loadClient();',
  './useLoginNextTarget': "export const useLoginNextTarget=()=>({authRedirectOrigin:'https://example.invalid',nextPath:'/app/image?draft=1',nextPathReady:true,persistNextTarget(t){window.redirectedTo=t},safeNextPath:'/app/image?draft=1'});",
  './useLoginAuthenticatedRedirect': 'export const useLoginAuthenticatedRedirect=({completeAuthenticatedRedirect})=>{window.completeRedirect=completeAuthenticatedRedirect;return {redirectFromExistingBrowserSession(){}};};',
  './useLoginAuthHashSession': 'export const useLoginAuthHashSession=()=>{};',
  './useLoginOAuthCodeExchange': 'export const useLoginOAuthCodeExchange=()=>{};',
};

const bundle = bundleClientFlow(`import React,{act}from'react';import{createRoot}from'react-dom/client';import{useLoginPageController}from'./app/(core)/login/_hooks/useLoginPageController';import{LoginAuthSurface}from'./app/(core)/login/_components/LoginAuthSurface';import{I18nProvider}from'@/lib/i18n/I18nProvider';window.IS_REACT_ACT_ENVIRONMENT=true;function Page(){const state=useLoginPageController({initialMode:window.mode,initialLocale:'zh',initialMcpConnection:false});window.controller=state;return <I18nProvider locale="zh" dictionary={{}} fallback={{}}><LoginAuthSurface {...state} isMcpStaging={false}/></I18nProvider>;}const root=createRoot(document.getElementById('root'));window.fx={act,render:()=>root.render(<Page/>),unmount:()=>root.unmount()};`, boundaries);

async function mount({ enabled = true, mode = 'signin', stored, setup }: { enabled?: boolean; mode?: string; stored?: object; setup?: object } = {}) {
  const dom = createClientFlowDom('/login');
  const w = dom.window as any;
  if (enabled) w.process.env.NEXT_PUBLIC_PHONE_LOGIN_ENABLED = 'true';
  if (stored) w.sessionStorage.setItem(PHONE_COOLDOWN_STORAGE_KEY, JSON.stringify(stored));
  if (setup) w.sessionStorage.setItem(PHONE_PASSWORD_SETUP_STORAGE_KEY, JSON.stringify(setup));
  const sends: Array<{ input: any; reply: ReturnType<typeof deferred<any>> }> = [];
  const verifies: Array<{ input: any; reply: ReturnType<typeof deferred<any>> }> = [];
  const passwords: Array<{ input: any; reply: ReturnType<typeof deferred<any>> }> = [];
  const updates: Array<{ input: any; reply: ReturnType<typeof deferred<any>> }> = [];
  const signOuts: any[] = [];
  const signUps: any[] = [];
  const consents: any[] = [];
  const client = { auth: {
    signInWithOtp: (input: any) => { const reply = deferred<any>(); sends.push({ input, reply }); return reply.promise; },
    verifyOtp: (input: any) => { const reply = deferred<any>(); verifies.push({ input, reply }); return reply.promise; },
    signInWithPassword: (input: any) => { const reply = deferred<any>(); passwords.push({ input, reply }); return reply.promise; },
    updateUser: (input: any) => { const reply = deferred<any>(); updates.push({ input, reply }); return reply.promise; },
    signUp: (input: any) => { signUps.push(input); return new Promise(() => {}); },
    signOut: async (options: any) => { signOuts.push(options); return { error: null }; },
  } };
  w.mode = mode; w.loadClient = async () => client;
  w.fetch = async (url: string, init: any) => { consents.push({ url, body: JSON.parse(init.body) }); return { ok: true, json: async () => ({ ok: true }) }; };
  w.eval(await bundle);
  await w.fx.act(async () => w.fx.render());
  const $ = (selector: string) => w.document.querySelector(selector);
  const text = () => w.document.querySelector('.videoai-auth-card')!.textContent as string;
  const alerts = () => [...w.document.querySelectorAll('[role=alert]')].map((node: any) => node.textContent).join(' ');
  const act = (fn: () => unknown) => w.fx.act(async () => { await fn(); });
  const flush = () => w.fx.act(async () => { await new Promise((resolve) => w.setTimeout(resolve, 0)); });
  const type = (selector: string, value: string) => act(() => {
    const input = $(selector)!;
    Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype, 'value')!.set!.call(input, value);
    input.dispatchEvent(new w.Event('input', { bubbles: true }));
  });
  const methodButton = (label: string) => [...w.document.querySelectorAll('[role=group] button')].find((b: any) => b.textContent === label) as any;
  const submit = (selector = '[data-testid=phone-auth-form]') => act(() => $(selector)!.dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true })));
  const consent = () => act(() => { const boxes = $('[data-testid=phone-auth-form]')!.querySelectorAll('input[type=checkbox]'); boxes[0].click(); boxes[1].click(); });
  const button = (label: string) => [...w.document.querySelectorAll('button')].find((b: any) => b.textContent === label) as any;
  const setPassword = async (password: string, confirm: string) => {
    await type('#auth-new-password', password);
    await type('#auth-new-password-confirm', confirm);
    await submit('[data-testid=phone-password-setup-form]');
  };
  return { w, $, text, alerts, act, flush, type, methodButton, button, submit, consent, setPassword, sends, verifies, passwords, updates, signOuts, signUps, consents,
    async dispose() { await w.fx.act(async () => w.fx.unmount()); w.close(); } };
}

const PASSWORD_FORM = '[data-testid=phone-password-form]';
const SETUP_FORM = '[data-testid=phone-password-setup-form]';
const REDIRECT_TARGET = '/app/image?draft=1';

test('phone sign-in is password first; the SMS code step still validates the number and consent before any SMS', async () => {
  const f = await mount();
  try {
    // Returning users sign in with phone + password. The SMS code is a separate step.
    assert.equal(f.w.controller.phoneAuth.method, 'phone');
    assert.equal(f.w.controller.phoneAuth.step, 'signin');
    assert.equal(f.methodButton(phoneCopy.methodPhone), undefined);
    assert.equal(f.$('#auth-email'), null, 'email form is replaced by the phone form');
    assert.ok(f.$(PASSWORD_FORM));
    assert.equal(f.$('label[for=auth-phone]')!.textContent, phoneCopy.fields.phone);
    assert.match(f.text(), /\+86/);
    assert.equal(f.$('#auth-phone')!.getAttribute('autocomplete'), 'tel-national');
    assert.equal(f.$('#auth-phone-password')!.getAttribute('autocomplete'), 'current-password');

    await f.submit(PASSWORD_FORM);
    assert.equal(f.$('#auth-phone-error')!.textContent, phoneCopy.validation.phoneRequired);
    await f.type('#auth-phone', '12812345678');
    await f.submit(PASSWORD_FORM);
    assert.equal(f.$('#auth-phone-error')!.textContent, phoneCopy.validation.phoneInvalid);
    assert.equal(f.$('#auth-phone')!.getAttribute('aria-invalid'), 'true');
    assert.match(f.$('#auth-phone')!.getAttribute('aria-describedby')!, /auth-phone-error/);
    await f.type('#auth-phone', '138 1234 5678');
    await f.submit(PASSWORD_FORM);
    assert.equal(f.$('#auth-phone-password-error')!.textContent, zh.auth.validation.passwordRequired);
    assert.equal(f.passwords.length, 0, 'no password request without a password');

    // The code step keeps its consent requirement: no SMS before terms and age are confirmed.
    await f.act(() => f.$('[data-testid=phone-use-code]')!.click());
    assert.equal(f.w.controller.phoneAuth.step, 'code');
    assert.equal(f.$('#auth-phone')!.value, '138 1234 5678', 'the number carries over to the code step');
    await f.submit();
    assert.equal(f.$('#auth-phone-terms-error')!.textContent, zh.auth.validation.termsRequired);
    assert.equal(f.sends.length, 0, 'no SMS before validation and consent');
  } finally { await f.dispose(); }
});

test('phone + password sign-in calls signInWithPassword with E.164, sends no SMS and redirects as the phone method', async () => {
  const f = await mount();
  try {
    await f.type('#auth-phone', '138 1234 5678');
    await f.type('#auth-phone-password', 'secret-6');
    await f.submit(PASSWORD_FORM);
    assert.equal(f.passwords.length, 1);
    assert.deepEqual(JSON.parse(JSON.stringify(f.passwords[0].input)), { phone: '+8613812345678', password: 'secret-6' });
    assert.equal(f.sends.length, 0, 'password sign-in does not request an SMS');
    const user = { id: 'phone-password-user', app_metadata: {} };
    await f.act(() => f.passwords[0].reply.resolve({ data: { user, session: { access_token: 'synthetic', user } }, error: null }));
    assert.equal(f.w.redirectedTo, REDIRECT_TARGET, 'same sanitized next target as the other login paths');
    assert.equal(f.w.lastUser, 'phone-password-user');
    assert.ok(f.w.events.includes('login_completed:phone'));
    assert.equal(f.consents.length, 0, 'signing in records no sign-up consent');
  } finally { await f.dispose(); }
});

test('password sign-in errors map to localized copy without provider details', async () => {
  const f = await mount();
  try {
    await f.type('#auth-phone', '13812345678');
    await f.type('#auth-phone-password', 'wrong-pass');
    await f.submit(PASSWORD_FORM);
    await f.act(() => f.passwords[0].reply.resolve({ data: { user: null, session: null }, error: { status: 400, code: 'invalid_credentials', message: 'Invalid login credentials' } }));
    assert.ok(f.alerts().includes(phoneCopy.feedback.passwordInvalid), 'wrong number or password uses one neutral message');
    assert.doesNotMatch(f.alerts(), /Invalid login credentials/);
    assert.equal(f.w.redirectedTo, undefined);

    await f.submit(PASSWORD_FORM);
    await f.act(() => f.passwords[1].reply.resolve({ data: { user: null, session: null }, error: { status: 429, code: 'over_request_rate_limit', message: 'For security purposes, retry in 20 seconds' } }));
    assert.ok(f.alerts().includes(phoneCopy.feedback.passwordRateLimited));
    assert.doesNotMatch(f.alerts(), /retry in 20 seconds/);

    await f.submit(PASSWORD_FORM);
    await f.act(() => f.passwords[2].reply.resolve({ data: { user: null, session: null }, error: { status: 500, message: 'Database error querying schema' } }));
    assert.ok(f.alerts().includes(phoneCopy.feedback.passwordUnavailable));
    assert.doesNotMatch(f.alerts(), /Database error/);
    assert.equal(f.w.redirectedTo, undefined);
  } finally { await f.dispose(); }
});

test('sending a code starts a persisted 60 s cooldown and maps rate limits', async () => {
  const f = await mount();
  try {
    await f.act(() => f.$('[data-testid=phone-use-code]')!.click());
    await f.type('#auth-phone', '13812345678');
    await f.consent();
    await f.submit();
    await f.submit();
    assert.equal(f.sends.length, 1, 'one request in flight');
    assert.deepEqual(JSON.parse(JSON.stringify(f.sends[0].input)), { phone: '+8613812345678', options: { shouldCreateUser: true, data: { locale: 'zh' } } });
    assert.equal(f.$('[role=status]')!.textContent, phoneCopy.feedback.sending);
    await f.act(() => f.sends[0].reply.resolve({ data: {}, error: null }));
    assert.match(f.$('[role=status]')!.textContent, /\+86 138\*\*\*\*5678/);
    assert.ok(f.$('#auth-otp'), 'code step is shown');
    assert.equal(f.$('#auth-otp')!.getAttribute('autocomplete'), 'one-time-code');
    const resend = f.$('[data-testid=phone-resend]')!;
    assert.equal(resend.disabled, true);
    assert.match(resend.textContent, /^(60|59) 秒后重新获取$/);
    const stored = JSON.parse(f.w.sessionStorage.getItem(PHONE_COOLDOWN_STORAGE_KEY));
    assert.equal(stored.phone, '13812345678');
    assert.ok(stored.cooldownUntil - Date.now() > 55_000 && stored.cooldownUntil - Date.now() <= 60_000);
  } finally { await f.dispose(); }

  const limited = await mount();
  try {
    await limited.act(() => limited.$('[data-testid=phone-use-code]')!.click());
    await limited.type('#auth-phone', '13812345678');
    await limited.consent();
    await limited.submit();
    await limited.act(() => limited.sends[0].reply.resolve({ data: {}, error: { status: 429, code: 'over_sms_send_rate_limit', message: 'For security purposes, you can only request this after 47 seconds.' } }));
    assert.match(limited.alerts(), new RegExp(phoneCopy.feedback.rateLimited));
    assert.doesNotMatch(limited.alerts(), /security purposes/);
    assert.equal(limited.$('#auth-otp'), null);
    await limited.submit();
    assert.equal(limited.sends.length, 1, 'local back-off after a 429');
  } finally { await limited.dispose(); }
});

test('a reload during the cooldown restores the number, code step and countdown', async () => {
  const now = Date.now();
  const f = await mount({ stored: { phone: '13912345678', sentAt: now - 20_000, cooldownUntil: now + 40_000 } });
  try {
    assert.equal(f.w.controller.phoneAuth.step, 'code');
    assert.equal(f.w.controller.phoneAuth.method, 'phone');
    assert.equal(f.$('#auth-phone')!.value, '13912345678');
    assert.ok(f.$('#auth-otp'));
    const resend = f.$('[data-testid=phone-resend]')!;
    assert.equal(resend.disabled, true);
    assert.match(resend.textContent, /^(40|39) 秒后重新获取$/);
  } finally { await f.dispose(); }
});

test('wrong codes count down the attempts; a verified code opens the required password step before any redirect', async () => {
  const now = Date.now();
  const f = await mount({ stored: { phone: '13912345678', sentAt: now - 5_000, cooldownUntil: now + 55_000 } });
  try {
    await f.consent();
    await f.type('#auth-otp', '12a34');
    assert.equal(f.$('#auth-otp')!.value, '1234');
    await f.submit();
    assert.equal(f.$('#auth-otp-error')!.textContent, phoneCopy.validation.codeRequired);
    assert.equal(f.verifies.length, 0);

    await f.type('#auth-otp', '111111');
    await f.submit();
    assert.deepEqual(JSON.parse(JSON.stringify(f.verifies[0].input)), { phone: '+8613912345678', token: '111111', type: 'sms' });
    await f.act(() => f.verifies[0].reply.resolve({ data: { session: null, user: null }, error: { status: 403, code: 'otp_expired', message: 'Token has expired or is invalid' } }));
    assert.match(f.alerts(), /验证码错误或已过期，还可尝试 4 次。/);
    assert.equal(f.$('#auth-otp')!.value, '');

    await f.type('#auth-otp', '222222');
    await f.submit();
    await f.act(() => f.verifies[1].reply.resolve({ data: { session: null, user: null }, error: { status: 429, code: 'over_request_rate_limit' } }));
    assert.match(f.alerts(), new RegExp(phoneCopy.feedback.verifyRateLimited));

    await f.type('#auth-otp', '333333');
    await f.submit();
    const user = { id: 'synthetic-phone-user', created_at: '2020-01-01T00:00:00Z', app_metadata: {} };
    await f.act(() => f.verifies[2].reply.resolve({ data: { session: { access_token: 'synthetic', user }, user }, error: null }));
    // A verified code is not a finished sign-in: the password step comes first, and the page must not redirect.
    assert.equal(f.w.controller.phoneAuth.step, 'setPassword');
    assert.ok(f.$(SETUP_FORM));
    assert.equal(f.w.redirectedTo, undefined);
    assert.equal(f.consents.length, 0, 'an existing account does not re-record sign-up consent');
    assert.equal(f.w.sessionStorage.getItem(PHONE_COOLDOWN_STORAGE_KEY), null);
    assert.ok(f.w.sessionStorage.getItem(PHONE_PASSWORD_SETUP_STORAGE_KEY), 'the password step survives a reload');
    assert.equal(f.updates.length, 0);

    // Code login is recovery: the password that was forgotten is replaced by the one set here.
    await f.setPassword('new-secret', 'new-secret');
    assert.deepEqual(JSON.parse(JSON.stringify(f.updates[0].input)), { password: 'new-secret' });
    await f.act(() => f.updates[0].reply.resolve({ data: { user }, error: null }));
    assert.equal(f.w.redirectedTo, REDIRECT_TARGET, 'same sanitized next target as password login');
    assert.equal(f.w.lastUser, 'synthetic-phone-user');
    assert.ok(f.w.events.includes('login_completed:phone'), 'an existing account is a login, not a sign-up');
    assert.equal(f.w.sessionStorage.getItem(PHONE_PASSWORD_SETUP_STORAGE_KEY), null);
  } finally { await f.dispose(); }
});

test('a new phone account records sign-up consents, sets a password, and only then completes sign-up', async () => {
  const now = Date.now();
  const f = await mount({ mode: 'signup', stored: { phone: '13912345678', sentAt: now - 5_000, cooldownUntil: now + 55_000 } });
  try {
    assert.equal(f.w.controller.phoneAuth.step, 'code', 'a pending code restores the code step, not password sign-in');
    await f.consent();
    await f.type('#auth-otp', '123456');
    await f.submit();
    const user = { id: 'synthetic-new-user', created_at: new Date(now - 6_000).toISOString(), app_metadata: {} };
    await f.act(() => f.verifies[0].reply.resolve({ data: { session: { access_token: 'synthetic', user }, user }, error: null }));
    assert.equal(f.consents.length, 1);
    assert.deepEqual(f.consents[0], { url: '/api/legal/consents', body: { userId: 'synthetic-new-user', ageConfirmed: true, cookiesAccepted: true, locale: 'zh', source: 'signup' } });
    assert.equal(f.w.redirectedTo, undefined, 'sign-up is not complete until a password is set');
    assert.equal(f.w.controller.phoneAuth.step, 'setPassword');
    assert.ok(!(f.w.events ?? []).includes('sign_up_completed:phone'));

    await f.setPassword('secret-6', 'secret-6');
    assert.deepEqual(JSON.parse(JSON.stringify(f.updates[0].input)), { password: 'secret-6' });
    await f.act(() => f.updates[0].reply.resolve({ data: { user }, error: null }));
    assert.equal(f.w.redirectedTo, REDIRECT_TARGET);
    assert.ok(f.w.events.includes('sign_up_completed:phone'));
    assert.ok(!f.w.events.includes('login_completed:phone'));
  } finally { await f.dispose(); }

  const g = await mount({ stored: { phone: '13912345678', sentAt: now - 5_000, cooldownUntil: now + 55_000 } });
  try {
    await g.consent();
    for (let i = 0; i < 5; i += 1) {
      await g.type('#auth-otp', '000000');
      await g.submit();
      await g.act(() => g.verifies[i].reply.resolve({ data: { session: null }, error: { status: 403, code: 'otp_expired' } }));
    }
    assert.match(g.alerts(), new RegExp(phoneCopy.feedback.attemptsExhausted));
    assert.equal(g.$('#auth-otp')!.disabled, true);
    assert.equal(g.$('[data-testid=phone-auth-form] button[type=submit]')!.disabled, true);
    assert.equal(g.verifies.length, 5);
  } finally { await g.dispose(); }
});

test('password setup enforces the shared length rule and maps update errors without provider details', async () => {
  const now = Date.now();
  const f = await mount({ setup: { phone: '13912345678', newAccount: false, verifiedAt: now } });
  try {
    assert.equal(f.w.controller.phoneAuth.step, 'setPassword');
    assert.equal(f.$('.videoai-auth-card h1')!.textContent, phoneCopy.passwordSetup.title);
    assert.ok(f.$('[data-testid=phone-password-setup-cancel]'), 'the setup step can be cancelled');

    await f.setPassword('12345', '12345');
    assert.equal(f.updates.length, 0, 'no update below the minimum length');
    assert.equal(f.$('#auth-new-password-error')!.textContent, zh.auth.validation.passwordTooShort);
    assert.equal(f.$('#auth-new-password')!.getAttribute('aria-invalid'), 'true');

    await f.setPassword('123456', '123457');
    assert.equal(f.updates.length, 0);
    assert.equal(f.$('#auth-new-password-confirm-error')!.textContent, zh.auth.validation.passwordMismatch);

    await f.setPassword('123456', '123456');
    assert.equal(f.updates.length, 1);
    await f.act(() => f.updates[0].reply.resolve({ data: { user: null }, error: { status: 422, code: 'weak_password', message: 'Password is known to be weak and easy to guess' } }));
    assert.ok(f.alerts().includes(phoneCopy.feedback.passwordWeak));
    assert.doesNotMatch(f.alerts(), /known to be weak/);

    await f.submit(SETUP_FORM);
    await f.act(() => f.updates[1].reply.resolve({ data: { user: null }, error: { status: 422, code: 'same_password', message: 'New password should be different from the old password.' } }));
    assert.ok(f.alerts().includes(phoneCopy.feedback.passwordSame));
    assert.doesNotMatch(f.alerts(), /different from the old password/);

    await f.submit(SETUP_FORM);
    await f.act(() => f.updates[2].reply.resolve({ data: { user: null }, error: { status: 500, message: 'upstream exploded' } }));
    assert.ok(f.alerts().includes(phoneCopy.feedback.passwordSetupUnavailable));
    assert.doesNotMatch(f.alerts(), /upstream exploded/);
    assert.equal(f.w.controller.phoneAuth.step, 'setPassword', 'a retryable failure keeps the step');
    assert.equal(f.w.redirectedTo, undefined);

    await f.submit(SETUP_FORM);
    await f.act(() => f.updates[3].reply.resolve({ data: { user: null }, error: { status: 403, code: 'session_not_found', message: 'Auth session missing' } }));
    assert.equal(f.w.controller.phoneAuth.step, 'signin', 'an expired verification starts again from sign-in');
    assert.ok(f.alerts().includes(phoneCopy.feedback.passwordSessionExpired));
    assert.equal(f.w.sessionStorage.getItem(PHONE_PASSWORD_SETUP_STORAGE_KEY), null);
    assert.deepEqual(JSON.parse(JSON.stringify(f.signOuts)), [{ scope: 'local' }]);
    assert.equal(f.w.redirectedTo, undefined);
  } finally { await f.dispose(); }
});

test('a reload after a verified code keeps the password step held; cancel signs out and returns to sign-in', async () => {
  const now = Date.now();
  const f = await mount({ setup: { phone: '13912345678', newAccount: true, verifiedAt: now } });
  try {
    assert.equal(f.w.controller.phoneAuth.step, 'setPassword');
    // The page's own session probe (after a reload the session cookie exists) must not leave the page.
    f.w.completeRedirect(REDIRECT_TARGET, 'synthetic-new-user');
    assert.equal(f.w.redirectedTo, undefined);

    await f.act(() => f.$('[data-testid=phone-password-setup-cancel]')!.click());
    await f.flush();
    assert.equal(f.w.controller.phoneAuth.step, 'signin');
    assert.deepEqual(JSON.parse(JSON.stringify(f.signOuts)), [{ scope: 'local' }]);
    assert.equal(f.w.sessionStorage.getItem(PHONE_PASSWORD_SETUP_STORAGE_KEY), null);
    assert.ok(f.$(PASSWORD_FORM), 'back at phone + password sign-in');

    f.w.completeRedirect(REDIRECT_TARGET, 'synthetic-new-user');
    assert.equal(f.w.redirectedTo, REDIRECT_TARGET, 'the redirect is allowed again once the password step is gone');
  } finally { await f.dispose(); }
});

test('a pending password step wins over a leftover code cooldown after a reload', async () => {
  const now = Date.now();
  const f = await mount({
    setup: { phone: '13912345678', newAccount: true, verifiedAt: now },
    stored: { phone: '13912345678', sentAt: now - 5_000, cooldownUntil: now + 55_000 },
  });
  try {
    assert.equal(f.w.controller.phoneAuth.step, 'setPassword');
    assert.ok(f.$(SETUP_FORM));
  } finally { await f.dispose(); }
});

test('without the flag the login page shows no phone option and keeps the email form', async () => {
  const f = await mount({ enabled: false });
  try {
    assert.equal(f.w.controller.phoneAuth, null);
    assert.equal(f.methodButton(phoneCopy.methodPhone), undefined);
    assert.equal(f.$('#auth-phone'), null);
    assert.ok(f.$('#auth-email'));
    assert.ok(f.$('#auth-password'));
    assert.equal(f.$('[data-testid=login-use-email-account]'), null);
    assert.equal(f.$('[data-testid=login-use-phone]'), null);
    assert.equal(f.$('[data-testid=phone-password-form]'), null);
    assert.equal(f.$('[data-testid=phone-password-setup-form]'), null);
    // Today's page: the email sign-up tab still creates accounts with email + password.
    const signupTab = f.button(zh.auth.tabs.signup);
    assert.ok(signupTab, 'email sign-up tab is offered without the flag');
    await f.act(() => signupTab.click());
    assert.equal(f.w.controller.mode, 'signup');
    assert.ok(f.$('#auth-confirm'), 'sign-up form asks for a password confirmation');
  } finally { await f.dispose(); }
});

const phoneTab = (f: any, label: string) =>
  [...f.w.document.querySelectorAll('[data-testid=phone-mode-tabs] button')].find((b: any) => b.textContent === label) as any;

test('phone tabs: ?mode decides the tab, and switching keeps the number', async () => {
  const up = await mount({ mode: 'signup' });
  try {
    assert.equal(up.w.controller.mode, 'signup');
    assert.equal(up.$('.videoai-auth-card h1')!.textContent, phoneCopy.signup.title);
    assert.equal(phoneTab(up, phoneCopy.tabs.signup).getAttribute('aria-pressed'), 'true');
    assert.equal(phoneTab(up, phoneCopy.tabs.signin).getAttribute('aria-pressed'), 'false');
    assert.ok(up.$('#auth-phone'));
    assert.equal(up.$('#auth-phone-password'), null, 'the 注册 tab has no password field');
    assert.equal(up.$('#auth-phone-hint')!.textContent, phoneCopy.hint);
    assert.equal(up.$('[data-testid=phone-switch-to-signin]')!.textContent, phoneCopy.signup.haveAccount);
    assert.equal(up.button(zh.auth.tabs.signup), undefined, 'no email create-account tab');
    await up.type('#auth-phone', '13812345678');

    await up.act(() => phoneTab(up, phoneCopy.tabs.signin).click());
    assert.equal(up.w.controller.mode, 'signin');
    assert.equal(up.w.controller.phoneAuth.step, 'signin');
    assert.ok(up.$(PASSWORD_FORM));
    assert.equal(up.$('#auth-phone')!.value, '13812345678', 'the number survives the tab switch');
    assert.equal(up.$('#auth-phone-hint'), null, 'the 登录 tab shows no registration hint');
    assert.equal(up.$('.videoai-auth-card h1')!.textContent, phoneCopy.signin.title);

    await up.act(() => phoneTab(up, phoneCopy.tabs.signup).click());
    assert.equal(up.w.controller.mode, 'signup');
    assert.equal(up.$('#auth-phone')!.value, '13812345678');
    assert.equal(up.$('.videoai-auth-card h1')!.textContent, phoneCopy.signup.title);

    // The link in the 注册 footer goes back to the 登录 tab.
    await up.act(() => up.$('[data-testid=phone-switch-to-signin]')!.click());
    assert.equal(up.w.controller.mode, 'signin');
    assert.ok(up.$(PASSWORD_FORM));
  } finally { await up.dispose(); }
});

test('登录 tab shows only password sign-in and its two links, with no stale registration copy', async () => {
  const f = await mount();
  try {
    assert.equal(f.$('.videoai-auth-card h1')!.textContent, phoneCopy.signin.title);
    assert.equal(f.$('.videoai-auth-card header p')!.textContent, phoneCopy.signin.description);
    const text = f.text();
    for (const stale of ['自动创建', '新手机号验证后', '您的生成设置已保存', '在此继续', '新用户？用验证码注册']) {
      assert.ok(!text.includes(stale), `no stale copy: ${stale}`);
    }
    assert.equal(f.$('[data-testid=phone-use-code]')!.textContent, phoneCopy.passwordSignin.forgotPassword);
    assert.equal(f.$('[data-testid=login-use-email-account]')!.textContent, phoneCopy.useEmailAccount);
    assert.equal(f.$('#auth-phone-hint'), null);
    assert.equal(f.$('[data-testid=phone-switch-to-signin]'), null);
  } finally { await f.dispose(); }
});

test('phone-only sign-up: no email sign-up anywhere, existing email accounts keep sign-in and password reset', async () => {
  // ?mode=signup lands on the 注册 tab (phone + SMS), never on an email registration form.
  const f = await mount({ mode: 'signup' });
  try {
    assert.equal(f.w.controller.mode, 'signup');
    assert.ok(f.$('#auth-phone'));
    assert.equal(f.$('#auth-email'), null);
    assert.equal(f.button(zh.auth.tabs.signup), undefined, 'no create-account tab');
    // Email sign-in is reached from the 登录 tab only.
    assert.equal(f.$('[data-testid=login-use-email-account]'), null);
    await f.act(() => phoneTab(f, phoneCopy.tabs.signin).click());
    await f.act(() => f.$('[data-testid=login-use-email-account]')!.click());
    assert.equal(f.w.controller.phoneAuth.method, 'email');
    assert.equal(f.$('#auth-phone'), null);
    assert.ok(f.$('#auth-email'));
    assert.ok(f.$('#auth-password'));
    assert.equal(f.$('#auth-confirm'), null, 'email form is sign-in only');
    assert.equal(f.$('[data-testid=phone-mode-tabs]'), null, 'the email view has no phone tabs');
    assert.equal(f.$('.videoai-auth-card h1')!.textContent, phoneCopy.emailSigninTitle);
    assert.equal(f.$('form button[type=submit]')!.textContent, zh.auth.actions.signin);
    assert.ok(f.button(zh.auth.forgotPassword), 'password reset stays for email accounts');
    await f.type('#auth-email', 'existing@example.invalid');
    await f.type('#auth-password', 'not-the-password');
    await f.act(() => f.$('form')!.dispatchEvent(new f.w.Event('submit', { bubbles: true, cancelable: true })));
    assert.equal(f.passwords.length, 1);
    assert.deepEqual(JSON.parse(JSON.stringify(f.passwords[0].input)), { email: 'existing@example.invalid', password: 'not-the-password' });
    await f.act(() => f.passwords[0].reply.resolve({ data: { user: null, session: null }, error: { status: 400, code: 'invalid_credentials', message: 'Invalid login credentials' } }));
    assert.match(f.alerts(), new RegExp(phoneCopy.emailSigninFailed));
    assert.equal(f.w.controller.signupSuggestion, null, 'no email sign-up suggestion');
    assert.doesNotMatch(f.text(), new RegExp(zh.auth.signupSuggestion.title));
    assert.equal(f.signUps.length, 0);
    await f.act(() => f.button(zh.auth.forgotPassword).click());
    assert.equal(f.w.controller.mode, 'reset');
    assert.ok(f.$('#reset-email'));
    await f.act(() => f.button(zh.auth.links.backToSignIn).click());
    assert.equal(f.w.controller.mode, 'signin');
    assert.ok(f.$('#auth-email'), 'back to the email sign-in form');
    await f.act(() => f.$('[data-testid=login-use-phone]')!.click());
    assert.equal(f.w.controller.phoneAuth.method, 'phone');
    assert.ok(f.$('#auth-phone'));
    assert.equal(f.$('.videoai-auth-card h1')!.textContent, phoneCopy.signin.title);
  } finally { await f.dispose(); }
});

test('forgot-password code view has no tabs and returns to password sign-in', async () => {
  const f = await mount();
  try {
    await f.act(() => f.$('[data-testid=phone-use-code]')!.click());
    assert.equal(f.w.controller.phoneAuth.step, 'code');
    assert.equal(f.w.controller.mode, 'signin');
    assert.equal(f.$('[data-testid=phone-mode-tabs]'), null);
    assert.equal(f.$('.videoai-auth-card h1')!.textContent, phoneCopy.codeSignin.title);
    assert.equal(f.$('.videoai-auth-card header p')!.textContent, phoneCopy.codeSignin.description);
    assert.ok(f.$('[data-testid=phone-auth-form]'));
    await f.act(() => f.$('[data-testid=phone-back-to-password]')!.click());
    assert.equal(f.w.controller.phoneAuth.step, 'signin');
    assert.ok(f.$(PASSWORD_FORM));
  } finally { await f.dispose(); }
});

test('注册 tab: the terms and age checkboxes gate the SMS, and the verified code opens the password step', async () => {
  const f = await mount({ mode: 'signup' });
  try {
    await f.type('#auth-phone', '13812345678');
    await f.submit();
    assert.equal(f.$('#auth-phone-terms-error')!.textContent, zh.auth.validation.termsRequired);
    assert.equal(f.sends.length, 0, 'no SMS before terms and age are confirmed');
    await f.consent();
    await f.submit();
    assert.equal(f.sends.length, 1);
    assert.deepEqual(JSON.parse(JSON.stringify(f.sends[0].input)), { phone: '+8613812345678', options: { shouldCreateUser: true, data: { locale: 'zh' } } });
    await f.act(() => f.sends[0].reply.resolve({ data: {}, error: null }));
    assert.ok(f.$('#auth-otp'), 'code step is shown on the 注册 tab');
    assert.equal(phoneTab(f, phoneCopy.tabs.signup).getAttribute('aria-pressed'), 'true');
    await f.type('#auth-otp', '123456');
    await f.submit();
    const user = { id: 'synthetic-tab-user', created_at: new Date().toISOString(), app_metadata: {} };
    await f.act(() => f.verifies[0].reply.resolve({ data: { session: { access_token: 'synthetic', user }, user }, error: null }));
    assert.equal(f.consents.length, 1, 'sign-up consents are recorded for the new account');
    assert.equal(f.w.controller.phoneAuth.step, 'setPassword');
    assert.equal(f.$('.videoai-auth-card h1')!.textContent, phoneCopy.passwordSetup.title);
    assert.equal(f.$('[data-testid=phone-mode-tabs]'), null, 'the password step has no tabs');
    assert.equal(f.w.redirectedTo, undefined, 'sign-up is not complete before a password is set');
    await f.setPassword('secret-6', 'secret-6');
    await f.act(() => f.updates[0].reply.resolve({ data: { user }, error: null }));
    assert.equal(f.w.redirectedTo, REDIRECT_TARGET);
    assert.ok(f.w.events.includes('sign_up_completed:phone'));
  } finally { await f.dispose(); }
});

test('phone-only sign-up copy exists in every locale', () => {
  for (const locale of ['en', 'es', 'fr', 'zh']) {
    const messages = JSON.parse(readFileSync(`frontend/messages/${locale}.json`, 'utf8'));
    const phone = messages.auth.phone;
    for (const key of ['emailSigninTitle', 'emailSigninDescription', 'useEmailAccount', 'emailSigninFailed', 'backToPassword', 'backToPhone', 'hint']) {
      assert.equal(typeof phone[key], 'string', `${locale} auth.phone.${key}`);
      assert.ok(phone[key].length > 0);
    }
    for (const view of ['signin', 'signup', 'codeSignin']) {
      assert.ok(phone[view].title.length > 0, `${locale} auth.phone.${view}.title`);
      assert.ok(phone[view].description.length > 0, `${locale} auth.phone.${view}.description`);
    }
    assert.ok(phone.signup.haveAccount.length > 0, `${locale} auth.phone.signup.haveAccount`);
    assert.ok(phone.tabs.signin.length > 0 && phone.tabs.signup.length > 0, `${locale} auth.phone.tabs`);
    for (const key of ['submit', 'forgotPassword']) {
      assert.ok(phone.passwordSignin[key].length > 0, `${locale} passwordSignin.${key}`);
    }
    // The 登录 tab no longer offers a registration link, and the signed-out hint no longer promises auto-creation.
    assert.equal(phone.passwordSignin.newUser, undefined, `${locale} passwordSignin.newUser is retired`);
    assert.equal(phone.title, undefined, `${locale} auth.phone.title is retired`);
    assert.equal(phone.description, undefined, `${locale} auth.phone.description is retired`);
    assert.equal(phone.usePhone, undefined, `${locale} auth.phone.usePhone is retired`);
    assert.doesNotMatch(phone.hint, /自动创建|automatically|créer un compte|crear una cuenta|create an account/i, `${locale} hint`);
    for (const key of ['title', 'description', 'hint', 'submit', 'cancel', 'verified']) {
      assert.ok(phone.passwordSetup[key].length > 0, `${locale} passwordSetup.${key}`);
    }
    for (const key of ['passwordSigningIn', 'passwordInvalid', 'passwordRateLimited', 'passwordUnavailable', 'passwordSetupSaving', 'passwordSetupSaved', 'passwordWeak', 'passwordSame', 'passwordSessionExpired', 'passwordSetupUnavailable', 'passwordSetupRateLimited'] as const) {
      assert.ok(phone.feedback[key].length > 0, `${locale} feedback.${key}`);
    }
    assert.doesNotMatch(phone.feedback.signupDisabled, /email|邮箱|correo|e-mail/i, `${locale}: no email sign-up fallback`);
  }
});
