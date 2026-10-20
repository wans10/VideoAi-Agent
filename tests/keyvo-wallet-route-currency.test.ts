import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';

test('CNY customer checkout quotes CNY identity and freezes CNY wallet metadata in actual Stripe route',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'keyvo-wallet-currency-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const req=createRequire(resolve('frontend/package.json'));const output=join(dir,'wallet.cjs');
 const state={fx:[] as unknown[][],session:null as any};(globalThis as any).__walletCurrencyAudit=state;t.after(()=>delete (globalThis as any).__walletCurrencyAudit);
 const mocks:Record<string,string>={
 '@/server/wallet-direct-checkout':"export const createWalletDirectPaymentIntent=async()=>{throw Error('unexpected direct');};",
 '@/server/pricing/wallet-direct-policy':"export const requireCurrentWalletDirectPricingPolicy=()=>null;",
 '@/lib/wallet':"export const applyMockWalletTopUp=()=>{throw Error('unexpected mock');};",
 '@/server/wallet-summary':"export const getWalletSummary=async()=>({hasCompletedTopUp:true});",
 '@/lib/env':"export const ENV={STRIPE_SECRET_KEY:'fixture'};",
 '@/lib/db':"export const query=async()=>[{topup_count:1}];",
 '@/lib/schema':'export const ensureBillingSchema=async()=>{};',
 '@/lib/supabase-ssr':"export const getRouteAuthContext=async()=>({userId:'owner'});",
 '@/lib/currency':"export const getUserPreferredCurrency=async()=>null;export const normalizeCurrencyCode=v=>v;export const resolveCurrency=()=>({currency:'cny',source:'default'});export const resolveEnabledCurrencies=()=>['cny'];",
 '@/lib/customer-currency':"export const CUSTOMER_CURRENCY='CNY';",
 '@/lib/exchange':"export const convertCents=async(...args)=>{globalThis.__walletCurrencyAudit.fx.push(args);return {cents:args[0],rate:1,source:'identity'};};",
 '@/server/fraud-cleanup':"export const getActiveAccountRestriction=async()=>null;export const buildRestrictedAccountPayload=()=>({});",
 '@/server/checkout-guard':"export const resolveCheckoutClientIp=()=> '127.0.0.1';export const evaluateWalletCheckoutGuard=async()=>({action:'allow',attemptId:1});export const markCheckoutAttemptSessionCreated=async()=>{};export const markCheckoutAttemptSessionFailed=async()=>{};export const hashCheckoutIp=()=> 'fixture';",
 '@/server/checkout-session-coordination':"export const withCheckoutSessionPreparationLock=async(_input,work)=>work();",
 '@/server/stripe-customers':"export const getOrCreateStripeCheckoutCustomerForUser=async()=>({id:'customer',hasShippingAddress:false});",
 '@/server/checkout-session-reuse':"export const findReusableExpressCheckoutSession=async()=>null;",
 stripe:"export default class Stripe{checkout={sessions:{create:async p=>{globalThis.__walletCurrencyAudit.session=p;return {id:'cs_fixture',url:'https://checkout.stripe.com/fixture'};}}};}",
 };
 await build({entryPoints:['frontend/app/api/wallet/route.ts'],outfile:output,bundle:true,platform:'node',format:'cjs',tsconfig:'frontend/tsconfig.json',packages:'external',plugins:[{name:'wallet-boundaries',setup(b){b.onResolve({filter:/.*/},a=>mocks[a.path]?{path:a.path,namespace:'fixture'}:undefined);b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:mocks[a.path],loader:'js',resolveDir:process.cwd()}));b.onResolve({filter:/^next\/server$/},a=>({path:req.resolve(a.path),external:true}));}}]});
 const prior=process.env.DATABASE_URL;process.env.DATABASE_URL='fixture';t.after(()=>prior===undefined?delete process.env.DATABASE_URL:process.env.DATABASE_URL=prior);
 const {POST}=req(output);const {NextRequest}=req('next/server');
 const response=await POST(new NextRequest('https://app.keyvo.cn/api/wallet',{method:'POST',body:JSON.stringify({amountCents:8000,currency:'cny',locale:'zh'}),headers:{origin:'https://app.keyvo.cn'}}));
 assert.equal(response.status,200);assert.deepEqual(state.fx,[[8000,'cny','cny']]);
 assert.equal(state.session.metadata.wallet_currency,'CNY');assert.equal(state.session.payment_intent_data.metadata.wallet_currency,'CNY');
});


