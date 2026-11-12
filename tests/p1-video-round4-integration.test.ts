import assert from 'node:assert/strict';
import test from 'node:test';
import { h3MaxCustomerCents } from './helpers/minimax-h3-max-customer-price';

import { NextRequest } from 'next/server';

import { buildFalRequestParts } from '../frontend/app/api/generate/_lib/fal-request';
import { buildGenerateRequestOptions } from '../frontend/app/api/generate/_lib/request-options';
import { resolveGenerateRouteContext } from '../frontend/app/api/generate/_lib/route-context';
import { computeCanonicalPublicSnapshot } from '../frontend/server/pricing/quote-public';
import { getFalEngineById, listFalEngines } from '../frontend/src/config/falEngines';
import { KLING_3_TURBO_STANDARD_ENGINE } from '../frontend/src/config/fal-engines/kling-3-turbo-standard';
import { MINIMAX_H3_MAX_ENGINE } from '../frontend/src/config/fal-engines/minimax-h3-max';
import type { GenerateRequestOptions } from '../frontend/app/api/generate/_lib/request-options';
import { computeConfiguredPreflight } from '../frontend/src/server/engines';
import type { EngineCaps, Mode, PreflightRequest } from '../frontend/types/engines';

const STAGING_URL = 'https://maxvideoai-mcp-staging.vercel.app';
function publicEngine(engineId: string): EngineCaps {
  const engine = listFalEngines().find((entry) => entry.id === engineId)?.engine;
  assert.ok(engine, `Missing public engine ${engineId}`);
  return engine;
}

// Keyvo 2026-11-12 (notes_turbo): Kling 3.0 Turbo no longer falls back to Fal when Fal is not configured. Without a
// Bailian or official Kling route it is refused before any charge (`kling_direct_unavailable`, 503). These boundary
// tests therefore configure the official Turbo route explicitly (test-only placeholder values, no real credential).
const TURBO_ROUTE_ENV_KEYS = ['KLING_DIRECT_ENABLED', 'KLING_API_KEY', 'KLING_ACCESS_KEY', 'KLING_SECRET_KEY',
  'KLING_DIRECT_ADMIN_ONLY', 'KLING_DIRECT_PUBLIC_ROUTING_ENABLED', 'FAL_API_KEY', 'FAL_KEY',
  'ALIBABA_MODEL_STUDIO_ENABLED', 'ALIBABA_MODEL_STUDIO_API_KEY', 'KLING_ROUTE_ORDER'] as const;
