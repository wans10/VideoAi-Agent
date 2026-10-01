export type BlogSlugLocale = 'en' | 'fr' | 'es' | 'zh';

export const BLOG_SLUGS_BY_CANONICAL = {
  "voiceover-to-visual-capsule-ltx-2-5-pro": {
    en: "voiceover-to-visual-capsule-ltx-2-5-pro",
    fr: "voiceover-to-visual-capsule-ltx-2-5-pro",
    es: "voiceover-to-visual-capsule-ltx-2-5-pro",
    zh: "voiceover-to-visual-capsule-ltx-2-5-pro",
  },
  "gpt-6-podcast-maxvideoai-premiere-pro": {
    en: "gpt-6-podcast-maxvideoai-premiere-pro",
    fr: "gpt-6-podcast-maxvideoai-premiere-pro",
    es: "gpt-6-podcast-maxvideoai-premiere-pro",
    zh: "gpt-6-podcast-maxvideoai-premiere-pro",
  },
  "animated-cafe-menu-flux-3-codex-cli": {
    en: "animated-cafe-menu-flux-3-codex-cli",
    fr: "animated-cafe-menu-flux-3-codex-cli",
    es: "animated-cafe-menu-flux-3-codex-cli",
    zh: "animated-cafe-menu-flux-3-codex-cli",
  },
  "blender-animatic-ai-product-reveal-source-vs-reference": {
    en: "blender-animatic-ai-product-reveal-source-vs-reference",
    fr: "blender-animatic-ai-product-reveal-source-vs-reference",
    es: "blender-animatic-ai-product-reveal-source-vs-reference",
    zh: "blender-animatic-ai-product-reveal-source-vs-reference",
  },
  "course-visual-kit-claude-desktop-maxvideoai": {
    en: "course-visual-kit-claude-desktop-maxvideoai",
    fr: "course-visual-kit-claude-desktop-maxvideoai",
    es: "course-visual-kit-claude-desktop-maxvideoai",
    zh: "course-visual-kit-claude-desktop-maxvideoai",
  },
  "pack-broll-codex-cli-maxvideoai": {
    en: "pack-broll-codex-cli-maxvideoai",
    fr: "pack-broll-codex-cli-maxvideoai",
    es: "pack-broll-codex-cli-maxvideoai",
    zh: "pack-broll-codex-cli-maxvideoai",
  },
  "30-second-music-promo-two-minimax-h3-clips": {
    en: "30-second-music-promo-two-minimax-h3-clips",
    fr: "30-second-music-promo-two-minimax-h3-clips",
    es: "30-second-music-promo-two-minimax-h3-clips",
    zh: "30-second-music-promo-two-minimax-h3-clips",
  },
  'access-sora-2-without-invite': {
    en: 'access-sora-2-without-invite',
    fr: 'acceder-a-sora-2-sans-invitation',
    es: 'accede-a-sora-2-sin-invitacion',
    zh: 'access-sora-2-without-invite',
  },
  'ai-character-sheet-generator': {
    en: 'ai-character-sheet-generator',
    fr: 'generateur-de-fiche-personnage-ia',
    es: 'generador-de-fichas-de-personaje-con-ia',
    zh: 'ai-character-sheet-generator',
  },
  'change-camera-angle-with-ai': {
    en: 'change-camera-angle-with-ai',
    fr: 'lia-peut-elle-changer-langle-de-camera-dune-photo',
    es: 'la-ia-puede-cambiar-el-angulo-de-camara-de-una-foto',
    zh: 'change-camera-angle-with-ai',
  },
  'compare-ai-video-engines': {
    en: 'compare-ai-video-engines',
    fr: 'comment-comparer-les-moteurs-video-dia-sora-vs-veo-vs-pika',
    es: 'como-comparar-motores-de-video-con-ia-sora-vs-veo-vs-pika',
    zh: 'compare-ai-video-engines',
  },
  'how-to-create-consistent-ai-characters': {
    en: 'how-to-create-consistent-ai-characters',
    fr: 'comment-creer-des-personnages-ia-coherents-dans-les-images-et-la-video',
    es: 'como-crear-personajes-de-ia-coherentes-en-imagenes-y-video',
    zh: 'how-to-create-consistent-ai-characters',
  },
  'multiple-camera-angles-from-one-image': {
    en: 'multiple-camera-angles-from-one-image',
    fr: 'explorer-plusieurs-angles-de-camera-a-partir-dune-image-approuvee',
    es: 'como-explorar-multiples-angulos-de-camara-desde-una-imagen-aprobada',
    zh: 'multiple-camera-angles-from-one-image',
  },
  'sora-2-sequenced-prompts': {
    en: 'sora-2-sequenced-prompts',
    fr: 'invites-sequencees-sora-2-avec-son-et-image-de-marque',
    es: 'indicaciones-secuenciadas-de-sora-2-con-sonido-e-identidad-de-marca',
    zh: 'sora-2-sequenced-prompts',
  },
  'veo-3-updates': {
    en: 'veo-3-updates',
    fr: 'les-mises-a-jour-de-veo-3-apportent-des-controles-cinematographiques',
    es: 'las-actualizaciones-de-veo-3-traen-controles-cinematograficos',
    zh: 'veo-3-updates',
  },
} as const satisfies Record<string, { en: string } & Partial<Record<BlogSlugLocale, string>>>;

const localizedBlogSlugs: Record<string, Partial<Record<BlogSlugLocale, string>>> = BLOG_SLUGS_BY_CANONICAL;

export function resolveBlogCanonicalSlug(locale: BlogSlugLocale, slug: string): string | null {
  for (const [canonicalSlug, localizedSlugs] of Object.entries(localizedBlogSlugs)) {
    if (localizedSlugs[locale] === slug) {
      return canonicalSlug;
    }
  }

  return null;
}

export function resolveLocalizedBlogSlug(canonicalSlug: string, locale: BlogSlugLocale): string | null {
  return localizedBlogSlugs[canonicalSlug]?.[locale] ?? null;
}
