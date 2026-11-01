import type { HistoryEntry } from './image-workspace-types';

/**
 * Which history entry the large image preview shows, or `undefined` for the empty placeholder.
 *
 * An explicitly selected entry always wins (opening one from the rail, a deep link, or the result of a generation
 * started in this session). Without a selection the preview only falls back to the newest entry when
 * `defaultToLatestEntry` is on, which is the logged-out visitor case: a signed-in user opens on an empty preview and
 * picks from their own history. `suppressDefaultPreview` (the storyboard hand-off) keeps the preview empty either way.
 */
export function resolveImagePreviewEntry({
  historyEntries,
  selectedPreviewEntryId,
  suppressDefaultPreview,
  defaultToLatestEntry,
}: {
  historyEntries: readonly HistoryEntry[];
  selectedPreviewEntryId: string | null;
  suppressDefaultPreview: boolean;
  defaultToLatestEntry: boolean;
}): HistoryEntry | undefined {
  if (suppressDefaultPreview && !selectedPreviewEntryId) return undefined;
  if (selectedPreviewEntryId) {
    const match = historyEntries.find((entry) => entry.id === selectedPreviewEntryId);
    if (match) return match;
  }
  return defaultToLatestEntry ? historyEntries[0] : undefined;
}
