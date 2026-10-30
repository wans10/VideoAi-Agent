import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const css = readFileSync('frontend/src/styles/marketing-home.css', 'utf8');
const quote = readFileSync('frontend/components/composer/ComposerGenerationQuote.client.tsx', 'utf8');

// The workspace Composer sizes its price slot from two aria-hidden status labels and hides them with
// `.app-experience` rules. The home price demo renders the same Composer outside that scope, so its
// own stylesheet must hide the labels and stack them under the price, or "计算中… 价格暂不可用" shows beside it.
test('the home price demo hides the quote slot sizing labels like the workspace does', () => {
  assert.match(quote, /app-generation-quote-size/, 'the shared quote still sizes its slot from hidden labels');
  assert.match(css, /\.marketing-site \.price-app-surface \.app-generation-quote-size\{[^}]*visibility:hidden/);
  assert.match(css, /\.marketing-site \.price-app-surface \.app-generation-quote>\*\{grid-area:1\/1\}/, 'every label and the price share one grid cell');
  assert.match(css, /\.marketing-site \.price-app-surface \[data-composer-density="workspace"\] \.app-generation-quote\{[^}]*display:grid/);
});
