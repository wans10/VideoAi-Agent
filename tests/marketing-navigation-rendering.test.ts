import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import test from 'node:test';
import {chromium} from '@playwright/test';
import {MARKETING_NAV_DROPDOWNS,MARKETING_SITE_NAV_LINKS} from '../frontend/config/navigation';
import {createMarketingNavigationBrowserFixture} from './helpers/marketing-navigation-browser-fixture';

test('closed desktop panels keep their complete SSR link roster and render decorations on opening', async () => {
  const dictionary=JSON.parse(readFileSync('frontend/messages/en.json','utf8'));
  const translate=(key:string,fallback:string)=>key.split('.').reduce((value,part)=>value?.[part],dictionary)??fallback;
  const href=(value:any)=>typeof value==='string'?value:Object.entries(value.params??{}).reduce((path,[key,param])=>path.replace(`[${key}]`,String(param)),value.pathname);
  const expected=MARKETING_SITE_NAV_LINKS.flatMap(item=>{
    const dropdown=MARKETING_NAV_DROPDOWNS[item.key];
    if(!dropdown)return [];
    return [{id:`marketing-${item.key}-dropdown`,links:[
      {href:href(dropdown.allHref),label:translate(dropdown.allLabelKey,dropdown.allLabelFallback),badge:null,description:null},
      ...dropdown.items.map(entry=>({href:href(entry.href),label:translate(`nav.dropdown.${item.key}.items.${entry.key}`,entry.label),badge:entry.badge?translate(`nav.badges.${entry.badge}`,entry.badge):null,description:entry.description?translate(`nav.dropdown.${item.key}.descriptions.${entry.key}`,entry.description):null})),
      ...(dropdown.sections??[]).flatMap(section=>section.items.map(entry=>({href:href(entry.href),label:translate(`nav.dropdown.${item.key}.sections.${section.key}.items.${entry.key}`,entry.label),badge:null,description:null}))),
    ]}];
  });
  const fixture=await createMarketingNavigationBrowserFixture();
  const browser=await chromium.launch({headless:true});
  try {
    const page=await browser.newPage({viewport:{width:1280,height:900}});
    const errors:string[]=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(fixture.url,{waitUntil:'commit'});
    const panels=page.locator('.marketing-mega-menu');
    const roster=()=>panels.evaluateAll(nodes=>nodes.map(node=>({id:node.id,links:Array.from(node.querySelectorAll('a')).map(link=>({
      href:link.getAttribute('href'),
      label:(link.querySelector('.marketing-entry-content > span:not([aria-hidden]):not(.marketing-new-badge)')?.textContent??link.childNodes[0]?.textContent??'').trim(),
      badge:link.querySelector('.marketing-new-badge')?.textContent?.trim()??null,
      description:link.querySelector('small')?.textContent?.trim()??null,
    }))})));
    assert.deepEqual(await roster(),expected,'all destinations, translated labels, badges and descriptions must exist before JS');
    const before=await panels.evaluateAll(nodes=>({
      bytes:nodes.reduce((sum,node)=>sum+new TextEncoder().encode(node.outerHTML).length,0),
      elements:nodes.reduce((sum,node)=>sum+node.querySelectorAll('*').length,0),
      decorations:nodes.reduce((sum,node)=>sum+node.querySelectorAll('img, svg, [role="img"], .marketing-entry-picto, .marketing-entry-pair').length,0),
    }));
    const ssr=await page.evaluate(()=>({bytes:(window as any).__fixtureSSRBytes,gzipBytes:(window as any).__fixtureSSRGzipBytes,hydrated:!!(window as any).__fixtureHydrated}));
    assert.equal(ssr.hydrated,false,'the roster and decoration budget must be measured before hydration');
    assert.equal(before.decorations,0,'closed SSR desktop panels must omit their invisible decorative DOM');
    // Keyvo triggers hold a leading icon svg as well as the trailing chevron; only the chevron is the native arrow.
    assert.equal(await page.locator('.marketing-nav-trigger > .studio-navigation-chevron').count(),expected.length,'visible main triggers retain their native arrows');
    fixture.releaseHydration();
    await page.waitForFunction(()=>!!(window as any).__fixtureHydrated);
    for(const {id} of expected) {
      const trigger=page.locator(`button[aria-controls="${id}"]`);
      const panel=page.locator(`#${id}`);
      await trigger.focus();
      await page.keyboard.press('ArrowDown');
      await panel.waitFor({state:'visible'});
      assert.ok(await panel.locator('.marketing-entry-content img, .marketing-entry-content svg, .marketing-entry-content [role="img"]').count()>0,'visible panels render their original entry decoration');
      assert.ok(await panel.locator('.lucide-arrow-up-right').count()>0,'panel action arrows appear with the panel');
      assert.deepEqual(await roster(),expected,'enhancement must preserve the complete link roster');
      await page.keyboard.press('Tab');
      assert.equal(await panel.evaluate(node=>node.contains(document.activeElement)),true,'Tab enters the open panel');
      await page.keyboard.press('Escape');
      await panel.waitFor({state:'hidden'});
      assert.equal(await trigger.evaluate(node=>node===document.activeElement),true,'Escape restores trigger focus');
      assert.equal(await panel.locator('img, svg, [role="img"], .marketing-entry-picto, .marketing-entry-pair').count(),0);
    }
    assert.deepEqual(errors,[]);
    assert.deepEqual(await page.evaluate(()=>(window as any).__fixtureHydrationErrors),[]);
    if(process.env.MARKETING_NAV_EVIDENCE_DIR) {
      const {mkdir,writeFile}=await import('node:fs/promises');
      await mkdir(process.env.MARKETING_NAV_EVIDENCE_DIR,{recursive:true});
      await writeFile(join(process.env.MARKETING_NAV_EVIDENCE_DIR,'desktop-decoration.json'),JSON.stringify({before,ssr,cssBytes:fixture.cssBytes,links:expected.reduce((sum,panel)=>sum+panel.links.length,0),panels:expected.length},null,2));
    }
  } finally {await browser.close();await fixture.close()}
});

