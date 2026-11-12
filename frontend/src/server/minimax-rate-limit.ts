/**
 * In-process guard for MiniMax's documented per-account request limits
 * (https://platform.minimaxi.com/docs/guides/rate-limits.md, checked 2026-11-11):
 * Video Generation V2 (MiniMax-H3) 300 RPM, legacy Hailuo video 20 RPM, T2A V2 speech 20 RPM (paid account).
 * It is per process, so several instances can still exceed the account limit together; the provider's own
 * 429 / 1002 answer remains the final authority and is mapped to the same user message.
 */
export type MinimaxRateLimitBucket = 'video_v2' | 'video_v1' | 'speech_t2a';

export const MINIMAX_RATE_LIMITS: Readonly<Record<MinimaxRateLimitBucket, { requestsPerMinute: number }>> = {
  video_v2: { requestsPerMinute: 300 },
  video_v1: { requestsPerMinute: 20 },
  speech_t2a: { requestsPerMinute: 20 },
};

const WINDOW_MS = 60_000;
const windows = new Map<MinimaxRateLimitBucket, number[]>();

export function acquireMinimaxSlot(
  bucket: MinimaxRateLimitBucket,
  now: number = Date.now(),
): { ok: true } | { ok: false; retryAfterMs: number } {
  const recent = (windows.get(bucket) ?? []).filter((at) => at > now - WINDOW_MS && at <= now);
  if (recent.length >= MINIMAX_RATE_LIMITS[bucket].requestsPerMinute) {
    windows.set(bucket, recent);
    return { ok: false, retryAfterMs: Math.max(1, recent[0]! + WINDOW_MS - now) };
  }
  recent.push(now);
  windows.set(bucket, recent);
  return { ok: true };
}

/** Tests only. */
export function resetMinimaxRateLimits(): void {
  windows.clear();
}
