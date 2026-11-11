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

// MiniMax-H3-Max has no mainland route and is hidden on Keyvo (KEYVO_HIDDEN_MODEL_IDS): a stale settings row
// for it must not bring it back into the app or MCP catalogs, so only H3 is asserted as refreshed.
const HIDDEN_ID = 'minimax-h3-max';
const ids = ['minimax-h3'];
const staleRows: EngineSettingsRecord[] = [...ids, HIDDEN_ID].map((engine_id) => ({
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
  assert.equal(engine.inputLimits.promptMaxChars, 50_000);
  assert.equal(engine.inputLimits.audioMaxDurationSec, undefined);
  assert.deepEqual(engine.inputSchema, base.inputSchema);
}

test('app and MCP read-only catalogs refresh stale H3 system defaults consistently', async () => {
  const list = await getReadOnlyConfiguredEnginesByCategory('video', false, dependencies);
  for (const id of ids) {
    assertCurrent(list.find((engine) => engine.id === id), id);
    assertCurrent(await getReadOnlyConfiguredEngine(id, false, dependencies), id);
    assertCurrent(await getReadOnlyConfiguredEngineIncludingHidden(id, false, dependencies), id);
  }
  assert.equal(list.some((engine) => engine.id === HIDDEN_ID), false, 'hidden H3 Max stays out of the catalog');
  assert.equal(await getReadOnlyConfiguredEngine(HIDDEN_ID, false, dependencies), undefined);
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
    assert.equal(list.some((engine) => engine.id === HIDDEN_ID), false, 'hidden H3 Max stays out of the catalog');
  }
  for (const id of ids) assertCurrent(await getReadOnlyConfiguredEngineIncludingHiddenInExecutor(id, executor), id);
  assert.ok(statements.every((statement) => /^(?:LOCK|SELECT)\b/u.test(statement.trim())));
});
