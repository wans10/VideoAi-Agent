import { NextResponse, type NextRequest } from 'next/server';
import {
  getConfiguredEngineIncludingHidden,
  getPublicConfiguredEnginesByCategory,
} from '@/server/engines';
import { fetchEngineAverageDurations } from '@/server/generate-metrics';
import { loadAppEngineScoreMap } from '@/server/engine-scores';
import { getBaseEnginesByCategory } from '@/lib/engines';
import { resolveLaunchCanaryRequestContext } from '@/server/model-launch-canary-request';
import { createAgentGenerationExecutabilityEnvironment, resolveAgentGenerationModeExecutability } from '@/server/agent-runtime/model-executability';
import {
  filterExecutableWorkspaceEngines,
  reportHiddenWorkspaceEngines,
  resolveWorkspaceViewerIsAdmin,
  type WorkspaceModeExecutability,
} from '@/server/workspace-engine-availability';
import { projectSeedance25ModeAvailability } from '@/server/engine-mode-availability';
import { isMinimaxH3MaxEngineId, isMinimaxH3MaxRuntimeModeAvailable } from '@/lib/minimax-h3-max';
import { isKling3TurboEngineId } from '@/lib/kling-3-turbo';
import type { EngineCaps, Mode } from '@/types/engines';

type EnginesRouteDependencies = Readonly<{
  getPublicConfiguredEnginesByCategory: typeof getPublicConfiguredEnginesByCategory;
  getConfiguredEngineIncludingHidden: typeof getConfiguredEngineIncludingHidden;
  resolveLaunchCanaryRequestContext: typeof resolveLaunchCanaryRequestContext;
  fetchEngineAverageDurations: typeof fetchEngineAverageDurations;
  loadAppEngineScoreMap: typeof loadAppEngineScoreMap;
  getGenerationEnvironment: typeof createAgentGenerationExecutabilityEnvironment;
  resolveModeExecutability: WorkspaceModeExecutability;
  resolveIsAdmin: (request: NextRequest) => Promise<boolean>;
}>;

const defaultDependencies: EnginesRouteDependencies = {
  getPublicConfiguredEnginesByCategory,
  getConfiguredEngineIncludingHidden,
  resolveLaunchCanaryRequestContext,
  fetchEngineAverageDurations,
  loadAppEngineScoreMap,
  getGenerationEnvironment: createAgentGenerationExecutabilityEnvironment,
  resolveModeExecutability: resolveAgentGenerationModeExecutability,
  resolveIsAdmin: resolveWorkspaceViewerIsAdmin,
};

function workspaceModeProjection(engine: EngineCaps, modes: readonly Mode[]): EngineCaps {
  const safeEngine = { ...engine };
  delete safeEngine.providerMeta;
  return {
    ...safeEngine,
    modes: [...modes],
    modeCaps: engine.modeCaps
      ? Object.fromEntries(
          modes.flatMap((mode) => engine.modeCaps?.[mode]
            ? [[mode, engine.modeCaps[mode]]]
            : []),
        )
      : undefined,
  };
}

// Seedance 2.5 reports availability per mode (projectSeedance25ModeAvailability), so its modes stay listed.
const keepsOwnModeAvailability = (engine: EngineCaps) => engine.id === 'seedance-2-5';

