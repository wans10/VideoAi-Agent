import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {CUSTOMER_CURRENCY} from '../frontend/src/lib/customer-currency';
import {getDb} from '../frontend/src/lib/db';
import {STUDIO_ASSISTANCE_TARIFF} from '../frontend/src/lib/studio/assistance-contract';
import {chooseStudioAssistance,openStudioAssistanceTurn,reserveStudioAssistanceCall,settleStudioAssistanceCall} from '../frontend/src/server/studio/assistance-ledger';
import {applyStudioAssistanceResolution,inspectStudioAssistanceResolution} from '../frontend/src/server/studio/assistance-resolution';
import {createPaidGenerationTestSchema,startDisposablePostgres} from './helpers/disposable-postgres';

test('CNY legacy assistance converts wallet reservation, settlement and waiver once, preserving USD tariff/provider facts',async t=>{
  if(CUSTOMER_CURRENCY!=='CNY'){t.skip('Requires explicit CNY lane');return;}
  const pg=await startDisposablePostgres('keyvo-cny-assistance'),previous=process.env.DATABASE_URL;
  process.env.DATABASE_URL=pg.databaseUrl;
  t.after(async()=>{await getDb().end();if(previous===undefined)delete process.env.DATABASE_URL;else process.env.DATABASE_URL=previous;await pg.cleanup();});
  await createPaidGenerationTestSchema(pg.pool);
  await pg.pool.query('CREATE TABLE studio_projects(id text PRIMARY KEY,user_id text,name text,deleted_at timestamptz);CREATE TABLE studio_sequences(id text PRIMARY KEY)');
  for(const file of ['50_studio_image_conversation.sql','51_studio_image_model_usage.sql','42_studio_connected_montages.sql','52_studio_conversation_runs.sql','54_studio_assistance_ledger.sql','62_studio_assistance_resolutions.sql'])await pg.pool.query(readFileSync('neon/migrations/'+file,'utf8'));
  const policy={enabled:true,solAllowanceNanoUsd:1e9,lunaAllowanceNanoUsd:1e9,campaignNanoUsd:1e11,maxAdditionalBudgetCents:2000};
  const actor={userId:randomUUID(),projectId:randomUUID(),authMethod:'studio-session' as const,clientId:null};
  await pg.pool.query("INSERT INTO app_receipts(user_id,type,amount_cents,currency) VALUES($1,'topup',8000,'CNY')",[actor.userId]);
  await chooseStudioAssistance(actor.userId,{action:'authorize_paid',budgetCents:100,tariffVersion:STUDIO_ASSISTANCE_TARIFF.version,expectedRevision:0},policy);
  const reserve=async()=>{const requestId=randomUUID();await openStudioAssistanceTurn(actor,requestId,policy);return reserveStudioAssistanceCall({...actor,requestId,leaseId:randomUUID(),index:0,inputTokens:1000,outputTokens:1000},policy);};
  const first=await reserve();assert.equal(first.reserved_cents,4);
  const evidence={id:randomUUID(),model:'gpt-6.1-sol',service_tier:'default',usage:{input_tokens:40,input_tokens_details:{cached_tokens:0},output_tokens:0}};
  await settleStudioAssistanceCall(first.id,actor.userId,evidence);await settleStudioAssistanceCall(first.id,actor.userId,evidence);
  const receipts=async()=>(await pg.pool.query('SELECT type,amount_cents,currency FROM app_receipts WHERE user_id=$1 ORDER BY id',[actor.userId])).rows;
  assert.deepEqual(await receipts(),[{type:'topup',amount_cents:8000,currency:'CNY'},{type:'charge',amount_cents:32,currency:'CNY'},{type:'refund',amount_cents:24,currency:'CNY'}]);
  const stored=(await pg.pool.query('SELECT charged_cents,tariff_basis_nano_usd,pricing_snapshot FROM studio_assistance_calls WHERE id=$1',[first.id])).rows[0];
  assert.equal(stored.charged_cents,1);assert.equal(stored.pricing_snapshot.currency,'USD');assert.ok(Number(stored.tariff_basis_nano_usd)>0);
  const unknown=await reserve();
  const preview=await inspectStudioAssistanceResolution(unknown.id,'waive_unknown');assert.equal(preview.refundCents,4);assert.equal(preview.refundWalletCents,32);assert.equal(preview.refundCurrency,'CNY');
  const approval={callId:unknown.id,action:'waive_unknown' as const,expectedFingerprint:preview.fingerprint,operator:'test',reason:'Disposable unknown outcome'};
  await applyStudioAssistanceResolution(approval);await applyStudioAssistanceResolution(approval);
  assert.equal((await receipts()).filter(r=>r.type==='refund').length,2);
  assert.equal((await receipts()).at(-1)?.amount_cents,32);
  // An older USD reservation must refund USD even under a CNY customer build.
  const historical=await reserve();
  await pg.pool.query("UPDATE app_receipts SET amount_cents=$2,currency='USD',pricing_snapshot=NULL WHERE id::text=$1",[historical.charge_receipt_id,historical.reserved_cents]);
  await settleStudioAssistanceCall(historical.id,actor.userId,{...evidence,id:randomUUID()});
  assert.deepEqual((await receipts()).at(-1),{type:'refund',amount_cents:3,currency:'USD'});
  const corrupt=await reserve();
  await pg.pool.query("UPDATE app_receipts SET pricing_snapshot='{}'::jsonb WHERE id::text=$1",[corrupt.charge_receipt_id]);
  await assert.rejects(settleStudioAssistanceCall(corrupt.id,actor.userId,{...evidence,id:randomUUID()}),/inconsistent/);
  assert.equal((await pg.pool.query('SELECT state FROM studio_assistance_calls WHERE id=$1',[corrupt.id])).rows[0].state,'reserved');
  await pg.pool.query("INSERT INTO app_receipts(user_id,type,amount_cents,currency) VALUES($1,'topup',100,'USD')",[actor.userId]);
  await assert.rejects(reserve(),(error:any)=>error.nextAction?.reason==='wallet_currency_mismatch');
});
