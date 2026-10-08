/** Actual local-app captures, refreshed 2026-09-30. Chinese visitor UI, never synthetic results. */
export const TOOL_WORKSPACE_CAPTURES = {
  'character-builder': '/assets/tools/redesign/character-builder-workspace-v2.webp',
  angle: '/assets/tools/redesign/angle-workspace-v2.webp',
  upscale: '/assets/tools/redesign/upscale-workspace-v2.webp',
  'background-removal': '/assets/tools/redesign/background-removal-workspace-v2.webp',
} as const;
export type MarketingToolId = keyof typeof TOOL_WORKSPACE_CAPTURES;
