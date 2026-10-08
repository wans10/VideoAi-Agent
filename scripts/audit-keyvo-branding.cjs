// Run from repository root:
// NODE_PATH=frontend/node_modules TSX_TSCONFIG_PATH=frontend/tsconfig.json node --import tsx scripts/audit-keyvo-branding.cjs
// Read-only application audit. Writes evidence only under artifacts/.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const ts = require('typescript');
const out = path.resolve('artifacts/keyvo-audit-2026-10-06');
fs.mkdirSync(out, { recursive: true });
const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const legacy = /maxvideoai|videoai|video[ -]ai|videoai\.omninodetech\.com/ig;
const inventory = [];
const literals = [];
let scanned = 0;
for (const file of files) {
  if (!/\.(?:tsx?|jsx?|cjs|mjs|json|mdx?|txt|toml|ya?ml|svg|webmanifest)$/.test(file) && !/\.env.*example$/.test(file)) continue;
  if (!fs.existsSync(file)) continue;
  const source = fs.readFileSync(file, 'utf8');
  scanned++;
  source.split('\n').forEach((line, index) => {
    const matches = [...line.matchAll(legacy)].map(m => m[0]);
    if (matches.length) inventory.push({ file, line: index + 1, matches });
  });
  if (!/^frontend\/(app|components|lib|server|src)\//.test(file) || !/\.[jt]sx?$/.test(file)) continue;
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const visit = node => {
    if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isJsxText(node)) && /\b(?:MaxVideoAI|VideoAI)\b|videoai\.omninodetech\.com/i.test(node.text)) {
      const text = node.text.trim();
      const kind = /https?:\/\/|\b[\w.-]+\.com\b/.test(text) ? 'domain-or-link'
        : /\b(?:MaxVideoAI|VideoAI)\b/.test(text) && !/^(?:videoai-|maxvideoai-|@maxvideoai|\.\/|\.\.\/)/i.test(text) ? 'copy-candidate' : 'compatibility-identifier';
      literals.push({ file, line: tree.getLineAndCharacterOfPosition(node.getStart(tree)).line + 1, kind, text: text.slice(0, 700) });
    }
    ts.forEachChild(node, visit);
  };
  visit(tree);
}
const checks = [];
async function check(id, run) {
  try { const actual = await run(); checks.push({ id, status: 'PASS', actual }); }
  catch (error) { checks.push({ id, status: error.code === 'MODULE_NOT_FOUND' ? 'BLOCKED' : 'FAIL', message: error.message, actual: error.actual, expected: error.expected }); }
}
async function main() {
  const root = '..';
  await check('brand.constant', () => { const actual = require(root+'/frontend/lib/product-brand.ts').PRODUCT_BRAND_NAME; assert.equal(actual, 'Keyvo'); return actual; });
  await check('origin.default', () => {
    const names = ['NEXT_PUBLIC_SITE_URL','SITE_URL','VERCEL_URL','VERCEL_PROJECT_PRODUCTION_URL'];
    const saved = names.map(n=>process.env[n]); names.forEach(n=>delete process.env[n]);
    try { const actual = require(root+'/frontend/lib/siteOrigin.ts').resolveSiteOrigin(); assert.equal(actual,'https://app.keyvo.cn'); return actual; }
    finally { names.forEach((n,i)=>saved[i]===undefined ? delete process.env[n] : process.env[n]=saved[i]); }
  });
  await check('manifest.brand', () => { const m=JSON.parse(fs.readFileSync('frontend/public/site.webmanifest','utf8')); assert.equal(m.name,'Keyvo'); assert.equal(m.short_name,'Keyvo'); return m; });
  await check('wallet.cny-label', () => { const actual=require(root+'/frontend/lib/product-brand.ts').WALLET_TOPUP_PRODUCT_NAME; assert.equal(actual,'Keyvo 账户充值'); return actual; });
  await check('robots.http-handler.sitemap-hosts', async () => {
    const response=require(root+'/frontend/app/robots.txt/route.ts').GET(new Request('https://app.keyvo.cn/robots.txt',{headers:{host:'app.keyvo.cn'}}));
    const text=await response.text(); fs.writeFileSync(out+'/robots-handler.txt',text);
    const actual=text.split('\n').filter(l=>l.startsWith('Sitemap:')).map(l=>new URL(l.slice(9)).hostname);
    assert.ok(actual.length); assert.deepEqual([...new Set(actual)],['app.keyvo.cn']); return actual;
  });
  await check('llms.http-handler.brand-and-hosts', async () => {
    const text=await require(root+'/frontend/app/llms.txt/route.ts').GET().text(); fs.writeFileSync(out+'/llms-handler.txt',text);
    const actual=[...new Set([...text.matchAll(/https:\/\/videoai\.omninodetech\.com[^\s)]*/g)].map(m=>m[0]))];
    assert.deepEqual(actual,[]); assert.doesNotMatch(text,/\b(?:MaxVideoAI|VideoAI)\b/i); return text.length;
  });
  await check('organization.schema.brand', () => { const actual=require(root+'/frontend/lib/seo/site-organization-schema.ts').buildSiteOrganizationSchema(); fs.writeFileSync(out+'/organization.json',JSON.stringify(actual,null,2)); assert.equal(actual.name,'Keyvo'); return actual; });
  await check('service.schema.provider', () => { const actual=require(root+'/frontend/lib/seo/marketingServiceJsonLd.ts').buildMarketingServiceJsonLd({name:'Keyvo',description:'Audit',serviceType:'AI generation',url:'https://app.keyvo.cn/pricing'}).provider; assert.deepEqual({name:actual.name,url:actual.url},{name:'Keyvo',url:'https://app.keyvo.cn'}); return actual; });
  await check('failure.start.brand', () => { const actual=require(root+'/frontend/server/user-facing-failure-messages.ts').toUserFacingFailureMessage('Could not start request'); assert.doesNotMatch(actual,/\bVideoAI\b/); return actual; });
  await check('failure.storage.brand', () => { const actual=require(root+'/frontend/server/user-facing-failure-messages.ts').toUserFacingFailureMessage('Output could not be copied to storage'); assert.doesNotMatch(actual,/\bVideoAI\b/); return actual; });
  await check('failure.historical-normalization', () => { const actual=require(root+'/frontend/server/user-facing-failure-messages.ts').toUserFacingFailureMessage('MaxVideoAI needs a different reference.'); assert.equal(actual,'Keyvo needs a different reference.'); return actual; });
  await check('job-group.failure.brand', () => { const jobs=['audit-1','audit-2'].map(jobId=>({jobId,groupId:'audit-group',status:'failed',engineId:'audit',createdAt:new Date().toISOString()})); const actual=require(root+'/frontend/lib/job-groups.ts').groupJobsIntoSummaries(jobs); fs.writeFileSync(out+'/failed-job-group.json',JSON.stringify(actual,null,2)); assert.equal(actual.groups.length,1,'Fixture must exercise grouped failure output'); assert.doesNotMatch(JSON.stringify(actual),/\bVideoAI\b/); return actual; });
  await check('supabase.site-and-callback', () => { const s=fs.readFileSync('supabase/config.toml','utf8'); const actual=s.match(/^site_url\s*=\s*"([^"]+)"/m)?.[1]; assert.equal(actual,'https://app.keyvo.cn'); assert.match(s,/https:\/\/app\.keyvo\.cn\/auth\/callback/); return actual; });
  await check('supabase.email-subjects', () => { const actual=[...fs.readFileSync('supabase/config.toml','utf8').matchAll(/^subject\s*=\s*"([^"]+)"/gm)].map(m=>m[1]); assert.ok(actual.length); actual.forEach(v=>assert.doesNotMatch(v,/\b(?:MaxVideoAI|VideoAI)\b/)); return actual; });
  await check('email.templates.brand-and-hosts', () => { const actual=files.filter(f=>f.startsWith('supabase/templates/')).filter(f=>/maxvideoai|videoai\.omninodetech/i.test(fs.readFileSync(f,'utf8'))); assert.deepEqual(actual,[]); return actual; });
  await check('sitemap.build-config.default-host', () => { const names=['NEXT_PUBLIC_SITE_URL','SITE_URL']; const saved=names.map(n=>process.env[n]); names.forEach(n=>delete process.env[n]); try { const actual=require(root+'/frontend/next-sitemap.config.js').siteUrl; assert.equal(actual,'https://app.keyvo.cn'); return actual; } finally { names.forEach((n,i)=>saved[i]===undefined?delete process.env[n]:process.env[n]=saved[i]); } });
  const report={ commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(), branch:execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim(), scannedFiles:scanned, legacyMatchingLines:inventory.length, literalCandidates:literals.length, checks, note:'Inventory and AST candidates are not all defects. Includes historical attribution, protocol IDs, media URLs and inactive translations. No secret environment files are read.' };
  fs.writeFileSync(out+'/audit-results.json',JSON.stringify(report,null,2));
  fs.writeFileSync(out+'/legacy-inventory.json',JSON.stringify(inventory,null,2));
  fs.writeFileSync(out+'/literal-candidates.json',JSON.stringify(literals,null,2));
  console.log(JSON.stringify({scannedFiles:scanned,legacyMatchingLines:inventory.length,literalCandidates:literals.length,checks:checks.map(c=>({id:c.id,status:c.status}))},null,2));
  process.exitCode=checks.some(c=>c.status!=='PASS')?1:0;
}
main().catch(error=>{console.error(error);process.exitCode=2;});
