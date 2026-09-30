import type { AppLocale } from '@/i18n/locales';
import { CUSTOMER_CURRENCY } from '@/lib/customer-currency';

type PricingHubCopy = {
  liveQuote: string;
  noExactRoute: string;
  priceCellCheapest: string;
  quote: {
    audioIncluded: string;
    audioOptional: string;
    audioUnavailable: string;
    audio: string;
    unsupported: string;
    silent: string;
    dedicated: string;
    fast: string;
    supported: string;
    optional: string;
    sampleRequired: string;
    appPresets: string;
    square: string;
    portrait: string;
    landscape: string;
    maxDuration: (seconds: number) => string;
    minDuration: (seconds: number) => string;
    durationsOnly: (seconds: number[]) => string;
    resolutionOnly: (resolution: string) => string;
    resolutionUnavailable: (resolution: string) => string;
    fourKNote: (seconds: number) => string;
    perSecond: (price: string) => string;
  };
  links: {
    model: string;
    examples: string;
    compare: string;
    livePrice: string;
    more: string;
    imageApp: string;
    audioApp: string;
    tool: string;
    viewRow: string;
    imagePricing: string;
    audioPricing: string;
    toolPricing: string;
  };
  video: {
    ariaTabs: string;
    title: string;
    intro: string;
    currencyLabel: string;
    cheapestCurrentGen: string;
    tableHeaders: {
      engine: string;
      caps: string;
      actions: string;
    };
    tabs: {
      video: string;
      image: string;
      audio: string;
      tools: string;
    };
    presetSubLabels: Record<string, string>;
    mobile: {
      title: string;
      viewFullTable: string;
      noExactCurrentGen: string;
      includeLegacy: string;
      previousGen: string;
    };
    groups: {
      recommendedTitle: string;
      recommendedDescription: string;
      legacyTitle: string;
      legacyDescription: string;
    };
    highlights: {
      bestDraft: string;
      cheapest8s: string;
      cheapest10s: string;
      cheapestAudio: string;
      cheapest4k: string;
      dedicated4k: string;
      currentGenCount: string;
      currentGenValue: (count: number) => string;
    };
    globalNote: string;
  };
  popularChecks: {
    title: string;
    columns: {
      priceCheck: string;
      cheapestEngine: string;
      typicalPrice: string;
      link: string;
    };
    rows: {
      draft720: string;
      premium8s: string;
      video1080: string;
      audio1080: string;
      image: string;
      voiceOver: string;
      upscale4k: string;
    };
  };
  otherSurfaces: {
    title: string;
    intro: string;
    imageTitle: string;
    audioTitle: string;
    toolTitle: string;
    imageColumns: {
      engine: string;
      standard: string;
      highQuality: string;
      reference: string;
      sizes: string;
      links: string;
    };
    audioColumns: {
      mode: string;
      thirtySeconds: string;
      sixtySeconds: string;
      oneTwentySeconds: string;
      voiceClone: string;
      links: string;
    };
    toolColumns: {
      tool: string;
      standard: string;
      pro: string;
      bestUsedBefore: string;
      links: string;
    };
  };
  audioModes: {
    musicOnly: string;
    voiceOnly: string;
    cinematic: string;
    cinematicVoice: string;
    voiceClone: string;
  };
  tools: {
    characterBuilderDraft: string;
    characterBuilderFinal: string;
    changeCameraAngle: string;
    generateBestAngles: string;
    imageUpscale: string;
    videoUpscale: string;
    imageToVideoReferences: string;
    finalCharacterReferences: string;
    imageToVideoSetup: string;
    storyboardCoverage: string;
    imageToVideoSourceCleanup: string;
    finalExport: string;
  };
  creditsRefunds: {
    title: string;
    intro: string;
    cards: Array<{
      title: string;
      body: string;
      link?: {
        href: '/pay-as-you-go-ai-video-generator';
        label: string;
      };
    }>;
  };
};

function formatSeconds(locale: AppLocale, seconds: number) {
  return locale === 'en' ? `${seconds}s` : `${seconds} s`;
}

