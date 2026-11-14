import './_setup-cny-env';
import assert from 'node:assert/strict';
import test from 'node:test';
import {createRequire} from 'node:module';
import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import {JSDOM} from 'jsdom';
import {CUSTOMER_CURRENCY,formatWalletBalance} from '../frontend/src/lib/customer-currency';
import {formatAssistanceUsdCents,formatAssistanceUsdRate} from '../frontend/src/lib/studio/assistance-money';
import {studioCreditTariffForModel,STUDIO_ASSISTANCE_CREDIT_TARIFF,STUDIO_ASSISTANCE_TARIFF,type StudioAssistanceStatus} from '../frontend/src/lib/studio/assistance-contract';

const base:StudioAssistanceStatus={enabled:true,policyVersion:'test',revision:3,selectedModel:'gpt-6.1-sol',mode:'paid_sol',tariff:STUDIO_ASSISTANCE_TARIFF,includedSol:{remainingPercent:72,renewal:'one_time'},sponsoredLuna:{remainingPercent:100,renewal:'one_time'},paid:{enabled:true,authorizedCents:300,spentCents:100,reservedCents:50,remainingCents:150,maxAdditionalBudgetCents:1800},unresolvedCalls:0,canContinue:true,blockedReason:null};
const withCredits:StudioAssistanceStatus={...base,tariff:STUDIO_ASSISTANCE_CREDIT_TARIFF,credits:{creditsPerDollar:1000,included:{total:500,remaining:360,reserved:0,period:'2026-10-01',renewsAt:'2026-11-01T00:00:00Z'},purchased:{total:2000,remaining:1280,reserved:0,packs:[{id:'first',amountCents:200,total:2000,remaining:1280,reserved:0,purchasedAt:'2026-10-05T00:00:00Z'}]}}};

test('the CNY build converts USD assistance cents and rates exactly once at 8 CNY per USD',()=>{
  assert.equal(CUSTOMER_CURRENCY,'CNY');
  assert.equal(formatAssistanceUsdCents(250),formatWalletBalance(20,'CNY'));
  assert.equal(formatAssistanceUsdCents(1),formatWalletBalance(0.08,'CNY'));
  assert.equal(formatAssistanceUsdRate(2.5),formatWalletBalance(20,'CNY'));
  assert.equal(formatAssistanceUsdRate(0.1),formatWalletBalance(0.8,'CNY'));
  assert.equal(formatAssistanceUsdRate(10),formatWalletBalance(80,'CNY'));
  for(const text of [formatAssistanceUsdCents(250),formatAssistanceUsdRate(5)])assert.doesNotMatch(text,/\$/);
});

for(const [name,status] of [['legacy budget dialog',base],['credits dialog',withCredits]] as const)for(const locale of ['en','zh'] as const)
test(`${name} (${locale}) shows no dollar sign and shows converted amounts in the CNY build`,async()=>{
  const require=createRequire(import.meta.url),oldCss=require.extensions['.css'];require.extensions['.css']=module=>{module.exports={};};
  const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost/app/studio',pretendToBeVisual:true});
  Object.assign(dom.window.HTMLDialogElement.prototype,{showModal(){this.open=true;},close(){this.open=false;}});
  const globals={window:dom.window,self:dom.window,document:dom.window.document,navigator:dom.window.navigator,HTMLElement:dom.window.HTMLElement,React,IS_REACT_ACT_ENVIRONMENT:true};
  const previous=new Map(Object.keys(globals).map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));for(const[key,value]of Object.entries(globals))Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});
  const root=createRoot(dom.window.document.getElementById('root')!);
  try{
    const {StudioAssistance}=await import('../frontend/app/(core)/(workspace)/app/studio/conversation/[projectId]/_components/StudioAssistance.client');
    await act(async()=>root.render(React.createElement(StudioAssistance,{status,locale,busy:false,error:null,conversationBusy:false,choose:async()=>true,refresh:async()=>{},onChoice:()=>{}})));
    const open=Array.from(dom.window.document.querySelectorAll('button')).find(el=>/settings and credits|设置|Milo/.test(el.getAttribute('aria-label')??''))!;
    await act(async()=>open.click());
    const text=dom.window.document.body.textContent??'';
    assert.doesNotMatch(text,/\$/);
    if(status.credits){
      const tariff=studioCreditTariffForModel('gpt-6.1-sol');
      for(const dollars of [tariff.noncachedInputUsdPerMillion,tariff.cachedInputUsdPerMillion,tariff.outputUsdPerMillion])assert.ok(text.includes(formatWalletBalance(dollars*8,'CNY')),'rate '+dollars);
      assert.ok(text.includes(formatWalletBalance(16,'CNY')),'pack price');
    }else{
      assert.ok(text.includes(formatWalletBalance(1.5*8,'CNY')),'remaining 150 USD cents -> 12 CNY');
      assert.ok(text.includes(formatWalletBalance(8,'CNY')),'1.00 USD spent -> 8 CNY');
      assert.ok(text.includes(formatWalletBalance(4,'CNY')),'0.50 USD reserved -> 4 CNY');
      for(const dollars of [7.5,0.3,30])assert.ok(text.includes(formatWalletBalance(dollars*8,'CNY')),'legacy rate '+dollars);
    }
  }finally{
    await act(async()=>root.unmount());
    for(const[key,desc]of previous){if(desc)Object.defineProperty(globalThis,key,desc);else delete (globalThis as Record<string,unknown>)[key];}
    if(oldCss)require.extensions['.css']=oldCss;else delete require.extensions['.css'];
    dom.window.close();
  }
});
