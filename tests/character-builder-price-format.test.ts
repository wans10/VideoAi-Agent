// Keyvo 2026-11-15: the Character Builder generate button showed the estimate as "$0.01" on the CNY build.
import assert from 'node:assert/strict';
import test from 'node:test';
import { formatCharacterPrice } from '../frontend/src/components/tools/character-builder/_lib/character-builder-price';

test('the CNY build shows the customer amount in yuan (8 CNY per USD), never a dollar sign', () => {
  assert.equal(formatCharacterPrice(0.01, 'zh', 'CNY'), '¥0.08');
  assert.equal(formatCharacterPrice(0.06, 'zh', 'CNY'), '¥0.48');
  assert.equal(formatCharacterPrice(0.07, 'zh', 'CNY'), '¥0.56');
  assert.ok(!formatCharacterPrice(0.06, 'zh', 'CNY').includes('$'));
});

test('other builds keep the USD display in the page locale', () => {
  assert.equal(formatCharacterPrice(0.07, 'en', 'USD'), '$0.07');
  assert.match(formatCharacterPrice(0.07, 'fr', 'USD'), /0,07/);
});
