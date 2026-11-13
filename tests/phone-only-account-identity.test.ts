import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import zh from '../frontend/messages/zh.json';
import { maskAccountPhone, normalizeAccountEmail, resolveAccountDisplayLabel } from '../frontend/lib/account-identity';
import { projectAllowedAnalyticsPayload } from '../frontend/lib/analytics/journey';
import { scanRegistrations } from '../frontend/server/admin-overview-read';
import { bundleClientFlow, createClientFlowDom } from './helpers/client-flow-dom';

// Phone sign-up accounts: auth.users.email is NULL, GoTrue returns `email: ""` and
// `phone: "8613812345678"` (E.164 digits without +). Identity is the user id.
const PHONE_ONLY_USER = { id: 'synthetic-phone-user', email: '', phone: '8613812345678' };

test('account identity helpers treat an empty email as missing and mask the phone', () => {
  for (const value of [undefined, null, '', '   ', 42]) assert.equal(normalizeAccountEmail(value), null, String(value));
  assert.equal(normalizeAccountEmail(' existing@example.invalid '), 'existing@example.invalid');

  for (const value of ['8613812345678', '+8613812345678', '+86 138 1234 5678', '13812345678', '008613812345678']) {
    assert.equal(maskAccountPhone(value), '138****5678', value);
  }
  assert.equal(maskAccountPhone('12345'), '****');
  for (const value of [undefined, null, '', '+', 13812345678]) assert.equal(maskAccountPhone(value), null, String(value));

  assert.equal(resolveAccountDisplayLabel(PHONE_ONLY_USER), '138****5678');
  assert.equal(resolveAccountDisplayLabel({ email: 'existing@example.invalid', phone: '' }), 'existing@example.invalid');
  assert.equal(resolveAccountDisplayLabel({ email: 'existing@example.invalid', phone: '8613812345678' }), 'existing@example.invalid');
  assert.equal(resolveAccountDisplayLabel({ email: null, phone: null }), null);
  assert.equal(resolveAccountDisplayLabel(null), null);
  assert.doesNotMatch(String(resolveAccountDisplayLabel(PHONE_ONLY_USER)), /12345678$|^8613/, 'never the full number');
});

