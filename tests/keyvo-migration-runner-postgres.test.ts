import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import {startDisposablePostgres} from './helpers/disposable-postgres';

test('Docker bootstrap waits for the migration lock before any base-schema write',async t=>{
  const pg=await startDisposablePostgres('keyvo-bootstrap-lock');
  t.after(()=>pg.cleanup());
  const owner=await pg.pool.connect();
  await owner.query('SELECT pg_advisory_lock(19283746)');
  const child=spawn('frontend/node_modules/.bin/tsx',['--tsconfig','frontend/tsconfig.json','docker/scripts/bootstrap-schema.ts'],
    {env:{...process.env,DATABASE_URL:pg.databaseUrl,DATABASE_URL_UNPOOLED:pg.databaseUrl},stdio:['ignore','pipe','pipe']});
  let logs='';child.stdout.on('data',chunk=>{logs+=chunk;});child.stderr.on('data',chunk=>{logs+=chunk;});
  const completed=new Promise<number|null>((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve);});
  try {
    let waiting=false;
    for(let attempt=0;attempt<100;attempt++){
      const locks=await pg.pool.query("SELECT count(*)::int n FROM pg_locks WHERE locktype='advisory' AND objid=19283746 AND NOT granted");
      if(locks.rows[0].n>0){waiting=true;break;}
      await new Promise(resolve=>setTimeout(resolve,50));
    }
    assert.ok(waiting,'bootstrap must acquire the same lock as versioned migrations');
    assert.equal((await pg.pool.query("SELECT to_regclass('app_pricing_rules') name")).rows[0].name,null);
    await owner.query('SELECT pg_advisory_unlock(19283746)');
    assert.equal(await completed,0,logs);
    assert.ok((await pg.pool.query("SELECT to_regclass('app_pricing_rules') name")).rows[0].name);
  }finally{
    await owner.query('SELECT pg_advisory_unlock(19283746)');owner.release();
    if(child.exitCode===null){child.kill('SIGTERM');await completed;}
  }
});

test('migration runner atomically records SQL, rolls back failed work and refuses changed history',async t=>{
  const pg=await startDisposablePostgres('keyvo-runner'),dir=mkdtempSync(join(tmpdir(),'keyvo-migrations-'));
  t.after(async()=>{await pg.cleanup();rmSync(dir,{recursive:true,force:true});});
  const run=()=>spawnSync('bash',['docker/scripts/migrate.sh'],{encoding:'utf8',env:{...process.env,DATABASE_URL:pg.databaseUrl,MIGRATIONS_DIR:dir}});
  writeFileSync(join(dir,'01_first.sql'),'BEGIN;\nCREATE TABLE first_test(id integer);\nCOMMIT;\n');
  assert.equal(run().status,0);assert.equal(run().status,0);
  assert.equal((await pg.pool.query('SELECT count(*)::int n FROM application_schema_migrations')).rows[0].n,1);
  writeFileSync(join(dir,'02_bad.sql'),'CREATE TABLE bad_test(id integer); SELECT definitely_missing_function();');
  assert.notEqual(run().status,0);assert.equal((await pg.pool.query("SELECT to_regclass('bad_test') name")).rows[0].name,null);
  assert.equal((await pg.pool.query("SELECT count(*)::int n FROM application_schema_migrations WHERE filename='02_bad.sql'")).rows[0].n,0);
  rmSync(join(dir,'02_bad.sql'));writeFileSync(join(dir,'01_first.sql'),'CREATE TABLE changed_test(id integer);');
  assert.notEqual(run().status,0);assert.equal((await pg.pool.query("SELECT to_regclass('changed_test') name")).rows[0].name,null);
});

test('migration 31 executes the exact approved historical reconciliation and concurrent indexes are replayable',async t=>{
  const pg=await startDisposablePostgres('keyvo-upgrade'),dir=mkdtempSync(join(tmpdir(),'keyvo-upgrade-'));
  t.after(async()=>{await pg.cleanup();rmSync(dir,{recursive:true,force:true});});
  const {readFileSync,mkdirSync}=await import('node:fs');
  await pg.pool.query(readFileSync('neon/migrations/30_mcp_paid_generation.sql','utf8'));
  await pg.pool.query('CREATE TABLE app_jobs(job_id text PRIMARY KEY)');
  const old=spawnSync('git',['show','9ed63ad:neon/migrations/31_mcp_trial_entitlements.sql'],{encoding:'utf8'});
  assert.equal(old.status,0);await pg.pool.query(old.stdout);
  await pg.pool.query("CREATE TABLE application_schema_migrations(filename text PRIMARY KEY,checksum text NOT NULL,applied_at timestamptz DEFAULT now()); INSERT INTO application_schema_migrations(filename,checksum) VALUES('31_mcp_trial_entitlements.sql','3ff943b10bbbbef3e3e83eb4edabd10e755ba7a9a4a87e4188f477ce4b572139')");
  writeFileSync(join(dir,'31_mcp_trial_entitlements.sql'),readFileSync('neon/migrations/31_mcp_trial_entitlements.sql'));
  const run=(args:string[]=[])=>spawnSync('bash',['docker/scripts/migrate.sh',...args],{encoding:'utf8',env:{...process.env,DATABASE_URL:pg.databaseUrl,MIGRATIONS_DIR:dir}});
  const upgraded=run();assert.equal(upgraded.status,0,upgraded.stderr);assert.equal(run().status,0);
  assert.equal((await pg.pool.query('SELECT count(*)::int n FROM application_schema_migration_reconciliations')).rows[0].n,1);
  assert.equal((await pg.pool.query("SELECT checksum FROM application_schema_migrations WHERE filename='31_mcp_trial_entitlements.sql'")).rows[0].checksum,'3ff943b10bbbbef3e3e83eb4edabd10e755ba7a9a4a87e4188f477ce4b572139');
  await pg.pool.query('CREATE TABLE media_assets(user_id text,url text,deleted_at timestamptz,status text)');
  mkdirSync(join(dir,'concurrent'));
  writeFileSync(join(dir,'concurrent/66_public_deleted_media_index.sql'),readFileSync('neon/migrations/concurrent/66_public_deleted_media_index.sql'));
  const concurrent=run(['--concurrent']);assert.equal(concurrent.status,0,concurrent.stderr);assert.equal(run(['--concurrent']).status,0);
  assert.equal((await pg.pool.query("SELECT indisvalid FROM pg_index WHERE indexrelid='media_assets_deleted_user_url_idx'::regclass")).rows[0].indisvalid,true);
});