// The native mobile owner must not cause the CSS-hidden desktop menus to render again.
// Keyvo's top-level desktop menus are production/craft/screening/pipeline (no models menu),
// and the fixture only instruments the models dictionary, so desktop rebuilds are observed
// as DOM mutations inside the desktop nav. Real browser behavior also covers details/popover.
test('mobile actions skip unchanged desktop menus while desktop state and locale still update', async () => {
  const fixture=await createMarketingNavigationBrowserFixture();
  const browser=await chromium.launch({headless:true});
  try {
    fixture.releaseHydration();
    const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    const errors:string[]=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(fixture.url);
    await page.waitForFunction(()=>!!(window as any).__fixtureHydrated);
    await page.evaluate(()=>{
      const w=window as any;
      w.__desktopNavMutations=0;
      new MutationObserver(records=>{w.__desktopNavMutations+=records.length}).observe(document.querySelector('.marketing-desktop-nav')!,{subtree:true,childList:true,attributes:true,characterData:true});
    });
    const desktopMutations=()=>page.evaluate(()=>(window as any).__desktopNavMutations as number);
    const before=await desktopMutations();
    assert.ok(await page.locator('#marketing-production-dropdown a').count()>0,'desktop production links must be rendered initially while their panel is closed');
    await page.getByRole('button',{name:'Open menu',exact:true}).tap();
    await page.locator('[role="dialog"][aria-modal="true"]').waitFor();
    assert.equal(await desktopMutations(),before,'opening mobile navigation must not rebuild the hidden desktop production links');
    await page.locator('summary[aria-controls="mobile-craft-panel"]').tap();
    await page.locator('#mobile-craft-panel a[href="/tools/angle"]').waitFor();
    assert.ok(await page.locator('#mobile-craft-panel a[href="/tools"]').isVisible());
    assert.match(await page.locator('#mobile-craft-panel').textContent()??'',/Camera studies/);
    assert.ok(await page.locator('#mobile-craft-panel .marketing-entry-content svg').count()>0,'mobile entries retain their decoration by default');
    assert.equal(await desktopMutations(),before,'expanding a mobile section must leave desktop production links untouched');
    await page.getByRole('button',{name:'Close menu',exact:true}).tap();
    await page.locator('.marketing-menu-overlay').waitFor({state:'hidden'});
    assert.equal(await desktopMutations(),before);

    await page.setViewportSize({width:1280,height:900});
    await page.locator('button[aria-controls="marketing-production-dropdown"]').click();
    assert.equal(await page.locator('#marketing-production-dropdown').getAttribute('hidden'),null);
    assert.ok(await desktopMutations()>before,'desktop state still invalidates its own menu');
    await page.locator('#marketing-production-dropdown a[href="/app"]').first().click();
    await page.locator('#marketing-production-dropdown').waitFor({state:'hidden'});
    await page.evaluate(()=>(window as any).__fixtureSetLocale('fr'));
    await page.waitForFunction(()=>document.documentElement.lang==='fr');
    assert.match(await page.locator('button[aria-controls="marketing-production-dropdown"]').textContent()??'',/Production/);
    assert.ok(await page.locator('button[aria-controls="marketing-production-dropdown"]').evaluate(node=>node.classList.contains('is-active')));
    assert.deepEqual(errors,[]);
    assert.deepEqual(await page.evaluate(()=>(window as any).__fixtureHydrationErrors),[]);
  } finally {await browser.close();await fixture.close()}
});

// Restored from the Keyvo zh navigation assertions. Keyvo publishes zh only (site-experience.json),
// and the mobile account labels are component literals in MarketingNav.tsx (loginLabelMobile and
// generateLabelMobile), not zh.json keys. The guest label reuses nav.login, which is '登录' in zh.json.
test('zh mobile account labels follow guest and signed-in navigation before and after hydration', async () => {
  for (const {initialEmail,label} of [
    {initialEmail:null,label:'登录'},
    {initialEmail:'fixture@example.invalid',label:'生成'},
  ]) {
    const fixture=await createMarketingNavigationBrowserFixture({initialEmail});
    const browser=await chromium.launch({headless:true});
    try {
      const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
      const errors:string[]=[];
      page.on('pageerror',error=>errors.push(error.message));
      await page.goto(`${fixture.url}/zh`,{waitUntil:'commit'});
      await page.locator('.studio-navigation-account').first().waitFor({state:'attached'});
      const mobileLabels=()=>page.locator('.studio-navigation-account .sm\\:hidden').evaluateAll(nodes=>nodes.map(node=>node.textContent?.trim()??''));
      assert.ok((await mobileLabels()).includes(label),`SSR markup must contain the zh mobile account label "${label}" before hydration`);
      fixture.releaseHydration();
      await page.waitForFunction(()=>!!(window as any).__fixtureHydrated);
      assert.ok((await mobileLabels()).includes(label),`hydration must keep the zh mobile account label "${label}"`);
      assert.equal(await page.locator('.studio-navigation-account .sm\\:hidden',{hasText:label}).first().isVisible(),true,'the zh mobile label is the visible mobile variant');
      assert.equal(await page.evaluate(()=>document.documentElement.lang),'zh');
      assert.deepEqual(errors,[]);
      assert.deepEqual(await page.evaluate(()=>(window as any).__fixtureHydrationErrors),[]);
    } finally {await browser.close();await fixture.close()}
  }
});
