import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {getCurrentPriceUnavailableLabel} from '../frontend/app/(localized)/[locale]/(marketing)/ai-video-engines/[slug]/_lib/compare-page-pricing';

test('merged starter shelf renders Chinese labels and titles while preserving prompt selection',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'keyvo-shelf-render-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const req=createRequire(resolve('frontend/package.json'));const React=req('react');const {renderToStaticMarkup}=req('react-dom/server');
 const output=join(dir,'shelf.cjs');
 await build({entryPoints:['frontend/components/starters/StarterMediaShelf.client.tsx'],outfile:output,bundle:true,platform:'node',format:'cjs',jsx:'automatic',tsconfig:'frontend/tsconfig.json',plugins:[{name:'render-boundaries',setup(b){
 b.onResolve({filter:/^@\/lib\/i18n\/I18nProvider$/},()=>({path:'i18n',namespace:'fixture'}));
 b.onResolve({filter:/^\.\/useStarterMedia$/},()=>({path:'items',namespace:'fixture'}));
 b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:a.path==='i18n'?"export const useI18n=()=>({locale:'zh'});":`import {BUILTIN_STARTER_MEDIA} from ${JSON.stringify(resolve('frontend/lib/starter-media.ts'))};export const useStarterMedia=s=>BUILTIN_STARTER_MEDIA[s];`,loader:'ts',resolveDir:process.cwd()}));
 b.onResolve({filter:/^(react(?:\/.*)?|next\/image)$/},a=>({path:req.resolve(a.path),external:true}));
 }}]});
 const {StarterMediaShelf}=req(output);const html=renderToStaticMarkup(React.createElement(StarterMediaShelf,{surface:'image'}));
 for(const text of ['创作您的版本','创意示例','深夜洗衣房','使用此提示词'])assert.ok(html.includes(text),text);
 assert.ok(!html.includes('Make it your own'));assert.ok(!html.includes('Night shift'));
});

test('Chinese compare quote failure never falls back to an English customer price message',()=>{
 assert.equal(getCurrentPriceUnavailableLabel('zh'),'当前价格暂不可用');
});

test('actual model catalogue image cards display the quoted CNY currency without USD symbol or double conversion',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'keyvo-catalog-price-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const req=createRequire(resolve('frontend/package.json'));const output=join(dir,'cards.cjs');
 await build({entryPoints:['frontend/app/(localized)/[locale]/(marketing)/models/_lib/models-catalog-cards.ts'],outfile:output,bundle:true,platform:'node',format:'cjs',tsconfig:'frontend/tsconfig.json',packages:'external',plugins:[{name:'quoted-range-fixture',setup(b){
 b.onResolve({filter:/^server-only$/},()=>({path:'server-only',namespace:'empty'}));b.onLoad({filter:/.*/,namespace:'empty'},()=>({contents:'',loader:'js'}));
 b.onResolve({filter:/^@\/lib\/pricing-marketing$/},()=>({path:'price',namespace:'fixture'}));
 b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:"export const computeMarketingPriceRange=async()=>({currency:'CNY',min:{cents:24},max:{cents:24}});",loader:'js',resolveDir:process.cwd()}));
 b.onResolve({filter:/^(react(?:\/.*)?|lucide-react|clsx)$/},a=>({path:req.resolve(a.path),external:true}));
 }}]});
 const {buildModelsCatalogCards}=req(output);
 const cards=await buildModelsCatalogCards({activeLocale:'zh',engineMetaCopy:{},galleryCopy:{},scope:'image'});
 assert.ok(cards.length>0);
 for(const card of cards){const serialized=JSON.stringify(card);assert.ok(!serialized.includes('$0.24'),card.id);assert.ok(serialized.includes('0.24'),card.id);}
});


