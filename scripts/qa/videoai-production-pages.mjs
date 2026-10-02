import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const base = process.env.DESIGN_AUDIT_URL ?? 'http://127.0.0.1:3010';
const output = process.env.DESIGN_AUDIT_OUTPUT ?? '/tmp/videoai-production-pages';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const routes = [
  ['/tools', '先把这一场戏准备好。'],
  ['/tools/character-builder', '先认识这个人，再安排他的镜头。'],
  ['/tools/upscale', '让这一镜，经得起细看。'],
  ['/tools/background-removal', '把人物，交给下一场景。'],
  ['/examples', '镜头放映室'],
  ['/pricing', '把预算留给值得拍的镜头。'],
  ['/mcp', '把镜头生成，接入你的制作流程。'],
];
const selectedRoutes = process.env.DESIGN_AUDIT_PATHS ? routes.filter(([route]) => process.env.DESIGN_AUDIT_PATHS.split(',').includes(route)) : routes;
const report = [];
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce', locale: 'zh-CN' });
    await context.addCookies([{ name: 'mv-consent', value: encodeURIComponent(JSON.stringify({ version: '2025-10-26', timestamp: Date.now(), categories: { analytics: false, ads: false }, source: 'banner' })), url: base }]);
    const page = await context.newPage();
    const errors = [];
    const failed = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (response.status() >= 400) failed.push({ url: response.url(), status: response.status() }); });
    for (const [route, title] of selectedRoutes) {
      errors.length = 0; failed.length = 0;
      const response = await page.goto(`${base}/zh${route}`, { waitUntil: 'networkidle' });
      assert.equal(response.status(), 200);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
      const seo = await page.evaluate(() => ({
        canonical: document.querySelector('link[rel="canonical"]')?.href,
        alternates: [...document.querySelectorAll('link[rel="alternate"][hreflang]')].map(link => [link.hreflang, link.href]),
        schemas: [...document.querySelectorAll('script[type="application/ld+json"]')].map(script => JSON.parse(script.textContent)),
        overflow: Math.max(0, document.documentElement.scrollWidth - innerWidth),
      }));
      assert.equal(seo.overflow, 0, route);
      assert.ok(seo.canonical?.endsWith(`/zh${route}`), route);
      assert.equal(seo.alternates.length, 5, route);
      assert.deepEqual(errors, [], route);
      const slug = route.replaceAll('/', '-');
      await page.screenshot({ path: `${output}/${width}${slug}.png` });
      if (route === '/tools') {
        await page.getByRole('link', { name: /找到当前制作任务/ }).click();
        await expect(page.locator('#departments')).toBeInViewport();
        for (const href of ['/zh/tools/character-builder', '/zh/tools/angle', '/app/tools/storyboard']) assert.ok(await page.locator(`main a[href="${href}"]`).count(), href);
      }
      if (route === '/examples') {
        const toggle = page.locator('main summary').filter({ hasText: '技术索引' });
        await toggle.focus(); await page.keyboard.press('Enter');
        await expect(toggle.locator('..').getByRole('navigation')).toBeVisible();
        await page.keyboard.press('Enter');
        await page.getByRole('heading', { name: '再看一遍，带着这三个问题。' }).scrollIntoViewIfNeeded();
        await page.screenshot({ path: `${output}/${width}-screening-notes.png` });
      }
      const note = page.locator('[data-production-review]').first();
      if (await note.count()) { await note.scrollIntoViewIfNeeded(); await page.screenshot({ path: `${output}/${width}${slug}-notes.png` }); }
      if (route === '/mcp') { await page.locator('.production-pipeline-handoff').scrollIntoViewIfNeeded(); await page.screenshot({ path: `${output}/${width}-pipeline.png` }); }
      report.push({ width, route, title, ...seo, errors: [...errors], failed: [...failed] });
      console.log(`${width} ${route}: OK`);
    }
    await context.close();
  }
  const page = await browser.newPage();
  for (const locale of ['en', 'fr', 'es']) for (const [route] of selectedRoutes) {
    const translated = route === '/examples' ? (locale === 'fr' ? '/galerie' : locale === 'es' ? '/galeria' : route) : route === '/pricing' ? (locale === 'fr' ? '/tarifs' : locale === 'es' ? '/precios' : route) : route;
    const path = `${locale === 'en' ? '' : `/${locale}`}${translated}`;
    const response = await page.goto(`${base}${path}`, { waitUntil: 'domcontentloaded' });
    assert.equal(response.status(), 200, path);
    const title = await page.locator('main h1').innerText();
    report.push({ locale, path, title, status: response.status() });
  }
} finally {
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
  await browser.close();
}
