import assert from 'node:assert/strict';
import test from 'node:test';

// Keyvo does not publish the Flux family; these upstream contracts are checked on the unfiltered catalog.
// The runtime projection reads this once at module load, so the modules are imported after it is set.
process.env.KEYVO_MODEL_VISIBILITY = 'off';
const loadModules = async () => ({
  ...(await import('../frontend/config/model-runtime')),
  ...(await import('../frontend/config/model-families')),
  ...(await import('../frontend/lib/model-families')),
  ...(await import('../frontend/server/playlists/curation-candidate-aliases')),
});

test('admin can prepare real Max family membership while the public family remains gated by assets',async()=>{
  const {listRuntimeModels,buildModelFamilyDefinitions,createExampleFamilyResolver,getCurationCandidateAliases}=await loadModules();
  const models=listRuntimeModels();
  const publicFamilies=createExampleFamilyResolver({families:buildModelFamilyDefinitions(models,[])});
  assert.equal(publicFamilies.getModelSlugs('flux').includes('flux-3-max'),false);
  const aliases=getCurationCandidateAliases('family-flux')!;
  assert.ok(aliases.includes('flux-3-max'));
  assert.ok(aliases.includes('blackforestlabs/flux-3-max/keyframes-to-video'));
  assert.equal(aliases.includes('wan-3'),false);
  assert.equal(getCurationCandidateAliases('family-unknown'),null);
});

test('admin preparation still excludes retired, deep legacy and unpublished model identities',async()=>{
  const {listRuntimeModels,getCurationCandidateAliases}=await loadModules();
  for(const variant of ['retired','deep_legacy','app-hidden','examples-hidden'] as const){
    const models=listRuntimeModels().map(model=>model.id!=='flux-3-max'?model:{...model,
      lifecycle:variant==='retired'||variant==='deep_legacy'?variant:model.lifecycle,
      publication:{...model.publication,app:{...model.publication.app,published:variant!=='app-hidden'},examples:{...model.publication.examples,published:variant!=='examples-hidden'}},
    });
    assert.equal(getCurationCandidateAliases('family-flux',models)?.includes('flux-3-max'),false,variant);
  }
});
