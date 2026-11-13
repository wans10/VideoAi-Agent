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
  './useLoginAuthenticatedRedirect': 'export const useLoginAuthenticatedRedirect=()=>({redirectFromExistingBrowserSession(){}});',
  './useLoginAuthHashSession': 'export const useLoginAuthHashSession=()=>{};',
  './useLoginOAuthCodeExchange': 'export const useLoginOAuthCodeExchange=()=>{};',
};

const bundle = bundleClientFlow(`import React,{act}from'react';import{createRoot}from'react-dom/client';import{useLoginPageController}from'./app/(core)/login/_hooks/useLoginPageController';import{LoginAuthSurface}from'./app/(core)/login/_components/LoginAuthSurface';import{I18nProvider}from'@/lib/i18n/I18nProvider';window.IS_REACT_ACT_ENVIRONMENT=true;function Page(){const state=useLoginPageController({initialMode:window.mode,initialLocale:'zh',initialMcpConnection:false});window.controller=state;return <I18nProvider locale="zh" dictionary={{}} fallback={{}}><LoginAuthSurface {...state} isMcpStaging={false}/></I18nProvider>;}const root=createRoot(document.getElementById('root'));window.fx={act,render:()=>root.render(<Page/>),unmount:()=>root.unmount()};`, boundaries);

async function mount({ enabled = true, mode = 'signin', stored }: { enabled?: boolean; mode?: string; stored?: object } = {}) {
  const dom = createClientFlowDom('/login');
  const w = dom.window as any;
  if (enabled) w.process.env.NEXT_PUBLIC_PHONE_LOGIN_ENABLED = 'true';
  if (stored) w.sessionStorage.setItem(PHONE_COOLDOWN_STORAGE_KEY, JSON.stringify(stored));
  const sends: Array<{ input: any; reply: ReturnType<typeof deferred<any>> }> = [];
  const verifies: Array<{ input: any; reply: ReturnType<typeof deferred<any>> }> = [];
  const consents: any[] = [];
  const client = { auth: {
    signInWithOtp: (input: any) => { const reply = deferred<any>(); sends.push({ input, reply }); return reply.promise; },
    verifyOtp: (input: any) => { const reply = deferred<any>(); verifies.push({ input, reply }); return reply.promise; },
    signInWithPassword: () => new Promise(() => {}), signUp: () => new Promise(() => {}),
    signOut: async () => ({ error: null }),
  } };
  w.mode = mode; w.loadClient = async () => client;
  w.fetch = async (url: string, init: any) => { consents.push({ url, body: JSON.parse(init.body) }); return { ok: true, json: async () => ({ ok: true }) }; };
  w.eval(await bundle);
  await w.fx.act(async () => w.fx.render());
  const $ = (selector: string) => w.document.querySelector(selector);
  const text = () => w.document.querySelector('.videoai-auth-card')!.textContent as string;
  const alerts = () => [...w.document.querySelectorAll('[role=alert]')].map((node: any) => node.textContent).join(' ');
  const act = (fn: () => unknown) => w.fx.act(async () => { await fn(); });
  const type = (selector: string, value: string) => act(() => {
    const input = $(selector)!;
    Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype, 'value')!.set!.call(input, value);
    input.dispatchEvent(new w.Event('input', { bubbles: true }));
  });
  const methodButton = (label: string) => [...w.document.querySelectorAll('[role=group] button')].find((b: any) => b.textContent === label) as any;
  const submit = () => act(() => $('[data-testid=phone-auth-form]')!.dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true })));
  const consent = () => act(() => { const boxes = $('[data-testid=phone-auth-form]')!.querySelectorAll('input[type=checkbox]'); boxes[0].click(); boxes[1].click(); });
  return { w, $, text, alerts, act, type, methodButton, submit, consent, sends, verifies, consents,
    async dispose() { await w.fx.act(async () => w.fx.unmount()); w.close(); } };
}

test('without the flag the login page shows no phone option and keeps the email form', async () => {
  const f = await mount({ enabled: false });
  try {
    assert.equal(f.w.controller.phoneAuth, null);
    assert.equal(f.methodButton(phoneCopy.methodPhone), undefined);
    assert.equal(f.$('#auth-phone'), null);
    assert.ok(f.$('#auth-email'));
    assert.ok(f.$('#auth-password'));
  } finally { await f.dispose(); }
});

