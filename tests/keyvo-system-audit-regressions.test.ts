import assert from 'node:assert/strict';
import test from 'node:test';
import {extractQwenImageResult,QwenImageError,callQwenImage,buildQwenImagePayload} from '../frontend/src/server/images/alibaba-qwen-image-client';
import {executeAlibabaQwenImageGeneration} from '../frontend/src/server/images/alibaba-qwen-image-execution';
import {listFalEngines} from '../frontend/src/config/falEngines';
import type {PricingSnapshot} from '../frontend/types/engines';

const entry=listFalEngines().find(x=>x.id==='qwen-image-3-0')!;
const pricing={totalCents:24,currency:'CNY'} as PricingSnapshot;
const params:Parameters<typeof executeAlibabaQwenImageGeneration>[0]={
 billingProductKey:null,characterReferenceCount:0,combinedImageUrls:[],costBreakdownJson:null,effectivePrompt:'A cup',engine:entry.engine,engineEntry:entry,indexable:false,jobId:'audit-qwen',jobSurface:'image',limitGenerations:false,maskUrl:null,mode:'t2i',normalizedSeed:null,numImages:1,outputFormat:'png',priceOnlyReceipts:true,pricing,pricingSnapshotJson:JSON.stringify(pricing),quality:null,refundDescription:'Refund',resolvedAspectRatio:'1:1',resolution:'1k',thinkingLevel:null,userId:'audit-owner',vendorAccountId:null,visibility:'private',watermark:false,pendingReceipt:{userId:'audit-owner',amountCents:24,currency:'CNY',description:'Image',jobId:'audit-qwen',surface:'image',billingProductKey:null,snapshot:pricing,applicationFeeCents:null,vendorAccountId:null},
};
const success={request_id:'accepted-id',output:{choices:[{message:{content:[{image:'https://example.com/output.png'}]}}]}};

test('Qwen rejects malformed request identities before using them as durable reconciliation keys',()=>{
 for(const request_id of [42,{},[],true,'','  ','id\nforged'])assert.throws(()=>extractQwenImageResult({...success,request_id} as never),QwenImageError);
});

test('Qwen HTTP rejection with diagnostic request id refunds exactly once instead of permanent paid quarantine',async()=>{
 let refunds=0,pending=0,calls=0;
 await assert.rejects(executeAlibabaQwenImageGeneration(params,{
 getConfig:()=>({apiKey:'fixture',baseUrl:'https://dashscope.aliyuncs.com'}),
 callProvider:async()=>{calls++;return callQwenImage({apiKey:'fixture',baseUrl:'https://dashscope.aliyuncs.com'},buildQwenImagePayload({modelId:'qwen-image-3.0',prompt:'cup',mode:'t2i',imageUrls:[],resolution:'1k',aspectRatio:'1:1',numImages:1,seed:null,watermark:false}),async()=>Response.json({code:'InvalidParameter',message:'Rejected',request_id:'diagnostic-id'},{status:400}));},
 queryFn:async(sql)=>{if(sql.includes("status='pending'"))pending++;return [];},
 fail:async()=>{refunds++;return {message:'Rejected',providerBody:null,providerStatus:400};},
 }),/Rejected/);
 assert.equal(calls,1);assert.equal(refunds,1);assert.equal(pending,0);
});

test('Qwen arbitrary 4xx after an attempted call remains uncertain without authoritative rejection evidence',async()=>{
 let refunds=0,pending=0;
 await assert.rejects(executeAlibabaQwenImageGeneration(params,{
 getConfig:()=>({apiKey:'fixture',baseUrl:'https://dashscope.aliyuncs.com'}),
 callProvider:async()=>{throw new QwenImageError('Proxy rejected',400,{request_id:'diagnostic'});},
 queryFn:async(sql)=>{if(sql.includes("status='pending'"))pending++;return [];},
 fail:async()=>{refunds++;throw new Error('must not refund');},
 }),/reconciliation/);
 assert.equal(refunds,0);assert.equal(pending,1);
});
