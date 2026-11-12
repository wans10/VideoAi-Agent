import type { ModelPageTemplateConfig } from '../model-page-template-types';

export const seedance15ProTemplateConfig: ModelPageTemplateConfig = {
  slug: 'seedance-1-5-pro',
  intent: 'specialized',
  hero: {
    eyebrow: 'SUPPORTED SEEDANCE LEGACY PRO ROUTE',
    subtitleHighlightTerms: ['camera-fixed shots', 'seeded variants', 'start/end frame control'],
    // Seedance 1.5 Pro is retired on Keyvo; every CTA points at its replacement, Seedance 2.0 Mini.
    primaryCtaHref: '/models/dreamina-seedance-2-0-mini',
    secondaryCtaHref: '/examples/seedance',
    quickLinks: [
      {
        labelKey: 'compareCurrent',
        href: '/ai-video-engines/seedance-1-5-pro-vs-seedance-2-0',
        icon: 'compare',
      },
      {
        labelKey: 'viewPricing',
        href: '/pricing#seedance-1-5-pro-pricing',
        icon: 'pricing',
      },
      {
        labelKey: 'promptExamples',
        href: '#prompting',
        icon: 'prompt',
      },
    ],
  },
  pricing: {
    anchorHref: '/pricing#seedance-1-5-pro-pricing',
    presets: [
      { id: '5s-480p-audio', seconds: 5, resolution: '480p', audio: true, labelKey: 'entryDraft' },
      { id: '8s-720p-audio', seconds: 8, resolution: '720p', audio: true, labelKey: 'standardPreview' },
      {
        id: '10s-1080p-audio',
        seconds: 10,
        resolution: '1080p',
        audio: true,
        labelKey: 'imageToVideo1080pCheck',
        noteKey: 'imageToVideoRouteOnly',
        highlightKey: 'mostPopular',
      },
      { id: 'max-duration', fixedValueKey: 'maxDurationValue', labelKey: 'maxDuration', noteKey: 'upTo1080pI2vOnly' },
    ],
  },
  sections: {
    examples: true,
    prompting: true,
    tips: true,
    compare: true,
    specs: true,
    safety: true,
    faq: true,
  },
};
