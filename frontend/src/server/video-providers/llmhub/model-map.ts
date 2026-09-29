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
} as const;

export function resolveLlmhubVideoModel(engineId: string, mode: string): string | null {
  if (mode !== 't2v' && mode !== 'i2v') return null;
  return Object.hasOwn(MODELS, engineId) ? MODELS[engineId as keyof typeof MODELS] : null;
}
