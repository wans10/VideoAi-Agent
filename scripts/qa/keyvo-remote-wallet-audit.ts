import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {getDb,withDbTransaction} from '../../frontend/src/lib/db';
import {getWalletSummary} from '../../frontend/src/server/wallet-summary';
import {reserveWalletChargeInExecutor} from '../../frontend/src/lib/wallet';
import {chooseStudioAssistance,readStudioAssistanceStatus} from '../../frontend/src/server/studio/assistance-ledger';
import {studioAssistancePolicy} from '../../frontend/src/server/studio/assistance-policy';
async function main(){
 if(!process.env.DATABASE_URL)throw Error('DATABASE_URL must point to the authorized empty test database');
 const db=getDb(),owner=randomUUID(),result:any={kind:'real application remote CNY wallet and Studio credit validation',owner,checks:[]};
 try{
 assert.equal((await db.query('SELECT current_database() name')).rows[0].name,'test');
 await db.query("INSERT INTO app_receipts(user_id,type,amount_cents,currency) VALUES($1,'topup',20000,'CNY')",[owner]);
 assert.equal((await getWalletSummary(owner)).balanceCents,20000);result.checks.push('CNY wallet reads initial funding');
 const policy=studioAssistancePolicy({STUDIO_ASSISTANCE_ENABLED:'true'});
 for(const amountCents of [200,500,1000] as const){const before=await readStudioAssistanceStatus(owner,policy);const choice={action:'purchase_pack' as const,amountCents,expectedRevision:before.revision,tariffVersion:before.tariff.version,purchaseKey:randomUUID()};await chooseStudioAssistance(owner,choice,policy);await chooseStudioAssistance(owner,choice,policy);}
 const status=await readStudioAssistanceStatus(owner,policy);
 assert.equal(status.credits?.purchased.total,17000);assert.deepEqual(status.credits?.purchased.packs.map(p=>[p.amountCents,p.total,Math.abs(p.paidAmountCents!),p.paidCurrency]),[[200,2000,1600,'CNY'],[500,5000,4000,'CNY'],[1000,10000,8000,'CNY']]);
 assert.equal((await getWalletSummary(owner)).balanceCents,6400);result.checks.push('all three packs convert 8x once, preserve credits and replay without another debit');
 await assert.rejects(withDbTransaction(async tx=>{const debit=await reserveWalletChargeInExecutor(tx,{userId:owner,amountCents:100,currency:'CNY',description:'rollback audit',jobId:'rollback-'+randomUUID(),surface:'tool',billingProductKey:'studio_assistance_pack',pricingSnapshotJson:'{}',applicationFeeCents:null,vendorAccountId:null});assert.equal(debit.ok,true);throw Error('REMOTE_AUDIT_ROLLBACK');}),/REMOTE_AUDIT_ROLLBACK/);
 assert.equal((await getWalletSummary(owner)).balanceCents,6400);result.checks.push('real wallet debit rolls back with transaction');
 assert.equal((await getWalletSummary(owner+'-foreign')).balanceCents,0);result.checks.push('wallet reader isolates another account');
 await db.query("INSERT INTO app_receipts(user_id,type,amount_cents,currency) VALUES($1,'topup',777,'USD')",[owner]);
 const beforeMixed=await readStudioAssistanceStatus(owner,policy);
 await assert.rejects(chooseStudioAssistance(owner,{action:'purchase_pack',amountCents:200,expectedRevision:beforeMixed.revision,tariffVersion:beforeMixed.tariff.version,purchaseKey:randomUUID()},policy),(e:any)=>e.code==='PARAMETER_INVALID'&&e.nextAction?.reason==='wallet_currency_mismatch');
 assert.equal((await getWalletSummary(owner)).balanceCents,6400);result.checks.push('mixed-currency purchase refuses without debit and reports currency reconciliation instead of top-up');result.status='passed';
 }catch(e:any){result.status='failed';result.error={code:e.code,message:e.message};process.exitCode=1;}finally{if(process.env.KEYVO_REMOTE_AUDIT_OUTPUT)writeFileSync(process.env.KEYVO_REMOTE_AUDIT_OUTPUT,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));await db.end();}
}
main();
