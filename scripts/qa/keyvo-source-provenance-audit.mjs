import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const upstream='312af9337bd1948b7d9b49c8cb191465533cd96b';
const git=(args)=>{const r=spawnSync('git',args,{maxBuffer:64*1024*1024});if(r.status!==0)throw Error('Git evidence unavailable: '+args.join(' '));return r.stdout;};
const ancestor=(a,b)=>spawnSync('git',['merge-base','--is-ancestor',a,b]).status===0;
const manifest=JSON.parse(readFileSync('docs/marketing/github-asset-manifest.json','utf8'));
const records=Array.isArray(manifest)?manifest:manifest.assets;
const assets=[];
for(const record of records){
 const hash=createHash('sha256').update(readFileSync(record.path)).digest('hex');
 const history=git(['log','--format=%H',upstream,'--',record.path]).toString().trim().split('\n').filter(Boolean);
 let matchingCommit=null;
 for(const commit of history){const r=spawnSync('git',['show',commit+':'+record.path],{maxBuffer:64*1024*1024});if(r.status===0&&createHash('sha256').update(r.stdout).digest('hex')===hash){matchingCommit=commit;break;}}
 assets.push({id:record.id,path:record.path,sha256:hash,manifestBytesMatch:hash===record.sha256,authoredRevision:record.maxvideoaiRevision,authoredRevisionInOriginalHistory:!!record.maxvideoaiRevision&&ancestor(record.maxvideoaiRevision,upstream),authoredRevisionInCandidate:!!record.maxvideoaiRevision&&ancestor(record.maxvideoaiRevision,'HEAD'),matchingOriginalBytesCommit:matchingCommit});
}
const result={candidate:git(['rev-parse','HEAD']).toString().trim(),originalRepository:'https://github.com/camgraphe/MaxVideoAi.git',originalHistoryHead:upstream,requiredBranchAncestors:{MaxVideoAI:ancestor('d0acb5e','HEAD'),Keyvo:ancestor('9ed63ad','HEAD')},assets,scope:'Supplemental byte and original-history evidence. Does not waive or replace the candidate-ancestor publication gate.'};
const output=process.argv[2];if(output)writeFileSync(output,JSON.stringify(result,null,2)+'\n');else console.log(JSON.stringify(result,null,2));
if(!Object.values(result.requiredBranchAncestors).every(Boolean)||assets.some(a=>!a.manifestBytesMatch||!a.matchingOriginalBytesCommit))process.exitCode=1;
