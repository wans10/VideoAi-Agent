import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const output = process.env.DESIGN_AUDIT_OUTPUT ?? '/tmp/videoai-production-performance';
const bases = { before: process.env.DESIGN_BASELINE_URL ?? 'http://127.0.0.1:3011', after: process.env.DESIGN_AUDIT_URL ?? 'http://127.0.0.1:3010' };
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const samples = [];
const routes = (process.env.DESIGN_AUDIT_ROUTES ?? '/zh,/zh/tools/angle').split(',');
try {
  // Warm both development route compilers before measuring new isolated browser contexts.
  for (const base of Object.values(bases)) {
    const page = await browser.newPage();
    for (const route of routes) { await page.goto(`${base}${route}`, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(2000); }
    await page.close();
  }
  for (const width of [390, 1440]) for (const route of routes) for (let run = 1; run <= 3; run++) for (const [version, base] of Object.entries(bases)) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce', locale: 'zh-CN' });
    await context.addInitScript(() => {
      window.__vitals = { lcp: 0, cls: 0 };
      new PerformanceObserver(list => { for (const entry of list.getEntries()) window.__vitals.lcp = entry.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver(list => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__vitals.cls += entry.value; }).observe({ type: 'layout-shift', buffered: true });
    });
    const page = await context.newPage();
    await page.goto(`${base}${route}`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(2000);
    samples.push({ version, width, route, run, ...await page.evaluate(() => ({ ...window.__vitals, overflow: Math.max(0, document.documentElement.scrollWidth - innerWidth) })) });
    await context.close();
  }
  const medians = [];
  for (const width of [390,1440]) for (const route of routes) for (const version of ['before','after']) {
    const group = samples.filter(item => item.width === width && item.route === route && item.version === version);
    medians.push({ width, route, version, lcp: group.map(item => item.lcp).sort((a,b) => a-b)[1], cls: Math.max(...group.map(item => item.cls)), overflow: Math.max(...group.map(item => item.overflow)) });
  }
  await writeFile(`${output}/comparison.json`, JSON.stringify({ conditions: 'Same Chrome, local Next dev, warm route compiler, fresh browser contexts, reduced motion, 3 alternating samples. Directional evidence only; not production CWV.', medians, samples }, null, 2));
  console.log(JSON.stringify(medians));
} finally { await browser.close(); }
