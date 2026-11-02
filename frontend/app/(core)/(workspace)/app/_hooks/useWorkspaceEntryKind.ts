import { useCallback, useRef } from 'react';
import { claimWorkspaceDocumentEntry, type WorkspaceEntryKind } from '../_lib/workspace-prompt-entry';

/**
 * Returns a stable getter for how this workspace mount was entered. It decides once per mount, and only when first
 * called from an effect or event handler (never while rendering), so the answer is the same for every restore
 * step of the mount and a discarded render cannot consume the document's first entry.
 */
export function useWorkspaceEntryKind(): () => WorkspaceEntryKind {
  const decided = useRef<WorkspaceEntryKind | null>(null);
  return useCallback(() => {
    decided.current ??= claimWorkspaceDocumentEntry();
    return decided.current;
  }, []);
}
