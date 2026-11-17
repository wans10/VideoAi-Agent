#!/usr/bin/env node
/**
 * Regenerates every static brand asset from the canonical K mark
 * (frontend/public/assets/branding/keyvo-mark.svg), the same shapes that
 * frontend/components/brand/BrandLockup.tsx draws in code.
 *
 * Run from the repository root inside the test container (Chromium from
 * @playwright/test is the renderer; sharp/rsvg are not required):
 *   WT=$PWD ./lock.sh ./ctr.sh "node scripts/brand/render-keyvo-icons.mjs"
 *
 * Output is deterministic: flat vector input, fixed sizes, no timestamps.
 * Chinese text on share cards needs a CJK font (WenQuanYi Zen Hei in the
 * container); the script aborts rather than emit tofu boxes.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

const root = process.cwd();
const pub = path.join(root, 'frontend/public');
const require = createRequire(path.join(root, 'frontend/package.json'));
const { chromium } = require('@playwright/test');

const RED = '#b83c2b';
const CREAM = '#fffaf5';
const TAGLINE = '按需付费 AI 视频生成平台';

const mark = fs.readFileSync(path.join(pub, 'assets/branding/keyvo-mark.svg'), 'utf8').trim();
const square = mark.replace('rx="10"', 'rx="0"');
// Maskable: full bleed, glyph enlarged slightly but kept inside the central 80% safe zone.
const maskable = square
  .replace(/(<path[^>]*>)/, '<g transform="translate(20 20) scale(1.1) translate(-20 -20)">$1')
  .replace(/(<circle[^>]*\/>)/, '$1</g>');

if (!/M13 11v18M13 20l10-9M13 20l10 9/.test(mark)) throw new Error('keyvo-mark.svg lost the K path');

const browser = await chromium.launch();

async function png(svg, size, file) {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await page.setContent(
    `<html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`,
  );
  const buffer = await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
  await page.close();
  if (file) fs.writeFileSync(path.join(pub, file), buffer);
  return buffer;
}

function ico(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);
  let offset = 6 + entries.length * 16;
  const dir = entries.map(({ size, data }) => {
    const e = Buffer.alloc(16);
    e[0] = size;
    e[1] = size;
    e.writeUInt16LE(1, 4); // planes
    e.writeUInt16LE(32, 6); // bpp
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    return e;
  });
  return Buffer.concat([header, ...dir, ...entries.map((e) => e.data)]);
}

// Vector copies
fs.writeFileSync(path.join(pub, 'favicon.svg'), `${mark}\n`);
fs.writeFileSync(path.join(pub, 'assets/branding/logo-mark.svg'), `${mark}\n`);

// Transparent rounded PNGs
const rounded = {
  'favicon-16x16.png': 16,
  'favicon-32x32.png': 32,
  'favicon.png': 64,
  'favicon-512.png': 512,
  'android-chrome-192x192.png': 192,
  'android-chrome-512x512.png': 512,
  'assets/branding/app-icon-512.png': 512,
};
for (const [file, size] of Object.entries(rounded)) await png(mark, size, file);

// iOS rounds the corners itself: opaque, full-bleed square
await png(square, 180, 'apple-touch-icon.png');
await png(maskable, 512, 'assets/branding/maskable-512.png');

fs.writeFileSync(
  path.join(pub, 'favicon.ico'),
  ico(await Promise.all([16, 32, 48].map(async (size) => ({ size, data: await png(mark, size) })))),
);

// Share cards
const fonts = execSync('fc-list :lang=zh', { encoding: 'utf8' });
if (!fonts.trim()) throw new Error('No CJK font available: refusing to draw the Chinese tagline');
const card = `<html><body style="margin:0;width:1200px;height:630px;background:#f7f5f0;position:relative;overflow:hidden;font-family:'Helvetica Neue',Helvetica,Arial,'Liberation Sans','WenQuanYi Zen Hei',sans-serif;color:#252623">
<div style="position:absolute;left:110px;top:175px;width:280px;height:280px">${mark.replace('<svg ', '<svg width="280" height="280" ')}</div>
<div style="position:absolute;left:450px;top:205px;font-size:132px;font-weight:700;letter-spacing:-3px;line-height:1">Keyvo</div>
<div style="position:absolute;left:454px;top:365px;font-size:46px;line-height:1.3;color:#5b5a55;font-family:'WenQuanYi Zen Hei','Noto Sans CJK SC',sans-serif">${TAGLINE}</div>
<div style="position:absolute;left:0;bottom:0;width:1200px;height:12px;background:${RED}"></div>
</body></html>`;
const cardPage = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await cardPage.setContent(card);
const cardPng = await cardPage.screenshot({ type: 'png' });
const cardJpg = await cardPage.screenshot({ type: 'jpeg', quality: 86 });
await cardPage.close();
for (const f of [
  'assets/branding/og-image.png',
  'og/brand-2026-09-25.png',
  'og/home-2026-09-25.png',
  'og/compare-2026-09-25.png',
  'og/models-2026-09-25.png',
  'og/pricing-2026-09-25.png',
]) fs.writeFileSync(path.join(pub, f), cardPng);
fs.writeFileSync(path.join(pub, 'og-default.jpg'), cardJpg);

await browser.close();
console.log('keyvo icons and share cards regenerated (cream', CREAM, ')');
