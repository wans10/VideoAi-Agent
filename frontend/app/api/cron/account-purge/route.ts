import type { NextRequest } from 'next/server';
import { handleAccountPurgeCron } from '../_lib/account-purge-handler';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(req: NextRequest) { return handleAccountPurgeCron(req); }
