import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { buildSeedanceV2vVersionedCells, customerTariffDocumentText } from '@/server/pricing/seedance-v2v-versioned-cells';

// Run from the repository root:
//   frontend/node_modules/.bin/tsx --tsconfig frontend/tsconfig.json frontend/scripts/generate-seedance-v2v-tariff-cells.ts [--check]
// Without --check it rewrites frontend/config/customer-tariffs.json; with --check it only compares.
async function main() {
  const check = process.argv.slice(2).includes('--check');
  const target = resolve('frontend/config/customer-tariffs.json');
  const { cells, scenarioCount } = await buildSeedanceV2vVersionedCells();
  const expected = customerTariffDocumentText(cells);
  if (check) {
    const current = await readFile(target, 'utf8');
    if (current !== expected) throw new Error('customer-tariffs.json does not match the regenerated Seedance v2v cells.');
    console.log(JSON.stringify({ check: 'matched', scenarios: scenarioCount, cells: cells.length }));
    return;
  }
  await writeFile(target, expected, 'utf8');
  console.log(JSON.stringify({ written: target, scenarios: scenarioCount, cells: cells.length }));
}

void main().catch(error => {
  console.error('Seedance v2v tariff generation failed:', error instanceof Error ? error.message : 'unknown error');
  process.exitCode = 1;
});
