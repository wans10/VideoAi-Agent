import { chromium } from '@playwright/test';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
const require = createRequire(new URL('../../frontend/package.json', import.meta.url));
const sharp = require('sharp');
const base = process.env.DESIGN_AUDIT_URL ?? 'http://127.0.0.1:3001';
const destination = 'frontend/public/assets/tools/redesign';
await mkdir(destination, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1316, height: 820 }, locale: 'zh-CN', reducedMotion: 'reduce' });
  for (const tool of ['character-builder', 'angle', 'upscale', 'background-removal']) {
    const page = await context.newPage();
    const response = await page.goto(`${base}/app/tools/${tool}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    if (response.status() !== 200) throw new Error(`${tool}: HTTP ${response.status()}`);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(2000);
    const reject = page.getByRole('button', { name: '全部拒绝', exact: true });
    if (await reject.isVisible()) await reject.click();
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error(`${tool}: overflow`);
    const pixels = await page.screenshot();
    const output = await sharp(pixels).webp({ quality: 76 }).toBuffer();
    if (output.length > 150 * 1024) throw new Error(`${tool}: capture too large`);
    await sharp(output).toFile(`${destination}/${tool}-workspace-v2.webp`);
    console.log(JSON.stringify({ tool, bytes: output.length, file: `${tool}-workspace-v2.webp` }));
    await page.close();
  }
} finally { await browser.close(); }
