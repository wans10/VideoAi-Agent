import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Isolated, read-only page audit. Never submit generation, payment or authentication.
const baseURL = process.env.DESIGN_AUDIT_URL ?? 'http://127.0.0.1:3000';
const output = process.env.DESIGN_AUDIT_OUTPUT ?? '/tmp/videoai-design-audit';
const routes = (process.env.DESIGN_AUDIT_ROUTES ?? '/zh,/zh/models,/zh/pricing,/zh/examples,/zh/tools,/zh/blog,/zh/docs,/zh/about,/zh/contact,/zh/legal,/login,/app,/app/image,/app/audio,/app/tools,/app/library,/jobs,/billing,/settings').split(',');
const viewports = process.env.DESIGN_AUDIT_WIDTHS
  ? Object.fromEntries(process.env.DESIGN_AUDIT_WIDTHS.split(',').map(Number).map(width => [`width-${width}`, { width, height: 1000 }]))
  : { desktop: { width: 1440, height: 1000 }, mobile: { width: 390, height: 844 } };
const browser = await chromium.launch({ channel: 'chrome', headless: true });
await mkdir(output, { recursive: true });
const report = [];
try {
  for (const [device, viewport] of Object.entries(viewports)) {
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce', locale: 'zh-CN' });
    if (process.env.DESIGN_AUDIT_THEME) await context.addInitScript(theme => localStorage.setItem('mv-app-theme', theme), process.env.DESIGN_AUDIT_THEME);
    await context.addInitScript(() => {
      localStorage.setItem('mv-consent-analytics', 'denied');
      window.__designVitals = { lcp: 0, cls: 0 };
      new PerformanceObserver(list => { for (const entry of list.getEntries()) window.__designVitals.lcp = entry.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver(list => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__designVitals.cls += entry.value; }).observe({ type: 'layout-shift', buffered: true });
    });
    for (const route of routes) {
      const page = await context.newPage();
      const errors = [];
      const apiFailures = [];
      page.on('response', response => {
        const url = new URL(response.url());
        if (url.origin === new URL(baseURL).origin && url.pathname.startsWith('/api/') && response.status() >= 400) apiFailures.push({ path: url.pathname, status: response.status() });
      });
      page.on('pageerror', error => errors.push(error.message));
      try {
        const response = await page.goto(new URL(route, baseURL).href, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(2000);
        const reject = page.getByRole('button', { name: /^(全部拒绝|Reject all|Tout refuser|Rechazar todo)$/ }).first();
        if (await reject.isVisible().catch(() => false)) await reject.click();
        const result = await page.evaluate(() => {
          const rgb = value => value.match(/[\d.]+/g)?.map(Number);
          const oldAccents = new Set(['805126', 'dfb982', '765020', '8b5426', '9b652e', 'e5c394', 'b48046', '945d2f', 'b77a3f', 'd3aa78', 'd2a977', 'd4ac79', 'd3aa77', 'dab17b', '895324', '865d2e', 'b28649', '946c35'].map(hex => `rgb(${[0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16)).join(', ')})`));
          const legacyAccents = [...document.querySelectorAll('main *, header *, footer *')].filter(el => el.getClientRects().length).flatMap(el => {
            const style = getComputedStyle(el);
            return ['color', 'backgroundColor', 'borderTopColor'].filter(prop => oldAccents.has(style[prop])).map(prop => ({ tag: el.tagName, className: el.getAttribute('class')?.slice(0, 120), property: prop, color: style[prop] }));
          }).slice(0, 30);
          const luminance = values => values.slice(0, 3).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((n, v, i) => n + v * [.2126, .7152, .0722][i], 0);
          const headingContrast = [...document.querySelectorAll('h1')].map(heading => {
            let ancestor = heading;
            let background;
            while (ancestor) {
              const style = getComputedStyle(ancestor);
              if (style.backgroundImage !== 'none') return null; // Image/gradient text needs visual inspection.
              const color = rgb(style.backgroundColor);
              if (color && (color.length === 3 || color[3] === 1)) { background = color; break; }
              ancestor = ancestor.parentElement;
            }
            if (!background) return null;
            const foreground = rgb(getComputedStyle(heading).color);
            const [high, low] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
            return { text: heading.textContent?.trim(), ratio: (high + .05) / (low + .05) };
          }).filter(Boolean);
          return ({
          legacyBrand: [...document.querySelectorAll('h1,h2,h3,p,a,span,label,button,img')]
            .filter(el => !el.closest('pre,code,script') && el.getClientRects().length)
            .filter(el => /max\s?video\s?ai/i.test(el.tagName === 'IMG' ? el.getAttribute('alt') ?? '' : [...el.childNodes].filter(n => n.nodeType === Node.TEXT_NODE).map(n => n.textContent).join(' ')))
            .map(el => ({ tag: el.tagName, text: (el.textContent || el.getAttribute('alt'))?.slice(0, 160) })).slice(0, 20),
          headingContrast,
          legacyAccents,
          catalogPrices: [...document.querySelectorAll('.studio-recommendation-price strong, .studio-model-specs dd')]
            .map(el => el.textContent?.trim()).filter(text => /[$¥￥]|CNY|USD/.test(text)),
          modelMedia: [...document.querySelectorAll('.model-story-media')].map(el => {
            const box = el.getBoundingClientRect();
            return { width: box.width, height: box.height };
          }),
          journalTitleWidths: [...document.querySelectorAll('.studio-journal-entry h3')].map(el => el.getBoundingClientRect().width),
          title: document.title,
          canonical: document.querySelector('link[rel=canonical]')?.href,
          hreflang: [...document.querySelectorAll('link[hreflang]')].map(el => el.getAttribute('hreflang')),
          jsonLdCount: document.querySelectorAll('script[type="application/ld+json"]').length,
          headings: [...document.querySelectorAll('h1')].map(el => el.textContent?.trim()),
          overflow: Math.max(0, document.documentElement.scrollWidth - innerWidth),
          vitals: window.__designVitals,
          theme: document.documentElement.dataset.theme ?? 'light',
          brand: Boolean(document.querySelector('.videoai-brand')),
          bodyTextLength: document.body.innerText.length,
        });
        });
        const name = `${device}-${route.replaceAll('/', '-').replace(/^-/, '') || 'home'}`;
        await page.screenshot({ path: path.join(output, `${name}.png`) });
        if (process.env.DESIGN_AUDIT_SECTIONS === '1') {
          const stops = await page.locator('main h2, main > section, footer').evaluateAll(elements => [...new Set(elements.map(el => Math.max(0, Math.round(el.getBoundingClientRect().top + scrollY - 28))))].sort((a, b) => a - b));
          let last = -1000;
          let index = 0;
          for (const y of stops) {
            if (y - last < viewport.height * .65) continue;
            await page.evaluate(y => scrollTo(0, y), y);
            await page.waitForTimeout(400);
            await page.screenshot({ path: path.join(output, `${name}-section-${String(++index).padStart(2, '0')}.png`) });
            last = y;
          }
        }
        report.push({ device, route, finalPath: new URL(page.url()).pathname, status: response?.status(), ...result, errors, apiFailures, authGate: new URL(page.url()).pathname === '/login' && route !== '/login' });
        console.log(JSON.stringify({ device, route, status: response?.status(), overflow: result.overflow, errors: errors.length }));
      } catch (error) {
        report.push({ device, route, error: error.message });
        console.log(JSON.stringify({ device, route, error: error.message }));
      } finally { await page.close(); }
    }
    await context.close();
  }
} finally {
  await browser.close();
  await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
}
const failures = report.filter(row => row.error || row.status >= 400 || row.overflow > 1 || row.errors?.length || row.legacyBrand?.length || row.legacyAccents?.length || row.headingContrast?.some(heading => heading.ratio < 3) || row.catalogPrices?.some(price => /\$|USD/.test(price)) || row.modelMedia?.some(box => box.width < 200 || box.height < 150) || row.journalTitleWidths?.some(width => width < 180));
console.log(JSON.stringify({ pages: report.length, failures: failures.length, output }));
if (failures.length) process.exitCode = 1;
