import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

type Json = unknown;

function leafPaths(value: Json, prefix: string[] = []): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => leafPaths(item, [...prefix, String(index)]));
  }
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, Json>).flatMap(([key, item]) => leafPaths(item, [...prefix, key]));
  }
  return [prefix.join('.')];
}

function hasPath(root: Json, segments: string[]): boolean {
  let current: Json = root;
  for (const segment of segments) {
    if (current === null || typeof current !== 'object' || !Object.prototype.hasOwnProperty.call(current, segment)) {
      return false;
    }
    current = (current as Record<string, Json>)[segment];
  }
  return true;
}

function readMessages(locale: string): Json {
  return JSON.parse(readFileSync(path.join(process.cwd(), 'frontend', 'messages', `${locale}.json`), 'utf8'));
}

// Keyvo shows only the models it can serve, so curated zh lists (providers, brands, gallery, popular links) may
// legitimately hold fewer items than en: array positions are compared as `*`, object keys must all exist.
function shape(leaf: string): string {
  return leaf.split('.').map((segment) => (/^\d+$/.test(segment) ? '*' : segment)).join('.');
}

// Only the hidden FLUX 3 Max provider card carries a model-page href parameter in en; Keyvo does not list that card.
const KEYVO_OMITTED_SHAPES = new Set(['home.redesign.providers.items.*.href.params.slug']);

test('zh messages contain every en leaf key (list lengths may differ)', () => {
  const en = readMessages('en');
  const zh = readMessages('zh');
  const zhShapes = new Set(leafPaths(zh).map(shape));
  const missing = [...new Set(leafPaths(en).map(shape))].filter((leaf) => !zhShapes.has(leaf) && !KEYVO_OMITTED_SHAPES.has(leaf));
  assert.deepEqual(missing, [], `zh.json is missing ${missing.length} en keys:\n${missing.join('\n')}`);
});