async function withTurboRouteEnv<T>(values: Partial<Record<(typeof TURBO_ROUTE_ENV_KEYS)[number], string>>, run: () => Promise<T>): Promise<T> {
  const saved = new Map(TURBO_ROUTE_ENV_KEYS.map((key) => [key, process.env[key]] as const));
  for (const key of TURBO_ROUTE_ENV_KEYS) {
    if (values[key] === undefined) delete process.env[key];
    else process.env[key] = values[key];
  }
  try {
    return await run();
  } finally {
    for (const [key, value] of saved) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}
const OFFICIAL_TURBO_ROUTE_ENV = { KLING_DIRECT_ENABLED: 'true', KLING_API_KEY: 'test-only-kling-key',
  KLING_DIRECT_ADMIN_ONLY: 'false', KLING_DIRECT_PUBLIC_ROUTING_ENABLED: 'true', KLING_ROUTE_ORDER: 'direct' };

async function resolveModeAtGenerateBoundary(input: {
  engine: EngineCaps;
  modePresent: boolean;
  mode?: unknown;
}) {
  let databaseChecks = 0;
  let billingChecks = 0;
  const body: Record<string, unknown> = { engineId: input.engine.id };
  if (input.modePresent) body.mode = input.mode;
  const result = await resolveGenerateRouteContext({
    req: new NextRequest(`${STAGING_URL}/api/generate`, { method: 'POST' }),
    body,
    boundaryOverrides: {
      resolveLaunchCanaryRequestContext: async () => null,
      getConfiguredEngine: async () => input.engine,
      getConfiguredEngineIncludingHidden: async () => undefined,
      isDatabaseConfigured: () => {
        databaseChecks += 1;
        return true;
      },
      ensureBillingSchema: async () => {
        billingChecks += 1;
      },
    },
  });
  return { result, databaseChecks, billingChecks };
}

test('generate defaults only a truly absent mode and keeps normalized public mode compatibility', async () => {
  const publicPika = getFalEngineById('pika-text-to-video')?.engine;
  assert.ok(publicPika);

  // Keyvo: with no Turbo route at all, the omitted mode still normalizes but the request is refused before charging.
  const unrouted = await withTurboRouteEnv({}, () => resolveModeAtGenerateBoundary({
    engine: KLING_3_TURBO_STANDARD_ENGINE,
    modePresent: false,
  }));
  assert.equal(unrouted.result.ok, false);
  if (!unrouted.result.ok) {
    assert.equal(unrouted.result.status, 503);
    assert.equal((unrouted.result.body as { error?: unknown }).error, 'Engine unavailable');
  }

  for (const fixture of [
    { engine: KLING_3_TURBO_STANDARD_ENGINE },
    { engine: publicPika },
  ]) {
    const omitted = await withTurboRouteEnv(OFFICIAL_TURBO_ROUTE_ENV, () => resolveModeAtGenerateBoundary({
      ...fixture,
      modePresent: false,
    }));
    assert.equal(omitted.result.ok, true);
    if (omitted.result.ok) assert.equal(omitted.result.context.mode, 't2v');
    assert.equal(omitted.databaseChecks, 1);
    assert.equal(omitted.billingChecks, 1);
  }

  const normalizedPublic = await resolveModeAtGenerateBoundary({
    engine: publicPika,
    modePresent: true,
    mode: '  T2V  ',
  });
  assert.equal(normalizedPublic.result.ok, true);
  if (normalizedPublic.result.ok) assert.equal(normalizedPublic.result.context.mode, 't2v');
});

test('generate rejects every explicitly invalid mode before database and billing work', async (context) => {
  const publicPika = getFalEngineById('pika-text-to-video')?.engine;
  assert.ok(publicPika);
  const invalidModes: Array<{ label: string; value: unknown }> = [
    { label: 'empty string', value: '' },
    { label: 'whitespace string', value: '   ' },
    { label: 'null', value: null },
    { label: 'undefined property', value: undefined },
    { label: 'number', value: 7 },
    { label: 'object', value: { value: 't2v' } },
    { label: 'unknown string', value: 'bogus' },
  ];

  for (const fixture of [
    { label: 'P1 public', engine: KLING_3_TURBO_STANDARD_ENGINE },
    { label: 'established public', engine: publicPika },
  ]) {
    for (const invalid of invalidModes) {
      await context.test(`${fixture.label}: ${invalid.label}`, async () => {
        const resolved = await resolveModeAtGenerateBoundary({
          ...fixture,
          modePresent: true,
          mode: invalid.value,
        });
        assert.deepEqual(resolved.result, {
          ok: false,
          status: 400,
          body: { ok: false, error: 'Invalid mode' },
        });
        assert.equal(resolved.databaseChecks, 0);
        assert.equal(resolved.billingChecks, 0);
      });
    }
  }
});

function buildOmittedGenerateOptions(engine: EngineCaps, mode: Mode): GenerateRequestOptions {
  const result = buildGenerateRequestOptions({
    body: { prompt: 'A controlled omitted-resolution parity test.' },
    engine,
    mode,
    isBytePlusV1a: false,
  });
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error('Generation option normalization unexpectedly failed.');
  return result.options;
}

async function computeFinalPrice(
  engine: EngineCaps,
  mode: Mode,
  options: GenerateRequestOptions,
) {
  return computeCanonicalPublicSnapshot({
    engine,
    durationSec: options.durationSec,
    resolution: options.pricingResolution,
    aspectRatio: options.aspectRatio,
    mode,
    membershipTier: 'Member',
  });
}

async function computeOmittedPreflight(
  engine: EngineCaps,
  mode: Mode,
  durationSec: number,
) {
  const request: PreflightRequest = {
    engine: engine.id,
    mode,
    durationSec,
    fps: engine.fps[0] ?? 24,
    user: { memberTier: 'Member' },
  };
  return computeConfiguredPreflight(request, { resolvedEngine: engine });
}

// Keyvo prices H3-Max at MiniMax's official PROVISIONAL cost (5 s 768P: CNY 2.50 = USD 0.3125; 41 cents with the 30%
// margin, 25 under the 2026-11-13 official-list rule) instead of Fal's USD 0.40 (52 cents); preflight and generation agree.
test('H3 Max omitted-resolution preflight uses the same 768P setting and official-cost price as generation', async () => {
  const generate = buildOmittedGenerateOptions(MINIMAX_H3_MAX_ENGINE, 't2v');
  assert.deepEqual({
    supportsResolution: generate.supportsResolution,
    requestedResolution: generate.requestedResolution,
    pricingResolution: generate.pricingResolution,
    effectiveResolution: generate.effectiveResolution,
  }, {
    supportsResolution: true,
    requestedResolution: '768P',
    pricingResolution: '768P',
    effectiveResolution: '768P',
  });

  const finalPrice = await computeFinalPrice(MINIMAX_H3_MAX_ENGINE, 't2v', generate);
  const preflight = await computeOmittedPreflight(
    MINIMAX_H3_MAX_ENGINE,
    't2v',
    generate.durationSec,
  );
  assert.equal(finalPrice.totalCents, h3MaxCustomerCents(31.25));
  assert.equal(preflight.ok, true);
  assert.equal(preflight.total, h3MaxCustomerCents(31.25));
  assert.equal(preflight.total, finalPrice.totalCents);
  assert.equal(
    (preflight.pricing?.meta?.cost_breakdown_usd as { resolution?: unknown } | undefined)?.resolution,
    '768P',
  );
});

// Keyvo 2026-11-13: 5 s Turbo Standard at 80% of the Bailian list (CNY 0.8/s = 50 cents) -> 40 cents (formerly 73).
test('Kling Turbo i2v keeps resolution unset for dispatch while omitted preflight matches its 40-cent price', async () => {
  const engine = KLING_3_TURBO_STANDARD_ENGINE;
  const generate = buildOmittedGenerateOptions(engine, 'i2v');
  assert.equal(generate.supportsResolution, false);
  assert.equal(generate.pricingResolution, '720p');

  const falRequest = buildFalRequestParts({
    attachments: [],
    engineId: engine.id,
    prompt: 'Animate the verified first frame.',
    mode: 'i2v',
    apiKey: undefined,
    jobId: 'job_round4_kling',
    localKey: null,
    needsImage: true,
    needsFirstLastFrames: false,
    initialImageUrl: 'https://cdn.maxvideoai.com/round4-start.png',
    resolvedFirstFrameUrl: 'https://cdn.maxvideoai.com/round4-start.png',
    lastFrameUrl: undefined,
    resolvedAudioUrl: undefined,
    normalizedReferenceImages: [],
    videoUrls: [],
    audioUrls: [],
    soraRequest: null,
    isLumaRay2: false,
    loop: false,
    multiPrompt: null,
    shotType: 'customize',
    seed: null,
    cameraFixed: null,
    safetyChecker: null,
    voiceIds: [],
    elements: null,
    endImageUrl: null,
    extraInputValues: {},
    supportsDuration: generate.supportsDuration,
    durationSec: generate.durationSec,
    durationOption: generate.rawDurationOption,
    numFrames: generate.numFrames,
    supportsAspectRatio: generate.supportsAspectRatio,
    aspectRatio: generate.aspectRatio,
    supportsResolution: generate.supportsResolution,
    resolution: generate.effectiveResolution,
    audioEnabled: generate.audioEnabled,
    supportsFps: generate.supportsFps,
    fps: undefined,
    cfgScale: undefined,
  });
  assert.equal(Object.hasOwn(falRequest.falPayload, 'resolution'), false);

  const finalPrice = await computeFinalPrice(engine, 'i2v', generate);
  const preflight = await computeOmittedPreflight(engine, 'i2v', generate.durationSec);
  assert.equal(finalPrice.totalCents, 40);
  assert.equal(preflight.ok, true);
  assert.equal(preflight.total, 40);
  assert.equal(preflight.total, finalPrice.totalCents);
});

test('public omitted-resolution preflight preserves generation defaults when schema order differs', async () => {
  const engine = publicEngine('wan-3');
  const resolutionField = [
    ...(engine.inputSchema?.required ?? []),
    ...(engine.inputSchema?.optional ?? []),
  ].find((field) => field.id === 'resolution' && field.modes?.includes('t2v'));
  assert.equal(engine.resolutions[0], '480p');
  assert.equal(resolutionField?.default, '1080p');

  const generate = buildOmittedGenerateOptions(engine, 't2v');
  assert.equal(generate.requestedResolution, '480p');
  assert.equal(generate.pricingResolution, '480p');

  const finalPrice = await computeFinalPrice(engine, 't2v', generate);
  const preflight = await computeOmittedPreflight(engine, 't2v', generate.durationSec);
  // Keyvo 2026-11-13: 80% of the Bailian list, 4 s at 480p x CNY 0.3/s = 15c list -> 12c (formerly 26c at 30% margin).
  assert.equal(finalPrice.totalCents, 12);
  assert.equal(preflight.ok, true);
  assert.equal(preflight.total, 12);
  assert.equal(preflight.total, finalPrice.totalCents);
});
