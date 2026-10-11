import assert from 'node:assert/strict';
import test from 'node:test';
import {sameStudioProjectAssetReference} from '../frontend/src/server/studio/project-asset-media-facts';
test('media reference identity ignores JSON key order and separates source, output and kind',()=>{
 assert.equal(sameStudioProjectAssetReference({kind:'video',type:'asset',assetId:'a'},{assetId:'a',type:'asset',kind:'video'}),true);
 assert.equal(sameStudioProjectAssetReference({kind:'video',type:'job-output',outputId:'o',jobId:'j'},{type:'job-output',jobId:'j',outputId:'o',kind:'video'}),true);
 assert.equal(sameStudioProjectAssetReference({type:'asset',assetId:'a',kind:'video'},{type:'asset',assetId:'b',kind:'video'}),false);
 assert.equal(sameStudioProjectAssetReference({type:'asset',assetId:'a',kind:'video'},{type:'asset',assetId:'a',kind:'image'}),false);
 assert.equal(sameStudioProjectAssetReference({type:'job-output',jobId:'j',outputId:'o',kind:'video'},{type:'job-output',jobId:'other',outputId:'o',kind:'video'}),false);
 assert.equal(sameStudioProjectAssetReference(undefined,{type:'asset',assetId:'a',kind:'video'}),false);
});
