import { NextRequest, NextResponse } from 'next/server';
import { runLlmhubVideoPoll } from '@/server/llmhub-video-poll';
import { authorizeCronRequest } from '@/server/vercel-cron';

export const runtime = 'nodejs';

async function trigger(req: NextRequest) {
  const auth = authorizeCronRequest(req.headers, {
    cronSecret: (process.env.CRON_SECRET ?? '').trim(),
    deploymentId: process.env.VERCEL_DEPLOYMENT_ID,
    localTokens: [(process.env.LLMHUB_VIDEO_POLL_TOKEN ?? '').trim()],
    overrideHeaderName: 'x-llmhub-video-poll-token',
    vercelEnv: process.env.VERCEL,
  });
  if (!auth.ok) return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 });
  return runLlmhubVideoPoll();
}

export async function GET(req: NextRequest) { return trigger(req); }
export async function POST(req: NextRequest) { return trigger(req); }
