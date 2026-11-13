import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { CUSTOMER_CURRENCY } from '../frontend/src/lib/customer-currency';
import { TOPUP_TIERS } from '../frontend/src/config/topupTiers';
import { AUTH_COPY } from '../frontend/app/(core)/login/_lib/login-copy.ts';
import { buildLoginContinuation } from '../frontend/app/(core)/login/_lib/login-continuation.ts';

const controllerSource = readFileSync(
  'frontend/app/(core)/login/_hooks/useLoginPageController.ts',
  'utf8'
);
const surfaceSource = readFileSync(
  'frontend/app/(core)/login/_components/LoginAuthSurface.tsx',
  'utf8'
);

test('billing continuation confirms the preserved top-up amount', () => {
  assert.deepEqual(
    buildLoginContinuation({
      copy: AUTH_COPY.en.continuation,
      locale: 'en',
      nextPath: `/billing?amount=${TOPUP_TIERS[1].amountCents}&currency=${CUSTOMER_CURRENCY}`,
    }),
    {
      kind: 'billing',
      title: `Your ${CUSTOMER_CURRENCY === 'CNY' ? 'CN¥200' : '$25'} top-up is saved`,
      body: 'Create an account or sign in, then you’ll return to Billing with that amount still selected.',
    }
  );
});

test('a billing target without a valid amount keeps the generic billing banner', () => {
  assert.equal(
    buildLoginContinuation({ copy: AUTH_COPY.zh.continuation, locale: 'zh', nextPath: '/billing' })?.kind,
    'billing'
  );
});

test('generic workspace routes show no saved-settings banner in any locale', () => {
  // The login URL alone does not prove that a model, image or library setting was saved, so the
  // banner stays off for these routes (Keyvo decision, 2026-11-13).
  const paths = [
    '/app',
    '/app?engine=seedance-2-0',
    '/app/image?engine=gemini-2-5-flash-image',
    '/app/audio',
    '/app/library',
    '/app/tools/storyboard',
    '/app/studio',
    '/app/studio?starter=product-ad',
    '/app/studio/conversation/project-1',
  ];
  for (const locale of ['en', 'fr', 'es', 'zh'] as const) {
    for (const nextPath of paths) {
      assert.equal(
        buildLoginContinuation({ copy: AUTH_COPY[locale].continuation, locale, nextPath }),
        null,
        `${locale} ${nextPath}`
      );
    }
  }
});

test('direct login and unsafe targets do not invent continuation claims', () => {
  assert.equal(
    buildLoginContinuation({ copy: AUTH_COPY.en.continuation, locale: 'en', nextPath: '/generate' }),
    null
  );
  assert.equal(
    buildLoginContinuation({ copy: AUTH_COPY.en.continuation, locale: 'en', nextPath: 'https://example.com' }),
    null
  );
  assert.equal(
    buildLoginContinuation({ copy: AUTH_COPY.en.continuation, locale: 'en', nextPath: '/app/studiobook' }),
    null
  );
});

test('MCP consent explains account connection in every locale without claiming installation or payment', () => {
  for (const locale of ['en', 'fr', 'es'] as const) {
    const result = buildLoginContinuation({
      copy: AUTH_COPY[locale].continuation,
      locale,
      nextPath: '/oauth/consent?authorization_id=authz_1234567890',
    });
    assert.equal(result?.kind, 'mcp');
    assert.ok(result?.title.includes('Keyvo'));
    assert.ok(result?.body.includes('Keyvo'));
    assert.doesNotMatch(result?.body ?? '', /ChatGPT|Claude|installed|payment|paiement|pago/i);
  }
  assert.equal(buildLoginContinuation({ copy: AUTH_COPY.en.continuation, locale: 'en', nextPath: '/oauth/consent' }), null);
});

test('all supported auth locales expose the continuation copy that is still rendered', () => {
  for (const locale of ['en', 'fr', 'es', 'zh'] as const) {
    const copy = AUTH_COPY[locale].continuation;
    for (const key of ['billing', 'billingGeneric', 'mcp'] as const) {
      assert.ok(copy[key].title.length > 0, `${locale}.${key}.title`);
      assert.ok(copy[key].body.length > 0, `${locale}.${key}.body`);
    }
    for (const key of ['video', 'image', 'audio', 'library', 'tool', 'studio'] as const) {
      assert.equal((copy as Record<string, unknown>)[key], undefined, `${locale}.${key} is no longer shown`);
    }
  }
});

test('login controller and surface keep continuation derivation and rendering explicit', () => {
  assert.match(controllerSource, /buildLoginContinuation/);
  assert.match(controllerSource, /nextPathReady\s*\?\s*buildLoginContinuation/);
  assert.match(controllerSource, /nextPath:\s*safeNextPath/);
  assert.match(surfaceSource, /continuation:\s*LoginContinuation \| null/);
  assert.match(surfaceSource, /mode !== 'reset' && continuation/);
  assert.match(surfaceSource, /continuation\.title/);
  assert.match(surfaceSource, /continuation\.body/);
  assert.match(surfaceSource, /CheckCircle2/);
});
