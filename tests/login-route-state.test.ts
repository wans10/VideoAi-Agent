import assert from 'node:assert/strict';
import test from 'node:test';
import {
  resolveInitialAuthLocale,
  resolveInitialAuthMode,
} from '../frontend/app/(core)/login/_lib/login-route-state';

test('login mode accepts only the supported scalar query values', () => {
  assert.equal(resolveInitialAuthMode('signup'), 'signup');
  assert.equal(resolveInitialAuthMode('signin'), 'signin');
  assert.equal(resolveInitialAuthMode('reset'), 'reset');
  assert.equal(resolveInitialAuthMode(undefined), 'signup');
  assert.equal(resolveInitialAuthMode('other'), 'signup');
  assert.equal(resolveInitialAuthMode(['signin', 'signup']), 'signin');
});

test('login locale ignores disabled languages stored in old cookies', () => {
  assert.equal(resolveInitialAuthLocale('fr', 'en'), 'zh');
  assert.equal(resolveInitialAuthLocale('de', 'es'), 'zh');
  assert.equal(resolveInitialAuthLocale(undefined, 'EN'), 'zh');
  assert.equal(resolveInitialAuthLocale('pt', undefined), 'zh');
});

test('legacy MCP consent links open sign-in while explicit auth choices remain available', () => {
  const next = '/oauth/consent?authorization_id=authz_1234567890';
  assert.equal(resolveInitialAuthMode(undefined, next), 'signin');
  assert.equal(resolveInitialAuthMode(undefined, [next, '/app']), 'signin');
  assert.equal(resolveInitialAuthMode('other', next), 'signin');
  assert.equal(resolveInitialAuthMode('signup', next), 'signup');
  assert.equal(resolveInitialAuthMode('reset', next), 'reset');
});

test('invalid or external consent targets retain the general login default', () => {
  for (const next of [
    'https://example.com/oauth/consent?authorization_id=authz_1234567890',
    '//example.com/oauth/consent?authorization_id=authz_1234567890',
    '/\\\\example.com/oauth/consent?authorization_id=authz_1234567890',
    '/oauth/consent',
    '/oauth/consent?authorization_id=short',
    '/oauth/consent?authorization_id=authz_1234567890&authorization_id=other_authz',
    '/oauth/consent/other?authorization_id=authz_1234567890',
    '/app',
  ]) {
    assert.equal(resolveInitialAuthMode(undefined, next), 'signup', next);
  }
});
