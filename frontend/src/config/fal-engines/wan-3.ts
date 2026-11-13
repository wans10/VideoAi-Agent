import type { RawFalEngineEntry } from './types';
import { createWan3Engine, WAN_3_MODE_CAPS } from './wan-3-shared';

export const WAN_3_ENDPOINTS = {
  t2v: 'alibaba/wan-3.0/text-to-video',
  i2v: 'alibaba/wan-3.0/image-to-video',
  ref2v: 'alibaba/wan-3.0/reference-to-video',
  v2v: 'alibaba/model-studio/wan3.0-video/video-edit',
  extend: 'alibaba/model-studio/wan3.0-video/extend',
} as const;

const engine = createWan3Engine({
  id: 'wan-3',
  label: 'Wan 3',
  version: '3.0',
  // Bailian cn-beijing list: 0.3 / 0.6 / 1.2 CNY/s (https://docs.bailian.console.aliyun.com/zh/model-studio/wan3-0-video.md,
  // checked 2026-11-13; the limited-time discount and free quota are not applied), at 8 CNY/USD.
  perSecondCents: { '480p': 3.75, '720p': 7.5, '1080p': 15 },
  perSecondUsd: { '480p': 0.0375, '720p': 0.075, '1080p': 0.15 },
});
// Production continuity review (21 October): extension returns the new footage only.
engine.modeCaps={...WAN_3_MODE_CAPS,extend:{...WAN_3_MODE_CAPS.extend!,extensionOutput:'continuation'}};

export const WAN_3_FAL_ENGINE_REGISTRY: RawFalEngineEntry[] = [{
  id: 'wan-3', marketingName: 'Wan 3', cardTitle: 'Wan 3', provider: 'Alibaba', brandId: 'wan',
  versionLabel: '3.0', availability: 'available', logoPolicy: 'textOnly',
  billingNote: 'Provider cost uses input video plus generated output seconds at the Bailian list price of CNY 0.3 (480p), 0.6 (720p) or 1.2 (1080p) per second. Keyvo customer quotes are 80% of that list price, including verified input-video duration.',
  engine,
  modes: [
    { mode: 't2v', falModelId: WAN_3_ENDPOINTS.t2v, ui: WAN_3_MODE_CAPS.t2v! },
    { mode: 'i2v', falModelId: WAN_3_ENDPOINTS.i2v, ui: WAN_3_MODE_CAPS.i2v! },
    { mode: 'ref2v', falModelId: WAN_3_ENDPOINTS.ref2v, ui: WAN_3_MODE_CAPS.ref2v! },
    { mode: 'v2v', falModelId: WAN_3_ENDPOINTS.v2v, ui: WAN_3_MODE_CAPS.v2v! },
    { mode: 'extend', falModelId: WAN_3_ENDPOINTS.extend, ui: engine.modeCaps.extend! },
  ],
  defaultFalModelId: WAN_3_ENDPOINTS.t2v,
  seo: { title: 'Wan 3 AI Video Generator | Keyvo', description: 'Generate Wan 3 video from text, images, or mixed references with native audio.', canonicalPath: '/models/wan-3' },
  demoUrl: 'https://media.maxvideoai.com/mcp-reference-staging/media-assets/1a3c083f-bbda-4dc0-9e2a-75d46a6b5cbb/cb6eb769-7a2c-4970-82c6-3e9529949397.mp4',
  media: {
    videoUrl: 'https://media.maxvideoai.com/mcp-reference-staging/media-assets/1a3c083f-bbda-4dc0-9e2a-75d46a6b5cbb/cb6eb769-7a2c-4970-82c6-3e9529949397.mp4',
    imagePath: 'https://media.maxvideoai.com/mcp-render-staging/1a3c083f-bbda-4dc0-9e2a-75d46a6b5cbb/d3c5c35e-42d8-4abd-95bd-8608c50f92c7.jpg',
    altText: 'Wan 3 continuous contemporary choreography on city rooftop',
  },
  prompts: [
    { title: 'Cinematic scene', prompt: 'A cinematic street at blue hour, natural dialogue and ambient sound, slow camera push.', mode: 't2v' },
    { title: 'Animate a still', prompt: 'Preserve the subject while adding subtle parallax, cloth motion, and a slow dolly move.', mode: 'i2v' },
    { title: 'Mixed references', prompt: 'Use the supplied visual and audio references to create a coherent cinematic sequence.', mode: 'ref2v' },
  ],
}];
