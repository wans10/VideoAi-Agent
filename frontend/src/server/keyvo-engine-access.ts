import { isKeyvoHiddenModelForViewer, keyvoEngineTier } from '@/config/keyvo-model-visibility';
import { resolveWorkspaceViewerIsAdmin } from '@/server/workspace-engine-availability';

/**
 * Keyvo engine access for direct API routes (image generate, image estimate, public quote). The admin check runs
 * only for admin-tier ids, so ordinary requests add no session lookup. Call this before any reservation, charge or
 * provider call; a true result means the route must answer as if the engine did not exist.
 */
export async function isKeyvoEngineRefusedForRequest(
  engineId: string | null | undefined,
  request?: Parameters<typeof resolveWorkspaceViewerIsAdmin>[0],
): Promise<boolean> {
  if (typeof engineId !== 'string' || !engineId.trim()) return false;
  const isAdmin = keyvoEngineTier(engineId) === 'admin' ? await resolveWorkspaceViewerIsAdmin(request) : false;
  return isKeyvoHiddenModelForViewer(engineId, { isAdmin });
}
