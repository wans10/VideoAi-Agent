import assert from 'node:assert/strict';
import test from 'node:test';
import { ENV } from '../frontend/src/lib/env';
import { resolveBytePlusTransport, resolveBytePlusPollTransport, assertBytePlusTransportConfigured, getBytePlusModelArkClient, buildBytePlusSeedancePayload } from '../frontend/src/server/video-providers/byteplus-modelark';

test('configured Seedance 2.5 edits submit once to ModelArk without LAS credentials and keep video references', async (t) => {
  const original = { transport: ENV.SEEDANCE_2_5_V2V_TRANSPORT, key: ENV.BYTEPLUS_ARK_API_KEY, base: ENV.BYTEPLUS_ARK_BASE_URL, las: ENV.BYTEPLUS_LAS_API_KEY };
  t.after(() => { ENV.SEEDANCE_2_5_V2V_TRANSPORT=original.transport; ENV.BYTEPLUS_ARK_API_KEY=original.key; ENV.BYTEPLUS_ARK_BASE_URL=original.base; ENV.BYTEPLUS_LAS_API_KEY=original.las; });
  ENV.SEEDANCE_2_5_V2V_TRANSPORT='modelark'; ENV.BYTEPLUS_ARK_API_KEY='fixture'; ENV.BYTEPLUS_ARK_BASE_URL='https://ark.example.test/api/v3'; ENV.BYTEPLUS_LAS_API_KEY=undefined;
  const transport=assertBytePlusTransportConfigured('seedance-2-5','v2v');
  assert.equal(transport,'modelark');
  const payload=buildBytePlusSeedancePayload({modelId:'doubao-seedance-2-5-260628',prompt:'Change the lighting',mode:'v2v',durationSec:4,resolution:'480p',ratio:'16:9',referenceVideoUrls:['https://media.example.test/source.mp4'],allowedDurationOptions:[4],allowedModes:['v2v'],allowedResolutions:['480p']});
  let calls=0;
  t.mock.method(globalThis,'fetch',async (url,init)=>{
    calls+=1;
    assert.equal(String(url),'https://ark.example.test/api/v3/contents/generations/tasks');
    assert.equal(new Headers(init?.headers).get('authorization'),'Bearer fixture');
    const body=JSON.parse(String(init?.body));
    assert.equal(body.model,'doubao-seedance-2-5-260628');
    assert.ok(body.content.some((item:any)=>item.role==='reference_video' && item.video_url?.url==='https://media.example.test/source.mp4'));
    assert.match(body.content[0].text,/Edit Video 1/);
    return Response.json({id:'cgt-edit',status:'queued'});
  });
  assert.equal((await getBytePlusModelArkClient(transport).createSeedanceFastTask(payload)).providerJobId,'cgt-edit');
  assert.equal(calls,1);
  assert.equal(resolveBytePlusPollTransport({providerJobId:'lsd-old',settingsSnapshot:{byteplusTransport:'las'}}),'las');
  assert.equal(resolveBytePlusPollTransport({providerJobId:'cgt-new',settingsSnapshot:{byteplusTransport:'modelark'}}),'modelark');
  ENV.SEEDANCE_2_5_V2V_TRANSPORT='invalid';
  assert.throws(()=>resolveBytePlusTransport('seedance-2-5','v2v'),/must be modelark or las/);
});
