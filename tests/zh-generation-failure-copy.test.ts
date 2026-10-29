import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getGeneratedImageFailureMessage,
  getKnownGenerationFailureMessage,
  getMinimaxReferenceValidationMessage,
  localizeGenerationRefundDescription,
} from '../frontend/lib/generation-failure-messages';
import {
  buildUserFacingRefundDescription,
  toUserFacingFailureMessage,
  toUserFacingRefundReason,
} from '../frontend/server/user-facing-failure-messages';
import { CustomerTariffUnavailableError } from '../frontend/server/pricing/resolve-customer-tariff';

const CONNECTION_ZH = '与模型服务的连接中断，本次生成未能完成，请稍后重试。';
const TIMEOUT_ZH = '与模型服务的连接超时，本次生成未能完成，请稍后重试。';

test('raw network errors map to zh copy on the client and server without echoing the socket text', () => {
  assert.equal(getKnownGenerationFailureMessage({ message: 'fetch failed', locale: 'zh-CN' }), CONNECTION_ZH);
  assert.equal(getKnownGenerationFailureMessage({ message: 'read ECONNRESET', locale: 'zh' }), CONNECTION_ZH);
  assert.equal(getKnownGenerationFailureMessage({ message: 'socket hang up', locale: 'zh' }), CONNECTION_ZH);
  assert.equal(getKnownGenerationFailureMessage({ message: 'UND_ERR_CONNECT_TIMEOUT', locale: 'zh' }), TIMEOUT_ZH);
  assert.equal(getKnownGenerationFailureMessage({ message: 'connect ETIMEDOUT 10.0.0.1:443', locale: 'zh' }), TIMEOUT_ZH);
  assert.equal(getKnownGenerationFailureMessage({ message: 'fetch failed', locale: 'en' }), 'The connection to the model service was interrupted, so this render did not complete. Please try again later.');

  for (const raw of ['fetch failed', 'ECONNRESET', 'UND_ERR_CONNECT_TIMEOUT']) {
    const shown = toUserFacingFailureMessage(raw);
    assert.match(shown, /[㐀-鿿]/u);
    assert.doesNotMatch(shown, /fetch failed|ECONNRESET|UND_ERR|ETIMEDOUT|socket/i);
  }
  assert.equal(toUserFacingFailureMessage('fetch failed'), CONNECTION_ZH);
  assert.equal(toUserFacingFailureMessage('UND_ERR_CONNECT_TIMEOUT'), TIMEOUT_ZH);
});

test('transport failure copy never promises a refund it cannot confirm', () => {
  for (const message of [CONNECTION_ZH, TIMEOUT_ZH, toUserFacingFailureMessage('fetch failed')]) {
    assert.doesNotMatch(message, /退款|退回|已退/);
  }
});

test('transport refund reasons stay ledger-safe and localize for display', () => {
  assert.equal(toUserFacingRefundReason('fetch failed'), 'The connection to the model service was interrupted, so this render did not complete. Please try again later.');
  assert.equal(toUserFacingRefundReason('UND_ERR_CONNECT_TIMEOUT'), 'The connection to the model service timed out, so this render did not complete. Please try again later.');
  assert.equal(
    buildUserFacingRefundDescription({ engineLabel: 'Kling 3 Pro', durationSec: 5, reason: 'fetch failed' }),
    'Refund Kling 3 Pro - 5s - The connection to the model service was interrupted, so this render did not complete. Please try again later.',
  );
  const zhRefund = localizeGenerationRefundDescription(
    'Refund Kling 3 Pro - 5s - The connection to the model service was interrupted, so this render did not complete. Please try again later.',
    'zh',
  );
  assert.equal(zhRefund, `退款 Kling 3 Pro · 5 s — ${CONNECTION_ZH}`);
  assert.equal(toUserFacingRefundReason(CONNECTION_ZH), toUserFacingRefundReason('fetch failed'));
});

test('zh copy covers the generated-image and minimax reference messages with filled placeholders', () => {
  assert.equal(
    getGeneratedImageFailureMessage('Green net check rejected image (output)', 'zh'),
    '生成的图片被安全检查拦截。请修改提示词后重试。',
  );
  assert.equal(
    getMinimaxReferenceValidationMessage({ engineId: 'minimax-h3', field: 'reference_video_urls', error: 'MEDIA_DURATION_UNVERIFIED', locale: 'zh' }),
    '无法确认参考视频的时长。请重新上传后再生成。 未扣除积分。',
  );
  const measured = getMinimaxReferenceValidationMessage({ engineId: 'minimax-h3', field: 'reference_video_urls', error: 'MEDIA_COMBINED_DURATION_EXCEEDED', durationSec: 44, locale: 'zh' });
  assert.match(measured ?? '', /44 秒/);
  assert.match(measured ?? '', /未扣除积分/);
});

test('customer tariff unavailability keeps an English log message and a zh customer message', () => {
  const generic = new CustomerTariffUnavailableError('An active reviewed ModelArk Edit customer tariff is required.');
  assert.equal(generic.name, 'CustomerTariffUnavailableError');
  assert.equal(generic.message, 'An active reviewed ModelArk Edit customer tariff is required.');
  assert.equal(generic.userMessage, '该价格暂时无法计算，请稍后再试或联系支持。');

  const edit = new CustomerTariffUnavailableError(
    'An active reviewed LAS Edit customer tariff is required.',
    '该编辑模式暂时无法报价，请稍后再试或联系支持。',
  );
  assert.equal(edit.message, 'An active reviewed LAS Edit customer tariff is required.');
  assert.equal(edit.userMessage, '该编辑模式暂时无法报价，请稍后再试或联系支持。');
  assert.doesNotMatch(edit.userMessage, /customer tariff|ModelArk|LAS/);
});
