import assert from 'node:assert/strict';
import test from 'node:test';
import { CONTACT_EMAIL_MAX_LENGTH, isValidContactEmail, normalizeContactEmail } from '../frontend/lib/contact-email';

test('contact email is trimmed, lower-cased and accepted only when obviously valid', () => {
  assert.equal(normalizeContactEmail('  Member.One+news@Example.COM  '), 'member.one+news@example.com');
  assert.equal(normalizeContactEmail('a@mail.example.com.cn'), 'a@mail.example.com.cn');
  for (const bad of ['', '   ', 'plain', '@example.com', 'name@', 'name@example', 'name@example.', 'name@.example.com', 'name@ex ample.com',
    'name@example.c', 'a..b@example.com', '.a@example.com', 'a.@example.com', 'name@-bad.example.com', 'name@example.com@x.com', 'nàme@example.com', 42, null, undefined]) {
    assert.equal(normalizeContactEmail(bad), null, `rejects ${JSON.stringify(bad)}`);
    assert.equal(isValidContactEmail(bad), false);
  }
});

test('contact email has a length limit and a 64-character local part', () => {
  assert.equal(normalizeContactEmail(`${'a'.repeat(64)}@example.com`), `${'a'.repeat(64)}@example.com`);
  assert.equal(normalizeContactEmail(`${'a'.repeat(65)}@example.com`), null);
  const long = `${'a'.repeat(64)}@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(63)}.com`;
  assert.ok(long.length > CONTACT_EMAIL_MAX_LENGTH);
  assert.equal(normalizeContactEmail(long), null);
});