const en: PricingHubCopy = {
  liveQuote: 'Live quote',
  noExactRoute: 'No exact route',
  priceCellCheapest: 'Cheapest',
  quote: {
    audioIncluded: 'audio incl.',
    audioOptional: 'audio opt.',
    audioUnavailable: 'no audio',
    audio: 'audio',
    unsupported: 'unsupported',
    silent: 'silent',
    dedicated: 'dedicated',
    fast: 'fast',
    supported: 'Supported',
    optional: 'Optional',
    sampleRequired: 'Sample required',
    appPresets: 'App presets',
    square: 'Square',
    portrait: 'Portrait',
    landscape: 'Landscape',
    maxDuration: (seconds) => `max ${formatSeconds('en', seconds)}`,
    minDuration: (seconds) => `min ${formatSeconds('en', seconds)}`,
    durationsOnly: (seconds) => `${seconds.join('/')}s`,
    resolutionOnly: (resolution) => `${resolution} only`,
    resolutionUnavailable: (resolution) => `no ${resolution}`,
    fourKNote: (seconds) => `${formatSeconds('en', seconds)} 4K`,
    perSecond: (price) => `${price}/s`,
  },
  links: {
    model: 'Model',
    examples: 'Examples',
    compare: 'Compare',
    livePrice: 'Live price',
    more: 'More',
    imageApp: 'Image app',
    audioApp: 'Audio app',
    tool: 'Tool',
    viewRow: 'View row',
    imagePricing: 'Image pricing',
    audioPricing: 'Audio pricing',
    toolPricing: 'Tool pricing',
  },
  video: {
    ariaTabs: 'Pricing surfaces',
    title: 'AI video prices by engine',
    intro:
      'Compare preset VideoAI total prices for common video scenarios. Unsupported combinations are marked clearly. Open the app for the exact live quote before generation.',
    currencyLabel: CUSTOMER_CURRENCY === 'CNY' ? 'Prices shown in CNY.' : 'Prices shown in USD credits.',
    cheapestCurrentGen: 'Cheapest current-gen',
    tableHeaders: { engine: 'Engine', caps: 'Caps', actions: 'Actions' },
    tabs: { video: 'Video', image: 'Image', audio: 'Audio', tools: 'Tools & Upscale' },
    presetSubLabels: {
      'entry-route': 'Native',
      '5s-720p': 'Draft',
      '10s-720p': 'Preview',
      '8s-1080p': 'Premium',
      '10s-1080p': 'Standard',
      '10s-1080p-audio': 'Narrative',
      '4k-route': 'Native / route',
    },
    mobile: {
      title: 'Compare by scenario',
      viewFullTable: 'View full table',
      noExactCurrentGen: 'No exact route for current-generation engines.',
      includeLegacy: 'Include previous-generation routes',
      previousGen: 'previous-gen',
    },
    groups: {
      recommendedTitle: 'Recommended video engines',
      recommendedDescription: 'Current-generation and recommended routes for new generations.',
      legacyTitle: 'Previous-generation and budget routes',
      legacyDescription: 'Older or budget routes that may still be useful for low-cost tests.',
    },
    highlights: {
      bestDraft: 'Cheapest current-gen 5s 720p',
      cheapest8s: 'Cheapest current-gen 8s 1080p',
      cheapest10s: 'Cheapest current-gen 10s 1080p',
      cheapestAudio: 'Cheapest current-gen 10s 1080p + audio',
      cheapest4k: 'Cheapest 4K output',
      dedicated4k: 'Dedicated 4K engine',
      currentGenCount: 'Current-gen engines available',
      currentGenValue: (count) => `${count} engines`,
    },
    globalNote:
      'Prices are current VideoAI display prices for preset scenarios. Open the app for the exact live price before each generation, including provider limits, duration rounding and job-level rounding.',
  },
  popularChecks: {
    title: 'Popular price checks',
    columns: {
      priceCheck: 'Price check',
      cheapestEngine: 'Cheapest current-gen option',
      typicalPrice: 'Typical exact price',
      link: 'Link',
    },
    rows: {
      draft720: '5s 720p video',
      premium8s: '8s 1080p premium video',
      video1080: '10s 1080p video',
      audio1080: '10s 1080p + audio',
      image: '1 image generation',
      voiceOver: '30s voice-over',
      upscale4k: '4K upscale',
    },
  },
  otherSurfaces: {
    title: 'Image, audio and tool pricing',
    intro: 'Compact VideoAI price references for image generation, audio generation, character prep, angle tools and upscale.',
    imageTitle: 'Image generation pricing',
    audioTitle: 'Audio pricing',
    toolTitle: 'Prep tools and upscale pricing',
    imageColumns: {
      engine: 'Image engine',
      standard: '1 standard image',
      highQuality: '1 high-quality image',
      reference: 'Image-to-image / reference',
      sizes: 'Sizes / aspect ratios',
      links: 'Links',
    },
    audioColumns: {
      mode: 'Audio mode / provider',
      thirtySeconds: '30s',
      sixtySeconds: '60s',
      oneTwentySeconds: '120s',
      voiceClone: 'Voice clone / sample support',
      links: 'Links',
    },
    toolColumns: {
      tool: 'Tool',
      standard: 'Standard output',
      pro: 'Pro / high-res output',
      bestUsedBefore: 'Best used before',
      links: 'Links',
    },
  },
  audioModes: {
    musicOnly: 'Music Only',
    voiceOnly: 'Voice Over',
    cinematic: 'Cinematic',
    cinematicVoice: 'Cinematic + Voice',
    voiceClone: 'Seed Audio reference voice',
  },
  tools: {
    characterBuilderDraft: 'Character Builder Draft',
    characterBuilderFinal: 'Character Builder Final',
    changeCameraAngle: 'Change Camera Angle',
    generateBestAngles: 'Generate 4 best angles',
    imageUpscale: 'Image Upscale',
    videoUpscale: 'Video Upscale',
    imageToVideoReferences: 'Image-to-video references',
    finalCharacterReferences: 'Final character references',
    imageToVideoSetup: 'Image-to-video setup',
    storyboardCoverage: 'Storyboard coverage',
    imageToVideoSourceCleanup: 'Image-to-video source cleanup',
    finalExport: 'Final export',
  },
  creditsRefunds: {
    title: 'Credits, live quotes and refunds',
    intro: 'Pricing tables are preset references. The app remains the source for job-level live quotes before launch.',
    cards: [
      {
        title: 'Pay-as-you-go credits',
        body: `Use credits without a required subscription. Starter credits begin at ${CUSTOMER_CURRENCY === 'CNY' ? '¥80' : '$10'}, and you can top up when you need more generations.`,
        link: {
          href: '/pay-as-you-go-ai-video-generator',
          label: 'How pay-as-you-go credits work',
        },
      },
      {
        title: 'Exact price before launch',
        body: 'The app shows the live price for your selected engine, duration, resolution and options before generation, even as a guest.',
      },
      {
        title: 'Failed generations refunded',
        body: 'Credits are charged only when a job completes successfully. Failed generations are refunded automatically.',
      },
      {
        title: 'Secure checkout',
        body: 'Payments run through Stripe. Cards, Apple Pay and Google Pay appear when available on your device and browser.',
      },
    ],
  },
};