export function createEnginesGetHandler(
  dependencyOverrides: Partial<EnginesRouteDependencies> = {},
) {
  const dependencies = { ...defaultDependencies, ...dependencyOverrides };
  return async function enginesGet(request: NextRequest) {
    const rawCategory = request.nextUrl.searchParams.get('category') ?? 'video';
    const category = rawCategory === 'image' || rawCategory === 'all' ? rawCategory : 'video';
    const includeAverages =
      category !== 'image' && request.nextUrl.searchParams.get('includeAverages') === '1';
    const includeScores = category !== 'image';
    // Fail closed: an error resolving the viewer means a non-admin list.
    const isAdmin = await dependencies.resolveIsAdmin(request).catch(() => false);
    const viewer = isAdmin ? 'admin' : 'member';
    try {
      const [publicEngines, averages, engineScores, launchCanaryContext] = await Promise.all([
        dependencies.getPublicConfiguredEnginesByCategory(category),
        includeAverages ? dependencies.fetchEngineAverageDurations() : Promise.resolve([]),
        includeScores ? dependencies.loadAppEngineScoreMap() : Promise.resolve({}),
        category === 'image'
          ? Promise.resolve(null)
          : dependencies.resolveLaunchCanaryRequestContext(request),
      ]);
      const privateEngines: EngineCaps[] = [];
      if (launchCanaryContext) {
        for (const engineId of launchCanaryContext.access.allowedModelIds) {
          const engine = await dependencies.getConfiguredEngineIncludingHidden(engineId);
          if (!engine || publicEngines.some((candidate) => candidate.id === engine.id)) continue;
          const executableModes = engine.modes.filter((mode) =>
            resolveAgentGenerationModeExecutability(
              engine,
              mode,
              launchCanaryContext.generationEnvironment,
            ).executable,
          );
          if (executableModes.length) {
            privateEngines.push(workspaceModeProjection(engine, executableModes));
          }
        }
      }
      const averageMap = new Map(averages.map((entry) => [entry.engineId, entry]));
      const generationEnvironment = dependencies.getGenerationEnvironment();
      // Offer only what this deployment can run (see workspace-engine-availability.ts); fails open.
      const availability = filterExecutableWorkspaceEngines(publicEngines, {
        environment: generationEnvironment,
        resolve: dependencies.resolveModeExecutability,
        isAdmin,
        onCheckError: (engineId) => console.warn(`[engines] executability check failed for ${engineId}; keeping it listed`),
        keepAllModes: keepsOwnModeAvailability,
      });
      reportHiddenWorkspaceEngines(category, availability, Date.now(), viewer);
      const publicWorkspaceEngines = availability.engines.map((engine) => projectSeedance25ModeAvailability(
        isMinimaxH3MaxEngineId(engine.id)
          ? workspaceModeProjection(engine, engine.modes.filter(isMinimaxH3MaxRuntimeModeAvailable) as Mode[])
          : isKling3TurboEngineId(engine.id)
            ? workspaceModeProjection(engine, engine.modes)
          : engine,
        generationEnvironment,
      ));
      const payload = [...publicWorkspaceEngines, ...privateEngines].map((engine) => ({
        ...engine,
        avgDurationMs: averageMap.get(engine.id)?.averageDurationMs ?? null,
        durationSampleCount: averageMap.get(engine.id)?.completedCount ?? null,
        durationSource: averageMap.get(engine.id)?.source ?? null,
      }));
      return NextResponse.json(
        { ok: true, engines: payload, engineScores },
        {
          headers: {
            'Cache-Control': 'private, no-store',
            Vary: 'Authorization, Cookie',
          },
        },
      );
    } catch (error) {
      console.error('[api/engines] failed to load configured engines, falling back to base registry', error);
      const fallbackEnvironment = dependencies.getGenerationEnvironment();
      const fallbackAvailability = filterExecutableWorkspaceEngines(getBaseEnginesByCategory(category), {
        environment: fallbackEnvironment,
        resolve: dependencies.resolveModeExecutability,
        isAdmin,
        onCheckError: (engineId) => console.warn(`[engines] executability check failed for ${engineId}; keeping it listed`),
        keepAllModes: keepsOwnModeAvailability,
      });
      reportHiddenWorkspaceEngines(category, fallbackAvailability, Date.now(), viewer);
      const payload = fallbackAvailability.engines.map((engine) => ({
        ...projectSeedance25ModeAvailability(isMinimaxH3MaxEngineId(engine.id)
          ? workspaceModeProjection(engine, engine.modes.filter(isMinimaxH3MaxRuntimeModeAvailable) as Mode[])
          : isKling3TurboEngineId(engine.id)
            ? workspaceModeProjection(engine, engine.modes)
          : engine, fallbackEnvironment),
        avgDurationMs: null,
      }));
      return NextResponse.json(
        { ok: true, engines: payload, engineScores: {}, degraded: true },
        {
          headers: {
            'Cache-Control': 'private, no-store',
            Vary: 'Authorization, Cookie',
          },
        },
      );
    }
  };
}
