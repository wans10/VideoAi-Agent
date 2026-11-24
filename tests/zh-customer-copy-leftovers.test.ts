import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';
import { getKnownGenerationFailureMessage, localizeGenerationRefundDescription } from '../frontend/lib/generation-failure-messages';
import { toUserFacingFailureMessage } from '../frontend/server/user-facing-failure-messages';

// Pattern names are assembled so this file does not match its own scan.
const FORBIDDEN: Array<[string, RegExp]> = [
  ['glued brand', new RegExp('Max' + 'Keyvo')],
  ['Stripe in customer copy', new RegExp('Str' + 'ipe')],
  ['Apple Pay', new RegExp('Apple ' + 'Pay')],
  ['Google Pay', new RegExp('Google ' + 'Pay')],
];

function strings(value: unknown, path: string[] = [], out: Array<[string, string]> = []): Array<[string, string]> {
  if (typeof value === 'string') out.push([path.join('.'), value]);
  else if (Array.isArray(value)) value.forEach((item, index) => strings(item, [...path, String(index)], out));
  else if (value && typeof value === 'object') for (const [key, item] of Object.entries(value)) strings(item, [...path, key], out);
  return out;
}

function files(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = `${dir}/${entry.name}`;
    if (entry.isDirectory()) files(full, out);
    else if (/\.(mdx?|json)$/.test(entry.name)) out.push(full);
  }
  return out;
}

test('the zh message catalogue has no brand-sweep leftovers or foreign payment wording', () => {
  const catalogue = JSON.parse(readFileSync('frontend/messages/zh.json', 'utf8'));
  for (const [path, text] of strings(catalogue)) {
    for (const [name, pattern] of FORBIDDEN) assert.doesNotMatch(text, pattern, `${name} in messages/zh.json ${path}`);
  }
});

test('zh content sources have no brand-sweep leftovers or foreign payment wording', () => {
  for (const file of [...files('content/zh'), ...files('content/models/zh')]) {
    const text = readFileSync(file, 'utf8');
    for (const [name, pattern] of FORBIDDEN) assert.doesNotMatch(text, pattern, `${name} in ${file}`);
  }
});

test('the zh pricing hub copy and every locale of the about attribution never glue Keyvo to the upstream name', () => {
  const pricing = readFileSync('frontend/app/(localized)/[locale]/(marketing)/pricing/_lib/pricingHubCopy.ts', 'utf8');
  const zhBlock = pricing.slice(pricing.indexOf('const zh: PricingHubCopy'), pricing.indexOf('const copyByLocale'));
  assert.ok(zhBlock.length > 1000);
  for (const [name, pattern] of FORBIDDEN) assert.doesNotMatch(zhBlock, pattern, `${name} in the zh pricing hub block`);
  assert.match(zhBlock, /支付宝/);
  const about = readFileSync('frontend/app/(localized)/[locale]/(marketing)/about/_lib/about-copy.ts', 'utf8');
  assert.doesNotMatch(about, FORBIDDEN[0][1]);
  assert.doesNotMatch(about, /MaxVideoAI/);
  assert.match(about, /Adrien Millot 是本站所基于的开源 AI 视频项目的创始人/);
});

test('customer zh pages do not name models Keyvo does not offer in the entries fixed by this guard', () => {
  const catalogue = JSON.parse(readFileSync('frontend/messages/zh.json', 'utf8'));
  const pick = (path: string[]) => path.reduce((value: any, key) => value?.[key], catalogue);
  for (const path of [['pricing', 'faq'], ['workflows', 'examples'], ['docs', 'seeAlso']]) {
    const text = JSON.stringify(pick(path));
    assert.ok(text, path.join('.'));
    assert.doesNotMatch(text, /Veo|Sora|Pika|LTX|Hailuo 02|Wan 2\.6|Kling 2\.6/, path.join('.'));
  }
  for (const links of Object.values(pick(['docs', 'seeAlso'])) as Array<Array<{ label: string }>>) {
    for (const link of links) assert.doesNotMatch(link.label, /&|protections/);
  }
});

test('Bailian and vendor content-inspection failures map to clear zh copy without claiming a refund', () => {
  const raw = [
    'Input data may contain inappropriate content.',
    'DataInspectionFailed',
    'data inspection failed for the output',
    'Output data may contain inappropriate content.',
  ];
  for (const message of raw) {
    const zh = getKnownGenerationFailureMessage({ message, locale: 'zh' });
    assert.ok(zh && /[一-鿿]/.test(zh), message);
    assert.match(zh, /安全审核/);
    assert.doesNotMatch(zh, /退款|退回|已退|inappropriate|inspection/i);
    // The stored canonical text is English; the client localizes it with the zh copy above.
    const shown = toUserFacingFailureMessage(message);
    assert.equal(shown, getKnownGenerationFailureMessage({ message, locale: 'en' }), message);
    assert.doesNotMatch(shown, /inappropriate content\.$|DataInspection/i);
    const refund = localizeGenerationRefundDescription(`Refund Wan 3 - 5s - ${message}`, 'zh');
    assert.ok(refund && /[一-鿿]/.test(refund) && !/inappropriate|DataInspection/i.test(refund), message);
  }
  for (const message of ['The prompt contains sensitive information.', 'Content contains sensitive content.']) {
    assert.match(getKnownGenerationFailureMessage({ message, locale: 'zh' }) ?? '', /安全检查/);
  }
  assert.equal(getKnownGenerationFailureMessage({ message: 'Input data may contain inappropriate content.', locale: 'en' }),
    'Your content did not pass the safety review. Change the prompt or media and try again.');
});
