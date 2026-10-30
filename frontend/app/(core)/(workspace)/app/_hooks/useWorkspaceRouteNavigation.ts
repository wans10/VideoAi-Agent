import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { stripWorkspacePromptParam } from '@/lib/workspace-prompt-link';

export function useWorkspaceRouteNavigation() {
  const router = useRouter();

  // First-use onboarding stays in the workspace's existing starter feed.
  // Never replace an explicit creation/auth continuation with a gallery redirect.
  const replaceWorkspaceRoute = useCallback(
    (href: string) => {
      router.replace(href);
    },
    [router]
  );

  // A marketing link's starting prompt is applied once; drop it so a refresh keeps the user's edits.
  const clearRequestedPrompt = useCallback(() => {
    router.replace(stripWorkspacePromptParam(window.location.pathname, window.location.search));
  }, [router]);

  return {
    replaceWorkspaceRoute,
    clearRequestedPrompt,
  };
}
