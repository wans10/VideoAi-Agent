import type { RawFalEngineEntry } from './types';
import { createWan3Engine, WAN_3_MODE_CAPS } from './wan-3-shared';

export const WAN_3_PRIME_ENDPOINTS = {
  t2v: 'alibaba/wan-3.0-prime/text-to-video',
  i2v: 'alibaba/wan-3.0-prime/image-to-video',
  ref2v: 'alibaba/wan-3.0-prime/reference-to-video',
  v2v: 'alibaba/model-studio/wan3.0-video-prime/video-edit',
  extend: 'alibaba/model-studio/wan3.0-video-prime/extend',
} as const;

const engine = createWan3Engine({
  id: 'wan-3-prime',
  label: 'Wan 3 Prime',
  version: '3.0 Prime',
  // Bailian cn-beijing list: 0.45 / 0.9 / 1.8 CNY/s (https://docs.bailian.console.aliyun.com/zh/model-studio/wan3-0-video-prime.md,
  // checked 2026-11-13), at 8 CNY/USD.
  perSecondCents: { '480p': 5.625, '720p': 11.25, '1080p': 22.5 },
  perSecondUsd: { '480p': 0.05625, '720p': 0.1125, '1080p': 0.225 },
});

export const WAN_3_PRIME_FAL_ENGINE_REGISTRY: RawFalEngineEntry[] = [{
  id: 'wan-3-prime', marketingName: 'Wan 3 Prime', cardTitle: 'Wan 3 Prime', provider: 'Alibaba', brandId: 'wan',
  versionLabel: '3.0 Prime', availability: 'available', logoPolicy: 'textOnly',
  billingNote: 'Provider cost uses input video plus generated output seconds at the Bailian list price of CNY 0.45 (480p), 0.9 (720p) or 1.8 (1080p) per second. Keyvo customer quotes are 80% of that list price, including verified input-video duration.',
  engine,
  modes: [
    { mode: 't2v', falModelId: WAN_3_PRIME_ENDPOINTS.t2v, ui: WAN_3_MODE_CAPS.t2v! },
    { mode: 'i2v', falModelId: WAN_3_PRIME_ENDPOINTS.i2v, ui: WAN_3_MODE_CAPS.i2v! },
    { mode: 'ref2v', falModelId: WAN_3_PRIME_ENDPOINTS.ref2v, ui: WAN_3_MODE_CAPS.ref2v! },
    { mode: 'v2v', falModelId: WAN_3_PRIME_ENDPOINTS.v2v, ui: WAN_3_MODE_CAPS.v2v! },
    { mode: 'extend', falModelId: WAN_3_PRIME_ENDPOINTS.extend, ui: WAN_3_MODE_CAPS.extend! },
  ],
  defaultFalModelId: WAN_3_PRIME_ENDPOINTS.t2v,
  seo: { title: 'Wan 3 Prime AI Video Generator | Keyvo', description: 'Generate premium Wan 3 Prime video from text, images, or mixed references.', canonicalPath: '/models/wan-3-prime' },
  demoUrl: 'https://media.maxvideoai.com/mcp-reference-staging/media-assets/1a3c083f-bbda-4dc0-9e2a-75d46a6b5cbb/a583d7e2-c805-4fba-9f77-6139c2269e79.mp4',
  media: {
    videoUrl: 'https://media.maxvideoai.com/mcp-reference-staging/media-assets/1a3c083f-bbda-4dc0-9e2a-75d46a6b5cbb/a583d7e2-c805-4fba-9f77-6139c2269e79.mp4',
    imagePath: 'https://media.maxvideoai.com/mcp-render-staging/1a3c083f-bbda-4dc0-9e2a-75d46a6b5cbb/e1737553-786b-4362-a873-7ffec396247d.jpg',
    altText: 'Wan 3 Prime flagship video generation demo with coherent motion',
  },
  prompts: [
    { title: 'Premium cinematic scene', prompt: 'A premium cinematic commercial, controlled camera move, realistic motion, synchronized ambience.', mode: 't2v' },
    { title: 'Prime image animation', prompt: 'Animate the composition with precise subject preservation and polished cinematic motion.', mode: 'i2v' },
    { title: 'Prime mixed references', prompt: 'Synthesize the supplied image, video, and audio references into one consistent scene.', mode: 'ref2v' },
  ],
}];
