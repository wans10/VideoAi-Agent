import { isSameOriginConsentRequest } from '@/server/mcp/oauth-consent';
import { NextRequest, NextResponse } from 'next/server';
import { isDatabaseConfigured } from '@/lib/db';
import { resolveStudioApiAccess } from '@/server/studio/access';

/** Preserve browser same-origin intent across the trusted deployment proxy. */
export function isStudioSameOriginRequest(req: NextRequest): boolean {
  if (req.headers.get('sec-fetch-site') === 'cross-site') return false;
  const origin = req.headers.get('origin');
  if (origin && origin === req.nextUrl.origin) return true;
  // NextURL normalizes 127.0.0.1 to localhost. Preserve strict production checks
  // and only recover the exact loopback Host used by this development request.
  if (origin && req.nextUrl.hostname === 'localhost') {
    try {
      const parsed = new URL(origin);
      if (origin === parsed.origin && (parsed.hostname === '127.0.0.1' || parsed.hostname === '[::1]')) {
        return process.env.NODE_ENV === 'development' && parsed.protocol === req.nextUrl.protocol &&
          parsed.port === req.nextUrl.port && parsed.host === req.headers.get('host');
      }
    } catch { return false; }
  }
  return isSameOriginConsentRequest(req);
}

export function studioJson(body: unknown, init?: Parameters<typeof NextResponse.json>[1]) {
  const response = NextResponse.json(body, init);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

export async function resolveStudioRouteContext(req: NextRequest): Promise<
  | { userId: string; response: null }
  | { userId: null; response: NextResponse }
> {
  const access = await resolveStudioApiAccess(req);
  if (!access.ok) {
    return {
      userId: null,
      response: studioJson({ ok: false, error: access.error }, { status: access.status }),
    };
  }
  if (!isDatabaseConfigured()) {
    return { userId: null, response: studioJson({ ok: false, error: 'DATABASE_NOT_CONFIGURED' }, { status: 503 }) };
  }
  return { userId: access.userId, response: null };
}

export function payloadRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export function payloadString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}