test('CNY direct-payment route converts the canonical CNY quote once and freezes its currency',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'keyvo-direct-currency-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const req=createRequire(resolve('frontend/package.json'));const output=join(dir,'direct.cjs');
 const state={fx:[] as unknown[][],quote:null as any,intent:null as any};(globalThis as any).__directCurrencyAudit=state;t.after(()=>delete (globalThis as any).__directCurrencyAudit);
 const mocks:Record<string,string>={
 '@/lib/customer-currency':"export const CUSTOMER_CURRENCY='CNY';",
 '@/server/engines':"export const getConfiguredEngine=async()=>({id:'fixture',label:'Fixture'});",
 '@/lib/wallet-direct-pricing':"export const resolveWalletDirectPricingGate=()=>({mode:'t2v'});",
 '@/app/api/generate/_lib/request-options':"export const buildGenerateRequestOptions=()=>({ok:true,options:{durationSec:5,pricingResolution:'720p',aspectRatio:'16:9',rawExtraInputValues:{}}});",
 '@/server/video-providers/byteplus-modelark':"export const resolveBytePlusSeedanceRouteProfile=()=>null;",
 '@/app/api/generate/_lib/extra-input-values':"export const validateExtraInputValues=()=>({ok:true,values:{}});",
 '@/lib/pricing-video-extras':"export const videoPricingExtras=()=>({});",
 '@/lib/pricing-addons':"export const applyEngineVariantPricing=e=>e;export const buildEngineAddonInput=()=>({});",
 '@/server/pricing/quote-billing':"export const computeCanonicalBillingSnapshot=async()=>({totalCents:800,currency:'CNY',meta:{pricingMode:'manual_tariff',customerTariffRevision:7}});",
 '@/server/pricing/wallet-direct-policy':"export const requireDisplayedWalletCustomerTariff=()=>null;export const walletCustomerPricingMetadata=()=>({});",
 '@/lib/exchange':"export const convertCents=async(...args)=>{globalThis.__directCurrencyAudit.fx.push(args);return {cents:args[0],rate:1,source:'identity'};};",
 '@/server/pricing/direct-payment-quotes':"export class DirectPaymentQuoteError extends Error{};export const saveDirectPaymentQuote=async q=>{globalThis.__directCurrencyAudit.quote=q;return q;};",
 '@/server/pricing/customer-tariff-revision':"export class CustomerTariffRevisionError extends Error{};",
 };
 await build({entryPoints:['frontend/server/wallet-direct-checkout.ts'],outfile:output,bundle:true,platform:'node',format:'cjs',tsconfig:'frontend/tsconfig.json',packages:'external',plugins:[{name:'direct-boundaries',setup(b){b.onResolve({filter:/.*/},a=>mocks[a.path]?{path:a.path,namespace:'fixture'}:undefined);b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:mocks[a.path],loader:'js',resolveDir:process.cwd()}));b.onResolve({filter:/^next\/server$/},a=>({path:req.resolve(a.path),external:true}));}}]});
 const {createWalletDirectPaymentIntent}=req(output);
 const response=await createWalletDirectPaymentIntent({req:{headers:{get:()=> '7'}},body:{engineId:'fixture',jobId:'fixture-job'},userId:'owner',resolvedCurrencyLower:'cny',resolvedCurrencyUpper:'CNY',currencyResolution:{currency:'cny',source:'default'},stripe:{paymentIntents:{create:async p=>{state.intent=p;return {id:'pi_fixture',client_secret:'fixture'};}}}});
 assert.equal(response.status,200);assert.deepEqual(state.fx,[[800,'cny','cny']]);
 assert.equal(state.quote.settlement.amountCents,800);assert.equal(state.intent.metadata.wallet_currency,'CNY');
 const payload=await response.json();assert.equal(payload.currency,'CNY');assert.equal(payload.amountCents,800);
});


test('CNY admin manual-credit endpoint defaults to CNY and refuses USD before creating a receipt',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'keyvo-admin-currency-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const req=createRequire(resolve('frontend/package.json'));const output=join(dir,'admin.cjs');
 const state={credits:[] as any[]};(globalThis as any).__adminCurrencyAudit=state;t.after(()=>delete (globalThis as any).__adminCurrencyAudit);
 const mocks:Record<string,string>={
 '@/lib/customer-currency':"export const CUSTOMER_CURRENCY='CNY';",
 '@/server/admin':"export const requireAdmin=async()=> 'admin';export const adminErrorToResponse=()=>new Response(null,{status:403});",
 '@/lib/wallet':"export const getWalletBalanceCents=async()=>({balanceCents:800,mock:false});",
 '@/server/wallet-summary':"export const getWalletSummary=async()=>({balanceCents:800,currency:'CNY'});",
 '@/lib/db':"export const query=async()=>[];",
 '@/server/admin-transactions':"export const issueManualWalletTopUp=async p=>{globalThis.__adminCurrencyAudit.credits.push(p);return {receiptId:1,createdAt:'fixture',amountCents:p.amountCents,currency:p.currency};};",
 '@/server/supabase-admin':"export const getUserIdentity=async()=>({email:'fixture@example.invalid'});",
 };
 await build({entryPoints:['frontend/app/api/admin/users/[userId]/wallet/route.ts'],outfile:output,bundle:true,platform:'node',format:'cjs',tsconfig:'frontend/tsconfig.json',packages:'external',plugins:[{name:'admin-boundaries',setup(b){b.onResolve({filter:/.*/},a=>mocks[a.path]?{path:a.path,namespace:'fixture'}:undefined);b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:mocks[a.path],loader:'js',resolveDir:process.cwd()}));b.onResolve({filter:/^next\/server$/},a=>({path:req.resolve(a.path),external:true}));}}]});
 const prior=process.env.DATABASE_URL;process.env.DATABASE_URL='fixture';t.after(()=>prior===undefined?delete process.env.DATABASE_URL:process.env.DATABASE_URL=prior);
 const {POST,GET}=req(output);const {NextRequest}=req('next/server');const request=body=>new NextRequest('https://app.keyvo.cn/api/admin/users/owner/wallet',{method:'POST',body:JSON.stringify(body)});
 const params={params:Promise.resolve({userId:'owner'})};
 const summary=await (await GET(request({}),params)).json();assert.equal(summary.currency,'CNY');assert.equal(summary.balanceCents,800);
 const response=await POST(request({amountCents:800}),params);assert.equal(response.status,200);assert.equal(state.credits[0].currency,'CNY');
 const refused=await POST(request({amountCents:800,currency:'USD'}),params);assert.equal(refused.status,400);assert.equal(state.credits.length,1);
});
