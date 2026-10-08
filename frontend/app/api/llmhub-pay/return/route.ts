import { NextRequest, NextResponse } from 'next/server';
import { getLlmhubPayConfig, queryLlmhubPayOrder, signedFieldsFromUrl, verifyLlmhubPayFields } from '@/server/llmhub-pay/client';
import { confirmLlmhubPayOrder } from '@/server/llmhub-pay/orders';

export const runtime = 'nodejs';

function billingRedirect(request: NextRequest, status: 'success' | 'pending'): NextResponse {
  let url: URL;
  try {
    url = new URL('/billing', process.env.NEXT_PUBLIC_SITE_URL || request.url);
  } catch {
    url = new URL('/billing', request.url);
  }
  url.searchParams.set('status', status);
  return NextResponse.redirect(url, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function GET(request: NextRequest) {
  const config = getLlmhubPayConfig();
  const fields = signedFieldsFromUrl(request.nextUrl);
  if (!config || !fields || !verifyLlmhubPayFields(fields, config.platformPublicKey) ||
      String(fields.pid) !== config.pid || typeof fields.out_trade_no !== 'string') {
    return billingRedirect(request, 'pending');
  }
  try {
    const result = await queryLlmhubPayOrder(fields.out_trade_no, config);
    if (result.status !== 1 && result.status !== '1') return billingRedirect(request, 'pending');
    if (result.out_trade_no !== fields.out_trade_no) return billingRedirect(request, 'pending');
    await confirmLlmhubPayOrder(result, config.pid);
    return billingRedirect(request, 'success');
  } catch (error) {
    console.warn('[llmhub-pay] return reconciliation pending', error);
    return billingRedirect(request, 'pending');
  }
}
