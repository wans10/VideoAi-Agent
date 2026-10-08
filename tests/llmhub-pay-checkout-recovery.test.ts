import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';

// Exercise the actual HTTP handler; replace only auth, persistence and gateway boundaries.
test('payment timeout, reload, concurrent retry and late notification recover the same user-bound order', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'keyvo-checkout-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const require = createRequire(import.meta.url);
  const frontendRequire = createRequire(resolve('frontend/package.json'));
  const output = join(dir, 'route.cjs');
  const state = { userId: 'owner', orders: new Map<string, any>(), creates: 0, queries: 0,
    paid: false, gateway: 'timeout', failures: 0 };
  (globalThis as any).__keyvoCheckoutFixture = state;
  t.after(() => delete (globalThis as any).__keyvoCheckoutFixture);
  const stateImport = 'const s=globalThis.__keyvoCheckoutFixture;';
  const boundaries: Record<string, string> = {
    '@/lib/supabase-ssr': stateImport + 'export const getRouteAuthContext=async()=>({userId:s.userId});',
    '@/lib/schema': 'export const ensureBillingSchema=async()=>{};',
    '@/server/fraud-cleanup': 'export const getActiveAccountRestriction=async()=>null; export const buildRestrictedAccountPayload=()=>({});',
    '@/server/checkout-guard': 'export const resolveCheckoutClientIp=()=>"127.0.0.1";export const evaluateWalletCheckoutGuard=async()=>({action:"allow",attemptId:1});export const markCheckoutAttemptLlmhubOrderCreated=async()=>{};export const markCheckoutAttemptSessionFailed=async()=>{};',
    '@/config/topupTiers': 'export const findTopupTier=()=>({});',
    '@/server/wallet-summary': 'export const getWalletSummary=async()=>({hasCompletedTopUp:true});',
    '@/server/llmhub-pay/quote': 'export const parseLlmhubWalletAmountCents=v=>Number.isInteger(v)&&v>0?v:null;export const quoteLlmhubPayTopup=async v=>({amountMinor:v,quoteMetadata:{walletCurrency:"CNY"}});',
    '@/server/llmhub-pay/client': stateImport + `export class LlmhubPayRejectedError extends Error{};
      export const getLlmhubPayConfig=()=>({pid:1});export const getLlmhubPaySiteOrigin=()=>"https://app.keyvo.cn";
      export const queryLlmhubPayOrder=async id=>{s.queries++;if(!s.paid)throw new Error("query timeout");return {out_trade_no:id,status:1};};
      export const createLlmhubPayOrder=async()=>{s.creates++;await new Promise(r=>setTimeout(r,5));if(s.gateway==="timeout")throw new Error("network timeout");return {tradeNo:"provider",url:"https://pay.example/saved"};};`,
    '@/server/llmhub-pay/orders': stateImport + `export const findOwnedLlmhubPayOrder=async(id,user)=>{const o=s.orders.get(id);return o?.user_id===user?o:null};
      export const createPendingLlmhubPayOrder=async p=>{if(s.orders.has(p.outTradeNo))throw new Error("unique order");s.orders.set(p.outTradeNo,{user_id:p.userId,wallet_amount_cents:p.walletAmountCents,payment_type:p.paymentType,status:"pending",quote_metadata:p.quoteMetadata});};
      export const markLlmhubPayOrderCreated=async(id,trade,url)=>{s.orders.get(id).quote_metadata.paymentUrl=url};
      export const markLlmhubPayOrderFailed=async id=>{s.failures++;s.orders.get(id).status="failed"};
      export const confirmLlmhubPayOrder=async p=>{s.orders.get(p.out_trade_no).status="paid"};export const formatFenAsYuan=v=>(v/100).toFixed(2);`,
  };
  await build({ entryPoints: ['frontend/app/api/llmhub-pay/checkout/route.ts'], outfile: output,
    bundle: true, platform: 'node', format: 'cjs', logLevel: 'silent', plugins: [{ name: 'http-boundaries', setup(builder) {
      builder.onResolve({ filter: /.*/ }, args => {
        if (boundaries[args.path]) return { path: args.path, namespace: 'fixture' };
        if (!args.path.startsWith('.') && !args.path.startsWith('/') && !args.path.startsWith('@/') && !args.path.startsWith('node:')) return { path: frontendRequire.resolve(args.path), external: true };
      });
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: boundaries[args.path], loader: 'js' }));
    } }] });
  const { POST } = require(output);
  const { NextRequest } = frontendRequire('next/server');
  const savedDb = process.env.DATABASE_URL;
  process.env.DATABASE_URL = 'test-only';
  t.after(() => savedDb === undefined ? delete process.env.DATABASE_URL : process.env.DATABASE_URL = savedDb);
  const requestId = '11111111-1111-4111-8111-111111111111';
  const submit = (overrides = {}) => POST(new NextRequest('https://app.keyvo.cn/api/llmhub-pay/checkout', {
    method: 'POST', body: JSON.stringify({ requestId, amountCents: 8000, expectedAmountFen: 8000, type: 'alipay', ...overrides }), headers: { 'content-type': 'application/json' },
  }));
  const first = await submit();
  assert.equal(first.status, 503);
  const pending = await first.json();
  assert.equal(pending.pending, true);
  assert.equal(state.creates, 1);
  assert.equal(state.failures, 0, 'network uncertainty cannot reject the saved order');
  const recovery = await submit();
  assert.equal(recovery.status, 202);
  assert.equal((await recovery.json()).outTradeNo, pending.outTradeNo);
  assert.equal(state.creates, 1, 'reload retry only queries');
  assert.equal((await submit({ amountCents: 9000 })).status, 409, 'identity cannot change amount');
  state.paid = true;
  const latePaid = await submit();
  assert.equal((await latePaid.json()).paid, true);
  assert.equal(state.orders.get(pending.outTradeNo).status, 'paid');
  const previousQueries = state.queries;
  assert.equal((await (await submit()).json()).paid, true);
  assert.equal(state.queries, previousQueries, 'settled order is not resubmitted or requeried');
  state.paid = false; state.gateway = 'success';
  const nextId = '22222222-2222-4222-8222-222222222222';
  const concurrent = await Promise.all([submit({ requestId: nextId }), submit({ requestId: nextId })]);
  assert.equal(state.creates, 2, 'one gateway creation for the two concurrent callers');
  assert.ok(concurrent.some((response: Response) => response.status === 200));
  const restored = await submit({ requestId: nextId });
  assert.equal((await restored.json()).url, 'https://pay.example/saved');
  assert.equal(state.creates, 2, 'saved payment URL recovers without creating another order');
  state.userId = 'another-account';
  await submit();
  assert.equal(state.orders.size, 3, 'same request UUID in another account has a separate order identity');
  assert.equal(state.orders.get(pending.outTradeNo).user_id, 'owner');
});
