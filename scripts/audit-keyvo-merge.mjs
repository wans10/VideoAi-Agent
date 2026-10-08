import {execFileSync,spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const require=createRequire(new URL('../frontend/package.json',import.meta.url));
const ts=require('typescript');
const git=(...args)=>execFileSync('git',args,{maxBuffer:128*1024*1024});
const refs={base:git('merge-base','MaxVideoAI','feat/white-label-keyvo').toString().trim(),upstream:git('rev-parse','MaxVideoAI').toString().trim(),custom:git('rev-parse','feat/white-label-keyvo').toString().trim(),candidate:git('rev-parse','HEAD').toString().trim()};
function tree(ref){return new Map(git('ls-tree','-r','-z',ref).toString().split('\0').filter(Boolean).map(row=>{const [meta,path]=row.split('\t');return [path,meta.split(' ')[2]];}));}
const trees=Object.fromEntries(Object.entries(refs).map(([key,ref])=>[key,tree(ref)]));
const addedAuditPaths=git('ls-files','--others','--exclude-standard','-z').toString().split('\0').filter(path=>/^(?:tests\/.*\.test\.ts|scripts\/audit-keyvo-merge\.mjs)$/.test(path));
for(const path of addedAuditPaths)trees.candidate.set(path,null);
const workingBlobs=new Map();for(const [path]of trees.candidate){if(existsSync(path)){const bytes=readFileSync(path);const hash=createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');workingBlobs.set(hash,bytes.toString());trees.candidate.set(path,hash);}else trees.candidate.delete(path);}
const blobCache=new Map();function source(hash){if(!hash)return null;if(workingBlobs.has(hash))return workingBlobs.get(hash);if(!blobCache.has(hash))blobCache.set(hash,git('cat-file','blob',hash).toString());return blobCache.get(hash);}
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function exports(text,path){if(text===null)return new Set();const ast=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true);const names=new Set();for(const node of ast.statements){if(ts.isExportDeclaration(node)&&node.exportClause&&ts.isNamedExports(node.exportClause)){for(const item of node.exportClause.elements)names.add(item.name.text);}if(ts.isExportAssignment(node))names.add('default');if(node.modifiers?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword)){if(node.modifiers.some(m=>m.kind===ts.SyntaxKind.DefaultKeyword))names.add('default');else if(node.name)names.add(node.name.text);else if(ts.isVariableStatement(node)){for(const item of node.declarationList.declarations)if(ts.isIdentifier(item.name))names.add(item.name.text);}}}return names;}
function leaves(value,prefix='',out=new Map()){if(value&&typeof value==='object'&&!Array.isArray(value)){for(const [key,item]of Object.entries(value))leaves(item,`${prefix}/${key.replaceAll('~','~0').replaceAll('/','~1')}`,out);}else out.set(prefix,value);return out;}
function calls(text,path){const out=new Map();if(text===null)return out;const ast=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true);function visit(node){if(ts.isCallExpression(node)){const expr=node.expression;const name=ts.isIdentifier(expr)?expr.text:ts.isPropertyAccessExpression(expr)?`${ts.isIdentifier(expr.expression)?expr.expression.text:'<expression>'}.${expr.name.text}`:ts.isElementAccessExpression(expr)?'<element-call>':'<dynamic-call>'; out.set(name,(out.get(name)??0)+1);}ts.forEachChild(node,visit);}visit(ast);return out;}
const rows=[],missingExports=[],lostJsonLeaves=[],parseErrors=[],lostCallSites=[];
const all=new Set(Object.values(trees).flatMap(t=>[...t.keys()]));
for(const path of [...all].sort()){
 const hashes=Object.fromEntries(Object.entries(trees).map(([k,t])=>[k,t.get(path)]));
 const uc=hashes.upstream!==hashes.base,cc=hashes.custom!==hashes.base;if(!uc&&!cc)continue;
 const state=hashes.candidate===hashes.upstream?'upstream_exact':hashes.candidate===hashes.custom?'custom_exact':hashes.candidate===hashes.base?'base_reversion':'integrated_change';
 rows.push({path,upstreamChanged:uc,customChanged:cc,state,hashes});
 if(/\.(?:tsx?|mjs|jsx?)$/.test(path)){
  const callSets=Object.fromEntries(Object.entries(hashes).map(([k,h])=>[k,calls(source(h),path)]));
  for(const side of ['upstream','custom'])for(const [name,count]of callSets[side]){const added=count-(callSets.base.get(name)??0);if(added>0&&(callSets.candidate.get(name)??0)<count)lostCallSites.push({path,side,name,baseCount:callSets.base.get(name)??0,sourceCount:count,candidateCount:callSets.candidate.get(name)??0});}
  const sets=Object.fromEntries(Object.entries(hashes).map(([k,h])=>[k,exports(source(h),path)]));
  for(const side of ['upstream','custom'])for(const name of sets[side])if(!sets.base.has(name)&&!sets.candidate.has(name))missingExports.push({path,side,name,filePresent:Boolean(hashes.candidate)});
 }
 if(path.endsWith('.json')&&hashes.candidate){
  let parsed;try{parsed=Object.fromEntries(Object.entries(hashes).map(([k,h])=>[k,h?leaves(JSON.parse(source(h))):new Map()]));}catch(error){parseErrors.push({path,error:error.message});continue;}
  for(const side of ['upstream','custom']){const other=side==='upstream'?'custom':'upstream';for(const [pointer,value]of parsed[side])if(!equal(value,parsed.base.get(pointer))&&equal(parsed[other].get(pointer),parsed.base.get(pointer))&&!equal(parsed.candidate.get(pointer),value))lostJsonLeaves.push({path,side,pointer,expected:value,actual:parsed.candidate.get(pointer)});}
 }
}
const acceptedBrandChanges=lostJsonLeaves.filter(row=>typeof row.expected==='string'&&row.actual===row.expected.replaceAll('MaxVideoAI','Keyvo'));
const unexplainedJsonChanges=lostJsonLeaves.filter(row=>!acceptedBrandChanges.includes(row));
const sourceSnapshot=[...trees.candidate].filter(([path])=>/^(frontend|packages|tests|scripts|docker|neon)\//.test(path)).sort(([a],[b])=>a.localeCompare(b));
const sourceSnapshotSha256=createHash('sha256').update(JSON.stringify(sourceSnapshot)).digest('hex');
const summary={refs,candidateSource:'working tree (tracked candidate paths and new audit code/tests)',sourceSnapshotSha256,newAuditPaths:addedAuditPaths,ancestry:Object.fromEntries(['upstream','custom'].map(k=>[k,spawnSync('git',['merge-base','--is-ancestor',refs[k],refs.candidate]).status===0])),changedPaths:rows.length,states:rows.reduce((a,r)=>(a[r.state]=(a[r.state]??0)+1,a),{}),singleSideDivergences:rows.filter(r=>r.upstreamChanged!==r.customChanged&&r.hashes.candidate!==r.hashes[r.upstreamChanged?'upstream':'custom']).length,missingExportCount:missingExports.length,lostJsonLeafCount:lostJsonLeaves.length,parseErrorCount:parseErrors.length,lostCallSiteCount:lostCallSites.length,acceptedBrandChangeCount:acceptedBrandChanges.length,unexplainedJsonChangeCount:unexplainedJsonChanges.length};
mkdirSync('docs/plans/keyvo-system-audit',{recursive:true});writeFileSync('docs/plans/keyvo-system-audit/programmatic-coverage.json',JSON.stringify({summary,sourceSnapshot,rows,missingExports,lostJsonLeaves,acceptedBrandChanges,unexplainedJsonChanges,parseErrors,lostCallSites},null,2)+'\n');console.log(JSON.stringify(summary,null,2));
if(!Object.values(summary.ancestry).every(Boolean)||summary.states.base_reversion||parseErrors.length||missingExports.length||unexplainedJsonChanges.length)process.exitCode=1;
