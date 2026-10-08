import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import test from 'node:test';
import {startDisposablePostgres,createPaidGenerationTestSchema} from './helpers/disposable-postgres';
import {getDb} from '../frontend/src/lib/db';
import {CUSTOMER_CURRENCY} from '../frontend/src/lib/customer-currency';

test('CNY Sol packs debit 8x once, retain source credits, and display the actual frozen receipt',async t=>{
  if (CUSTOMER_CURRENCY !== 'CNY') { t.skip('Covered by the required explicit CNY CI lane'); return; }
  const pg=await startDisposablePostgres('keyvo-cny-packs'),previous=process.env.DATABASE_URL;
  process.env.DATABASE_URL=pg.databaseUrl;
  t.after(async()=>{await getDb().end();if(previous===undefined)delete process.env.DATABASE_URL;else process.env.DATABASE_URL=previous;await pg.cleanup();});
  await createPaidGenerationTestSchema(pg.pool);
  for(const file of ['54_studio_assistance_ledger.sql','62_studio_assistance_resolutions.sql','63_studio_assistance_credits.sql'])await pg.pool.query(readFileSync('neon/migrations/'+file,'utf8'));
  await pg.pool.query("INSERT INTO app_receipts(user_id,type,amount_cents,currency) VALUES('owner','topup',20000,'CNY')");
  const ledger=await import('../frontend/src/server/studio/assistance-ledger');
  const {studioAssistancePolicy}=await import('../frontend/src/server/studio/assistance-policy');
  const policy=studioAssistancePolicy({STUDIO_ASSISTANCE_ENABLED:'true'});
  for(const amountCents of [200,500,1000] as const){
    const before=await ledger.readStudioAssistanceStatus('owner',policy);
    const choice={action:'purchase_pack' as const,amountCents,expectedRevision:before.revision,tariffVersion:before.tariff.version,purchaseKey:randomUUID()};
    await ledger.chooseStudioAssistance('owner',choice,policy);
    await ledger.chooseStudioAssistance('owner',choice,policy);
  }
  const status=await ledger.readStudioAssistanceStatus('owner',policy);
  assert.equal(status.credits?.included.remaining,500);
  assert.equal(status.credits?.purchased.total,17000);
  assert.deepEqual(status.credits?.purchased.packs.map(p=>[p.amountCents,p.total,Math.abs(p.paidAmountCents!),p.paidCurrency]),[[200,2000,1600,'CNY'],[500,5000,4000,'CNY'],[1000,10000,8000,'CNY']]);
  const charges=(await pg.pool.query("SELECT amount_cents,currency,pricing_snapshot FROM app_receipts WHERE type='charge' ORDER BY id")).rows;
  assert.equal(charges.length,3);
  assert.deepEqual(charges.map(c=>Math.abs(c.amount_cents)),[1600,4000,8000]);
});
