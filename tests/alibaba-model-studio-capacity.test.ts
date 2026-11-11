import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ALIBABA_CAPACITY_BUSY_MESSAGE,
  ALIBABA_SUBMIT_RATE_LIMITS,
  ALIBABA_VIDEO_CONCURRENCY_LIMITS,
  acquireAlibabaRateSlot,
  reserveAlibabaVideoCapacity,
  resetAlibabaCapacityStateForTests,
  tryTakeAlibabaRateSlot,
} from '../frontend/src/server/video-providers/alibaba-model-studio/capacity';
import { AlibabaModelStudioError, classifyAlibabaModelStudioError } from '../frontend/src/server/video-providers/alibaba-model-studio/errors';
import { getKnownGenerationFailureMessage } from '../frontend/lib/generation-failure-messages';

test('documented Beijing limits are encoded for every direct Alibaba model', () => {
  for (const model of ['wan3.0-video', 'wan3.0-video-prime', 'happyhorse-1.1-t2v', 'happyhorse-1.1-i2v', 'happyhorse-1.1-r2v']) {
    assert.deepEqual(ALIBABA_SUBMIT_RATE_LIMITS[model], { limit: 5, windowMs: 1_000 });
    assert.equal(ALIBABA_VIDEO_CONCURRENCY_LIMITS[model], 5);
  }
  assert.deepEqual(ALIBABA_SUBMIT_RATE_LIMITS['qwen-image-3.0-pro'], { limit: 5, windowMs: 60_000 });
  assert.deepEqual(ALIBABA_SUBMIT_RATE_LIMITS['qwen-image-3.0'], { limit: 20, windowMs: 60_000 });
});

test('rate windows admit the documented number of submissions and then report the wait', () => {
  resetAlibabaCapacityStateForTests();
  const now = 1_000_000;
  for (let index = 0; index < 5; index += 1) assert.deepEqual(tryTakeAlibabaRateSlot('qwen-image-3.0-pro', now + index), { ok: true });
  const blocked = tryTakeAlibabaRateSlot('qwen-image-3.0-pro', now + 10);
  assert.equal(blocked.ok, false);
  assert.equal(tryTakeAlibabaRateSlot('qwen-image-3.0-pro', now + 60_001).ok, true, 'the minute window slides');
  resetAlibabaCapacityStateForTests();
});

test('per-second video windows wait briefly instead of failing; exhausted waits raise a busy rate_limit error', async () => {
  resetAlibabaCapacityStateForTests();
  let clock = 5_000_000;
  const slept: number[] = [];
  const options = { now: () => clock, sleep: async (ms: number) => { slept.push(ms); clock += ms; } };
  for (let index = 0; index < 6; index += 1) await acquireAlibabaRateSlot('wan3.0-video', options);
  assert.equal(slept.length, 1, 'the sixth submission in one second waits for the window');
  for (let index = 0; index < 4; index += 1) await acquireAlibabaRateSlot('wan3.0-video', options);
  await assert.rejects(acquireAlibabaRateSlot('wan3.0-video', { ...options, maxWaitMs: 0 }), (error: unknown) => {
    assert.ok(error instanceof AlibabaModelStudioError);
    const normalized = classifyAlibabaModelStudioError(error);
    assert.equal(normalized.errorClass, 'rate_limit');
    assert.equal(normalized.status, 429);
    assert.equal(error.message, ALIBABA_CAPACITY_BUSY_MESSAGE);
    return true;
  });
  resetAlibabaCapacityStateForTests();
});

test('video capacity counts accepted in-progress tasks plus local in-flight submissions', async () => {
  resetAlibabaCapacityStateForTests();
  const queries: Array<{ sql: string; params?: unknown[] }> = [];
  let active = 3;
  const queryFn = async <T,>(sql: string, params?: unknown[]): Promise<T[]> => {
    queries.push({ sql, params });
    return [{ active }] as T[];
  };
  const first = await reserveAlibabaVideoCapacity({ model: 'happyhorse-1.1-t2v', queryFn });
  const second = await reserveAlibabaVideoCapacity({ model: 'happyhorse-1.1-t2v', queryFn });
  await assert.rejects(reserveAlibabaVideoCapacity({ model: 'happyhorse-1.1-t2v', queryFn }), /at capacity/);
  // Other models have their own limit.
  (await reserveAlibabaVideoCapacity({ model: 'happyhorse-1.1-i2v', queryFn })).release();
  first.release();
  first.release();
  const third = await reserveAlibabaVideoCapacity({ model: 'happyhorse-1.1-t2v', queryFn });
  third.release();
  second.release();
  active = 5;
  await assert.rejects(reserveAlibabaVideoCapacity({ model: 'happyhorse-1.1-t2v', queryFn }), /at capacity/);
  assert.match(queries[0]!.sql, /FROM provider_attempts/);
  assert.match(queries[0]!.sql, /provider_job_id IS NOT NULL/);
  assert.deepEqual(queries[0]!.params?.slice(0, 2), ['alibaba_model_studio', 'happyhorse-1.1-t2v']);
  resetAlibabaCapacityStateForTests();
});

test('the busy message is localized for Keyvo readers', () => {
  assert.equal(getKnownGenerationFailureMessage({ message: ALIBABA_CAPACITY_BUSY_MESSAGE, locale: 'en' }), ALIBABA_CAPACITY_BUSY_MESSAGE);
  assert.match(getKnownGenerationFailureMessage({ message: ALIBABA_CAPACITY_BUSY_MESSAGE, locale: 'zh' }) ?? '', /繁忙/);
});
