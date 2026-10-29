import { getUpstreamRuntimeModelById, toLegacyModelSurfaces } from '../frontend/config/model-runtime';

/** Re-project an engine/roster entry with upstream publication surfaces (before Keyvo's web hiding). */
export function withUpstreamSurfaces<T extends { id?: string; engineId?: string; surfaces?: unknown }>(entry: T): T {
  const model = getUpstreamRuntimeModelById((entry.id ?? entry.engineId) as string);
  return model ? { ...entry, surfaces: toLegacyModelSurfaces(model) } : entry;
}
