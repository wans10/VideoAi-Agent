/**
 * Whether LLM Hub definitely did not take the job, so the customer can be refunded at once.
 *
 * A 4xx is a clear rejection. The hailuo task plugin also reports some rejections as a 5xx wrapped in
 * its own error text (for example "insufficient balance" when the supplier account is empty); no task
 * exists after those, and leaving the wallet charge in place would bill a user for nothing. Any other
 * 5xx or a network failure stays ambiguous, because the provider may already have accepted the job.
 */
const DEFINITE_REJECTION_PATTERN = /insufficient[ _]balance|insufficient[ _]quota|invalid param/i;

export function isDefiniteLlmhubRejection(status: number, detail: unknown): boolean {
  if (Number.isFinite(status) && status >= 400 && status < 500) return true;
  if (!Number.isFinite(status) || status < 500) return false;
  return typeof detail === 'string' && DEFINITE_REJECTION_PATTERN.test(detail);
}