const fr: PricingHubCopy = {
  ...en,
  liveQuote: 'Devis en direct',
  noExactRoute: 'Aucune route exacte',
  priceCellCheapest: 'Moins cher',
  quote: {
    ...en.quote,
    audioIncluded: 'audio incl.',
    audioOptional: 'audio opt.',
    audioUnavailable: 'sans audio',
    audio: 'audio',
    unsupported: 'non pris en charge',
    silent: 'silencieux',
    dedicated: 'dédié',
    fast: 'rapide',
    supported: 'Pris en charge',
    optional: 'Optionnel',
    sampleRequired: 'Échantillon requis',
    appPresets: 'Presets app',
    square: 'Carré',
    portrait: 'Portrait',
    landscape: 'Paysage',
    maxDuration: (seconds) => `max ${formatSeconds('fr', seconds)}`,
    minDuration: (seconds) => `min ${formatSeconds('fr', seconds)}`,
    durationsOnly: (seconds) => seconds.map((second) => formatSeconds('fr', second)).join('/'),
    resolutionOnly: (resolution) => `${resolution} uniquement`,
    resolutionUnavailable: (resolution) => `pas de ${resolution}`,
    fourKNote: (seconds) => `${formatSeconds('fr', seconds)} 4K`,
    perSecond: (price) => `${price}/s`,
  },
  links: {
    ...en.links,
    model: 'Modèle',
    examples: 'Exemples',
    compare: 'Comparer',
    livePrice: 'Prix live',
    more: 'Plus',
    imageApp: 'App image',
    audioApp: 'App audio',
    tool: 'Outil',
    viewRow: 'Voir la ligne',
    imagePricing: 'Prix image',
    audioPricing: 'Prix audio',
    toolPricing: 'Prix outils',
  },
  video: {
    ...en.video,
    ariaTabs: 'Surfaces tarifaires',
    title: 'Prix vidéo IA par moteur',
    intro:
      'Comparez les prix totaux VideoAI pour des scénarios vidéo courants. Les combinaisons non disponibles sont indiquées clairement. Ouvrez l’app pour le devis exact avant génération.',
    currencyLabel: CUSTOMER_CURRENCY === 'CNY' ? 'Prix affichés en CNY.' : 'Prix affichés en crédits USD.',
    cheapestCurrentGen: 'Moins cher génération actuelle',
    tableHeaders: { engine: 'Moteur', caps: 'Caps', actions: 'Actions' },
    tabs: { video: 'Vidéo', image: 'Image', audio: 'Audio', tools: 'Outils & upscale' },
    presetSubLabels: {
      'entry-route': 'Natif',
      '5s-720p': 'Brouillon',
      '10s-720p': 'Aperçu',
      '8s-1080p': 'Premium',
      '10s-1080p': 'Standard',
      '10s-1080p-audio': 'Narratif',
      '4k-route': 'Natif / route',
    },
    mobile: {
      title: 'Comparer par scénario',
      viewFullTable: 'Voir le tableau complet',
      noExactCurrentGen: 'Aucune route exacte pour les moteurs de génération actuelle.',
      includeLegacy: 'Inclure les routes de génération précédente',
      previousGen: 'ancienne génération',
    },
    groups: {
      recommendedTitle: 'Moteurs vidéo recommandés',
      recommendedDescription: 'Routes de génération actuelle recommandées pour les nouveaux rendus.',
      legacyTitle: 'Routes génération précédente et budget',
      legacyDescription: 'Routes plus anciennes ou budget, encore utiles pour des tests à faible coût.',
    },
    highlights: {
      bestDraft: 'Moins cher actuel 5 s 720p',
      cheapest8s: 'Moins cher actuel 8 s 1080p',
      cheapest10s: 'Moins cher actuel 10 s 1080p',
      cheapestAudio: 'Moins cher actuel 10 s 1080p + audio',
      cheapest4k: 'Sortie 4K la moins chère',
      dedicated4k: 'Moteur 4K dédié',
      currentGenCount: 'Moteurs actuels disponibles',
      currentGenValue: (count) => `${count} moteurs`,
    },
    globalNote:
      'Les prix sont les prix affichés VideoAI pour ces scénarios prédéfinis. Ouvrez l’app pour le prix exact avant chaque génération, avec les limites provider, l’arrondi de durée et l’arrondi par job.',
  },
  popularChecks: {
    title: 'Vérifications de prix fréquentes',
    columns: {
      priceCheck: 'Scénario',
      cheapestEngine: 'Option actuelle la moins chère',
      typicalPrice: 'Prix exact typique',
      link: 'Lien',
    },
    rows: {
      draft720: 'Vidéo 5 s 720p',
      premium8s: 'Vidéo premium 8 s 1080p',
      video1080: 'Vidéo 10 s 1080p',
      audio1080: '10 s 1080p + audio',
      image: '1 image générée',
      voiceOver: 'Voix off 30 s',
      upscale4k: 'Upscale 4K',
    },
  },
  otherSurfaces: {
    title: 'Prix image, audio et outils',
    intro: 'Références compactes VideoAI pour la génération d’images, l’audio, la préparation de personnages, les angles caméra et l’upscale.',
    imageTitle: 'Prix génération d’images',
    audioTitle: 'Prix audio',
    toolTitle: 'Prix outils de préparation et upscale',
    imageColumns: {
      engine: 'Moteur image',
      standard: '1 image standard',
      highQuality: '1 image haute qualité',
      reference: 'Image-vers-image / référence',
      sizes: 'Tailles / ratios',
      links: 'Liens',
    },
    audioColumns: {
      mode: 'Mode audio / provider',
      thirtySeconds: '30 s',
      sixtySeconds: '60 s',
      oneTwentySeconds: '120 s',
      voiceClone: 'Clone voix / échantillon',
      links: 'Liens',
    },
    toolColumns: {
      tool: 'Outil',
      standard: 'Sortie standard',
      pro: 'Sortie pro / haute résolution',
      bestUsedBefore: 'À utiliser avant',
      links: 'Liens',
    },
  },
  audioModes: {
    musicOnly: 'Musique seule',
    voiceOnly: 'Voix off',
    cinematic: 'Cinématique',
    cinematicVoice: 'Cinématique + voix',
    voiceClone: 'Voix de référence Seed Audio',
  },
  tools: {
    characterBuilderDraft: 'Character Builder brouillon',
    characterBuilderFinal: 'Character Builder final',
    changeCameraAngle: 'Changer l’angle caméra',
    generateBestAngles: 'Générer les 4 meilleurs angles',
    imageUpscale: 'Upscale image',
    videoUpscale: 'Upscale vidéo',
    imageToVideoReferences: 'Références image-vers-vidéo',
    finalCharacterReferences: 'Références personnage finales',
    imageToVideoSetup: 'Préparation image-vers-vidéo',
    storyboardCoverage: 'Couverture storyboard',
    imageToVideoSourceCleanup: 'Nettoyage source image-vers-vidéo',
    finalExport: 'Export final',
  },
  creditsRefunds: {
    title: 'Crédits, devis live et remboursements',
    intro: 'Les tableaux sont des références par scénario. L’app reste la source du devis exact par job avant lancement.',
    cards: [
      {
        title: 'Crédits à l’usage',
        body: `Utilisez des crédits sans abonnement obligatoire. Les crédits de démarrage commencent à ${CUSTOMER_CURRENCY === 'CNY' ? '80 CNY' : '10 $'}, et vous rechargez quand vous avez besoin de générer.`,
        link: {
          href: '/pay-as-you-go-ai-video-generator',
          label: 'Comprendre les crédits à l’usage',
        },
      },
      {
        title: 'Prix exact avant lancement',
        body: 'L’app affiche le prix live selon le moteur, la durée, la résolution et les options sélectionnés avant génération, même en invité.',
      },
      {
        title: 'Échecs remboursés',
        body: 'Les crédits ne sont débités que lorsqu’un job réussit. Les générations échouées sont remboursées automatiquement.',
      },
      {
        title: 'Paiement sécurisé',
        body: 'Les paiements passent par Stripe. Carte bancaire, Apple Pay et Google Pay s’affichent lorsqu’ils sont disponibles sur votre appareil et votre navigateur.',
      },
    ],
  },
};

