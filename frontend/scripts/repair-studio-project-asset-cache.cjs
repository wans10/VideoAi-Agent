/* Explicit bounded operational repair; never imported by request paths. */
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const digest=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
async function repairStudioProjectAssetCache(client,plan,{apply=false,backup=()=>{}}={}) {
  await client.query('BEGIN');
  try {
    await client.query("SET LOCAL lock_timeout='5s'");await client.query("SET LOCAL statement_timeout='15s'");
    const p=(await client.query('SELECT * FROM studio_projects WHERE id=$1 AND deleted_at IS NULL FOR UPDATE',[plan.target.projectId])).rows[0];
    assert.ok(p&&p.persistence_mode==='connected','PROJECT_UNAVAILABLE');
    assert.equal(digest(p.user_id),plan.verifiedSource.ownerHash,'OWNER_CHANGED');assert.equal(String(p.revision),String(plan.target.expectedRevision),'REVISION_CHANGED');
    const assets=p.workspace_state.projectAssets;assert.ok(Array.isArray(assets),'INVALID_ASSET_CACHE');
    const indices=assets.flatMap((a,i)=>a.id===plan.target.itemId&&digest(a)===plan.target.expectedSnapshotSha256?[i]:[]);assert.equal(indices.length,1,'ASSET_ID_AMBIGUOUS');const index=indices[0],item=assets[index];
    assert.equal(digest(item),plan.target.expectedSnapshotSha256,'ASSET_CHANGED');assert.deepEqual(item.ref,plan.target.ref,'REF_CHANGED');
    const a=(await client.query(`SELECT a.*,j.user_id AS job_owner,j.hidden,o.user_id AS output_owner,o.status AS output_status,o.job_id AS output_job
      FROM media_assets a LEFT JOIN job_outputs o ON o.id=a.source_output_id LEFT JOIN app_jobs j ON j.job_id=COALESCE(a.source_job_id,o.job_id)
      WHERE a.public_id=$1 AND a.user_id=$2 FOR SHARE OF a`,[item.ref.assetId,p.user_id])).rows[0];
    assert.ok(a&&a.kind==='video'&&a.status==='ready'&&!a.deleted_at&&!a.hidden,'SOURCE_UNAVAILABLE');
    assert.ok(!a.source_job_id||a.job_owner===p.user_id,'SOURCE_OWNER_CHANGED');
    assert.ok(!a.source_output_id||(a.output_owner===p.user_id&&a.output_status==='ready'&&a.job_owner===p.user_id&&(!a.source_job_id||a.source_job_id===a.output_job)),'SOURCE_OUTPUT_CHANGED');
    // Lock all linked source rows too, then repeat the source snapshot before committing.
    if(a.source_output_id)await client.query('SELECT id FROM job_outputs WHERE id=$1 FOR SHARE',[a.source_output_id]);
    if(a.source_job_id||a.output_job)await client.query('SELECT job_id FROM app_jobs WHERE job_id=$1 FOR SHARE',[a.source_job_id||a.output_job]);
    if(a.source_output_id){const o=(await client.query('SELECT * FROM job_outputs WHERE id=$1',[a.source_output_id])).rows[0];assert.ok(o&&o.user_id===p.user_id&&o.status==='ready'&&(!a.source_job_id||o.job_id===a.source_job_id),'SOURCE_OUTPUT_CHANGED');}
    if(a.source_job_id||a.output_job){const j=(await client.query('SELECT * FROM app_jobs WHERE job_id=$1',[a.source_job_id||a.output_job])).rows[0];assert.ok(j&&j.user_id===p.user_id&&!j.hidden,'SOURCE_OWNER_CHANGED');}
    assert.equal(digest(a.url),plan.verifiedSource.urlSha256,'SOURCE_URL_CHANGED');assert.equal(digest(a.metadata),plan.verifiedSource.metadataSha256,'SOURCE_METADATA_CHANGED');
    const f=a.metadata?.mediaFacts;assert.ok(f?.source==='probe'&&f.durationSec>0&&f.width>0&&f.height>0&&typeof f.hasAudio==='boolean','INCOMPLETE_SOURCE');
    assert.deepEqual(f,plan.patchFields.mediaFacts,'UNVERIFIED_PATCH');
    const seq=(await client.query('SELECT * FROM studio_sequences WHERE project_id=$1 ORDER BY id FOR UPDATE',[p.id])).rows;
    assert.ok(seq.every(s=>s.user_id===p.user_id),'SEQUENCE_OWNER_CHANGED');
    const commands=(await client.query('SELECT * FROM studio_project_commands WHERE project_id=$1 ORDER BY idempotency_key',[p.id])).rows;
    const next=structuredClone(p.workspace_state);next.projectAssets[index]={...item,...plan.patchFields};
    const originalUnchanged=structuredClone(next);originalUnchanged.projectAssets[index]=item;assert.deepEqual(originalUnchanged,p.workspace_state);
    const before={project:p,sequences:seq,commands};await backup(before);
    const result={applied:apply,projectId:p.id,itemId:item.id,beforeRevision:String(p.revision),sequenceHash:digest(seq),beforeAssetHash:digest(item),afterAssetHash:digest(next.projectAssets[index]),updatedAssetCount:apply?1:0};
    if(apply){
      const r=await client.query(`UPDATE studio_projects SET workspace_state=$3::jsonb,revision=revision+1,updated_at=NOW()
        WHERE id=$1 AND user_id=$2 AND revision=$4 AND persistence_mode='connected' AND deleted_at IS NULL RETURNING *`,[p.id,p.user_id,JSON.stringify(next),p.revision]);assert.equal(r.rows.length,1,'CONCURRENT_CHANGE');const after=r.rows[0];
      assert.deepEqual(after.workspace_state,next);assert.equal(Number(after.revision),Number(p.revision)+1);
      const preserved={...after,workspace_state:p.workspace_state,revision:p.revision,updated_at:p.updated_at};assert.deepEqual(preserved,p,'PROJECT_UNRELATED_CHANGE');
      assert.deepEqual((await client.query('SELECT * FROM studio_sequences WHERE project_id=$1 ORDER BY id',[p.id])).rows,seq,'SEQUENCE_CHANGED');
      assert.deepEqual((await client.query('SELECT * FROM studio_project_commands WHERE project_id=$1 ORDER BY idempotency_key',[p.id])).rows,commands,'COMMAND_HISTORY_CHANGED');
      assert.equal(digest((await client.query('SELECT metadata FROM media_assets WHERE id=$1',[a.id])).rows[0].metadata),plan.verifiedSource.metadataSha256,'SOURCE_CHANGED');result.afterRevision=String(after.revision);await client.query('COMMIT');
    }else await client.query('ROLLBACK');return result;
  }catch(e){await client.query('ROLLBACK');throw e;}
}
module.exports={repairStudioProjectAssetCache,digest};
if(require.main===module){(async()=>{
 const arg=name=>process.argv[process.argv.indexOf(name)+1];assert.ok(process.argv.includes('--plan')&&process.argv.includes('--backup'),'PLAN_AND_BACKUP_REQUIRED');
 const plan=JSON.parse(fs.readFileSync(arg('--plan')));const {Client}=require(process.env.KEYVO_REPAIR_PG_MODULE||'pg');const client=new Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:15000});await client.connect();try{
 const result=await repairStudioProjectAssetCache(client,plan,{apply:process.argv.includes('--apply'),backup:s=>fs.writeFileSync(arg('--backup'),JSON.stringify(s),{mode:0o600,flag:'wx'})});console.log(JSON.stringify(result));
 }finally{await client.end()}
})().catch(e=>{console.log(JSON.stringify({failed:true,name:e.name,message:e.message.slice(0,180)}));process.exitCode=1});}
