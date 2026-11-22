// Keyvo product rule: 18+ at signup; zh settings, billing ledger and tab visibility carry no English leftovers.
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { localizeReceiptDescriptionZh, formatReceiptSurfaceLabel } from '../frontend/app/(core)/billing/_lib/billing-utils';
import { SETTINGS_TAB_ITEMS, resolveSettingsContentTab } from '../frontend/lib/settings-navigation';
import { KEYVO_NOTIFICATIONS_TAB_HIDDEN } from '../frontend/config/keyvo-disabled-features';

const read = (p: string) => readFileSync(p, 'utf8');
const msg = (l: string) => JSON.parse(read(`frontend/messages/${l}.json`));

test('age rule is 18 in the shared policy, the controller, the consent route and the env docs', () => {
  // Upstream moved the age floor into one shared module; Keyvo keeps the fixed floor of 18 there,
  // so stale env values can neither lower the form minimum nor the recorded attestation version.
  const policy = read('frontend/src/lib/legal-policy.ts');
  assert.match(policy, /export const LEGAL_MIN_AGE = 18;/);
  assert.match(policy, /export const AGE_ATTESTATION_VERSION = `min_age:\$\{LEGAL_MIN_AGE\}`;/);
  const controller = read('frontend/app/(core)/login/_hooks/useLoginPageController.ts');
  assert.match(controller, /import \{ LEGAL_MIN_AGE \} from '@\/lib\/legal-policy';/);
  assert.match(controller, /legalMinAge: LEGAL_MIN_AGE,/);
  assert.doesNotMatch(controller, /NEXT_PUBLIC_LEGAL_MIN_AGE/);
  const route = read('frontend/app/api/legal/consents/route.ts');
  assert.match(route, /import \{ AGE_ATTESTATION_VERSION \} from '@\/lib\/legal-policy';/);
  assert.match(route, /docVersion: AGE_ATTESTATION_VERSION,/);
  assert.match(read('frontend/.env.local.example'), /^LEGAL_MIN_AGE=18$/m);
  assert.equal(msg("zh").auth.terms.age.replace('{age}', '18'), '我确认已年满 18 周岁。');
});

test('terms and privacy state the 18+ rule', () => {
  assert.match(read('frontend/app/(core)/legal/terms/_components/TermsArticleZh.tsx'), /年满十八周岁/);
  assert.match(read('frontend/app/(core)/legal/privacy/_components/PrivacyArticleZh.tsx'), /年满十八周岁/);
  assert.match(read('frontend/app/(core)/legal/terms/_components/TermsArticleEn.tsx'), /18 years old/);
  assert.match(read('frontend/app/(core)/legal/terms/_components/TermsArticleFr.tsx'), /18 ans/);
  assert.match(read('frontend/app/(core)/legal/terms/_components/TermsArticleEs.tsx'), /18 años/);
  assert.doesNotMatch(read('frontend/app/(core)/legal/privacy/_components/PrivacyArticleEn.tsx'), /under 15/);
});

test('the Notifications tab is hidden while it is not available', () => {
  assert.equal(KEYVO_NOTIFICATIONS_TAB_HIDDEN, true);
  assert.ok(!SETTINGS_TAB_ITEMS.some((item) => item.id === 'notifications'));
  assert.equal(resolveSettingsContentTab('notifications'), 'account');
});

test('zh privacy tab has Chinese copy for every visible sentence', () => {
  const p = msg('zh').workspace.settings.privacy;
  for (const key of ['summary', 'reviewNote', 'guestNote', 'supportPrefix', 'supportSuffix']) assert.match(p[key], /[一-鿿]/, key);
  assert.equal(p.supportEmail, 'contact@llmhub.com.cn');
  assert.doesNotMatch(read('frontend/app/(core)/settings/page.tsx'), /<p[^>]*>\s*Sign in to manage/);
});

test('billing receipts: disclosure label, surface chips and known English ledger text are Chinese', () => {
  const receipts = msg('zh').workspace.billing.receipts;
  assert.equal(receipts.collapsedLabel, '展开');
  assert.equal(receipts.expandedLabel, '收起');
  assert.equal(formatReceiptSurfaceLabel('audio'), '音频');
  assert.equal(localizeReceiptDescriptionZh('Voice Over'), '配音');
  assert.equal(localizeReceiptDescriptionZh('Run MiniMax H3 - 4s'), '生成 MiniMax H3 · 4 秒');
  assert.equal(localizeReceiptDescriptionZh('Run Voice Over - 12s'), '生成 配音 · 12 秒');
  assert.equal(localizeReceiptDescriptionZh('Refund Voice Over'), '退款 配音');
  assert.equal(localizeReceiptDescriptionZh('银行转账'), '银行转账');
  assert.equal(localizeReceiptDescriptionZh(null), null);
});
