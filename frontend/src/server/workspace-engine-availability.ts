import {
  createAgentGenerationExecutabilityEnvironment,
  resolveAgentGenerationModeExecutability,
  type AgentGenerationExecutabilityEnvironment,
} from '@/server/agent-runtime/model-executability';
import { requireAdmin } from '@/server/admin';
import type { EngineCaps, Mode } from '@/types/engines';

/**
 * Which models the workspace pickers (video and image) offer.
 *
 * An engine is listed only when at least one of its modes can run with the providers configured in THIS deployment
 * (`resolveAgentGenerationModeExecutability`). This is a configuration check: it proves a key is present and the
 * route is enabled, not that the provider account has access to the model or credit. It fails open: an unexpected
 * error while checking an engine keeps the engine listed, and a list that would become empty is returned unfiltered
 * so a misread environment can never leave the picker with nothing.
 */

export type WorkspaceModeDecision = Readonly<{ executable: boolean; reason: string }>;

export type WorkspaceModeExecutability = (
  engine: EngineCaps,
  mode: Mode,
  environment: AgentGenerationExecutabilityEnvironment,
  options?: { isAdmin?: boolean },
) => WorkspaceModeDecision;

export type HiddenWorkspaceEngine = Readonly<{ id: string; reason: string }>;

export type WorkspaceEngineFilterResult<T extends EngineCaps> = Readonly<{
  engines: T[];
  hidden: HiddenWorkspaceEngine[];
  /** True when every engine failed the check, so the unfiltered list was returned instead. */
  noneExecutable: boolean;
}>;

function projectModes<T extends EngineCaps>(engine: T, modes: readonly Mode[]): T {
  if (modes.length === engine.modes.length) return engine;
  return {
    ...engine,
    modes: [...modes],
    modeCaps: engine.modeCaps
      ? Object.fromEntries(
          modes.flatMap((mode) => (engine.modeCaps?.[mode] ? [[mode, engine.modeCaps[mode]]] : [])),
        )
      : undefined,
  };
}

export function filterExecutableWorkspaceEngines<T extends EngineCaps>(
  engines: readonly T[],
  options: {
    environment?: AgentGenerationExecutabilityEnvironment;
    resolve?: WorkspaceModeExecutability;
    /**
     * Whether the viewer is an admin. Admin-only routes (a provider rolled out to admins first) count as runnable for
     * admins, exactly as the generate route routes them, and stay hidden from everyone else. Defaults to false.
     */
    isAdmin?: boolean;
    /** Called with the engine id only (never the error message, which could echo configuration). */
    onCheckError?: (engineId: string) => void;
    /**
     * Engines that publish per-mode availability themselves (Seedance 2.5 marks Edit as unavailable instead of
     * dropping it) keep their full mode list; they are hidden only when no mode can run.
     */
    keepAllModes?: (engine: EngineCaps) => boolean;
  } = {},
): WorkspaceEngineFilterResult<T> {
  const resolve = options.resolve ?? resolveAgentGenerationModeExecutability;
  const environment = options.environment ?? createAgentGenerationExecutabilityEnvironment();
  const isAdmin = options.isAdmin === true;
  const kept: T[] = [];
  const hidden: HiddenWorkspaceEngine[] = [];

  for (const engine of engines) {
    if (!engine.modes.length) {
      kept.push(engine);
      continue;
    }
    try {
      const decisions = engine.modes.map((mode) => ({ mode, decision: resolve(engine, mode, environment, { isAdmin }) }));
      const executableModes = decisions.filter((entry) => entry.decision.executable).map((entry) => entry.mode);
      if (executableModes.length) {
        kept.push(options.keepAllModes?.(engine) ? engine : projectModes(engine, executableModes));
      } else {
        hidden.push({ id: engine.id, reason: decisions[0]?.decision.reason ?? 'unknown' });
      }
    } catch {
      options.onCheckError?.(engine.id);
      kept.push(engine);
    }
  }

  if (!kept.length && engines.length) {
    return { engines: [...engines], hidden, noneExecutable: true };
  }
  return { engines: kept, hidden, noneExecutable: false };
}

/**
 * Admin check for the picker, same rule as the generate route (`requireAdmin`). Any failure means "not an admin", so a
 * broken session lookup can only hide admin-only models, never expose them.
 */
export async function resolveWorkspaceViewerIsAdmin(
  request?: Parameters<typeof requireAdmin>[0],
): Promise<boolean> {
  try {
    await requireAdmin(request);
    return true;
  } catch {
    return false;
  }
}

const HIDDEN_LOG_INTERVAL_MS = 10 * 60 * 1000;
const lastHiddenLogAt = new Map<string, number>();

/**
 * One compact line, at most once per process start and then every 10 minutes per picker, so the owner can read
 * `docker logs` instead of guessing. Only engine ids and reason codes are written: never keys or environment values.
 */
export function reportHiddenWorkspaceEngines(
  scope: string,
  result: Pick<WorkspaceEngineFilterResult<EngineCaps>, 'hidden' | 'noneExecutable'>,
  now: number = Date.now(),
  viewer: 'admin' | 'member' = 'member',
): boolean {
  if (!result.hidden.length) return false;
  const last = lastHiddenLogAt.get(scope);
  if (last !== undefined && now - last < HIDDEN_LOG_INTERVAL_MS) return false;
  lastHiddenLogAt.set(scope, now);
  const adminNote = viewer === 'member'
    ? ' [non-admin view: models whose route is admin-only are hidden; admins see them]'
    : ' [admin view]';
  const list = result.hidden.map((entry) => `${entry.id}(${entry.reason})`).join(', ');
  if (result.noneExecutable) {
    console.warn(`[engines] no executable engine in the ${scope} picker, listing all of them instead: ${list}${adminNote}`);
  } else {
    console.info(`[engines] hidden in the workspace picker (${scope}): ${list}${adminNote}`);
  }
  return true;
}

export function resetHiddenWorkspaceEngineLogForTests(): void {
  lastHiddenLogAt.clear();
}
