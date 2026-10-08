import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../../frontend/package.json', import.meta.url));
const sharp = require('sharp');

// Extend the capture viewport so sticky navigation cannot cover a tall mobile section.
// Offscreen content-visibility can leave a full-document crop blank in production.
async function captureSection(page, locator, file) {
  const viewport = page.viewportSize();
  await locator.scrollIntoViewIfNeeded();
  if (await locator.locator('.price-app-frame').count()) {
    await locator.locator('.price-app-surface').waitFor({ state: 'visible' });
    assert.match(await locator.locator('.app-generation-price').innerText(), /[¥￥]/);
  }
  const box = await locator.boundingBox();
  await page.setViewportSize({ width: viewport.width, height: Math.max(viewport.height, Math.ceil(box.height) + 240) });
  await locator.evaluate(el => window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - 112, behavior: 'instant' }));
  const screenshot = await locator.screenshot({ path: file });
  const stats = await sharp(screenshot).stats();
  assert(stats.channels.some(channel => channel.stdev > 10), `Blank capture: ${file}`);
  await page.setViewportSize(viewport);
}

// Local visual acceptance: inspect the actual cascade, menu structure and score interactions.
const base = process.env.DESIGN_AUDIT_URL ?? 'http://127.0.0.1:3000';
const output = process.env.DESIGN_AUDIT_OUTPUT ?? '/tmp/videoai-theme-review';
const baseline = process.env.DESIGN_AUDIT_BASELINE === '1';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const report = [];
try {
  for (const width of [1440, 1024, 390, 320]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/zh`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const decline = page.getByRole('button', { name: '全部拒绝', exact: true });
    if (await decline.isVisible()) await decline.click();
    const comparison = page.locator('#compare');
    await comparison.scrollIntoViewIfNeeded();
    await captureSection(page, comparison, `${output}/comparison-${width}.png`);
    const section = await comparison.evaluate(el => ({
      background: getComputedStyle(el.parentElement.parentElement).backgroundColor,
      cta: getComputedStyle(el.querySelector('.comparison-active-link')).backgroundColor,
      metricsColumns: getComputedStyle(el.querySelector('.paired-scores')).gridTemplateColumns,
    }));
    const tabs = page.locator('.comparison-switcher button[aria-pressed]');
    if (await tabs.count() > 1) {
      await tabs.nth(1).click();
      await page.waitForTimeout(50);
      assert.equal(await tabs.nth(1).getAttribute('aria-pressed'), 'true');
      assert.match(await page.locator('.comparison-active-link').getAttribute('href'), /veo-3-1/);
    }
    await page.locator('#compare .paired-row summary').first().click();
    assert.equal(await page.locator('#compare .paired-row details').first().getAttribute('open'), '');
    if (!baseline) {
      assert.equal(section.cta, 'rgb(184, 60, 43)', `CTA at ${width}`);
      assert.equal(section.background, 'rgb(247, 245, 240)', `Comparison paper at ${width}`);
      assert.equal(await page.locator('.studio-contender').count(), 2);
    }
    await captureSection(page, page.locator('#toolkit'), `${output}/tools-${width}.png`);
    await captureSection(page, page.locator('#your-price'), `${output}/pricing-${width}.png`);
    if (!baseline) assert.doesNotMatch(await page.locator('#your-price').innerText(), /MaxVideoAI/);
    await captureSection(page, page.locator('.home-faq-chapter'), `${output}/faq-${width}.png`);
    if (width >= 1024) {
      await page.evaluate(() => window.scrollTo(0, 0));
      for (const key of ['models', 'examples', 'compare', 'tools', 'connect']) {
        const trigger = page.locator(`[aria-controls="marketing-${key}-dropdown"]`);
        if (!await trigger.count()) continue;
        await trigger.hover();
        const menu = page.locator(`#marketing-${key}-dropdown`);
        await menu.waitFor({ state: 'visible' });
        await menu.screenshot({ path: `${output}/menu-${key}-${width}.png` });
        const bounds = await menu.boundingBox();
        assert(bounds.x >= 0 && bounds.x + bounds.width <= width + 1);
        if (!baseline) assert.equal(await menu.locator('.studio-menu-intro').count(), 1);
        await trigger.focus();
        await page.keyboard.press('Escape');
        assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
        assert(await trigger.evaluate(el => el === document.activeElement));
      }
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    assert(overflow <= 1, `overflow ${width}: ${overflow}`);
    assert.deepEqual(errors, []);
    report.push({ width, section, overflow, errors });
    await context.close();
  }
} finally {
  await browser.close();
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
}
console.log(JSON.stringify({ passed: report.length, output }));
