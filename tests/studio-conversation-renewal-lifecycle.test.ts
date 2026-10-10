import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {runInNewContext} from 'node:vm';
import React,{act} from '../frontend/node_modules/react';
import {createRoot} from '../frontend/node_modules/react-dom/client';
import {JSDOM} from 'jsdom';

// Runs the actual monitor owner; only unrelated hooks/layers are injected.
test('late errors from a retired decoder cannot close its renewed monitor, including same-URL recovery',async()=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'https://app.keyvo.cn'});
 const saved=new Map(['window','document','navigator','IS_REACT_ACT_ENVIRONMENT'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 for(const [key,value] of Object.entries({window:dom.window,document:dom.window.document,navigator:dom.window.navigator,IS_REACT_ACT_ENVIRONMENT:true}))Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});
 const item={id:'clip',title:'Clip',track:'video',mediaKind:'video',startSec:0,durationSec:3,mediaUrl:'https://original.test/clip.mp4',mediaAccessRequired:true,mediaAccessUrl:'https://signed.test/clip.mp4',mediaAccessExpiresAt:new Date(Date.now()+300000).toISOString()};
 let settle:(applied:boolean)=>void=()=>{};let reads=0;
 const fixture:any={item,view:{data:{revision:1},settings:{fps:30,aspectRatio:'16:9',resolution:'720p'},items:[item]},layers:null,refresh:()=>{reads++;return new Promise<boolean>(resolve=>{settle=resolve;});}};
 const mocks:Record<string,string>={
  '../conversation-timeline.module.css':'export default {};',
  'next/navigation':'export const useRouter=()=>({push(){}});',
  '@/lib/i18n/I18nProvider':'export const useI18n=()=>({dictionary:{},locale:"en"});',
  '../../../_lib/studio-copy':'export const resolveStudioCopy=()=>({notices:{},viewer:{monitor:{}}});',
  '../_hooks/useConversationTimeline':'export const useConversationTimeline=()=>({view:fixture.view,busy:false,edit(){},refresh:fixture.refresh});',
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
  const oldHandler=fixture.layers.onMediaAccessError;
  await act(async()=>oldHandler(item,{generation:0,url:'https://signed.test/superseded'}));assert.equal(reads,0);assert.ok(monitor());
  await act(async()=>{oldHandler(item,{generation:0,url:item.mediaAccessUrl});oldHandler(item,{generation:0,url:item.mediaAccessUrl});});
  assert.equal(reads,1);assert.ok(monitor());
  // Resolve network first, then deliver the failed OLD decoder's delayed error.
  // This reproduces the gap that the previous pending-only guard did not cover.
  await act(async()=>{settle(true);await Promise.resolve();oldHandler(item,{generation:0,url:item.mediaAccessUrl});});
  assert.ok(monitor());assert.equal(fixture.layers.mediaReloadKeys.clip,1);
  await act(async()=>oldHandler(item,{generation:0,url:item.mediaAccessUrl}));assert.ok(monitor());
  // A genuinely failed NEW decoder, even with an identical URL, must close.
  await act(async()=>fixture.layers.onMediaAccessError(item,{generation:1,url:item.mediaAccessUrl}));
  assert.equal(monitor(),null);assert.match(dom.window.document.body.textContent!,/This clip could not be played/);assert.equal(reads,1);
  await open();await act(async()=>fixture.layers.onMediaAccessError(item,{generation:1,url:item.mediaAccessUrl}));assert.equal(reads,2);
  // A rejected/discarded read cannot be mistaken for a usable renewed source.
  await act(async()=>settle(false));assert.equal(monitor(),null);
  // Closing while a read is in flight must ignore that opening's completion.
  await open();await act(async()=>fixture.layers.onMediaAccessError(item,{generation:2,url:item.mediaAccessUrl}));
  await act(async()=>{(dom.window.document.querySelector('button[aria-label="Collapse monitor"]') as HTMLButtonElement).click();});
  await act(async()=>settle(true));assert.equal(monitor(),null);
 }finally{await act(async()=>root.unmount());dom.window.close();for(const [key,d] of saved){if(d)Object.defineProperty(globalThis,key,d);else Reflect.deleteProperty(globalThis,key);}}
});