const es: PricingHubCopy = {
  ...en,
  liveQuote: 'Precio en vivo',
  noExactRoute: 'Sin ruta exacta',
  priceCellCheapest: 'Más barato',
  quote: {
    ...en.quote,
    audioIncluded: 'audio incl.',
    audioOptional: 'audio opc.',
    audioUnavailable: 'sin audio',
    audio: 'audio',
    unsupported: 'no admitido',
    silent: 'silencioso',
    dedicated: 'dedicado',
    fast: 'rápido',
    supported: 'Compatible',
    optional: 'Opcional',
    sampleRequired: 'Muestra requerida',
    appPresets: 'Presets app',
    square: 'Cuadrado',
    portrait: 'Vertical',
    landscape: 'Horizontal',
    maxDuration: (seconds) => `máx. ${formatSeconds('es', seconds)}`,
    minDuration: (seconds) => `mín. ${formatSeconds('es', seconds)}`,
    durationsOnly: (seconds) => seconds.map((second) => formatSeconds('es', second)).join('/'),
    resolutionOnly: (resolution) => `solo ${resolution}`,
    resolutionUnavailable: (resolution) => `sin ${resolution}`,
    fourKNote: (seconds) => `${formatSeconds('es', seconds)} 4K`,
    perSecond: (price) => `${price}/s`,
  },
  links: {
    ...en.links,
    model: 'Modelo',
    examples: 'Ejemplos',
    compare: 'Comparar',
    livePrice: 'Precio vivo',
    more: 'Más',
    imageApp: 'App imagen',
    audioApp: 'App audio',
    tool: 'Herramienta',
    viewRow: 'Ver fila',
    imagePricing: 'Precios imagen',
    audioPricing: 'Precios audio',
    toolPricing: 'Precios herramientas',
  },
  video: {
    ...en.video,
    ariaTabs: 'Superficies de precios',
    title: 'Precios de video IA por motor',
    intro:
      'Compara precios totales de VideoAI para escenarios de video comunes. Las combinaciones no disponibles se marcan claramente. Abre la app para ver el precio exacto antes de generar.',
    currencyLabel: CUSTOMER_CURRENCY === 'CNY' ? 'Precios mostrados en CNY.' : 'Precios mostrados en créditos USD.',
    cheapestCurrentGen: 'Más barato generación actual',
    tableHeaders: { engine: 'Motor', caps: 'Caps', actions: 'Acciones' },
    tabs: { video: 'Video', image: 'Imagen', audio: 'Audio', tools: 'Herramientas & upscale' },
    presetSubLabels: {
      'entry-route': 'Nativa',
      '5s-720p': 'Borrador',
      '10s-720p': 'Vista previa',
      '8s-1080p': 'Premium',
      '10s-1080p': 'Estándar',
      '10s-1080p-audio': 'Narrativo',
      '4k-route': 'Nativo / ruta',
    },
    mobile: {
      title: 'Comparar por escenario',
      viewFullTable: 'Ver tabla completa',
      noExactCurrentGen: 'Sin ruta exacta para motores de generación actual.',
      includeLegacy: 'Incluir rutas de generación anterior',
      previousGen: 'generación anterior',
    },
    groups: {
      recommendedTitle: 'Motores de video recomendados',
      recommendedDescription: 'Rutas de generación actual recomendadas para nuevas generaciones.',
      legacyTitle: 'Rutas de generación anterior y budget',
      legacyDescription: 'Rutas antiguas o budget que aún pueden servir para pruebas de bajo coste.',
    },
    highlights: {
      bestDraft: 'Más barato actual 5 s 720p',
      cheapest8s: 'Más barato actual 8 s 1080p',
      cheapest10s: 'Más barato actual 10 s 1080p',
      cheapestAudio: 'Más barato actual 10 s 1080p + audio',
      cheapest4k: 'Salida 4K más barata',
      dedicated4k: 'Motor 4K dedicado',
      currentGenCount: 'Motores actuales disponibles',
      currentGenValue: (count) => `${count} motores`,
    },
    globalNote:
      'Los precios son los precios mostrados por VideoAI para escenarios predefinidos. Abre la app para ver el precio exacto antes de cada generación, incluyendo límites del proveedor, redondeo de duración y redondeo por job.',
  },
  popularChecks: {
    title: 'Consultas de precio frecuentes',
    columns: {
      priceCheck: 'Escenario',
      cheapestEngine: 'Opción actual más barata',
      typicalPrice: 'Precio exacto típico',
      link: 'Enlace',
    },
    rows: {
      draft720: 'Video 5 s 720p',
      premium8s: 'Video premium 8 s 1080p',
      video1080: 'Video 10 s 1080p',
      audio1080: '10 s 1080p + audio',
      image: '1 imagen generada',
      voiceOver: 'Voz en off 30 s',
      upscale4k: 'Upscale 4K',
    },
  },
  otherSurfaces: {
    title: 'Precios de imagen, audio y herramientas',
    intro: 'Referencias compactas de VideoAI para generación de imágenes, audio, preparación de personajes, herramientas de ángulo y upscale.',
    imageTitle: 'Precios de generación de imágenes',
    audioTitle: 'Precios de audio',
    toolTitle: 'Precios de herramientas de prep y upscale',
    imageColumns: {
      engine: 'Motor de imagen',
      standard: '1 imagen estándar',
      highQuality: '1 imagen alta calidad',
      reference: 'Imagen a imagen / referencia',
      sizes: 'Tamaños / ratios',
      links: 'Enlaces',
    },
    audioColumns: {
      mode: 'Modo audio / proveedor',
      thirtySeconds: '30 s',
      sixtySeconds: '60 s',
      oneTwentySeconds: '120 s',
      voiceClone: 'Clon voz / muestra',
      links: 'Enlaces',
    },
    toolColumns: {
      tool: 'Herramienta',
      standard: 'Salida estándar',
      pro: 'Salida pro / alta resolución',
      bestUsedBefore: 'Mejor antes de',
      links: 'Enlaces',
    },
  },
  audioModes: {
    musicOnly: 'Solo música',
    voiceOnly: 'Voz en off',
    cinematic: 'Cinemático',
    cinematicVoice: 'Cinemático + voz',
    voiceClone: 'Voz de referencia Seed Audio',
  },
  tools: {
    characterBuilderDraft: 'Character Builder borrador',
    characterBuilderFinal: 'Character Builder final',
    changeCameraAngle: 'Cambiar ángulo de cámara',
    generateBestAngles: 'Generar los 4 mejores ángulos',
    imageUpscale: 'Upscale de imagen',
    videoUpscale: 'Upscale de video',
    imageToVideoReferences: 'Referencias imagen a video',
    finalCharacterReferences: 'Referencias finales de personaje',
    imageToVideoSetup: 'Preparación imagen a video',
    storyboardCoverage: 'Cobertura storyboard',
    imageToVideoSourceCleanup: 'Limpieza de fuente imagen a video',
    finalExport: 'Export final',
  },
  creditsRefunds: {
    title: 'Créditos, precios vivos y reembolsos',
    intro: 'Las tablas son referencias por escenario. La app sigue siendo la fuente del precio exacto por job antes de lanzar.',
    cards: [
      {
        title: 'Créditos de pago por uso',
        body: `Usa créditos sin suscripción obligatoria. Los créditos iniciales empiezan en ${CUSTOMER_CURRENCY === 'CNY' ? '80 CNY' : '$10'} y puedes recargar cuando necesites más generaciones.`,
        link: {
          href: '/pay-as-you-go-ai-video-generator',
          label: 'Cómo funcionan los créditos por uso',
        },
      },
      {
        title: 'Precio exacto antes de lanzar',
        body: 'La app muestra el precio vivo según el motor, la duración, la resolución y las opciones antes de generar, incluso como invitado.',
      },
      {
        title: 'Fallos reembolsados',
        body: 'Los créditos solo se cobran cuando un job termina correctamente. Las generaciones fallidas se reembolsan automáticamente.',
      },
      {
        title: 'Pago seguro',
        body: 'Los pagos se procesan con Stripe. Tarjeta, Apple Pay y Google Pay aparecen cuando están disponibles en tu dispositivo y navegador.',
      },
    ],
  },
};

