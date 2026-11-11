import { isMinimaxOfficialEnabled } from '@/server/video-providers/minimax-official/client';

export const LLMHUB_VIDEO_PROVIDER = 'llmhub' as const;

const MODELS = {
  'veo-3-1': 'veo-3.1-generate-001',
  'veo-3-1-fast': 'veo-3.1-fast-generate-001',
  'veo-3-1-lite': 'veo-3.1-lite-generate-001',
  'seedance-2-0': 'doubao-seedance-2.0',
  'seedance-2-0-fast': 'doubao-seedance-2.0-fast',
  'seedance-2-0-mini': 'doubao-seedance-2.0-mini',
  'seedance-2-5': 'doubao-seedance-2.5',
  'wan-3': 'wan3.0-video',
  'wan-3-prime': 'wan3.0-video-prime',
  'minimax-h3': 'MiniMax-H3',
  'minimax-hailuo-02-text': 'MiniMax-Hailuo-02',
} as const;

/**
 * Engines that only MiniMax's official API serves (see minimax-official/client.ts). They keep the llmhub job
 * provider so polling and refunds are shared, but resolve only while MINIMAX_OFFICIAL_ENABLED is on.
 */
const MINIMAX_OFFICIAL_ONLY_MODELS: Readonly<Record<string, Readonly<{ model: string; modes: readonly string[] }>>> = {
  'minimax-hailuo-2-3': { model: 'MiniMax-Hailuo-2.3', modes: ['t2v', 'i2v'] },
  'minimax-hailuo-2-3-fast': { model: 'MiniMax-Hailuo-2.3-Fast', modes: ['i2v'] },
};

export function resolveLlmhubVideoModel(
  engineId: string,
  mode: string,
  env: Record<string, string | undefined> = process.env,
): string | null {
  const officialOnly = MINIMAX_OFFICIAL_ONLY_MODELS[engineId];
  if (officialOnly) return isMinimaxOfficialEnabled(env) && officialOnly.modes.includes(mode) ? officialOnly.model : null;
  // Multimodal reference exists only on MiniMax's own V2 API.
  if (mode === 'ref2v' && engineId === 'minimax-h3') return isMinimaxOfficialEnabled(env) ? MODELS[engineId] : null;
  if (mode !== 't2v' && mode !== 'i2v') return null;
  return Object.hasOwn(MODELS, engineId) ? MODELS[engineId as keyof typeof MODELS] : null;
}
