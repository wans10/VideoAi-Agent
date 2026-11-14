import { readFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';

const DETERMINISTIC_ENV_KEYS = [
  'DATABASE_URL',
  'LUMARAY2_BASE_5S_540P_USD',
  'LUMARAY2_FLASH_BASE_5S_540P_USD',
  'LUMARAY2_MODIFY_PER_SECOND_USD',
  'LUMARAY2_FLASH_MODIFY_PER_SECOND_USD',
  'LUMARAY2_REFRAME_PER_SECOND_USD',
  'LUMARAY2_FLASH_REFRAME_PER_SECOND_USD',
] as const;

async function main(): Promise<void> {
  // The baseline is the upstream pricing-policy contract, independent of Keyvo's web-presentation hiding.
  process.env.KEYVO_MODEL_VISIBILITY = 'off';
  for (const key of DETERMINISTIC_ENV_KEYS) delete process.env[key];
  const collector = await import('./pricing-public-baseline-collector');
  const rows = await collector.collectPublicPricingProjectionRows();
  const fixturePath = new URL('../../tests/fixtures/pricing-public-projections.v1.json', import.meta.url);
  // The committed fixture remains the historical pre-retirement evidence.
  // Compare live stale-tier rows to the independently frozen standard-tier row,
  // preserving every other field and all scenarios without a tier dimension.
  if (process.argv.includes('--write')) {
    throw new Error('The historical public pricing fixture is frozen; do not regenerate it for membership retirement.');
  }
  const fixture = JSON.parse(await readFile(fixturePath, 'utf8')) as { rows: typeof rows };
  const launchAdditions = JSON.parse(
    await readFile(
      new URL('../../tests/fixtures/gpt-image-2-5-public-pricing-launch-2026-09-15.json', import.meta.url),
      'utf8',
    ),
  ) as { rows: typeof rows };
  const fluxMaxLaunch = JSON.parse(await readFile(
    new URL('../../tests/fixtures/flux-3-max-public-pricing-launch-2026-10-20.json', import.meta.url), 'utf8',
  )) as { rows: typeof rows };
  const nano21Launch = JSON.parse(await readFile(
    new URL('../../tests/fixtures/nano21-fixed-public-pricing-launch-2026-10-27.json', import.meta.url), 'utf8',
  )) as { rows: typeof rows };
  const novemberImageAdmission = JSON.parse(await readFile(
    new URL('../../tests/fixtures/nov05-functional-image-public-projections-2026-11-06.json', import.meta.url), 'utf8',
  )) as { rows: typeof rows };
  if (!isDeepStrictEqual(novemberImageAdmission.rows, ['flare', 'sunburst'].map(variant => ({
    id: `image-estimate:gpt-image-2-6-${variant}:default`, surface: 'image-estimate',
    engineId: `gpt-image-2-6-${variant}`, status: 'unavailable',
  })))) throw new Error('GPT Image 2.6 admission cannot introduce an offline fallback price.');
  const novemberMarketing = JSON.parse(await readFile(
    new URL('../../tests/fixtures/nov06-model-marketing-public-projections-2026-11-06.json', import.meta.url), 'utf8',
  )) as { rows: typeof rows };
  const novemberModelIds = ['gpt-image-2-6-flare', 'gpt-image-2-6-sunburst', 'kling-v4-flash'];
  const novemberMarketingIds = [
    ...novemberModelIds.flatMap(modelId => ['member', 'plus', 'pro'].map(tier => `estimator:${modelId}:${tier}:default`)),
    ...novemberModelIds.map(modelId => `json-ld:${modelId}:offer`),
    ...novemberModelIds.map(modelId => `model-page:${modelId}:default`),
    ...novemberModelIds.slice(0, 2).flatMap(modelId => ['high', 'quantity-4', 'standard'].map(preset => `pricing-hub-image:${modelId}:${preset}`)),
    ...['10s-1080p', '10s-1080p-audio', '10s-720p', '4k-route', '5s-720p', '8s-1080p', 'entry-route']
      .map(preset => `pricing-hub-video:kling-v4-flash:${preset}`),
  ];
  if (!isDeepStrictEqual(novemberMarketing.rows, novemberMarketingIds.map(id => ({
    id, surface: id.split(':')[0], engineId: id.split(':')[1], status: 'unavailable',
  })))) throw new Error('November model discovery cannot introduce an offline fallback price.');
  const klingPublicDiscovery = JSON.parse(await readFile(
    new URL('../../tests/fixtures/kling-v4-public-discovery-projections-2026-10-27.json', import.meta.url), 'utf8',
  )) as { rows: typeof rows };
  // Public discovery adds no price or Product offer while the pricing gate is closed.
  // Preserve the frozen baseline and reject any amount hidden in this additive matrix.
  if (!isDeepStrictEqual(klingPublicDiscovery.rows, [
    { id: 'json-ld:kling-v4:offer', surface: 'json-ld', engineId: 'kling-v4', status: 'unavailable' },
    { id: 'model-page:kling-v4:default', surface: 'model-page', engineId: 'kling-v4', status: 'unavailable' },
  ])) throw new Error('Invalid reviewed Kling4 public-discovery matrix.');
  const klingPricingDiscovery = JSON.parse(await readFile(
    new URL('../../tests/fixtures/kling-v4-pricing-discovery-projections-2026-10-29.json', import.meta.url), 'utf8',
  )) as { rows: typeof rows };
  // Publishing the pricing surface adds explicit unavailable offline rows.
  // Current approved quotes remain database-owned, never copied into this audit.
  const klingPricingIds = [
    ...['member', 'plus', 'pro'].map((tier) => `estimator:kling-v4:${tier}:default`),
    ...['10s-1080p', '10s-1080p-audio', '10s-720p', '4k-route', '5s-720p', '8s-1080p', 'entry-route']
      .map((preset) => `pricing-hub-video:kling-v4:${preset}`),
  ];
  if (!isDeepStrictEqual(klingPricingDiscovery.rows, klingPricingIds.map((id) => ({
    id, surface: id.startsWith('estimator:') ? 'estimator' : 'pricing-hub-video',
    engineId: 'kling-v4', status: 'unavailable',
  })))) throw new Error('Invalid reviewed Kling4 pricing-discovery matrix.');
  const audioChange = JSON.parse(await readFile(new URL('../../tests/fixtures/audio-pricing-change-2026-09-08.json', import.meta.url), 'utf8')) as { rows: Array<{ id: string; previousCents: number; totalCents: number }> };
  const audioChanges = new Map(audioChange.rows.map(row => [row.id, row]));
  if (audioChanges.size !== audioChange.rows.length || audioChanges.size !== 15) throw new Error('Invalid reviewed Audio pricing change matrix.');
  const productOfferFix = JSON.parse(await readFile(new URL('../../tests/fixtures/product-schema-offer-fix-2026-09-10.json', import.meta.url), 'utf8')) as {
    rows: Array<{
      id: string;
      previousStatus: 'unavailable';
      status: 'exact';
      currency: string;
      customerTotalCents: number;
      unit: 'offer';
      quantity: 1;
      structuredDataAmount: string;
      compatibilityProfile: 'schema-current';
    }>;
  };
  const productOfferFixes = new Map(productOfferFix.rows.map(row => [row.id, row]));
  if (productOfferFixes.size !== productOfferFix.rows.length || productOfferFixes.size !== 2) {
    throw new Error('Invalid reviewed Product schema offer fix matrix.');
  }
  const appliedChanges = new Set<string>();
  const appliedProductOfferFixes = new Set<string>();
  const customerOfferRepair = JSON.parse(await readFile(new URL('../../tests/fixtures/product-schema-customer-price-fix-2026-09-21.json', import.meta.url), 'utf8')) as {
    rows: Array<{ id: string; previousCents: number; totalCents: number }>;
  };
  const customerOfferRepairs = new Map(customerOfferRepair.rows.map((row) => [row.id, row]));
  if (customerOfferRepairs.size !== 41 || customerOfferRepairs.size !== customerOfferRepair.rows.length) {
    throw new Error('Invalid reviewed Product customer-price repair matrix.');
  }
  const appliedCustomerOfferRepairs = new Set<string>();
  const h3Change = JSON.parse(await readFile(new URL('../../tests/fixtures/h3-capability-pricing-change-2026-09-22.json', import.meta.url), 'utf8')) as {
    rows: Array<{ previous: typeof rows[number]; current: typeof rows[number] }>;
  };
  const h3Changes = new Map(h3Change.rows.map((row) => [row.previous.id, row]));
  if (h3Changes.size !== 7 || h3Changes.size !== h3Change.rows.length || h3Change.rows.some((row) =>
    row.previous.id !== row.current.id || !['minimax-h3', 'minimax-h3-max'].includes(row.current.engineId)
  )) throw new Error('Invalid reviewed H3 capability pricing matrix.');
  const appliedH3Changes = new Set<string>();
  const characterTransition = JSON.parse(await readFile(new URL(
    '../../tests/fixtures/character-studio-public-pricing-transition-2026-11-05.json', import.meta.url,
  ), 'utf8')) as { rows: Array<{ previous: typeof rows[number]; current: typeof rows[number] }> };
  const characterChanges = new Map(characterTransition.rows.map((row) => [row.previous.id, row]));
  const characterIds = ['draft', 'final'].flatMap((stage) => ['standard', 'pro'].map(
    (quality) => `pricing-hub-tool:character-builder-${stage}:${quality}`,
  ));
  if (characterChanges.size !== 4 || characterTransition.rows.length !== 4 || characterIds.some(id => !characterChanges.has(id))
    || characterTransition.rows.some(({ previous, current }) => !isDeepStrictEqual(current, {
      id: previous.id, surface: 'pricing-hub-tool', engineId: previous.engineId, status: 'unavailable',
    }))) throw new Error('Invalid Character Studio static pricing transition.');
  const appliedCharacterChanges = new Set<string>();
  const omniChange = JSON.parse(await readFile(new URL('../../tests/fixtures/omni-1-2-public-pricing-change-2026-11-05.json', import.meta.url), 'utf8')) as {
    rows: Array<{ previous: typeof rows[number]; current: typeof rows[number] }>;
  };
  const omniChanges = new Map(omniChange.rows.map(row => [row.previous.id, row]));
  if (omniChanges.size !== 13 || omniChanges.size !== omniChange.rows.length || omniChange.rows.some(row =>
    row.previous.id !== row.current.id || row.current.engineId !== 'gemini-omni-flash'
  )) throw new Error('Invalid Omni 1.2 supplier-cost projection matrix.');
  const appliedOmniChanges = new Set<string>();
  // Keyvo provider completeness (2026-11-11): retired models leave the public surfaces, MiniMax-H3's default estimate
  // follows its remaining 768P/2K tiers, and Seedream 5.0 Flash is added at its PROVISIONAL list cost.
  const keyvoTransition = JSON.parse(await readFile(new URL(
    '../../tests/fixtures/keyvo-provider-transition-public-pricing-2026-11-11.json', import.meta.url,
  ), 'utf8')) as { retiredEngineIds: string[]; retiredRowIds: string[];
    changes: Array<{ previous: typeof rows[number]; current: typeof rows[number] }>; rows: typeof rows };
  const keyvoRetiredEngines = new Set(keyvoTransition.retiredEngineIds);
  const keyvoRetiredRows = new Set(keyvoTransition.retiredRowIds);
  const keyvoChanges = new Map(keyvoTransition.changes.map(row => [row.previous.id, row]));
  if (!isDeepStrictEqual([...keyvoRetiredEngines].sort(), ['happy-horse-1-0', 'seedance-1-5-pro', 'seedream', 'wan-2-5'])
    || keyvoRetiredRows.size !== 25 || keyvoRetiredRows.size !== keyvoTransition.retiredRowIds.length
    || keyvoTransition.retiredRowIds.some(id => !keyvoRetiredEngines.has(id.split(':')[1] ?? ''))
    || keyvoChanges.size !== 4 || keyvoChanges.size !== keyvoTransition.changes.length
    || keyvoTransition.changes.some(({ previous, current }) => previous.id !== current.id || current.engineId !== 'minimax-h3')
    || keyvoTransition.rows.length !== 7 || new Set(keyvoTransition.rows.map(row => row.id)).size !== 7
    || keyvoTransition.rows.some(row => row.engineId !== 'seedream-5-0-flash' || row.status !== 'exact')) {
    throw new Error('Invalid Keyvo provider-completeness public pricing transition.');
  }
  const appliedKeyvoRetirements = new Set<string>();
  const appliedKeyvoChanges = new Set<string>();
  // Keyvo MiniMax-H3-Max on MiniMax's own API (2026-11-12): PROVISIONAL official CNY cost with the existing margin;
  // the 1080P pricing-hub presets have no official tier. Only H3-Max rows change; nothing is added or retired.
  const h3MaxTransition = JSON.parse(await readFile(new URL(
    '../../tests/fixtures/keyvo-h3-max-official-public-pricing-2026-11-12.json', import.meta.url,
  ), 'utf8')) as { changes: Array<{ previous: typeof rows[number]; current: typeof rows[number] }> };
  const h3MaxChanges = new Map(h3MaxTransition.changes.map(row => [row.previous.id, row]));
  if (h3MaxChanges.size !== 9 || h3MaxChanges.size !== h3MaxTransition.changes.length
    || h3MaxTransition.changes.some(({ previous, current }) => previous.id !== current.id
      || previous.engineId !== 'minimax-h3-max' || current.engineId !== 'minimax-h3-max')) {
    throw new Error('Invalid Keyvo MiniMax-H3-Max official public pricing transition.');
  }
  const appliedH3MaxChanges = new Set<string>();
  // Keyvo official list price rule (2026-11-13): every Keyvo model is re-based on its official mainland CNY list price and
  // sold at 80% of it; Wan 2.6, Kling 2.5 Turbo and Kling 2.6 Pro (no mainland route) leave every public surface.
  const officialList = JSON.parse(await readFile(new URL(
    '../../tests/fixtures/keyvo-official-list-public-pricing-2026-11-13.json', import.meta.url,
  ), 'utf8')) as { retiredEngineIds: string[]; retiredRowIds: string[];
    changes: Array<{ previous: typeof rows[number]; current: typeof rows[number] }>; rows: typeof rows };
  const officialRetiredEngines = new Set(officialList.retiredEngineIds);
  const officialRetiredRows = new Set(officialList.retiredRowIds);
  const officialChanges = new Map(officialList.changes.map(row => [row.previous.id, row]));
  if (!isDeepStrictEqual([...officialRetiredEngines].sort(), ['kling-2-5-turbo', 'kling-2-6-pro', 'wan-2-6'])
    || officialRetiredRows.size !== officialList.retiredRowIds.length
    || officialList.retiredRowIds.some(id => !officialRetiredEngines.has(id.split(':')[1] ?? ''))
    || officialChanges.size !== officialList.changes.length
    || officialList.changes.some(({ previous, current }) => previous.id !== current.id || previous.engineId !== current.engineId
      || officialRetiredEngines.has(current.engineId))
    || new Set(officialList.rows.map(row => row.id)).size !== officialList.rows.length) {
    throw new Error('Invalid Keyvo official list public pricing transition.');
  }
  const appliedOfficialChanges = new Set<string>();
  const appliedOfficialRetirements = new Set<string>();
  // Keyvo official list 100% rule (2026-11-14): Nano Banana 2 / Lite rows move from the official-list-80 price to the
  // official list price (profile official-list-100). The change is additive on top of the 2026-11-13 transition.
  const official100 = JSON.parse(await readFile(new URL(
    '../../tests/fixtures/keyvo-official-list-100-public-pricing-2026-11-14.json', import.meta.url,
  ), 'utf8')) as { retiredEngineIds: string[]; retiredRowIds: string[];
    changes: Array<{ previous: typeof rows[number]; current: typeof rows[number] }>; rows: typeof rows };
  const official100Changes = new Map(official100.changes.map(row => [row.previous.id, row]));
  if (official100.retiredEngineIds.length !== 0 || official100.retiredRowIds.length !== 0 || official100.rows.length !== 0
    || official100Changes.size !== 18 || official100Changes.size !== official100.changes.length
    || official100.changes.some(({ previous, current }) => previous.id !== current.id || previous.engineId !== current.engineId
      || !['nano-banana-2', 'nano-banana-lite'].includes(current.engineId))) {
    throw new Error('Invalid Keyvo official list 100% public pricing transition.');
  }
  const appliedOfficial100Changes = new Set<string>();
  const byId = new Map(fixture.rows.map((row) => [row.id, row]));
  const expected = fixture.rows.map((row) => {
    const standardId = row.id.replace(/:(plus|pro):/u, ':member:');
    const standard = byId.get(standardId);
    if (!standard) throw new Error(`Missing frozen standard scenario ${standardId}`);
    const audio = audioChanges.get(row.id);
    if (audio) {
      if (row.surface !== 'pricing-hub-audio' || row.customerTotalCents !== audio.previousCents) throw new Error(`Audio change does not match historical evidence: ${row.id}`);
      appliedChanges.add(row.id);
      return { ...standard, id: row.id, customerTotalCents: audio.totalCents, displayedAmount: `$${(audio.totalCents / 100).toFixed(2)}`, compatibilityProfile: 'audio-tripled-rounded' };
    }
    const productOffer = productOfferFixes.get(row.id);
    if (productOffer) {
      if (row.surface !== 'json-ld' || row.status !== productOffer.previousStatus) {
        throw new Error(`Product schema offer fix does not match historical evidence: ${row.id}`);
      }
      appliedProductOfferFixes.add(row.id);
      return {
        id: row.id,
        surface: row.surface,
        engineId: row.engineId,
        status: productOffer.status,
        currency: productOffer.currency,
        customerTotalCents: productOffer.customerTotalCents,
        unit: productOffer.unit,
        quantity: productOffer.quantity,
        structuredDataAmount: productOffer.structuredDataAmount,
        compatibilityProfile: productOffer.compatibilityProfile,
      };
    }
    return { ...standard, id: row.id };
  });
  if (appliedChanges.size !== audioChanges.size) throw new Error('Missing Audio pricing change scenario.');
  if (appliedProductOfferFixes.size !== productOfferFixes.size) throw new Error('Missing Product schema offer fix scenario.');
  const historicalIds = new Set(expected.map((row) => row.id));
  const launchIds = new Set(launchAdditions.rows.map((row) => row.id));
  if (
    launchIds.size !== launchAdditions.rows.length ||
    launchAdditions.rows.length !== 18 ||
    launchAdditions.rows.some(
      (row) => historicalIds.has(row.id) || !row.engineId.startsWith('gpt-image-2-5-'),
    )
  ) {
    throw new Error('Invalid reviewed GPT Image 2.5 public pricing launch matrix.');
  }
  const keyvoQwenLaunch = JSON.parse(await readFile(new URL('../../tests/fixtures/keyvo-qwen-pricing-launch-2026-10-09.json', import.meta.url), 'utf8')) as { rows: typeof rows };
  const qwenIds = new Set(keyvoQwenLaunch.rows.map(row => row.id));
  if (qwenIds.size !== 2 || keyvoQwenLaunch.rows.length !== 2 || keyvoQwenLaunch.rows.some(row =>
    !['qwen-image-3-0', 'qwen-image-3-0-pro'].includes(row.engineId) ||
    row.surface !== 'image-estimate' || historicalIds.has(row.id) || launchIds.has(row.id))) {
    throw new Error('Invalid reviewed Keyvo Qwen pricing launch matrix.');
  }
  if (fluxMaxLaunch.rows.length !== 12 || new Set(fluxMaxLaunch.rows.map((row) => row.id)).size !== 12
    || fluxMaxLaunch.rows.some((row) => row.engineId !== 'flux-3-max' || historicalIds.has(row.id) || launchIds.has(row.id))) {
    throw new Error('Invalid reviewed FLUX.3 Max public pricing launch matrix.');
  }
  const priorLaunchIds = new Set([...historicalIds, ...launchIds, ...fluxMaxLaunch.rows.map(row => row.id)]);
  if (nano21Launch.rows.length !== 9 || new Set(nano21Launch.rows.map(row => row.id)).size !== 9
    || nano21Launch.rows.some(row => row.engineId !== 'nano-banana-2-1' || priorLaunchIds.has(row.id)
      || (row.id.endsWith(':quantity-4') ? row.status !== 'unavailable'
        : row.status !== 'exact' || row.customerTotalCents !== (row.id.endsWith(':high') ? 23 : 7)))) {
    throw new Error('Invalid reviewed Nano21 fixed customer-price launch matrix.');
  }
  // Approved archive sunsets: remove purchasable surfaces and invalidate Product offers.
  // Keep the pre-archive fixtures intact as historical pricing evidence.
  const expectedWithLaunch = [...expected, ...launchAdditions.rows, ...fluxMaxLaunch.rows, ...nano21Launch.rows, ...novemberImageAdmission.rows, ...novemberMarketing.rows, ...klingPublicDiscovery.rows, ...klingPricingDiscovery.rows, ...keyvoQwenLaunch.rows].map((row) => {
    const repair = customerOfferRepairs.get(row.id);
    if (!repair) return row;
    if (row.surface !== 'json-ld' || row.status !== 'exact' || row.customerTotalCents !== repair.previousCents) {
      throw new Error(`Product customer-price repair does not match historical evidence: ${row.id}`);
    }
    appliedCustomerOfferRepairs.add(row.id);
    return { ...row, customerTotalCents: repair.totalCents, structuredDataAmount: (repair.totalCents / 100).toFixed(2) };
  }).filter((row) => !(['sora-2', 'sora-2-pro', 'seedance-1-5-pro'].includes(row.engineId)
    && ['estimator', 'pricing-hub-video', 'workspace-preflight'].includes(row.surface)))
    .map((row) => ['sora-2', 'sora-2-pro', 'seedance-1-5-pro'].includes(row.engineId) && row.surface === 'json-ld'
      ? { id: row.id, surface: row.surface, engineId: row.engineId, status: 'unavailable' as const }
      : row)
    .map((row) => {
      const change = h3Changes.get(row.id);
      if (!change) return row;
      if (!isDeepStrictEqual(row, change.previous)) throw new Error(`H3 change does not match historical evidence: ${row.id}`);
      appliedH3Changes.add(row.id);
      return change.current;
    })
    .map((row) => {
      // Seedream Pro's high sample now selects its supported 2K tier. The frozen row quoted an unsupported 4K choice.
      if (row.id !== 'pricing-hub-image:seedream-5-0-pro:high') return row;
      if (row.customerTotalCents !== 32 || row.displayedAmount !== '$0.32') {
        throw new Error(`Unexpected historical Seedream Pro high sample: ${row.id}`);
      }
      return { ...row, customerTotalCents: 16, displayedAmount: '$0.16' };
    })
    .map((row) => {
      const change = characterChanges.get(row.id);
      if (!change) return row;
      if (!isDeepStrictEqual(row, change.previous)) throw new Error(`Character transition does not match historical evidence: ${row.id}`);
      appliedCharacterChanges.add(row.id);
      return change.current;
    })
    .map(row => {
      const change = omniChanges.get(row.id);
      if (!change) return row;
      if (!isDeepStrictEqual(row, change.previous)) throw new Error(`Omni 1.2 change does not match historical evidence: ${row.id}`);
      appliedOmniChanges.add(row.id);
      return change.current;
    })
    .map(row => {
      const change = keyvoChanges.get(row.id);
      if (!change) return row;
      if (!isDeepStrictEqual(row, change.previous)) throw new Error(`Keyvo H3 transition does not match historical evidence: ${row.id}`);
      appliedKeyvoChanges.add(row.id);
      return change.current;
    })
    .map(row => {
      const change = h3MaxChanges.get(row.id);
      if (!change) return row;
      if (!isDeepStrictEqual(row, change.previous)) throw new Error(`Keyvo H3-Max transition does not match historical evidence: ${row.id}`);
      appliedH3MaxChanges.add(row.id);
      return change.current;
    })
    .filter(row => {
      if (!keyvoRetiredRows.has(row.id)) {
        if (keyvoRetiredEngines.has(row.engineId)) throw new Error(`Keyvo retirement leaves an unlisted public row: ${row.id}`);
        return true;
      }
      appliedKeyvoRetirements.add(row.id);
      return false;
    })
    .concat(keyvoTransition.rows.map(row => {
      if (historicalIds.has(row.id) || launchIds.has(row.id)) throw new Error(`Keyvo launch row is not new: ${row.id}`);
      return row;
    }))
    .map(row => {
      const change = officialChanges.get(row.id);
      if (!change) return row;
      if (!isDeepStrictEqual(row, change.previous)) throw new Error(`Keyvo official list change does not match the previous row: ${row.id}`);
      appliedOfficialChanges.add(row.id);
      return change.current;
    })
    .map(row => {
      const change = official100Changes.get(row.id);
      if (!change) return row;
      if (!isDeepStrictEqual(row, change.previous)) throw new Error(`Keyvo official list 100% change does not match the previous row: ${row.id}`);
      appliedOfficial100Changes.add(row.id);
      return change.current;
    })
    .filter(row => {
      if (!officialRetiredRows.has(row.id)) {
        if (officialRetiredEngines.has(row.engineId)) throw new Error(`Keyvo retirement leaves an unlisted public row: ${row.id}`);
        return true;
      }
      appliedOfficialRetirements.add(row.id);
      return false;
    })
    .concat(officialList.rows)
    .sort((left, right) => left.id.localeCompare(right.id));
  if (appliedKeyvoChanges.size !== keyvoChanges.size) throw new Error('Missing Keyvo H3 transition scenario.');
  if (appliedOfficialChanges.size !== officialChanges.size) throw new Error('Missing Keyvo official list pricing scenario.');
  if (appliedOfficialRetirements.size !== officialRetiredRows.size) throw new Error('Missing Keyvo official list retired scenario.');
  if (appliedOfficial100Changes.size !== official100Changes.size) throw new Error('Missing Keyvo official list 100% pricing scenario.');
  if (appliedH3MaxChanges.size !== h3MaxChanges.size) throw new Error('Missing Keyvo H3-Max official pricing scenario.');
  if (appliedKeyvoRetirements.size !== keyvoRetiredRows.size) throw new Error('Missing Keyvo retired public pricing scenario.');
  if (appliedOmniChanges.size !== omniChanges.size) throw new Error('Missing Omni 1.2 supplier-cost projection scenario.');
  if (appliedCharacterChanges.size !== characterChanges.size) throw new Error('Missing Character Studio pricing transition scenario.');
  if (appliedH3Changes.size !== h3Changes.size) throw new Error('Missing H3 capability pricing scenario.');
  if (appliedCustomerOfferRepairs.size !== customerOfferRepairs.size) throw new Error('Missing Product customer-price repair scenario.');
  if (!isDeepStrictEqual(rows, expectedWithLaunch)) {
    const expectedById = new Map(expectedWithLaunch.map((row) => [row.id, row]));
    const changed = rows.filter((row) => !isDeepStrictEqual(row, expectedById.get(row.id))).map((row) => row.id);
    const actualIds = new Set(rows.map((row) => row.id));
    const missing = expectedWithLaunch.filter((row) => !actualIds.has(row.id)).map((row) => row.id);
    console.error('[pricing-public-baseline] unexpected drift from standard pricing policy', JSON.stringify({ changed, missing, details: rows.filter((row) => changed.includes(row.id)).map((row) => ({ actual: row, expected: expectedById.get(row.id) })) }, null, 2));
    process.exitCode = 1;
    return;
  }
  console.log(`[pricing-public-baseline] current (${rows.length} rows)`);
}

void main().catch((error: unknown) => {
  console.error(
    '[pricing-public-baseline] failed',
    error instanceof Error ? `${error.name}: ${error.message}` : String(error)
  );
  process.exitCode = 1;
});
