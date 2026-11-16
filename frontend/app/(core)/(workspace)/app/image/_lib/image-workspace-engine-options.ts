import { isKeyvoHiddenModelForViewer } from '@/config/keyvo-model-visibility';
import type { ImageEngineOption } from './image-workspace-types';

export const DEFAULT_IMAGE_WORKSPACE_ENGINE_ID = 'seedream-5-0-flash';

const IMAGE_WORKSPACE_ENGINE_PRIORITY = new Map<string, number>([[DEFAULT_IMAGE_WORKSPACE_ENGINE_ID, 0]]);

function getImageWorkspaceEnginePriority(engineId: string): number {
  return IMAGE_WORKSPACE_ENGINE_PRIORITY.get(engineId) ?? IMAGE_WORKSPACE_ENGINE_PRIORITY.size;
}

export function sortImageWorkspaceEngineOptions<T extends Pick<ImageEngineOption, 'id'>>(
  engines: T[]
): T[] {
  return engines
    .map((engine, index) => ({
      engine,
      index,
      priority: getImageWorkspaceEnginePriority(engine.id),
    }))
    .sort((left, right) => left.priority - right.priority || left.index - right.index)
    .map(({ engine }) => engine);
}

/**
 * Keyvo viewer gate for the image workspace picker (both tabs read this one list). The page builds its options from the
 * registry, not from /api/engines, so it must apply the same allowlist rule as getBaseEnginesByCategory: a non-admin never
 * receives an admin-tier engine, an admin does, and KEYVO_ADMIN_TIER_OPEN opens them for everyone.
 */
export function filterImageWorkspaceEntriesForViewer<T extends { id: string }>(
  entries: readonly T[],
  viewer: { isAdmin: boolean },
): T[] {
  return entries.filter((entry) => !isKeyvoHiddenModelForViewer(entry.id, viewer));
}
