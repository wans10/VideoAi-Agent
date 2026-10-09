import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,mkdtempSync,rmSync,realpathSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {validateReleaseReadmeAssets,findReadmeImageReferences} from '../scripts/check-github-assets.mjs';
const read=(p:string)=>readFileSync(p,'utf8');
const root=process.cwd();
const manifest=JSON.parse(read('docs/marketing/github-asset-manifest.json'));
const approval=JSON.parse(read('docs/marketing/keyvo-review/approval.json'));

test('current Keyvo approvals reject a plugin archive containing retired upstream exports',t=>{
  const temporary=mkdtempSync(path.join(realpathSync(tmpdir()),'keyvo-unapproved-plugin-'));
  t.after(()=>rmSync(temporary,{recursive:true,force:true}));
  const result=spawnSync(process.execPath,['scripts/build-maxvideoai-plugin-release.mjs','--source','plugins/maxvideoai','--out',path.join(temporary,'release')],{cwd:root,encoding:'utf8'});
  assert.notEqual(result.status,0);
  assert.match(result.stderr,/exported asset must be publishable_proof/);
  assert.ok(!existsSync(path.join(temporary,'release','maxvideoai-plugin-release.json')));
});

test('Keyvo publication uses only the four explicitly approved, unchanged public captures',async()=>{
  const current=manifest.assets.filter((a:any)=>a.state==='publishable_proof');
  assert.deepEqual(current.map((a:any)=>a.id).sort(),['keyvo-comparison-production','keyvo-home-production','keyvo-models-production','keyvo-tools-production']);
  for(const a of current){
    const id=a.id.replace(/^keyvo-/,'').replace(/-production$/,'');
    assert.ok(approval.approvedIds.includes(id));
    assert.equal(createHash('sha256').update(readFileSync(a.path)).digest('hex'),approval.approvedBytes[id]);
    assert.equal(a.sha256,approval.approvedBytes[id]);
    assert.equal(a.kind,'product_proof');assert.equal(a.sourceEnvironment,'production');
    assert.match(a.claim,/does not establish paid provider coverage or native assistant host execution/);
    assert.equal(a.approvalRecord,'docs/marketing/keyvo-review/approval.json');
    assert.equal(a.containerIdentityIndependentlyVerified,false);
  }
  assert.deepEqual(await validateReleaseReadmeAssets(manifest,{repositoryRoot:root}),[]);
});

test('active Keyvo READMEs resolve images and destinations without inheriting upstream host publication claims',()=>{
  const rootReadme=read('README.md'),pluginReadme=read('plugins/maxvideoai/README.md');
  assert.match(rootReadme,/^# Keyvo$/m);assert.match(pluginReadme,/^# Keyvo 集成源码$/m);
  assert.match(rootReadme,/https:\/\/app.keyvo.cn/);assert.match(rootReadme,/基于 MaxVideoAI 定制/);
  assert.match(rootReadme,/人民币/);assert.match(rootReadme,/暂无视频/);assert.match(rootReadme,/hydration/);
  assert.match(pluginReadme,/不继承上游主机证明/);assert.match(pluginReadme,/不发布新的插件安装包/);
  for(const [p,md] of [['README.md',rootReadme],['plugins/maxvideoai/README.md',pluginReadme]]){
    const refs=findReadmeImageReferences(md,path.join(root,p),root);
    if(p==='README.md')assert.equal(refs.length,4);assert.ok(refs.every((r:string)=>/keyvo-(home|models|comparison|tools)\.png$/.test(r)));
    for(const match of md.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)){
      if(!/^(https?:|#)/.test(match[1]))assert.ok(existsSync(path.resolve(path.dirname(p),match[1])),match[1]);
    }
    assert.doesNotMatch(md,/codex plugin marketplace add|api\.maxvideoai\.com\/mcp|maxvideoai-workspace-live\.webp/);
  }
});

test('retiring upstream publication retains exact source fields and bytes, excluding its old placements',()=>{
  const original=JSON.parse(read('docs/marketing/upstream-maxvideoai/github-asset-manifest.json'));
  for(const prior of original.assets){
    const a=manifest.assets.find((x:any)=>x.id===prior.id);assert.ok(a);
    for(const field of ['path','sha256','maxvideoaiRevision','lastReviewedRevision','approvedBy'])assert.equal(a[field],prior[field]);
    assert.equal(createHash('sha256').update(readFileSync(a.path)).digest('hex'),prior.sha256);
    if(['publishable_proof','draft_editorial'].includes(prior.state)){
      assert.equal(a.state,'reference_only');assert.deepEqual(a.placements,['upstream_historical_reference']);
      assert.deepEqual(a.historicalPublication.placements,prior.placements);assert.equal(a.historicalPublication.claim,prior.claim);
    }
  }
});
