// Start frontend Next dev on 127.0.0.1:3218, then run this read-only crawl.
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const out = 'artifacts/keyvo-audit-2026-10-06';
const routes = ['/robots.txt','/llms.txt','/zh','/zh/pricing','/zh/docs/get-started','/legal/cookies-list','/legal/acceptable-use','/legal/takedown','/login','/auth/reset-password'];
(async () => {
  const results=[];
  for (let i=0;i<routes.length;i++) {
    const route=routes[i];
    try {
      const response=await fetch('http://127.0.0.1:3218'+route,{signal:AbortSignal.timeout(60000)});
      const body=await response.text();
      fs.writeFileSync(`${out}/http-${i}.${response.headers.get('content-type')?.includes('html')?'html':'txt'}`,body);
      const document=new JSDOM(body).window.document;
      const schemas=[...document.querySelectorAll('script[type="application/ld+json"]')].map(s=>s.textContent);
      document.querySelectorAll('script,style').forEach(s=>s.remove());
      const text=(document.body?.textContent??body).replace(/\s+/g,' ');
      const result={route,url:response.url,status:response.status,title:document.title,canonical:document.querySelector('link[rel=canonical]')?.href,
        legacyText:[...text.matchAll(/.{0,65}(?:\bVideoAI\b|\bMaxVideoAI\b|videoai\.omninodetech\.com).{0,85}/gi)].map(m=>m[0]),
        legacySchemas:schemas.filter(s=>/"name"\s*:\s*"(?:VideoAI|MaxVideoAI)"|videoai\.omninodetech\.com/.test(s)),
        links:[...document.querySelectorAll('[href],[src]')].map(e=>e.getAttribute('href')??e.getAttribute('src')).filter(v=>/videoai\.omninodetech\.com|https?:\/\/(?:www\.)?maxvideoai\.com(?:\/|$)/i.test(v)),
        hreflang:[...document.querySelectorAll('link[hreflang]')].map(e=>({lang:e.hreflang,href:e.href}))};
      results.push(result); console.log(route,response.status,'legacy text',result.legacyText.length,'schemas',result.legacySchemas.length);
    } catch(error) {results.push({route,status:'BLOCKED',error:error.message});console.log(route,error.message);}
  }
  fs.writeFileSync(out+'/http-results.json',JSON.stringify(results,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