test('admin wallet metrics and individual historical receipts retain their actual currency',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'keyvo-admin-render-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const req=createRequire(resolve('frontend/package.json'));const React=req('react');const {renderToStaticMarkup}=req('react-dom/server');const output=join(dir,'admin.cjs');
 await build({stdin:{contents:"export {buildMemberPulseItems} from './frontend/app/(core)/admin/users/[userId]/_lib/admin-user-detail-metrics';export {AdminUserWalletLedgerSection} from './frontend/app/(core)/admin/users/[userId]/_components/AdminUserWalletLedgerSection';export {ManualCreditForm} from './frontend/components/admin/ManualCreditForm';",resolveDir:process.cwd()},outfile:output,bundle:true,platform:'node',format:'cjs',jsx:'automatic',tsconfig:'frontend/tsconfig.json',packages:'external',plugins:[{name:'admin-render-boundaries',setup(b){
 b.onResolve({filter:/^@\/lib\/customer-currency$/},()=>({path:'currency',namespace:'fixture'}));
 b.onResolve({filter:/^next\/navigation$/},()=>({path:'navigation',namespace:'fixture'}));
 b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:a.path==='currency'?"export const CUSTOMER_CURRENCY='CNY';":"export const useRouter=()=>({refresh(){}});",loader:'js'}));
 b.onResolve({filter:/^(react(?:\/.*)?|lucide-react|clsx)$/},a=>({path:req.resolve(a.path),external:true}));
 }}]});
 const {buildMemberPulseItems,AdminUserWalletLedgerSection,ManualCreditForm}=req(output);
 const amounts={lifetimeTopupsUsd:8,lifetimeChargesUsd:3,lifetimeCreditReversalsUsd:0,lifetimeRefundsUsd:1,lifetimeNetSpendUsd:2};
 const wallet={balanceCents:600,stats:{}};
 const metrics=buildMemberPulseItems({userId:'owner',profile:null,usage:null,wallet,...amounts});
 assert.match(metrics.find(x=>x.label==='Wallet balance').value,/CN¥6\.00/);
 const html=renderToStaticMarkup(React.createElement(AdminUserWalletLedgerSection,{wallet,...amounts,topups:[{id:1,createdAt:null,amountUsd:8,currency:'CNY'},{id:2,createdAt:null,amountUsd:2,currency:'USD'}]}));
 assert.ok(html.includes('CN¥8.00'));assert.ok(html.includes('$2.00'));assert.ok(!html.includes('$8.00'));
 const form=renderToStaticMarkup(React.createElement(ManualCreditForm,{userId:'owner'}));assert.match(form,/Amount .*CNY/);assert.ok(!form.includes('Amount (USD)'));
});


test('current Studio access renders Chinese sign-in, available and unavailable states and preserves return target',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'keyvo-studio-access-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const req=createRequire(resolve('frontend/package.json'));const React=req('react');const {renderToStaticMarkup}=req('react-dom/server');const output=join(dir,'studio.cjs');
 const mocks:Record<string,string>={
 '@/lib/i18n/I18nProvider':"export const useI18n=()=>({locale:'zh'});",
 'next/navigation':"export const usePathname=()=>'/app/studio';export const useSearchParams=()=>new URLSearchParams('preview=1&brief=fixture');export const useRouter=()=>({refresh(){}});",
 'next/link':"import React from 'react';export default function Link({children,prefetch,...p}){return React.createElement('a',p,children);}",
 'next/image':"import React from 'react';export default function Image({fill,...p}){return React.createElement('img',p);}",
 };
 await build({entryPoints:['frontend/app/(core)/(workspace)/app/studio/_components/StudioPreviewAccess.client.tsx'],outfile:output,bundle:true,platform:'node',format:'cjs',jsx:'automatic',tsconfig:'frontend/tsconfig.json',packages:'external',loader:{'.css':'empty'},plugins:[{name:'studio-access-boundaries',setup(b){b.onResolve({filter:/.*/},a=>mocks[a.path]?{path:a.path,namespace:'fixture'}:undefined);b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:mocks[a.path],loader:'js',resolveDir:process.cwd()}));b.onResolve({filter:/^(react(?:\/.*)?|lucide-react)$/},a=>({path:req.resolve(a.path),external:true}));}}]});
 const Access=req(output).default;
 const visitor=renderToStaticMarkup(React.createElement(Access,{visitor:true}));assert.ok(visitor.includes('登录 Studio'));assert.ok(!visitor.includes('Sign in to Studio'));assert.ok(visitor.includes('brief%3Dfixture'));assert.ok(!visitor.includes('preview%3D1'));
 const available=renderToStaticMarkup(React.createElement(Access,{available:true}));assert.ok(available.includes('打开 Studio'));
 const unavailable=renderToStaticMarkup(React.createElement(Access));assert.ok(unavailable.includes('Studio 暂时不可用'));assert.ok(unavailable.includes('重试'));
});
