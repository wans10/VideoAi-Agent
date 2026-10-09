const {Client}=require('pg');
const {spawnSync}=require('child_process');
const {writeFileSync}=require('fs');
(async()=>{
 if(!process.env.DATABASE_URL)throw Error('DATABASE_URL must point to the authorized test database');
 const result={kind:'remote PostgreSQL migration validation',node:process.version,startedAt:new Date().toISOString(),passes:[]};
 const c=new Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:10000,query_timeout:60000});
 try{
 await c.connect();result.server=(await c.query("SELECT current_database() database,current_setting('server_version') version")).rows[0];
 if(result.server.database!=='test')throw Error('Refusing unexpected database');
 for(const concurrent of [false,false,true,true]){
  const p=spawnSync('python3',['docker/scripts/migration-plan.py','neon/migrations',...(concurrent?['--concurrent']:[])],{encoding:'utf8'});
  if(p.status!==0)throw Error(p.stderr);
  let sql='',skip=false,applied=false,current='';const pass={concurrent,applied:[],skipped:[]};
  async function flush(){if(sql.trim()){await c.query(sql);sql='';}}
  for(const line of p.stdout.split('\n')){
   if(line.startsWith('\\set ')){if(line!=='\\set ON_ERROR_STOP on')throw Error('Unexpected psql command');continue;}
   if(line.endsWith(' \\gset')){await flush();applied=(await c.query(line.slice(0,-6))).rows[0].applied;continue;}
   if(line==='\\if :applied'){await flush();skip=!applied;continue;}
   if(line==='\\else'){skip=applied;continue;}
   if(line==='\\endif'){await flush();skip=false;continue;}
   if(skip)continue;
   if(line.startsWith('\\echo ')){await flush();current=line.slice(6);if(current.startsWith('Applying '))pass.applied.push(current.slice(9));if(current.startsWith('Skipping '))pass.skipped.push(current.slice(9));console.log(current);continue;}
   if(line.startsWith('\\'))throw Error('Unsupported psql directive');
   sql+=line+'\n';if(concurrent && line.trim().endsWith(';'))await flush();
  }
  await flush();result.passes.push(pass);
 }
 result.ledger=(await c.query('SELECT filename,checksum FROM application_schema_migrations ORDER BY filename')).rows;
 result.tables=(await c.query("SELECT count(*)::int count FROM pg_tables WHERE schemaname='public'")).rows[0].count;
 result.status='passed';
 }catch(e){result.status='failed';result.error={code:e.code,message:e.message};console.log('Migration failure:',e.code||'',e.message);await c.query('ROLLBACK').catch(()=>{});process.exitCode=1;}
 finally{await c.end().catch(()=>{});result.finishedAt=new Date().toISOString();if(process.env.KEYVO_REMOTE_AUDIT_OUTPUT)writeFileSync(process.env.KEYVO_REMOTE_AUDIT_OUTPUT,JSON.stringify(result,null,2)+'\n');}
})();