const zh: PricingHubCopy = {
  ...en,
  liveQuote: '实时报价',
  noExactRoute: '无完全匹配方案',
  priceCellCheapest: '最实惠',
  quote: {
    audioIncluded: '含音频',
    audioOptional: '可选音频',
    audioUnavailable: '无音频',
    audio: '音频',
    unsupported: '不支持',
    silent: '无声',
    dedicated: '专属模型',
    fast: '快速',
    supported: '支持',
    optional: '可选',
    sampleRequired: '需样本',
    appPresets: '应用预设',
    square: '正方形',
    portrait: '竖屏',
    landscape: '横屏',
    maxDuration: (seconds) => `最长 ${seconds} 秒`,
    minDuration: (seconds) => `最短 ${seconds} 秒`,
    durationsOnly: (seconds) => `${seconds.join('/')} 秒`,
    resolutionOnly: (resolution) => `仅 ${resolution}`,
    resolutionUnavailable: (resolution) => `无 ${resolution}`,
    fourKNote: (seconds) => `${seconds} 秒 4K`,
    perSecond: (price) => `${price}/秒`,
  },
  links: {
    model: '模型',
    examples: '案例',
    compare: '对比',
    livePrice: '实时价格',
    more: '更多',
    imageApp: '生图应用',
    audioApp: '音频应用',
    tool: '工具',
    viewRow: '查看行',
    imagePricing: '生图定价',
    audioPricing: '音频定价',
    toolPricing: '工具定价',
  },
  video: {
    ariaTabs: '定价分区',
    title: '各引擎 AI 视频价格',
    intro:
      '对比常见视频场景下 VideoAI 的预设总价。不支持的组合已明确标出。可在生成前打开应用查看实时精准报价。',
    currencyLabel: CUSTOMER_CURRENCY === 'CNY' ? '价格以人民币显示。' : '价格以美元点数显示。',
    cheapestCurrentGen: '当代最实惠',
    tableHeaders: { engine: '模型引擎', caps: '规格能力', actions: '操作' },
    tabs: { video: '视频', image: '图片', audio: '音频', tools: '工具与超分辨率' },
    presetSubLabels: {
      'entry-route': '原生',
      '5s-720p': '草稿',
      '10s-720p': '预览',
      '8s-1080p': '高画质',
      '10s-1080p': '标准',
      '10s-1080p-audio': '叙事',
      '4k-route': '原生 / 专属路径',
    },
    mobile: {
      title: '按场景对比',
      viewFullTable: '查看完整表格',
      noExactCurrentGen: '当代引擎无完全匹配方案。',
      includeLegacy: '包含上一代方案',
      previousGen: '上一代',
    },
    groups: {
      recommendedTitle: '推荐视频引擎',
      recommendedDescription: '适合新生成的当前主流及推荐模型方案。',
      legacyTitle: '上一代及经济型方案',
      legacyDescription: '适合低成本测试的较早版本或经济型方案。',
    },
    highlights: {
      bestDraft: '当代最实惠 5 秒 720p',
      cheapest8s: '当代最实惠 8 秒 1080p',
      cheapest10s: '当代最实惠 10 秒 1080p',
      cheapestAudio: '当代最实惠 10 秒 1080p + 音频',
      cheapest4k: '最实惠 4K 输出',
      dedicated4k: '专属 4K 引擎',
      currentGenCount: '可用当代引擎数量',
      currentGenValue: (count) => `${count} 个引擎`,
    },
    globalNote:
      '所列价格为预设场景下的 VideoAI 当前展示价格。生成前请在应用内查看实时精确价格，包括供应商限制、时长取整及任务级取整。',
  },
  popularChecks: {
    title: '热门价格速查',
    columns: {
      priceCheck: '速查场景',
      cheapestEngine: '最实惠当代选项',
      typicalPrice: '典型精确价格',
      link: '链接',
    },
    rows: {
      draft720: '5 秒 720p 视频',
      premium8s: '8 秒 1080p 高画质视频',
      video1080: '10 秒 1080p 视频',
      audio1080: '10 秒 1080p + 音频',
      image: '1 次图像生成',
      voiceOver: '30 秒配音',
      upscale4k: '4K 超分辨率',
    },
  },
  otherSurfaces: {
    title: '图像、音频与工具定价',
    intro: '涵盖图像生成、音频生成、角色预设、机位工具及超分辨率的 VideoAI 价格参考。',
    imageTitle: '图像生成定价',
    audioTitle: '音频定价',
    toolTitle: '预设工具与超分辨率定价',
    imageColumns: {
      engine: '图像引擎',
      standard: '1 张标准图',
      highQuality: '1 张高画质图',
      reference: '图生图 / 参考图',
      sizes: '尺寸 / 比例',
      links: '链接',
    },
    audioColumns: {
      mode: '音频模式 / 供应商',
      thirtySeconds: '30 秒',
      sixtySeconds: '60 秒',
      oneTwentySeconds: '120 秒',
      voiceClone: '音色克隆 / 样本',
      links: '链接',
    },
    toolColumns: {
      tool: '工具',
      standard: '标准输出',
      pro: '专业 / 高清输出',
      bestUsedBefore: '建议配合使用于',
      links: '链接',
    },
  },
  audioModes: {
    musicOnly: '纯音乐',
    voiceOnly: '纯旁白配音',
    cinematic: '电影级音效',
    cinematicVoice: '电影级音效 + 旁白',
    voiceClone: 'Seed Audio 参考音色',
  },
  tools: {
    characterBuilderDraft: '角色构建器（草稿）',
    characterBuilderFinal: '角色构建器（终稿）',
    changeCameraAngle: '转换摄像机机位',
    generateBestAngles: '生成 4 个最佳视角',
    imageUpscale: '图像超分辨率',
    videoUpscale: '视频超分辨率',
    imageToVideoReferences: '图生视频参考',
    finalCharacterReferences: '最终角色参考',
    imageToVideoSetup: '图生视频准备',
    storyboardCoverage: '故事板镜头覆盖',
    imageToVideoSourceCleanup: '图生视频素材清理',
    finalExport: '最终导出',
  },
  creditsRefunds: {
    title: '点数额度、实时报价与退款保障',
    intro: '各表格展示场景参考价格。生成任务前，应用内始终显示每项任务的最终实时报价。',
    cards: [
      {
        title: '按需付费点数',
        body: `使用点数额度，无需强制订阅。起充金额低至 ${CUSTOMER_CURRENCY === 'CNY' ? '¥80' : '$10'}，需要更多生成时可随时充值。`,
        link: {
          href: '/pay-as-you-go-ai-video-generator',
          label: '了解按需付费运作方式',
        },
      },
      {
        title: '生成前获知精准价格',
        body: '应用会在生成前根据所选引擎、时长、分辨率及功能实时展示精确价格，未登录用户亦可查看。',
      },
      {
        title: '生成失败自动退款',
        body: '仅在任务渲染成功后扣除额度。任何失败的生成任务均会自动全额退回点数。',
      },
      {
        title: '安全支付保障',
        body: '支付流程由 Stripe 保障。信用卡、Apple Pay 与 Google Pay 会在设备及浏览器支持时自动提供。',
      },
    ],
  },
};

const copyByLocale: Record<AppLocale, PricingHubCopy> = { en, fr, es, zh };

export function getPricingHubCopy(locale: AppLocale) {
  return copyByLocale[locale] ?? en;
}
