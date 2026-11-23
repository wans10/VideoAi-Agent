import { getEngineCaps } from '@/fixtures/engineCaps';
import { resolveActiveVideoInputField } from '@/lib/video-input-schema';
import { isKling3TurboEngineId } from '@/lib/kling-3-turbo';
import { isMinimaxH3MaxEngineId } from '@/lib/minimax-h3-max';
import { isFlux3MaxEngineId } from '@/lib/flux-3-max';
import type { EngineCaps, Mode } from '@/types/engines';
import { isPrivateRuntimeEngineId } from './private-engine-registry';

export type RuntimeResolutionPolicy = Readonly<{
  supportsResolution: boolean;
  usesSchemaDefaults: boolean;
  defaultResolution?: string;
  pricingFallbackResolution: string;
}>;

export function resolveRuntimeResolutionPolicy(
  engine: EngineCaps,
  mode: Mode,
): RuntimeResolutionPolicy {
  const usesSchemaDefaults = isPrivateRuntimeEngineId(engine.id)
    || isFlux3MaxEngineId(engine.id)
    || isKling3TurboEngineId(engine.id)
    || isMinimaxH3MaxEngineId(engine.id);
  const schemaField = resolveActiveVideoInputField({
    inputSchema: engine.inputSchema,
    mode,
    candidateFieldIds: ['resolution'],
    type: 'enum',
  });
  const registeredCapability = getEngineCaps(engine.id, mode);
  const supportsResolution = usesSchemaDefaults
    ? Boolean(schemaField?.values?.length)
    : registeredCapability
      ? Boolean(registeredCapability.resolution?.length)
      : true;
  const schemaDefault = usesSchemaDefaults && typeof schemaField?.default === 'string'
    ? schemaField.default.trim() || undefined
    : undefined;
  const pricingFallbackResolution =
    engine.resolutions.find((value) => value !== 'auto')
    ?? engine.resolutions[0]
    ?? '1080p';

  return {
    supportsResolution,
    usesSchemaDefaults,
    ...(supportsResolution
      ? {
          defaultResolution:
            schemaDefault
            ?? registeredCapability?.resolution?.[0]
            ?? engine.resolutions[0]
            ?? pricingFallbackResolution,
        }
      : {}),
    pricingFallbackResolution,
  };
}

export const RESOLUTION_UNSUPPORTED_CODE = 'RESOLUTION_UNSUPPORTED';

/**
 * Keyvo: resolutions an explicit request may name for this engine and mode. Schema-driven engines use the active
 * schema enum; registered engines use the mode capability intersected with the engine catalogue (the pricing matrix
 * only holds catalogue resolutions); everything else uses the catalogue list. 'auto' is not an option.
 */
export function listSupportedRequestResolutions(engine: EngineCaps, mode: Mode): string[] {
  const policy = resolveRuntimeResolutionPolicy(engine, mode);
  const catalogue = engine.resolutions.filter((value) => value !== 'auto') as string[];
  if (policy.usesSchemaDefaults) {
    const schemaField = resolveActiveVideoInputField({
      inputSchema: engine.inputSchema, mode, candidateFieldIds: ['resolution'], type: 'enum',
    });
    return (schemaField?.values ?? []).map(String).filter((value) => value !== 'auto');
  }
  const registered = getEngineCaps(engine.id, mode)?.resolution;
  if (!registered?.length) return catalogue;
  const narrowed = registered.filter((value) => value !== 'auto' && catalogue.includes(value));
  return narrowed.length ? narrowed : catalogue;
}

/**
 * An explicit resolution outside the engine's supported list must be refused, never priced or submitted as another
 * resolution. Absent or 'auto' requests keep the default behaviour; engines or modes that ignore resolution are exempt.
 */
export function checkRequestedResolutionSupported(
  engine: EngineCaps,
  mode: Mode,
  requested: unknown,
): { ok: true } | { ok: false; code: typeof RESOLUTION_UNSUPPORTED_CODE; message: string; allowed: string[] } {
  if (typeof requested !== 'string') return { ok: true };
  const value = requested.trim();
  if (!value || value === 'auto') return { ok: true };
  if (!resolveRuntimeResolutionPolicy(engine, mode).supportsResolution) return { ok: true };
  const allowed = listSupportedRequestResolutions(engine, mode);
  if (!allowed.length || allowed.includes(value)) return { ok: true };
  return {
    ok: false,
    code: RESOLUTION_UNSUPPORTED_CODE,
    message: `该模型不支持所选分辨率，请选择 ${allowed.join(' / ')}。`,
    allowed,
  };
}
