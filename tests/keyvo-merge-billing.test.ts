import assert from 'node:assert/strict';
import test from 'node:test';
import { llmhubOrderWalletCurrency } from '../frontend/server/llmhub-pay/orders';
import { submitImageGeneration } from '../frontend/lib/image-generation-client';
import { CUSTOMER_TARIFF_REVISION_HEADER } from '../frontend/lib/customer-tariff-revision';
import type { PricingSnapshot } from '@maxvideoai/pricing';

test('settlement currency follows the saved order across USD/CNY deployments and rejects ambiguous history',()=>{
  assert.equal(llmhubOrderWalletCurrency({walletCurrency:'USD'}),'USD');
  assert.equal(llmhubOrderWalletCurrency({walletCurrency:'CNY'}),'CNY');
  assert.equal(llmhubOrderWalletCurrency({source:'identity',rateWithMargin:1}),'CNY');
  assert.equal(llmhubOrderWalletCurrency({source:'open-exchange',rateWithMargin:7.25}),'USD');
  assert.throws(()=>llmhubOrderWalletCurrency({rateWithMargin:7.25}),/currency_unknown/);
});

test('image recovery preserves tariff revision and rejects a stale quote without another paid POST',async()=>{
  let posts=0,reads=0;
  const snapshot={meta:{pricingMode:'manual_tariff',customerTariffRevision:19}} as PricingSnapshot;
  await assert.rejects(submitImageGeneration({jobId:'test',engineId:'qwen-image-3-0',mode:'t2i',prompt:'cup'}, {
    fetch:async(_url,init)=>{posts++;assert.equal((init?.headers as Record<string,string>)[CUSTOMER_TARIFF_REVISION_HEADER],'19');return Response.json({ok:false,error:{code:'PRICING_REFRESH_REQUIRED',message:'Refresh quote'}},{status:409});},
    getStatus:async()=>{reads++;throw new Error('Must not poll rejected quote');},
  },snapshot),/Refresh quote/);
  assert.equal(posts,1);assert.equal(reads,0);
});