test('phone sign-in validates the number and consent before any SMS is requested', async () => {
  const f = await mount();
  try {
    const phoneTab = f.methodButton(phoneCopy.methodPhone);
    assert.ok(phoneTab, 'method switch offers phone');
    assert.equal(phoneTab.getAttribute('aria-pressed'), 'false');
    await f.act(() => phoneTab.click());
    assert.equal(phoneTab.getAttribute('aria-pressed'), 'true');
    assert.equal(f.$('#auth-email'), null, 'email form is replaced by the phone form');
    assert.equal(f.$('label[for=auth-phone]')!.textContent, phoneCopy.fields.phone);
    assert.match(f.text(), /\+86/);
    assert.equal(f.$('#auth-phone')!.getAttribute('autocomplete'), 'tel-national');

    await f.submit();
    assert.equal(f.$('#auth-phone-error')!.textContent, phoneCopy.validation.phoneRequired);
    await f.type('#auth-phone', '12812345678');
    await f.submit();
    assert.equal(f.$('#auth-phone-error')!.textContent, phoneCopy.validation.phoneInvalid);
    assert.equal(f.$('#auth-phone')!.getAttribute('aria-invalid'), 'true');
    assert.match(f.$('#auth-phone')!.getAttribute('aria-describedby')!, /auth-phone-error/);
    await f.type('#auth-phone', '138 1234 5678');
    await f.submit();
    assert.equal(f.$('#auth-phone-terms-error')!.textContent, zh.auth.validation.termsRequired);
    assert.equal(f.sends.length, 0, 'no SMS before validation and consent');
  } finally { await f.dispose(); }
});

test('sending a code starts a persisted 60 s cooldown and maps rate limits', async () => {
  const f = await mount();
  try {
    await f.act(() => f.methodButton(phoneCopy.methodPhone).click());
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
    await limited.act(() => limited.methodButton(phoneCopy.methodPhone).click());
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
    assert.equal(f.methodButton(phoneCopy.methodPhone).getAttribute('aria-pressed'), 'true');
    assert.equal(f.$('#auth-phone')!.value, '13912345678');
    assert.ok(f.$('#auth-otp'));
    const resend = f.$('[data-testid=phone-resend]')!;
    assert.equal(resend.disabled, true);
    assert.match(resend.textContent, /^(40|39) 秒后重新获取$/);
  } finally { await f.dispose(); }
});

test('wrong codes count down the attempts, then success follows the password-login redirect', async () => {
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
    assert.equal(f.w.redirectedTo, '/app/image?draft=1', 'same sanitized next target as password login');
    assert.equal(f.w.lastUser, 'synthetic-phone-user');
    assert.equal(f.consents.length, 0, 'an existing account does not re-record sign-up consent');
    assert.ok(f.w.events.includes('login_completed:phone'));
    assert.equal(f.w.sessionStorage.getItem(PHONE_COOLDOWN_STORAGE_KEY), null);
  } finally { await f.dispose(); }
});

test('a new phone account records sign-up consents before redirecting; exhausted attempts require a new code', async () => {
  const now = Date.now();
  const f = await mount({ mode: 'signup', stored: { phone: '13912345678', sentAt: now - 5_000, cooldownUntil: now + 55_000 } });
  try {
    await f.consent();
    await f.type('#auth-otp', '123456');
    await f.submit();
    const user = { id: 'synthetic-new-user', created_at: new Date(now - 6_000).toISOString(), app_metadata: {} };
    await f.act(() => f.verifies[0].reply.resolve({ data: { session: { access_token: 'synthetic', user }, user }, error: null }));
    assert.equal(f.consents.length, 1);
    assert.deepEqual(f.consents[0], { url: '/api/legal/consents', body: { userId: 'synthetic-new-user', ageConfirmed: true, locale: 'zh', source: 'signup' } });
    assert.equal(f.w.redirectedTo, '/app/image?draft=1');
    assert.ok(f.w.events.includes('sign_up_completed:phone'));
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
