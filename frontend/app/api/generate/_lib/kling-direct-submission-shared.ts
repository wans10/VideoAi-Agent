import { buildUserFacingRefundDescription } from '@/server/user-facing-failure-messages';
import { rollbackPendingPayment } from './payment-rollback';
import type { PaymentMode, PendingReceipt } from './initial-video-job';

type QueryFn = <T = unknown>(sql: string, params?: unknown[]) => Promise<T[]>;

/** Shared by the legacy (V3/O3) and new-design (4.0) Kling direct submissions; localized in lib/kling-failure-messages.ts. */
export const KLING_DIRECT_BUSY_MESSAGE =
  'This Kling model is busy right now (concurrent task limit reached). Please try again in about a minute.';

export function userSafeKlingDirectMessage(errorClass: string): string {
  if (errorClass === 'moderation') {
    return 'This request was blocked by safety checks. Try rephrasing it with safer, more neutral wording.';
  }
  if (errorClass === 'invalid_request') {
    return 'This request is not supported with the selected inputs. Adjust the prompt, media, or settings and try again.';
  }
  if (errorClass === 'auth_error' || errorClass === 'insufficient_provider_credits' || errorClass === 'provider_access_denied') {
    return 'This render option is temporarily unavailable. Please retry later.';
  }
  return 'The render could not start. Please retry later.';
}

export async function markJobFailedBeforeFallback(params: {
  jobId: string;
  engineLabel: string;
  durationSec: number;
  message: string;
  pendingReceipt: PendingReceipt | null;
  paymentMode: PaymentMode;
  walletChargeReserved: boolean;
  queryFn: QueryFn;
  rollbackPendingPaymentFn: typeof rollbackPendingPayment;
}) {
  const paymentStatusOverride =
    params.pendingReceipt && params.paymentMode === 'wallet'
      ? 'refunded_wallet'
      : params.pendingReceipt && params.paymentMode !== 'wallet'
        ? 'refunded'
        : null;
  await params.queryFn(
    `UPDATE app_jobs
        SET status = 'failed',
            progress = 0,
            message = $2,
            provisional = FALSE,
            payment_status = CASE WHEN $3::text IS NOT NULL THEN $3 ELSE payment_status END,
            updated_at = NOW()
      WHERE job_id = $1`,
    [params.jobId, params.message, paymentStatusOverride]
  );
  if (params.pendingReceipt) {
    await params.rollbackPendingPaymentFn({
      pendingReceipt: params.pendingReceipt,
      walletChargeReserved: params.walletChargeReserved,
      refundDescription: buildUserFacingRefundDescription({
        engineLabel: params.engineLabel,
        durationSec: params.durationSec,
        reason: params.message,
      }),
    });
  }
}