test('signed-in state and labels do not depend on an email address', () => {
  const header = readFileSync('frontend/components/header/useHeaderAccountState.ts', 'utf8');
  const nav = readFileSync('frontend/components/marketing/MarketingNav.tsx', 'utf8');
  const marketingAuth = readFileSync('frontend/src/server/marketing-auth.ts', 'utf8');
  for (const [name, source] of [['header', header], ['marketing nav', nav]] as const) {
    // HeaderBar/MarketingNav derive `isAuthenticated = Boolean(email)`: a phone-only user must still get a label.
    assert.doesNotMatch(source, /setEmail\(session\?\.user\?\.email/, name);
    assert.match(source, /setEmail\(resolveAccountDisplayLabel\(session\?\.user\)\)/, name);
  }
  assert.match(marketingAuth, /const email = resolveAccountDisplayLabel\(user\);/);

  const supabaseAdmin = readFileSync('frontend/src/server/supabase-admin.ts', 'utf8');
  assert.match(supabaseAdmin, /const email = normalizeAccountEmail\(user\.email\);/);
  assert.match(supabaseAdmin, /return \{ id: user\.id, email, phone, fullName \};/);
  assert.match(readFileSync('frontend/server/dsar.ts', 'utf8'), /phone: identity\?\.phone \?\? null,/);
});

test('admin user surfaces normalize empty emails and show the masked phone, never the raw number', () => {
  const list = readFileSync('frontend/app/api/admin/users/route.ts', 'utf8');
  const detail = readFileSync('frontend/app/api/admin/users/[userId]/route.ts', 'utf8');
  const overview = readFileSync('frontend/server/admin-users.ts', 'utf8');
  for (const source of [list, detail, overview]) {
    assert.match(source, /email: normalizeAccountEmail\(user\.email\),/);
    assert.match(source, /phone: maskAccountPhone\(user\.phone\),/);
  }
  assert.match(readFileSync('frontend/app/(core)/admin/users/_components/AdminUsersView.tsx', 'utf8'), /user\.email \?\? user\.phone \?\? 'No email attached'/);
  // Impersonation needs an email magic link: phone-only accounts stay disabled instead of failing late.
  assert.match(readFileSync('frontend/app/(core)/admin/users/[userId]/_components/AdminUserSupportActionsSection.tsx', 'utf8'), /!profile\?\.email/);
  assert.match(readFileSync('frontend/app/api/admin/impersonate/route.ts', 'utf8'), /if \(!targetEmail\) \{/);
});

test('admin overview registrations list a phone-only signup by masked phone, not an empty email', async () => {
  const result = await scanRegistrations('2026-11-13T00:00:00.000Z', '2026-11-14T00:00:00.000Z', new AbortController().signal, async () => [
    { ...PHONE_ONLY_USER, created_at: '2026-11-13T08:00:00Z' },
    { id: 'synthetic-email-user', email: 'existing@example.invalid', phone: '', created_at: '2026-11-13T09:00:00Z' },
  ]);
  assert.equal(result.count, 2);
  assert.deepEqual(result.recent.map(({ id, email, phone }) => ({ id, email, phone })), [
    { id: 'synthetic-email-user', email: 'existing@example.invalid', phone: null },
    { id: PHONE_ONLY_USER.id, email: null, phone: '138****5678' },
  ]);
  assert.match(readFileSync('frontend/app/(core)/admin/_components/AdminDashboardView.tsx', 'utf8'), /user\.email \?\? user\.phone \?\? user\.id/);
});

test('phone sign-in and sign-up analytics keep their method', () => {
  assert.deepEqual(
    projectAllowedAnalyticsPayload('login_completed', { route_family: 'auth', auth_surface: 'login', method: 'phone' }),
    { route_family: 'auth', auth_surface: 'login', method: 'phone' },
  );
  const signup = projectAllowedAnalyticsPayload('sign_up_completed', { route_family: 'auth', auth_surface: 'login', method: 'phone', email_confirmation_required: false });
  assert.equal(signup?.method, 'phone');
  assert.equal(projectAllowedAnalyticsPayload('login_completed', { method: 'sms-phone' })?.method, undefined, 'unknown methods are still dropped');
});

const settingsBundle = bundleClientFlow(
  `import React,{act}from'react';import{createRoot}from'react-dom/client';import{AccountSettingsPanel}from'./app/(core)/settings/_components/AccountSettingsPanel';window.IS_REACT_ACT_ENVIRONMENT=true;const root=createRoot(document.getElementById('root'));window.fx={act,render:(user,copy)=>root.render(<AccountSettingsPanel user={user} copy={copy}/>),unmount:()=>root.unmount()};`,
  {
    '@/components/AppLanguageToggle': 'export const AppLanguageToggle=()=>null;',
    '@/lib/i18n/I18nProvider': "export const useI18n=()=>({locale:'zh',t:(k,f)=>f});",
    '@/hooks/useThemePreference': "export const useThemePreference=()=>({preference:'system',setPreference(){}});",
    '../_hooks/useAccountNameForm': "export const useAccountNameForm=()=>({name:'',setName(){},busy:false,dirty:false,validation:{error:null},status:null,save(){},cancel(){}});",
  },
);

async function renderSettings(user: Record<string, unknown>) {
  const dom = createClientFlowDom('/settings');
  const w = dom.window as any;
  w.eval(await settingsBundle);
  const account = zh.workspace.settings.account;
  await w.fx.act(async () => w.fx.render(user, account));
  return { w, $: (selector: string) => w.document.querySelector(selector), async dispose() { await w.fx.act(async () => w.fx.unmount()); w.close(); } };
}

test('account settings show the masked phone for a phone-only user and the email for an email user', async () => {
  const phoneOnly = await renderSettings(PHONE_ONLY_USER);
  try {
    assert.equal(phoneOnly.$('#settings-account-email'), null, 'no empty email field');
    assert.equal(phoneOnly.$('#settings-account-phone')!.value, '138****5678');
    assert.equal(phoneOnly.$('label[for=settings-account-phone] span')!.textContent, zh.workspace.settings.account.fields.phone.label);
  } finally { await phoneOnly.dispose(); }

  const emailUser = await renderSettings({ id: 'synthetic-email-user', email: 'existing@example.invalid', phone: '' });
  try {
    assert.equal(emailUser.$('#settings-account-phone'), null);
    assert.equal(emailUser.$('#settings-account-email')!.value, 'existing@example.invalid');
  } finally { await emailUser.dispose(); }
});
