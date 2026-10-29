import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {runInNewContext} from 'node:vm';
import React,{act} from '../frontend/node_modules/react';
import {createRoot} from '../frontend/node_modules/react-dom/client';
import {JSDOM} from 'jsdom';

// Runs the actual monitor owner with the upstream hook contract: the hook owns mediaReloadKeys and
// renewal reads (refresh({renewMediaId})); a renewed clip remounts its decoder under a new generation.
test('late errors from a retired decoder cannot close its renewed monitor, while a genuinely failed renewed decoder still closes',async()=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'https://app.keyvo.cn'});
 const saved=new Map(['window','document','navigator','IS_REACT_ACT_ENVIRONMENT'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 for(const [key,value] of Object.entries({window:dom.window,document:dom.window.document,navigator:dom.window.navigator,IS_REACT_ACT_ENVIRONMENT:true}))Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});
 const item={id:'clip',title:'Clip',track:'video',mediaKind:'video',startSec:0,durationSec:3,mediaUrl:'https://original.test/clip.mp4',mediaAccessRequired:true,mediaAccessUrl:'https://signed.test/clip.mp4',mediaAccessExpiresAt:new Date(Date.now()+300000).toISOString()};
 let settle:(applied:boolean)=>void=()=>{};let reads=0;
 const fixture:any={item,useState:React.useState,view:{data:{revision:1},settings:{fps:30,aspectRatio:'16:9',resolution:'720p'},items:[item]},layers:null,setKeys:null,keys:{},
  refresh:(options?:{renewMediaId?:string})=>{reads++;const renewId=options?.renewMediaId;return new Promise<boolean>(resolve=>{settle=applied=>{if(applied&&renewId)fixture.setKeys((previous:Record<string,number>)=>({...previous,[renewId]:(previous[renewId]??0)+1}));resolve(applied);};});}};
 const mocks:Record<string,string>={
  '../conversation-timeline.module.css':'export default {};',
  'next/navigation':'export const useRouter=()=>({push(){}});',
  '@/lib/i18n/I18nProvider':'export const useI18n=()=>({dictionary:{},locale:"en"});',
  '../../../_lib/studio-copy':'export const resolveStudioCopy=()=>({notices:{},viewer:{monitor:{}}});',
  '../_hooks/useConversationTimeline':'export const useConversationTimeline=()=>{const [mediaReloadKeys,setKeys]=fixture.useState({});fixture.setKeys=setKeys;fixture.keys=mediaReloadKeys;return {view:fixture.view,mediaReloadKeys,busy:false,edit(){},refresh:fixture.refresh};};',
  '../../../_shared/_hooks/useWorkspaceTimelinePlayback':'export const useWorkspaceTimelinePlayback=()=>({playheadSec:0,isTimelinePlaying:false,stopTimelinePlayback(){},setPlayheadSec(){}});',
  '../../../_shared/_components/viewer/useProgramPlaybackSync':'export const useProgramPlaybackSync=()=>({});',
  '../../../_shared/_components/viewer/ProgramPlaybackLayers':'export function ProgramPlaybackLayers(props){fixture.layers=props;return null;}',
  './ConversationExport.client':'export const ConversationExport=()=>null;',
 };
 const frontend=resolve('frontend');
 const bundled=await build({absWorkingDir:frontend,stdin:{contents:"export {ConversationTimeline} from './app/(core)/(workspace)/app/studio/conversation/[projectId]/_components/ConversationTimeline.client';",resolveDir:frontend,loader:'ts'},tsconfig:resolve(frontend,'tsconfig.json'),bundle:true,platform:'node',format:'cjs',write:false,packages:'external',loader:{'.css':'empty'},jsx:'automatic',plugins:[{name:'monitor-lifecycle',setup(b){b.onResolve({filter:/.*/},a=>mocks[a.path]?{path:a.path,namespace:'mock'}:undefined);b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:mocks[a.path],loader:'js'}));}}]});
 const module={exports:{}};runInNewContext(bundled.outputFiles[0].text,{module,exports:module.exports,require:createRequire(resolve('frontend/package.json')),fixture,console});
 const Component=(module.exports as any).ConversationTimeline;const root=createRoot(dom.window.document.getElementById('root')!);
 const render=()=>root.render(React.createElement(Component,{projectId:'fixture',projectName:'Film',refreshKey:0,onOpenLibrary(){},onExportChange(){}}));
 const monitor=()=>dom.window.document.querySelector('[aria-label="Film monitor"]');
 const open=async()=>{await act(async()=>{(dom.window.document.querySelector('button[aria-label="Open monitor"]') as HTMLButtonElement).click();});};
 try{
  await act(async()=>render());await open();
  // The decoder rendered in the first opening is the retired one; its handler is captured before any renewal.
  const retiredHandler=fixture.layers.onMediaAccessError;
  // A superseded signed URL is ignored and never starts a renewal.
  await act(async()=>retiredHandler(item,{generation:0,url:'https://signed.test/superseded'}));assert.equal(reads,0);assert.ok(monitor());
  // Duplicate errors while the single renewal read is in flight are one failure.
  await act(async()=>{retiredHandler(item,{generation:0,url:item.mediaAccessUrl});retiredHandler(item,{generation:0,url:item.mediaAccessUrl});});
  assert.equal(reads,1);assert.ok(monitor());
  // The renewal lands: the clip remounts under generation 1, so the retired decoder's delayed error is stale.
  await act(async()=>settle(true));
  assert.equal(fixture.keys.clip,1);assert.ok(monitor());
  await act(async()=>retiredHandler(item,{generation:0,url:item.mediaAccessUrl}));
  assert.equal(reads,1);assert.ok(monitor(),'A retired decoder cannot close the renewed monitor.');
  // A genuinely failed renewed decoder, even with the identical URL, must close because this opening's renewal is spent.
  const renewedHandler=fixture.layers.onMediaAccessError;
  await act(async()=>renewedHandler(item,{generation:1,url:item.mediaAccessUrl}));
  assert.equal(monitor(),null);assert.match(dom.window.document.body.textContent!,/This clip could not be played/);assert.equal(reads,1);
  // Reopening grants one fresh automatic renewal; a rejected read does not bump the generation.
  await open();await act(async()=>fixture.layers.onMediaAccessError(item,{generation:1,url:item.mediaAccessUrl}));assert.equal(reads,2);
  await act(async()=>settle(false));assert.equal(fixture.keys.clip,1,'A rejected read cannot be mistaken for a renewed source.');
  // Closing while a read is in flight must ignore that opening's completion. A rejected read leaves the monitor open, so collapse before reopening.
  await act(async()=>{(dom.window.document.querySelector('button[aria-label="Collapse monitor"]') as HTMLButtonElement).click();});
  await open();await act(async()=>fixture.layers.onMediaAccessError(item,{generation:1,url:item.mediaAccessUrl}));assert.equal(reads,3);
  await act(async()=>{(dom.window.document.querySelector('button[aria-label="Collapse monitor"]') as HTMLButtonElement).click();});
  await act(async()=>settle(true));assert.equal(monitor(),null);
 }finally{await act(async()=>root.unmount());dom.window.close();for(const [key,d] of saved){if(d)Object.defineProperty(globalThis,key,d);else Reflect.deleteProperty(globalThis,key);}}
});
