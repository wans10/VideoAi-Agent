import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { I18nProvider } from '../frontend/lib/i18n/I18nProvider';
import { AUTH_COPY } from '../frontend/app/(core)/login/_lib/login-copy';
import { LoginAuthSurface } from '../frontend/app/(core)/login/_components/LoginAuthSurface';

(globalThis as typeof globalThis & { React: typeof React }).React = React;
const noop = () => {};

const read = (path: string) => readFileSync(`frontend/app/(core)/login/${path}`, 'utf8');

/** Renders the surface without phone login (the flag-off page). */
function renderFlagOff(locale: keyof typeof AUTH_COPY, mode: 'signin' | 'signup' | 'reset') {
  const authCopy = AUTH_COPY[locale];
  return renderToStaticMarkup(React.createElement(I18nProvider, { locale, dictionary: {}, fallback: {}, children: React.createElement(LoginAuthSurface, {
    authCopy, mode, effectiveMode: mode === 'reset' ? 'signin' : mode, continuation: null, isMcpStaging: false,
    email: '', password: '', confirm: '', status: null, statusTone: 'info', error: null,
    fieldErrors: {}, formAttention: false, signupSuggestion: null, unconfirmedEmail: null,
    isConfirmationResending: false, isGoogleOAuthStarting: false, isResetSending: false,
    acceptTerms: false, ageConfirmed: false, marketingOptIn: false, legalMinAge: 15,
    emailRef: null, passwordRef: null, confirmRef: null, termsRef: null, ageRef: null,
    onBack: noop, onModeChange: noop, onGoogleSignIn: noop, onSignInSubmit: noop, onResendConfirmation: noop,
    onSignUpSubmit: noop, onResetSubmit: noop, onEmailChange: noop, onPasswordChange: noop,
    onConfirmChange: noop, onSyncInputState: noop, onAcceptTermsChange: noop,
    onAgeConfirmedChange: noop, onMarketingOptInChange: noop, onAcceptSignupSuggestion: noop,
    onClearSignupSuggestion: noop,
  }) }));
}

test('flag off: the page keeps the email tab bar and the email forms, with no phone tabs or phone links', () => {
  for (const locale of ['en', 'fr', 'es', 'zh'] as const) {
    const copy = AUTH_COPY[locale];
    const signin = renderFlagOff(locale, 'signin');
    assert.ok(signin.includes(copy.tabs.signin) && signin.includes(copy.tabs.signup), `${locale} email tabs`);
    assert.match(signin, /aria-label="[^"]*"/);
    assert.match(signin, /id="auth-email"/);
    assert.match(signin, /id="auth-password"/);
    assert.ok(signin.includes(copy.forgotPassword), `${locale} email password reset link`);
    assert.doesNotMatch(signin, /phone-mode-tabs|phone-use-code|login-use-email-account|auth-phone/);

    const signup = renderFlagOff(locale, 'signup');
    assert.match(signup, /id="auth-confirm"/, `${locale} email sign-up keeps its confirm field`);
    assert.match(signup, /type="checkbox"/);
    assert.doesNotMatch(signup, /phone-mode-tabs|auth-phone/);
    assert.doesNotMatch(signup, /auth-contact-email/, `${locale} flag-off sign-up has no contact email field`);
  }
});

test('flag off: the email sign-up tab never shows the phone registration copy', () => {
  const html = renderFlagOff('zh', 'signup');
  assert.ok(!html.includes(AUTH_COPY.zh.phone.signup.title));
  assert.ok(!html.includes(AUTH_COPY.zh.phone.signin.title));
});

test('phone tabs are a named group with pressed state and are wired from the page default and the controller', () => {
  const tabs = read('_components/LoginPhoneModeTabs.tsx');
  assert.match(tabs, /role="group"/);
  assert.match(tabs, /aria-label=\{authCopy\.modeGroup\}/);
  assert.match(tabs, /aria-pressed=\{active\}/);
  assert.match(tabs, /authCopy\.phone\.tabs\.signin/);
  assert.match(tabs, /authCopy\.phone\.tabs\.signup/);

  const page = read('page.tsx');
  assert.match(page, /isPhoneLoginEnabled\(\) \? 'signin' : 'signup'/, 'phone login opens on 登录 when no mode is given');

  const controller = read('_hooks/useLoginPageController.ts');
  assert.match(controller, /useState<AuthMode>\(initialMode\)/, 'explicit ?mode=signup keeps the 注册 tab');
  assert.doesNotMatch(controller, /!EMAIL_SIGNUP_ENABLED && initialMode === 'signup'/);
  assert.match(controller, /phoneAuth\?\.onTabChange\(nextMode\)/);
  assert.match(controller, /onReturnToSignIn: returnPhoneToSignInTab/);

  const hook = read('_hooks/useLoginPhoneAuth.ts');
  assert.match(hook, /const selectTab = useCallback/);
  assert.match(hook, /onTabChange: selectTab/);
  assert.match(hook, /onReturnToSignIn\(\);/);
});

test('phone sign-in never renders the retired 新用户 link or the registration hint', () => {
  const signIn = read('_components/LoginPhoneSignInForm.tsx');
  assert.doesNotMatch(signIn, /newUser/);
  assert.doesNotMatch(signIn, /hint=/);
  const surface = read('_components/LoginAuthSurface.tsx');
  assert.doesNotMatch(surface, /phone\.usePhone|phone\.title\b|phone\.description\b/);
  assert.match(surface, /phoneHeading\.title/);
});
