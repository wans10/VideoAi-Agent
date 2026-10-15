import assert from 'node:assert/strict';
import test from 'node:test';
import {BytePlusModelArkClient} from '../frontend/src/server/video-providers/byteplus-modelark';
import {buildBytePlusSeedancePayload} from '../frontend/src/server/video-providers/byteplus-modelark-payload';
import {seedance25EditQuoteDuration} from '../frontend/server/seedance25-edit-duration';
import {ENV} from '../frontend/src/lib/env';

/** The source-length quote is ModelArk Edit semantics; LAS (the default v2v transport) prices the requested output plus continuous input seconds. */
async function withModelArkEditTransport(work:()=>Promise<void>){
 const flags={SEEDANCE_2_5_EDIT_TRANSPORT:'modelark',SEEDANCE_2_5_MODELARK_EDIT_ENABLED:'true'};
 const before=Object.fromEntries(Object.keys(flags).map(key=>[key,ENV[key as keyof typeof ENV]]));
 Object.assign(ENV,flags);
 try{await work();}finally{Object.assign(ENV,before);}
}

test('actual ModelArk HTTP bodies follow Seedance 2.5 task-type constraints for all modes',async()=>{
 const original=globalThis.fetch;const sent:any[]=[];
 globalThis.fetch=async(input,options)=>{assert.equal(String(input),'https://ark.test/api/v3/contents/generations/tasks');assert.equal(new Headers(options?.headers).get('authorization'),'Bearer offline');sent.push(JSON.parse(String(options?.body)));return new Response(JSON.stringify({id:'offline-task',status:'queued'}),{status:200});};
 try{
  const client=new BytePlusModelArkClient({apiKey:'offline',baseUrl:'https://ark.test/api/v3'});
  for(const mode of ['t2v','i2v','ref2v','v2v','extend'] as const){
   // Seedance 2.5 edit semantics (adaptive ratio, duration=-1, omni edit) are ModelArk-only; the LAS path is asserted below.
   const payload=buildBytePlusSeedancePayload({seedance25:true,modelId:'account-endpoint',prompt:'修改视频，保留其他内容',mode,...(mode==='v2v'?{transport:'modelark' as const}:{}),durationSec:8,ratio:'16:9',resolution:'720p',imageUrl:'https://assets.test/start.png',referenceImageUrls:['https://assets.test/ref.png'],referenceVideoUrls:['https://assets.test/source.mp4'],allowedModes:['t2v','i2v','ref2v','v2v','extend'],allowedDurationOptions:[8]});
   await client.createSeedanceFastTask(payload);
   const body=sent.at(-1);
   assert.equal(body.ratio,['i2v','v2v','extend'].includes(mode)?'adaptive':'16:9',mode);
   assert.equal(body.duration,mode==='v2v'?-1:8,mode);
   assert.equal(body.omni_reference_task_type,mode==='ref2v'?'reference':mode==='v2v'?'edit':mode==='extend'?'extend':undefined,mode);
   if(mode==='v2v'||mode==='extend')assert.ok(body.content.some((v:any)=>v.role==='reference_video'));
  }
  // LAS (no ModelArk transport) keeps the requested ratio/duration and sends no edit task type.
  for(const transport of [undefined,'las'] as const){
   const payload=buildBytePlusSeedancePayload({seedance25:true,modelId:'account-endpoint',prompt:'修改视频，保留其他内容',mode:'v2v',...(transport?{transport}:{}),durationSec:8,ratio:'16:9',resolution:'720p',referenceVideoUrls:['https://assets.test/source.mp4'],allowedModes:['v2v'],allowedDurationOptions:[8]});
   assert.equal(payload.duration,8,String(transport));
   assert.equal(payload.ratio,'16:9',String(transport));
   assert.equal(payload.omni_reference_task_type,undefined,String(transport));
   assert.ok(payload.content.some(v=>v.type==='video_url'&&v.role==='reference_video'),String(transport));
  }
  const old=buildBytePlusSeedancePayload({modelId:'seedance-2-0',prompt:'Edit',durationSec:8,mode:'v2v',referenceVideoUrls:['https://assets.test/source.mp4'],ratio:'16:9',allowedDurationOptions:[8]});
  assert.equal(old.duration,8);assert.equal(old.ratio,'16:9');assert.equal(old.omni_reference_task_type,undefined);
 }finally{globalThis.fetch=original;}
});

