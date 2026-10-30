import { useEffect, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';

/**
 * Applies the starting prompt carried by a marketing link (`/app?prompt=`) exactly once.
 *
 * It waits until the stored or account draft has finished hydrating, so the link wins over the previous
 * prompt without being overwritten afterwards, and it seeds only the composer prompt field. The existing
 * prompt persistence then saves it like any other edit. The parameter is removed from the URL afterwards
 * so a refresh does not replace the user's edits.
 */
export function useWorkspaceRequestedPrompt({
  requestedPrompt,
  draftReady,
  setPrompt,
  onApplied,
}: {
  requestedPrompt: string | null;
  draftReady: boolean;
  setPrompt: Dispatch<SetStateAction<string>>;
  onApplied: () => void;
}) {
  const appliedRef = useRef<string | null>(null);
  const onAppliedRef = useRef(onApplied);
  onAppliedRef.current = onApplied;

  useEffect(() => {
    if (!requestedPrompt || !draftReady) return;
    if (appliedRef.current === requestedPrompt) return;
    appliedRef.current = requestedPrompt;
    setPrompt(requestedPrompt);
    onAppliedRef.current();
  }, [draftReady, requestedPrompt, setPrompt]);
}
