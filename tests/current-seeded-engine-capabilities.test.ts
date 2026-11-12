import assert from 'node:assert/strict';
import test from 'node:test';
import { getBaseEngines } from '../frontend/src/lib/engines';
import type { TransactionQueryExecutor } from '../frontend/src/lib/db';
import type { EngineSettingsRecord } from '../frontend/src/server/engine-configuration-read';
import {
  getReadOnlyConfiguredEngine,
  getReadOnlyConfiguredEngineIncludingHidden,
  getReadOnlyConfiguredEngineIncludingHiddenInExecutor,
  getReadOnlyConfiguredEnginesByCategory,
  getReadOnlyConfiguredEnginesByCategoryInExecutor,
} from '../frontend/src/server/agent-api/read-only-engine-catalog';
import { getPublicConfiguredEnginesByCategoryInExecutor } from '../frontend/src/server/engines';
import type { EngineCaps } from '../frontend/types/engines';

// MiniMax-H3-Max is served on Keyvo again (MiniMax's own API, 2026-11-12), so both H3 engines are refreshed.
const ids = ['minimax-h3', 'minimax-h3-max'];
const staleRows: EngineSettingsRecord[] = ids.map((engine_id) => ({
  engine_id, updated_by: null, updated_at: '2026-08-01T00:00:00Z', pricing: null,
  options: { modes: ['t2v', 'i2v'], resolutions: ['768P'],
    inputLimits: { promptMaxChars: 7000, audioMaxDurationSec: 15 } },
}));
const settings = new Map(staleRows.map((row) => [row.engine_id, row]));
const dependencies = {
  databaseConfigured: () => true, fetchSettings: async () => settings, fetchOverrides: async () => new Map(),
};

function assertCurrent(engine: EngineCaps | undefined, id: string) {
  const base = getBaseEngines().find((entry) => entry.id === id)!;
  assert.ok(engine);
  assert.deepEqual(engine.modes, base.modes);
  assert.deepEqual(engine.resolutions, base.resolutions);
  // H3 keeps the catalogue's 50,000 characters; H3-Max now carries MiniMax's own 7,000-character limit.
  assert.equal(engine.inputLimits.promptMaxChars, id === 'minimax-h3-max' ? 7000 : 50_000);
  assert.equal(engine.inputLimits.promptMaxChars, base.inputLimits.promptMaxChars);
  assert.equal(engine.inputLimits.audioMaxDurationSec, undefined);
  if (id !== 'minimax-h3-max') {
    assert.deepEqual(engine.inputSchema, base.inputSchema);
    return;
  }
  // H3-Max's engine resolutions are MiniMax's own 480P/768P, so the configured projection also narrows the upstream
  // Fal-only Recast resolution field (768P/1080P) to 768P. Recast is never offered on Keyvo; every creation and
  // reference field matches the base engine exactly.
  const creation = (schema: EngineCaps['inputSchema']) => ({ ...schema,
    required: schema?.required?.filter((field) => field.modes?.some((mode) => mode !== 'v2v') ?? true),
    optional: schema?.optional?.filter((field) => field.modes?.some((mode) => mode !== 'v2v') ?? true) });
  assert.deepEqual(creation(engine.inputSchema), creation(base.inputSchema));
  const recastResolution = engine.inputSchema?.optional?.find((field) => field.id === 'resolution' && field.modes?.includes('v2v'));
  assert.deepEqual([recastResolution?.values, recastResolution?.default], [['768P'], '768P']);
}

test('app and MCP read-only catalogs refresh stale H3 system defaults consistently', async () => {
  const list = await getReadOnlyConfiguredEnginesByCategory('video', false, dependencies);
  for (const id of ids) {
    assertCurrent(list.find((engine) => engine.id === id), id);
    assertCurrent(await getReadOnlyConfiguredEngine(id, false, dependencies), id);
    assertCurrent(await getReadOnlyConfiguredEngineIncludingHidden(id, false, dependencies), id);
  }
  assert.equal(settings.get('minimax-h3')?.options?.inputLimits &&
    (settings.get('minimax-h3')!.options!.inputLimits as { promptMaxChars: number }).promptMaxChars, 7000);
});

test('explicit administrator settings and disabled overrides remain authoritative', async () => {
  const adminDependencies = { ...dependencies, fetchSettings: async () => new Map(staleRows.map((row) =>
    [row.engine_id, { ...row, updated_by: 'administrator' }])) };
  const list = await getReadOnlyConfiguredEnginesByCategory('video', false, adminDependencies);
  for (const id of ids) {
    const engine = list.find((entry) => entry.id === id)!;
    assert.deepEqual(engine.resolutions, ['768P']);
    assert.deepEqual(engine.modes, ['t2v', 'i2v']);
    assert.equal(engine.inputLimits.promptMaxChars, 7000);
  }
  const disabled = { ...dependencies, fetchOverrides: async () => new Map(ids.map((engine_id) => [engine_id, {
    engine_id, active: false, availability: null, status: null, latency_tier: null,
  }])) };
  assert.equal((await getReadOnlyConfiguredEnginesByCategory('video', false, disabled))
    .some((engine) => ids.includes(engine.id)), false);
  assert.equal(await getReadOnlyConfiguredEngineIncludingHidden(ids[0]!, false, disabled), undefined);
});

test('transactional app and MCP readers use current system capabilities with only locks and reads', async () => {
  const statements: string[] = [];
  const executor = { async query<T>(statement: string) {
    statements.push(statement);
    return (statement.includes('FROM engine_settings') ? staleRows : []) as T[];
  } } as TransactionQueryExecutor;
  for (const list of [
    await getReadOnlyConfiguredEnginesByCategoryInExecutor('video', executor),
    await getPublicConfiguredEnginesByCategoryInExecutor('video', executor),
  ]) {
    for (const id of ids) assertCurrent(list.find((engine) => engine.id === id), id);
  }
  for (const id of ids) assertCurrent(await getReadOnlyConfiguredEngineIncludingHiddenInExecutor(id, executor), id);
  assert.ok(statements.every((statement) => /^(?:LOCK|SELECT)\b/u.test(statement.trim())));
});