test('edit tariff timing uses verified source boundaries and never caller or provider sentinel values',()=>{
 for(const [source,want] of [[4,4],[4.01,5],[8.8,9],[30,30]])assert.equal(seedance25EditQuoteDuration('seedance-2-5','v2v',source),want);
 for(const source of [undefined,null,NaN,Infinity,-1,3.99,30.01])assert.throws(()=>seedance25EditQuoteDuration('seedance-2-5','v2v',source));
 assert.equal(seedance25EditQuoteDuration('seedance-2-0','v2v',undefined),undefined);
 assert.equal(seedance25EditQuoteDuration('seedance-2-5','extend',undefined),undefined);
});

test('ModelArk canonical preparation uses source duration and refuses missing or mismatched owned measurements',async()=>{await withModelArkEditTransport(async()=>{
 const {priceCanonicalGeneration}=await import('../frontend/src/server/agent-api/generation-pricing');
 const assetId='ma_'+'a'.repeat(32);
 const request={schemaVersion:1 as const,surface:'video' as const,engineId:'seedance-2-5',mode:'v2v' as const,prompt:'修改视频背景',settings:{durationSec:4,resolution:'720p',aspectRatio:'16:9',audio:true},references:[{kind:'asset' as const,assetId,role:'source' as const}],outputCount:1};
 const source={assetId,role:'source' as const,mediaKind:'video' as const,storageUrl:'https://assets.test/edit.mp4',mimeType:'video/mp4',width:1280,height:720,durationSec:8.25};
 let calls=0;
 const dependencies={computeVideoPreflight:async(input:any,options:any)=>{calls++;assert.equal(input.durationSec,9);assert.equal(options.trustedMediaPricingFacts.inputVideoDurationSec,8.25);return {ok:true,total:123,currency:'USD',pricing:{totalCents:123,currency:'USD',membershipTier:'member'}} as never;},estimateImage:async()=>{throw new Error('unexpected image');}};
 await priceCanonicalGeneration(request,'member',dependencies,{resolvedReferences:[source]});
 for(const references of [undefined,[],[{...source,durationSec:null}],[{...source,assetId:'other'}],[source,source]])await assert.rejects(priceCanonicalGeneration(request,'member',dependencies,{resolvedReferences:references}));
 assert.equal(calls,1);assert.equal(request.settings.durationSec,4,'Caller identity stays immutable.');
});});

test('ModelArk confirmed transaction quotes the same verified edit timing as preparation',async()=>{await withModelArkEditTransport(async()=>{
 const {priceCanonicalGenerationInExecutor}=await import('../frontend/src/server/agent-api/generation-pricing');
 const {getFalEngineById}=await import('../frontend/src/config/falEngines');
 const engine=getFalEngineById('seedance-2-5')!.engine;
 const assetId='ma_'+'a'.repeat(32);
 const request={schemaVersion:1 as const,surface:'video' as const,engineId:engine.id,mode:'v2v' as const,prompt:'修改视频背景',settings:{durationSec:4,resolution:'720p',aspectRatio:'16:9',audio:true},references:[{kind:'asset' as const,assetId,role:'source' as const}],outputCount:1};
 const source={assetId,role:'source' as const,mediaKind:'video' as const,storageUrl:'https://assets.test/edit.mp4',mimeType:'video/mp4',width:1280,height:720,durationSec:8.25};
 let calls=0;
 await priceCanonicalGenerationInExecutor(request,'member',{
  candidate:{engine,surface:'video',publicModes:['v2v'],modeCaps:{}},executor:{query:async()=>[]} as never,resolvedReferences:[source],
  computeBillingSnapshot:async input=>{calls++;assert.equal(input.durationSec,9);assert.equal(input.inputVideoDurationSec,8.25);return {totalCents:123,currency:'USD',membershipTier:'member'} as never;},
 });
 assert.equal(calls,1);
});});
