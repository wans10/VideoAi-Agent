// P0 duration-schema mechanism: the P0 models are upstream engine records that Keyvo does not all offer, so this runs on
// the unfiltered catalog. The customer-surface P0 expectations stay in mcp-p0-video-parity.test.ts. This import must stay first.
import './helpers/keyvo-unfiltered-catalog';
import assert from 'node:assert/strict';
import test from 'node:test';

import { getRuntimeModelById } from '../frontend/config/model-runtime';
import { listFalEngines } from '../frontend/src/config/falEngines';
import { getAgentModelDetails } from '../frontend/src/server/agent-api/model-details';
import { listAgentModels, listPublicAgentGenerationEngines, type AgentModelCatalogDeps } from '../frontend/src/server/agent-api/model-catalog';
import { recommendAgentModels } from '../frontend/src/server/agent-api/model-recommendations';

const P0 = ['wan-3', 'wan-3-prime', 'ltx-2-5-fast', 'ltx-2-5-pro', 'grok-imagine-video-1-5', 'flux-3', 'flux-3-draft'] as const;
const expectedModes = new Map<string, readonly string[]>([
  ['wan-3', ['t2v', 'i2v', 'ref2v', 'v2v', 'extend']], ['wan-3-prime', ['t2v', 'i2v', 'ref2v', 'v2v', 'extend']],
  ['ltx-2-5-fast', ['t2v', 'i2v', 'a2v']], ['ltx-2-5-pro', ['t2v', 'i2v', 'a2v']],
  ['grok-imagine-video-1-5', ['t2v', 'i2v', 'ref2v']],
  ['flux-3', ['t2v', 'i2v', 'fl2v', 'extend', 'ref2v', 'v2v']], ['flux-3-draft', ['t2v', 'i2v', 'fl2v', 'extend', 'ref2v', 'v2v']],
]);
const entries = listFalEngines();
const byId = new Map(entries.map((entry) => [entry.id, entry.engine]));
const deps: AgentModelCatalogDeps = {
  async listEngines() { return entries.filter((entry) => getRuntimeModelById(entry.id)?.publication.app.published).map((entry) => entry.engine); },
  async getEngineIncludingHidden(id) { return byId.get(id); },
  surfaceByEngineId(id) { const entry = entries.find((candidate) => candidate.id === id); return entry?.category === 'image' ? 'image' : entry ? 'video' : null; },
  isEngineExecutable: () => true,
  isModeExecutable: () => true,
};
test('all 31 P0 modes expose numeric duration choices from canonical engine schemas', async () => {
  let modes = 0;
  for (const id of P0) {
    const details = await getAgentModelDetails(id, deps);
    assert.deepEqual(details.modes.map((mode) => mode.mode), expectedModes.get(id), id);
    for (const mode of details.modes) {
      modes += 1;
      assert.ok(mode.duration === null || mode.duration.options === null || mode.duration.options.every(Number.isFinite), `${id}:${mode.mode}`);
    }
  }
  assert.equal(modes, 31);
  assert.deepEqual((await listPublicAgentGenerationEngines(deps)).filter((entry) => P0.includes(entry.engine.id as never)).map((entry) => entry.engine.id).sort(), [...P0].sort());
});

test('exact legacy and deep-legacy identities preserve lifecycle and canonical successor slugs', async () => {
  const [legacy] = await listAgentModels({ id: 'ltx-2-3' }, deps);
  assert.equal(legacy?.lifecycle, 'legacy');
  assert.equal(legacy?.recommendedByDefault, false);
  assert.deepEqual(legacy?.successor, { id: 'ltx-2-5-pro', slug: 'ltx-2-5-pro' });
  const legacyDetails = await getAgentModelDetails('ltx-2-3', deps);
  assert.equal(legacyDetails.links.model, 'https://maxvideoai.com/models/ltx-2-3-pro');
  const deep = await getAgentModelDetails('ltx-2', deps);
  assert.equal(deep.id, 'ltx-2');
  assert.equal(deep.lifecycle, 'deep_legacy');
  assert.equal(deep.generationEnabled, false);
  assert.deepEqual(deep.successor, { id: 'ltx-2-5-pro', slug: 'ltx-2-5-pro' });
  const executable = await listPublicAgentGenerationEngines(deps);
  assert.equal(executable.some((entry) => entry.engine.id === 'ltx-2-3'), true);
  assert.equal(executable.some((entry) => entry.engine.id === 'ltx-2'), false);
  assert.equal((await recommendAgentModels({ id: 'ltx-2-3' }, deps)).recommendations.length, 0);
});
