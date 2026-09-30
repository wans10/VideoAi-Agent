import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const baseURL = process.env.DESIGN_AUDIT_URL ?? 'http://127.0.0.1:3000';
const output = process.env.DESIGN_AUDIT_OUTPUT ?? '/tmp/videoai-design-interactions';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];
await mkdir(output, { recursive: true });
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce', locale: 'zh-CN' });
    // A synthetic saved denial in this isolated QA profile keeps consent UI from obscuring controls.
    await context.addCookies([{ name: 'mv-consent', value: encodeURIComponent(JSON.stringify({ version: '2025-10-26', timestamp: Date.now(), categories: { analytics: false, ads: false }, source: 'banner' })), url: baseURL }]);
    const page = await context.newPage();
    const check = async (name, fn) => {
      try { await fn(); results.push({ width, name, pass: true }); }
      catch (error) { results.push({ width, name, pass: false, error: error.message }); }
    };
    await check('home composition and mobile keyboard menu', async () => {
      await page.goto(`${baseURL}/zh`);
      await expect(page.locator('.videoai-brand').first()).toBeVisible();
      if (width < 768) {
        const trigger = page.getByRole('button', { name: '打开菜单', exact: true });
        await trigger.click();
        const dialog = page.getByRole('dialog', { name: '主导航' });
        await expect(dialog).toBeVisible();
        for (let i = 0; i < 20; i++) {
          await page.keyboard.press('Tab');
          assert.ok(await dialog.evaluate(el => el.contains(document.activeElement)), 'keyboard focus remains in menu');
        }
        await page.screenshot({ path: `${output}/${width}-public-menu.png` });
        await page.keyboard.press('Escape');
        await expect(dialog).not.toBeVisible();
        await expect(trigger).toBeFocused();
      }
      await page.locator('.home-create-chapter').scrollIntoViewIfNeeded();
      await expect(page.locator('.videoai-studio-preview')).toBeVisible();
      await page.screenshot({ path: `${output}/${width}-creation-section.png` });
    });
    await check('workspace theme changes and persists', async () => {
      await page.goto(`${baseURL}/app`);
      const trigger = page.getByRole('button', { name: '打开 VideoAI 导航' });
      await trigger.click();
      const dialog = page.locator('dialog.app-site-dialog');
      await expect(dialog).toBeVisible();
      const before = await page.locator('html').getAttribute('data-theme');
      await dialog.locator('.app-site-preferences > div:last-child button').click();
      await expect.poll(() => page.locator('html').getAttribute('data-theme')).not.toBe(before);
      const after = await page.locator('html').getAttribute('data-theme');
      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible();
      await page.reload();
      assert.equal(await page.locator('html').getAttribute('data-theme'), after);
      await page.screenshot({ path: `${output}/${width}-workspace-light.png` });
    });
    await check('CNY amount selection without starting checkout', async () => {
      await page.goto(`${baseURL}/billing`);
      const preset = page.getByRole('button', { name: /¥200/ });
      await preset.click();
      await expect(preset).toHaveAttribute('aria-pressed', 'true');
      assert.equal(await page.locator('select').first().inputValue(), 'CNY');
      await page.screenshot({ path: `${output}/${width}-billing-selected.png` });
      await page.getByRole('button', { name: /自定义/ }).click();
      await expect(page.locator('#billing-custom-amount')).toBeVisible();
      await page.locator('#billing-custom-amount').fill('160');
      await page.screenshot({ path: `${output}/${width}-billing-custom.png` });
    });
    await check('404 recovery has VideoAI and usable destinations', async () => {
      const response = await page.goto(`${baseURL}/zh/design-audit-missing-page`);
      // Next.js can stream notFound() with HTTP 200; the UI and noindex remain required.
      assert.ok([200, 404].includes(response.status()));
      await expect(page.locator('meta[name=robots]').last()).toHaveAttribute('content', /noindex/);
      await expect(page.locator('.videoai-recovery .videoai-brand')).toBeVisible();
      assert.equal(await page.locator('.videoai-recovery a').count(), 2);
      await page.screenshot({ path: `${output}/${width}-404.png` });
    });
    if (width >= 1200) await check('login consent stays outside the form column', async () => {
      await context.clearCookies();
      await page.goto(`${baseURL}/login`);
      const accept = page.getByRole('button', { name: '全部接受', exact: true });
      await expect(accept).toBeVisible();
      const consent = await accept.locator('xpath=ancestor::div[contains(@class,"fixed")]').boundingBox();
      const form = await page.locator('.videoai-auth-form').boundingBox();
      assert.ok(consent && form && consent.x + consent.width <= form.x);
      await page.screenshot({ path: `${output}/${width}-login-consent.png` });
    });
    await context.close();
  }
} finally {
  await browser.close();
  await writeFile(`${output}/report.json`, JSON.stringify(results, null, 2));
}
console.log(JSON.stringify(results, null, 2));
if (results.some(row => !row.pass)) process.exitCode = 1;
