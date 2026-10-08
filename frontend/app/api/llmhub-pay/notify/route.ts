import { NextRequest, NextResponse } from 'next/server';
import { getLlmhubPayConfig, signedFieldsFromParams, signedFieldsFromUrl, verifyLlmhubPayFields, type SignedFields } from '@/server/llmhub-pay/client';
import { confirmLlmhubPayOrder } from '@/server/llmhub-pay/orders';

export const runtime = 'nodejs';
const MAX_FORM_BYTES = 16_384;

async function readBoundedFormBody(request: NextRequest): Promise<string | null> {
  const reader = request.body?.getReader();
  if (!reader) return '';
  const chunks: Buffer[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_FORM_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks, totalBytes).toString('utf8');
}

async function handleNotification(fields: SignedFields | null) {
  const config = getLlmhubPayConfig();
  if (!config || !process.env.DATABASE_URL) return new NextResponse('unavailable', { status: 503 });
  if (!fields || !verifyLlmhubPayFields(fields, config.platformPublicKey)) return new NextResponse('invalid signature', { status: 400 });
  if (fields.trade_status !== 'TRADE_SUCCESS') return new NextResponse('unsupported status', { status: 400 });
  try {
    await confirmLlmhubPayOrder(fields, config.pid);
    return new NextResponse('success', { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[llmhub-pay] notification rejected', error);
    return new NextResponse('retry', { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return handleNotification(signedFieldsFromUrl(request.nextUrl));
}

export async function POST(request: NextRequest) {
  if (request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase() !== 'application/x-www-form-urlencoded') {
    return new NextResponse('unsupported content type', { status: 415 });
  }
  const contentLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_FORM_BYTES) return new NextResponse('payload too large', { status: 413 });
  const body = await readBoundedFormBody(request);
  if (body === null) return new NextResponse('payload too large', { status: 413 });
  return handleNotification(signedFieldsFromParams(new URLSearchParams(body)));
}
