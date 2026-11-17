import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const pub = 'frontend/public/';
const K_PATH = 'M13 11v18M13 20l10-9M13 20l10 9';

function pngSize(file: string) {
  const buf = readFileSync(pub + file);
  assert.equal(buf.subarray(1, 4).toString(), 'PNG', `${file} is a PNG`);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), colorType: buf[25] };
}

const EXPECTED: Record<string, [number, number]> = {
  'favicon-16x16.png': [16, 16],
  'favicon-32x32.png': [32, 32],
  'favicon.png': [64, 64],
  'favicon-512.png': [512, 512],
  'apple-touch-icon.png': [180, 180],
  'android-chrome-192x192.png': [192, 192],
  'android-chrome-512x512.png': [512, 512],
  'assets/branding/app-icon-512.png': [512, 512],
  'assets/branding/maskable-512.png': [512, 512],
  'assets/branding/og-image.png': [1200, 630],
  'og/brand-2026-09-25.png': [1200, 630],
  'og/home-2026-09-25.png': [1200, 630],
  'og/compare-2026-09-25.png': [1200, 630],
  'og/models-2026-09-25.png': [1200, 630],
  'og/pricing-2026-09-25.png': [1200, 630],
};

test('regenerated brand PNGs keep their pixel dimensions', () => {
  for (const [file, [width, height]] of Object.entries(EXPECTED)) {
    const size = pngSize(file);
    assert.deepEqual([size.width, size.height], [width, height], file);
  }
});

test('apple-touch-icon is opaque (iOS rounds the corners itself)', () => {
  assert.equal(pngSize('apple-touch-icon.png').colorType, 2);
});

test('favicon.ico holds 16, 32 and 48 px PNG entries', () => {
  const ico = readFileSync(pub + 'favicon.ico');
  assert.equal(ico.readUInt16LE(2), 1);
  const count = ico.readUInt16LE(4);
  assert.equal(count, 3);
  const sizes = Array.from({ length: count }, (_, i) => {
    const entry = 6 + i * 16;
    const offset = ico.readUInt32LE(entry + 12);
    assert.equal(ico.subarray(offset + 1, offset + 4).toString(), 'PNG');
    return ico[entry];
  });
  assert.deepEqual(sizes, [16, 32, 48]);
});

test('og-default.jpg is a 1200x630 JPEG', () => {
  const buf = readFileSync(pub + 'og-default.jpg');
  assert.equal(buf[0], 0xff);
  assert.equal(buf[1], 0xd8);
  let i = 2;
  while (i < buf.length) {
    assert.equal(buf[i], 0xff);
    const marker = buf[i + 1];
    if (marker >= 0xc0 && marker <= 0xc3) {
      assert.equal(buf.readUInt16BE(i + 5), 630);
      assert.equal(buf.readUInt16BE(i + 7), 1200);
      return;
    }
    i += 2 + buf.readUInt16BE(i + 2);
  }
  assert.fail('no SOF marker');
});

test('SVG marks use the K path and brand colours', () => {
  for (const file of ['favicon.svg', 'assets/branding/logo-mark.svg', 'assets/branding/keyvo-mark.svg']) {
    const svg = readFileSync(pub + file, 'utf8');
    assert.ok(svg.includes(K_PATH), `${file} contains the K path`);
    assert.ok(svg.includes('#b83c2b'), `${file} uses the brand red`);
  }
});

test('web manifest lists the regenerated icons', () => {
  const manifest = JSON.parse(readFileSync(pub + 'site.webmanifest', 'utf8'));
  const srcs = manifest.icons.map((icon: { src: string }) => icon.src);
  assert.ok(srcs.includes('/android-chrome-192x192.png'));
  assert.ok(srcs.includes('/android-chrome-512x512.png'));
  assert.ok(srcs.includes('/assets/branding/maskable-512.png'));
  assert.equal(manifest.theme_color, '#b83c2b');
});
