#!/usr/bin/env node
// Report how the Keyvo release line differs from upstream and which differences are new
// since the recorded baseline. Informational: it never fails the build unless --strict is given.
//
//   node scripts/report-upstream-deviations.mjs [--upstream origin/MaxVideoAI] [--write-baseline] [--strict]
//
// Classification is heuristic (path rules plus signal words in the diff). It answers "is this
// difference plausibly one of the seven documented customizations?", not "is it correct".
// See docs/engineering/keyvo-upstream-deviations.md for the scope and the kept deviations.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const BASELINE = 'docs/engineering/keyvo-deviation-baseline.tsv';

/** Ordered: the first matching bucket label (lowest number) wins. */
const TEXT_SIGNALS = [
  ['1 zh', /[一-鿿]/],
  ['2 llmhub-pay', /llmhub[-_ ]?pay|易支付|LlmhubPay/i],
  ['3 cny', /CNY|人民币|customer-currency|USD_TO_CNY|¥/],
  ['5 llmhub-api', /llmhub|LLM Hub/i],
  ['6 cn-providers', /alibaba|bailian|dashscope|volcengine|火山|volc\b|qwen/i],
  ['7 white-label', /keyvo|PRODUCT_BRAND|\bVideoAI\b|VideoAi-Agent/i],
];
const PATH_SIGNALS = [
  ['1 zh', /(^|\/)zh(\/|\.|-)|\.zh\.|site-experience|i18n\/locales/i],
  ['2 llmhub-pay', /llmhub[-_]?pay/i],
  ['3 cny', /cny|customer-currency/i],
  ['5 llmhub-api', /llmhub/i],
  ['6 cn-providers', /alibaba|bailian|volc|qwen/i],
  ['7 white-label', /keyvo|product-brand|^plugins\/keyvo\/|upstream-maxvideoai/i],
];
/** Differences that are documented as deliberately kept (see the deviations doc). */
const KEPT = [
  /^frontend\/(config\/public-examples\.json|server\/bundled-public-examples\.ts)$/,
  /^scripts\/seed-public-examples\.ts$/,
  /^frontend\/server\/(videos|video-seo)\.ts$/,
  /^frontend\/src\/lib\/env\.ts$/,
  /google-vertex|vertex-regions/i,
  /^frontend\/lib\/image-generation-client\.ts$/,
  /^docs\/engineering\/keyvo-/,
];
const INFRA = /^(\.github\/|docker\/|docker-compose|Dockerfile|\.dockerignore|\.env\.production|scripts\/(select-ci|run-validation))/;
const UI = /^(frontend\/(app|components)\/|frontend\/src\/components\/|frontend\/public\/|frontend\/styles|.*\.css$)/;

/** @param {string} path @param {string} changedText added and removed lines of the file */
export function classify(path, changedText) {
  if (KEPT.some(rx => rx.test(path))) return 'K kept (documented)';
  if (INFRA.test(path)) return 'Y deploy-infra';
  const hits = [];
  for (const [name, rx] of PATH_SIGNALS) if (rx.test(path)) hits.push(name);
  for (const [name, rx] of TEXT_SIGNALS) if (!hits.includes(name) && rx.test(changedText)) hits.push(name);
  if (hits.length) return hits.sort()[0];
  if (UI.test(path)) return '4 ui-redesign';
  return 'Z no signal';
}

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 1 << 29 });
}

function collect(upstream) {
  const files = new Map();
  let current = null;
  for (const line of git('diff', '-U0', '--no-color', '--no-renames', upstream, 'HEAD').split('\n')) {
    if (line.startsWith('diff --git ')) {
      const match = /^diff --git a\/(.*) b\/(.*)$/.exec(line);
      current = match ? match[2] : null;
      if (current) files.set(current, []);
    } else if (current && (line.startsWith('+') || line.startsWith('-')) && !line.startsWith('+++') && !line.startsWith('---')) {
      files.get(current).push(line.slice(1));
    }
  }
  return new Map([...files].map(([path, lines]) => [path, classify(path, lines.join('\n'))]));
}

function main() {
  const args = process.argv.slice(2);
  const flag = name => args.includes(name);
  const upstream = args.includes('--upstream') ? args[args.indexOf('--upstream') + 1] : 'origin/MaxVideoAI';
  const current = collect(upstream);

  if (flag('--write-baseline')) {
    const rows = [...current].sort(([a], [b]) => a.localeCompare(b)).map(([path, bucket]) => `${bucket}\t${path}`);
    writeFileSync(BASELINE, `${rows.join('\n')}\n`);
    console.log(`Wrote ${rows.length} paths to ${BASELINE}`);
    return;
  }

  const baseline = new Map();
  if (existsSync(BASELINE)) {
    for (const row of readFileSync(BASELINE, 'utf8').split('\n')) {
      const [bucket, path] = row.split('\t');
      if (path) baseline.set(path, bucket);
    }
  }
  const counts = new Map();
  for (const bucket of current.values()) counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  console.log(`${current.size} paths differ from ${upstream}`);
  for (const [bucket, count] of [...counts].sort()) console.log(`  ${String(count).padStart(5)}  ${bucket}`);

  const added = [...current].filter(([path]) => !baseline.has(path)).sort(([a], [b]) => a.localeCompare(b));
  const gone = [...baseline.keys()].filter(path => !current.has(path));
  console.log(`\nNew since the baseline: ${added.length}; no longer different: ${gone.length}`);
  for (const [path, bucket] of added) console.log(`  + [${bucket}] ${path}`);
  const unexplained = added.filter(([, bucket]) => bucket.startsWith('Z'));
  if (unexplained.length) console.log(`\n${unexplained.length} new paths have no customization signal; add them to the deviations doc or restore upstream.`);
  if (!existsSync(BASELINE)) console.log(`\nNo baseline yet; run with --write-baseline to record the current state.`);
  if (flag('--strict') && unexplained.length) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) main();
