import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const base = process.env.DESIGN_AUDIT_URL ?? 'http://127.0.0.1:3010';
const output = process.env.DESIGN_AUDIT_OUTPUT ?? '/tmp/videoai-production-review';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce', locale: 'zh-CN' });
    await context.addCookies([{ name: 'mv-consent', value: encodeURIComponent(JSON.stringify({ version: '2025-10-26', timestamp: Date.now(), categories: { analytics: false, ads: false }, source: 'banner' })), url: base }]);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/zh/tools/angle`, { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('同一场戏， 换一个讲法。');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    if (width > 1000) {
      const trigger = page.locator('button[aria-controls="marketing-craft-dropdown"]');
      await trigger.focus(); await page.keyboard.press('ArrowDown');
      await expect(trigger).toHaveAttribute('aria-expanded', 'true');
      const menu = page.locator('#marketing-craft-dropdown');
      await expect(menu.getByRole('link', { name: /机位勘景/ })).toBeVisible();
      await page.screenshot({ path: `${output}/${width}-camera-menu.png` });
      await page.keyboard.press('Escape');
      await expect(menu).toBeHidden(); await expect(trigger).toBeFocused();
      await page.locator('button[aria-controls="marketing-production-dropdown"]').hover();
      await expect(page.locator('#marketing-production-dropdown')).toBeVisible();
      await page.locator('button[aria-controls="marketing-screening-dropdown"]').hover();
      await expect(page.locator('#marketing-production-dropdown')).toBeHidden();
      await expect(page.locator('#marketing-screening-dropdown')).toBeVisible();
      await page.screenshot({ path: `${output}/${width}-screening-menu.png` });
      await page.mouse.click(width - 20, 800);
      await expect(page.locator('#marketing-screening-dropdown')).toBeHidden();
    } else {
      const trigger = page.getByRole('button', { name: '打开菜单', exact: true });
      await trigger.click();
      const dialog = page.getByRole('dialog');
      await page.locator('button[aria-controls="mobile-craft-panel"]').click();
      await expect(dialog.getByRole('link', { name: /机位勘景/ })).toBeVisible();
      await page.screenshot({ path: `${output}/${width}-camera-menu.png` });
      for (let i = 0; i < 12; i++) { await page.keyboard.press('Tab'); assert.ok(await dialog.evaluate(el => el.contains(document.activeElement))); }
      await page.keyboard.press('Escape'); await expect(dialog).toBeHidden(); await expect(trigger).toBeFocused();
    }
    const next = page.getByRole('button', { name: '展示下一机位视角' });
    await next.scrollIntoViewIfNeeded(); await next.click();
    await expect(page.getByText('演员 A 反打过肩镜头', { exact: true })).toBeVisible();
    await page.locator('#coverage').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${output}/${width}-coverage.png` });
    await page.goto(`${base}/zh`, { waitUntil: 'domcontentloaded' });
    await page.locator('.production-brief-section').scrollIntoViewIfNeeded();
    await expect(page.locator('.production-slate')).toBeVisible();
    assert.equal(await page.locator('.production-stage-list a').count(), 3);
    await page.screenshot({ path: `${output}/${width}-production-brief.png` });
    results.push({ width, keyboardMenu: 'passed', focusRestoration: 'passed', orbit: 'passed', brief: 'passed', errors });
    assert.deepEqual(errors, []);
    await context.close();
  }
  await writeFile(`${output}/interactions.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results));
} finally { await browser.close(); }
