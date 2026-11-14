import type { AppLocale } from '@/i18n/locales';
import { CUSTOMER_CURRENCY } from '@/lib/customer-currency';

type PricingHubCopy = {
  liveQuote: string;
  noExactRoute: string;
  priceCellCheapest: string;
  quote: {
    audioOff: string;
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
    /** Optional localized preset names; the preset's own label is used when an id has none. */
    presetLabels?: Record<string, string>;
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
      draftIntent: string;
      detailIntent: string;
      soundIntent: string;
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
    characterImageNote: string;
    recastPricingNote: string;
    recastExample: (outputSeconds: number, sourceSeconds: number) => string;
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
    characterRecast: string;
    recastUse: string;
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
    creditNotes: { title: string; items: Array<{ title: string; body: string }>; links: { termsHref: string; terms: string; refunds: string; support: string; studio: string } };
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
    audioOff: 'Audio off',
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
      'Compare preset Keyvo total prices for common video scenarios. Unsupported combinations are marked clearly. Open the app for the exact live quote before generation.',
    currencyLabel: CUSTOMER_CURRENCY === 'CNY' ? 'Prices shown in CNY.' : 'Prices shown in USD credits.',
    cheapestCurrentGen: 'Lowest quoted',
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
      draftIntent: 'Try a short idea',
      detailIntent: 'Give the scene more room',
      soundIntent: 'Create a scene with sound',
      bestDraft: 'Lowest quoted 5s 720p',
      cheapest8s: 'Lowest quoted 8s 1080p',
      cheapest10s: 'Lowest quoted 10s 1080p',
      cheapestAudio: 'Lowest quoted 10s 1080p + audio',
      cheapest4k: '4K entry price · durations vary',
      dedicated4k: 'Dedicated 4K engine',
      currentGenCount: 'Current-gen engines available',
      currentGenValue: (count) => `${count} engines`,
    },
    globalNote:
      'Prices are current Keyvo display prices for preset scenarios. Open the app for the exact live price before each generation, including provider limits, duration rounding and job-level rounding.',
  },
  popularChecks: {
    title: 'Popular price checks',
    columns: {
      priceCheck: 'Price check',
      cheapestEngine: 'Lowest quoted option',
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
    intro: 'Compact Keyvo price references for image generation, audio generation, character prep, angle tools and upscale.',
    imageTitle: 'Image generation pricing',
    audioTitle: 'Audio pricing',
    toolTitle: 'Prep tools and upscale pricing',
    characterImageNote: 'Character Studio prices are per generated image: a character, a new look or a sheet. One sheet counts as one image, regardless of the number of views. Select 1K, 2K or 4K output.',
    recastPricingNote: 'The price depends on resolution, selected source-video seconds and generated seconds. Without a source video, only generated seconds count. Review the exact quote before launch.',
    recastExample: (output, source) => source ? `${output} s generated + ${source} s source` : `${output} s generated · no source video`,
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
    characterBuilderDraft: 'Character Studio · 1K',
    characterBuilderFinal: 'Character Studio · 2K',
    characterRecast: 'Keyvo Recast',
    recastUse: 'Scenes with saved characters',
    changeCameraAngle: 'Change Camera Angle',
    generateBestAngles: 'Generate 4 best angles',
    imageUpscale: 'Image Upscale',
    videoUpscale: 'Video Upscale',
    imageToVideoReferences: 'Image-to-video references',
    finalCharacterReferences: 'Saved characters and new looks',
    imageToVideoSetup: 'Image-to-video setup',
    storyboardCoverage: 'Storyboard coverage',
    imageToVideoSourceCleanup: 'Image-to-video source cleanup',
    finalExport: 'Final export',
  },
  creditsRefunds: {
    creditNotes: {
      "title": "Credit validity before you top up",
      "items": [
        {
          "title": "Purchased media credits",
          "body": "Unused purchased media credits stay in your wallet between projects, with no subscription required. Our current Terms do not specify an expiry period or an inactivity deadline for this balance. Contact support before buying if you need confirmation of a validity period."
        },
        {
          "title": "Promotional, bonus and free credits",
          "body": "These have no cash value and are not refundable. Check the specific offer for its validity conditions; if none are stated, ask support before assuming the media-credit or Studio rules apply."
        },
        {
          "title": "Milo assistance credits",
          "body": "Milo Standard and Max share 500 included assistance credits per UTC calendar month. Unused included credits do not carry over. Purchased Milo packs accumulate without expiry or automatic refill. Each pack purchase is confirmed and funded from your Keyvo wallet. Media generation has its own separate quote. Milo Lite has no extra assistance fee, subject to request limits and service availability."
        }
      ],
      "links": {
        "termsHref": "/legal/terms#wallet-credits",
        "terms": "Wallet terms",
        "refunds": "Refund policy and request procedure",
        "support": "Ask support about credit validity",
        "studio": "Studio assistance"
      }
    },
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
        body: "The app shows the live price for your selected engine, duration, resolution and options before generation, even as a guest. Using Milo in a generator or Studio? Standard and Max share included and purchased assistance credits. Media generation has its own quote. Review both when planning your budget.",
      },
      {
        title: 'Failed generations refunded',
        body: 'Technically failed generations are recredited to your wallet. This is not an automatic card or bank refund. Completed results consume credits even if they disappoint; a new attempt has a new quote. Payment-refund requests are reviewed under the refund policy.',
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
    audioOff: 'Audio désactivé',
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
      'Comparez les prix totaux Keyvo pour des scénarios vidéo courants. Les combinaisons non disponibles sont indiquées clairement. Ouvrez l’app pour le devis exact avant génération.',
    currencyLabel: CUSTOMER_CURRENCY === 'CNY' ? 'Prix affichés en CNY.' : 'Prix affichés en crédits USD.',
    cheapestCurrentGen: 'Prix le plus bas affiché',
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
      draftIntent: 'Tester une idée courte',
      detailIntent: 'Développer une scène',
      soundIntent: 'Créer une scène avec du son',
      bestDraft: 'Prix le plus bas affiché 5 s 720p',
      cheapest8s: 'Prix le plus bas affiché 8 s 1080p',
      cheapest10s: 'Prix le plus bas affiché 10 s 1080p',
      cheapestAudio: 'Prix le plus bas affiché 10 s 1080p + audio',
      cheapest4k: 'Prix d’entrée 4K · durées variables',
      dedicated4k: 'Moteur 4K dédié',
      currentGenCount: 'Moteurs actuels disponibles',
      currentGenValue: (count) => `${count} moteurs`,
    },
    globalNote:
      'Les prix sont les prix affichés Keyvo pour ces scénarios prédéfinis. Ouvrez l’app pour le prix exact avant chaque génération, avec les limites provider, l’arrondi de durée et l’arrondi par job.',
  },
  popularChecks: {
    title: 'Vérifications de prix fréquentes',
    columns: {
      priceCheck: 'Scénario',
      cheapestEngine: 'Option au prix le plus bas affiché',
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
    intro: 'Références compactes Keyvo pour la génération d’images, l’audio, la préparation de personnages, les angles caméra et l’upscale.',
    imageTitle: 'Prix génération d’images',
    audioTitle: 'Prix audio',
    toolTitle: 'Prix outils de préparation et upscale',
    characterImageNote: 'Les prix Character Studio sont par image générée : personnage, nouveau look ou fiche. Une fiche compte comme une image, quel que soit le nombre de vues. Choisissez une sortie 1K, 2K ou 4K.',
    recastPricingNote: 'Le prix dépend de la résolution, des secondes du passage vidéo source et des secondes générées. Sans vidéo source, seules les secondes générées comptent. Vérifiez le devis exact avant de lancer.',
    recastExample: (output, source) => source ? `${output} s générées + ${source} s source` : `${output} s générées · sans vidéo source`,
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
    characterBuilderDraft: 'Character Studio · 1K',
    characterBuilderFinal: 'Character Studio · 2K',
    characterRecast: 'Keyvo Recast',
    recastUse: 'Scènes avec des personnages enregistrés',
    changeCameraAngle: 'Changer l’angle caméra',
    generateBestAngles: 'Générer les 4 meilleurs angles',
    imageUpscale: 'Upscale image',
    videoUpscale: 'Upscale vidéo',
    imageToVideoReferences: 'Références image-vers-vidéo',
    finalCharacterReferences: 'Personnages enregistrés et nouveaux looks',
    imageToVideoSetup: 'Préparation image-vers-vidéo',
    storyboardCoverage: 'Couverture storyboard',
    imageToVideoSourceCleanup: 'Nettoyage source image-vers-vidéo',
    finalExport: 'Export final',
  },
  creditsRefunds: {
    creditNotes: {
      "title": "Validité des crédits avant de recharger",
      "items": [
        {
          "title": "Crédits média achetés",
          "body": "Les crédits média achetés non utilisés restent dans votre portefeuille entre vos projets, sans abonnement obligatoire. Nos conditions actuelles ne précisent ni durée d’expiration ni délai d’inactivité pour ce solde. Contactez l’assistance avant l’achat si vous avez besoin de confirmer une durée de validité."
        },
        {
          "title": "Crédits promotionnels, bonus et gratuits",
          "body": "Ils n’ont pas de valeur monétaire et ne sont pas remboursables. Consultez les conditions de validité de l’offre ; si elles ne sont pas précisées, contactez l’assistance avant de leur appliquer les règles des crédits média ou de Studio."
        },
        {
          "title": "Crédits d’assistance Milo",
          "body": "Milo Standard et Max partagent 500 crédits d’assistance inclus par mois civil UTC. Les crédits inclus non utilisés ne sont pas reportés. Les packs Milo achetés se cumulent sans expiration ni recharge automatique. Chaque achat de pack est confirmé et financé depuis votre portefeuille Keyvo. La génération média a son propre devis distinct. Milo Lite n’entraîne pas de frais d’assistance supplémentaires, sous réserve des limites de requête et de la disponibilité du service."
        }
      ],
      "links": {
        "termsHref": "/fr/legal/terms#wallet-credits",
        "terms": "Conditions du portefeuille",
        "refunds": "Politique et demande de remboursement (anglais)",
        "support": "Contacter l’assistance sur la validité des crédits",
        "studio": "Assistance Studio"
      }
    },
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
        body: "L’app affiche le prix live selon le moteur, la durée, la résolution et les options sélectionnés avant génération, même en invité. Vous utilisez Milo dans un générateur ou dans Studio ? Standard et Max partagent les crédits d’assistance inclus et achetés. La génération média dispose de son propre devis. Tenez compte des deux dans votre budget.",
      },
      {
        title: 'Échecs remboursés',
        body: 'Les générations en échec technique sont recréditées au portefeuille. Ce n’est pas un remboursement automatique sur carte ou compte bancaire. Un résultat terminé consomme des crédits même s’il déçoit ; un nouvel essai a un nouveau devis. Les demandes de remboursement du paiement sont examinées selon la politique de remboursement.',
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
    audioOff: 'Audio desactivado',
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
      'Compara precios totales de Keyvo para escenarios de video comunes. Las combinaciones no disponibles se marcan claramente. Abre la app para ver el precio exacto antes de generar.',
    currencyLabel: CUSTOMER_CURRENCY === 'CNY' ? 'Precios mostrados en CNY.' : 'Precios mostrados en créditos USD.',
    cheapestCurrentGen: 'Menor precio cotizado',
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
      draftIntent: 'Probar una idea corta',
      detailIntent: 'Dar más espacio a la escena',
      soundIntent: 'Crear una escena con sonido',
      bestDraft: 'Menor precio cotizado 5 s 720p',
      cheapest8s: 'Menor precio cotizado 8 s 1080p',
      cheapest10s: 'Menor precio cotizado 10 s 1080p',
      cheapestAudio: 'Menor precio cotizado 10 s 1080p + audio',
      cheapest4k: 'Precio de entrada 4K · duraciones variables',
      dedicated4k: 'Motor 4K dedicado',
      currentGenCount: 'Motores actuales disponibles',
      currentGenValue: (count) => `${count} motores`,
    },
    globalNote:
      'Los precios son los precios mostrados por Keyvo para escenarios predefinidos. Abre la app para ver el precio exacto antes de cada generación, incluyendo límites del proveedor, redondeo de duración y redondeo por job.',
  },
  popularChecks: {
    title: 'Consultas de precio frecuentes',
    columns: {
      priceCheck: 'Escenario',
      cheapestEngine: 'Opción con menor precio cotizado',
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
    intro: 'Referencias compactas de Keyvo para generación de imágenes, audio, preparación de personajes, herramientas de ángulo y upscale.',
    imageTitle: 'Precios de generación de imágenes',
    audioTitle: 'Precios de audio',
    toolTitle: 'Precios de herramientas de prep y upscale',
    characterImageNote: 'Los precios de Character Studio son por imagen generada: personaje, nuevo look o ficha. Una ficha cuenta como una imagen, independientemente del número de vistas. Elige una salida 1K, 2K o 4K.',
    recastPricingNote: 'El precio depende de la resolución, los segundos del fragmento de vídeo de origen y los segundos generados. Sin vídeo de origen, solo cuentan los segundos generados. Revisa el presupuesto exacto antes de generar.',
    recastExample: (output, source) => source ? `${output} s generados + ${source} s de origen` : `${output} s generados · sin vídeo de origen`,
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
    characterBuilderDraft: 'Character Studio · 1K',
    characterBuilderFinal: 'Character Studio · 2K',
    characterRecast: 'Keyvo Recast',
    recastUse: 'Escenas con personajes guardados',
    changeCameraAngle: 'Cambiar ángulo de cámara',
    generateBestAngles: 'Generar los 4 mejores ángulos',
    imageUpscale: 'Upscale de imagen',
    videoUpscale: 'Upscale de video',
    imageToVideoReferences: 'Referencias imagen a video',
    finalCharacterReferences: 'Personajes guardados y nuevos looks',
    imageToVideoSetup: 'Preparación imagen a video',
    storyboardCoverage: 'Cobertura storyboard',
    imageToVideoSourceCleanup: 'Limpieza de fuente imagen a video',
    finalExport: 'Export final',
  },
  creditsRefunds: {
    creditNotes: {
      "title": "Validez de los créditos antes de recargar",
      "items": [
        {
          "title": "Créditos de medios comprados",
          "body": "Los créditos de medios comprados y no usados permanecen en tu monedero entre proyectos, sin suscripción obligatoria. Nuestras condiciones actuales no especifican un plazo de caducidad ni de inactividad para este saldo. Contacta con soporte antes de comprar si necesitas confirmar un periodo de validez."
        },
        {
          "title": "Créditos promocionales, de bonificación y gratuitos",
          "body": "No tienen valor en efectivo y no son reembolsables. Consulta las condiciones de validez de la oferta; si no se indican, pregunta a soporte antes de aplicar las reglas de los créditos de medios o de Studio."
        },
        {
          "title": "Créditos de asistencia de Milo",
          "body": "Milo Standard y Max comparten 500 créditos de asistencia incluidos por mes natural UTC. Los créditos incluidos no usados no se acumulan. Los paquetes Milo comprados se acumulan sin caducidad ni recarga automática. Cada compra de paquete se confirma y se financia desde tu monedero Keyvo. La generación de medios tiene su propia cotización. Milo Lite no tiene coste adicional de asistencia, sujeto a límites de solicitudes y disponibilidad del servicio."
        }
      ],
      "links": {
        "termsHref": "/es/legal/terms#wallet-credits",
        "terms": "Condiciones del monedero",
        "refunds": "Política y solicitud de reembolso (inglés)",
        "support": "Consultar la validez con soporte",
        "studio": "Asistencia de Studio"
      }
    },
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
        body: "La app muestra el precio vivo según el motor, la duración, la resolución y las opciones antes de generar, incluso como invitado. ¿Usas Milo en un generador o en Studio? Standard y Max comparten los créditos de asistencia incluidos y comprados. La generación de medios tiene su propia cotización. Ten en cuenta ambos al planificar tu presupuesto.",
      },
      {
        title: 'Fallos reembolsados',
        body: 'Las generaciones con un fallo técnico se abonan de nuevo al monedero. No es un reembolso automático a la tarjeta o cuenta bancaria. Un resultado completado consume créditos aunque decepcione; un nuevo intento tiene una nueva cotización. Las solicitudes de reembolso del pago se revisan según la política de reembolsos.',
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
    audioOff: '音频关闭',
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
      '对比常见视频场景下 Keyvo 的预设总价。不支持的组合已明确标出。可在生成前打开应用查看实时精准报价。',
    currencyLabel: CUSTOMER_CURRENCY === 'CNY' ? '价格以人民币显示。' : '价格以美元点数显示。',
    cheapestCurrentGen: '当代最实惠',
    tableHeaders: { engine: '模型引擎', caps: '规格能力', actions: '操作' },
    tabs: { video: '视频', image: '图片', audio: '音频', tools: '工具与超分辨率' },
    presetLabels: {
      'entry-route': '入门线路',
      '5s-720p': '5 秒 720p',
      '10s-720p': '10 秒 720p',
      '8s-1080p': '8 秒 1080p',
      '10s-1080p': '10 秒 1080p',
      '10s-1080p-audio': '10 秒 + 音频',
      '4k-route': '4K 输出',
    },
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
      draftIntent: '试做一个短创意',
      detailIntent: '为场景加入更多细节',
      soundIntent: '创建带声音的场景',
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
      '所列价格为预设场景下的 Keyvo 当前展示价格。生成前请在应用内查看实时精确价格，包括供应商限制、时长取整及任务级取整。',
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
    intro: '涵盖图像生成、音频生成、角色预设、机位工具及超分辨率的 Keyvo 价格参考。',
    imageTitle: '图像生成定价',
    audioTitle: '音频定价',
    characterImageNote: '角色工作室按每张生成图片计价：角色、新造型或设定表。设定表按一张图计算，与视图数量无关。输出可选 1K、2K 或 4K。',
    recastPricingNote: '价格取决于分辨率、所选源视频秒数与生成秒数。没有源视频时，仅计算生成秒数。上线前请审核准确报价。',
    recastExample: (outputSeconds, sourceSeconds) => (sourceSeconds ? `${outputSeconds} 秒生成 + ${sourceSeconds} 秒源视频` : `${outputSeconds} 秒生成 · 无源视频`),
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
    characterRecast: 'Keyvo 角色替换',
    recastUse: '使用已保存角色的场景',
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
    creditNotes: {
      title: '充值前的积分有效期',
      items: [
        { title: '已购媒体积分', body: '未使用的已购媒体积分会在项目之间保留在您的钱包中，无需订阅。当前服务条款未规定该余额的有效期或不活跃期限。如需确认有效期，请在购买前联系客服。' },
        { title: '促销、赠送与免费积分', body: '此类积分没有现金价值，不可退款。请查看具体优惠的有效条件；若未注明，请先咨询客服，不要假定适用媒体积分或 Studio 规则。' },
        { title: '助理服务积分', body: '标准版与 Max 版助理每个 UTC 自然月共享 500 个赠送助理积分。未使用的赠送积分不会结转。已购助理套餐积分无到期日，也不会自动补充。每次套餐购买均需确认，并从您的 Keyvo 钱包扣款。媒体生成另行报价。Lite 版助理无额外助理费用，但受请求次数限制和服务可用性约束。' },
      ],
      links: { termsHref: '/zh/legal/terms#wallet-credits', terms: '钱包条款', refunds: '退款政策与申请流程', support: '咨询客服有关积分有效期', studio: 'Studio 助理' },
    },
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
