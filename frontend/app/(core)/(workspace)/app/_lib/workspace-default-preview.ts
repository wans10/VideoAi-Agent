import type { SelectedVideoPreview } from '@/lib/video-preview-group';
import type { VideoGroup } from '@/types/video-groups';

/**
 * Whether the workspace opens on an earlier result by default.
 *
 * Signed-in users start with an empty preview and pick from their own history in the rail; a result appears in the
 * preview when they open it or when a generation they started finishes. Only logged-out visitors keep a default
 * (the guest starter sample), so nobody's private work is ever shown unasked. While the auth state is still
 * unresolved the default stays off, so a signed-in user never sees a flash of their latest result.
 */
export function shouldDefaultToLatestPreview(authStatus: string | null | undefined): boolean {
  return authStatus === 'loggedOut';
}

/** Which render group id should be active. `null` means the preview stays empty. */
export function resolveActiveGroupId({
  activeGroupId,
  groupIds,
  defaultToLatest,
}: {
  activeGroupId: string | null;
  groupIds: readonly string[];
  defaultToLatest: boolean;
}): string | null {
  if (!groupIds.length) return null;
  if (activeGroupId && groupIds.includes(activeGroupId)) return activeGroupId;
  return defaultToLatest ? groupIds[0] : null;
}

/** The group the video preview shows, or `null` for the empty placeholder. */
export function resolveActiveVideoGroup({
  activeVideoGroups,
  activeGroupId,
  selectedPreview,
  hasCompositeOverride,
  defaultToLatest,
}: {
  activeVideoGroups: readonly VideoGroup[];
  activeGroupId: string | null;
  selectedPreview: SelectedVideoPreview | null;
  hasCompositeOverride: boolean;
  defaultToLatest: boolean;
}): VideoGroup | null {
  if (hasCompositeOverride) return null;
  if (!activeVideoGroups.length) return null;
  if (selectedPreview) {
    // An unrelated active job must not replace an explicitly selected result.
    return (
      activeVideoGroups.find(
        (group) =>
          group.id === selectedPreview.batchId ||
          group.items.some((item) => (item.jobId ?? item.id) === selectedPreview.id)
      ) ?? null
    );
  }
  const latest = defaultToLatest ? activeVideoGroups[0] ?? null : null;
  if (!activeGroupId) return latest;
  return activeVideoGroups.find((group) => group.id === activeGroupId) ?? latest;
}
