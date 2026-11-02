/**
 * Whether a signed-in user's stored (or built-in default) prompt is put back in the composer when a workspace opens.
 *
 * Rule: a fresh entry starts with an EMPTY prompt; only a reload of the same document keeps the text, so a refresh
 * while typing loses nothing. "Fresh" is every normal navigation (menu, link, typed URL, the home-page 生成 button)
 * and every later workspace mount in the same document (switching between the video, image and audio tabs).
 *
 * Only the prompt text follows this rule. Engine, mode, duration, resolution and the other settings keep being
 * restored from their stores exactly as before.
 */
export type WorkspaceEntryKind = 'fresh' | 'resume';

/** Browser navigation types that mean "the same page again": a refresh or history traversal. */
const RESUME_NAVIGATION_TYPES = new Set(['reload', 'back_forward']);

export function resolveWorkspaceEntryKind({
  navigationType,
  firstEntryInDocument,
}: {
  navigationType: string | null | undefined;
  firstEntryInDocument: boolean;
}): WorkspaceEntryKind {
  // The navigation type describes the document load, so it only speaks for the first workspace mount in it.
  if (!firstEntryInDocument) return 'fresh';
  return navigationType && RESUME_NAVIGATION_TYPES.has(navigationType) ? 'resume' : 'fresh';
}

export function readDocumentNavigationType(): string | null {
  if (typeof performance === 'undefined' || typeof performance.getEntriesByType !== 'function') return null;
  const [entry] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
  return entry?.type ?? null;
}

let documentEntryClaimed = false;

/**
 * Called from an effect (never during render, so a discarded render cannot consume it): the first workspace mount
 * in this document reads the navigation type, every later mount is fresh.
 */
export function claimWorkspaceDocumentEntry(): WorkspaceEntryKind {
  const firstEntryInDocument = !documentEntryClaimed;
  documentEntryClaimed = true;
  return resolveWorkspaceEntryKind({ navigationType: readDocumentNavigationType(), firstEntryInDocument });
}

export function resetWorkspaceDocumentEntryForTests() {
  documentEntryClaimed = false;
}

/**
 * The prompt restore decision.
 * - Logged-out visitors keep the starter sample behaviour untouched.
 * - A prompt-bearing deep link (?job=, ?from=) or a guest creation carried over a login keeps its own prompt.
 * - Everyone else restores the stored prompt only when the same document is resumed.
 */
export function shouldRestoreStoredPrompt({
  signedIn,
  entry,
  promptDeepLink,
  guestContinuation = false,
}: {
  signedIn: boolean;
  entry: WorkspaceEntryKind;
  promptDeepLink: boolean;
  guestContinuation?: boolean;
}): boolean {
  if (!signedIn || promptDeepLink || guestContinuation) return true;
  return entry === 'resume';
}
