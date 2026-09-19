import { localeRegions, type AppLocale } from '@/i18n/locales';
import type { PricingScenario } from '@/lib/pricing-scenarios';

export type ExampleCardConfig = {
  title: string;
  engine: string;
  duration: string;
  resolution: string;
  audio: string;
  price?: string;
  note?: string;
  pricingScenario?: PricingScenario;
};

export type ExampleCostsContent = {
  title: string;
  subtitle: string;
  labels: {
    engine: string;
    duration: string;
    resolution: string;
    audio: string;
  };
  cards: ExampleCardConfig[];
};

export type PriceFactorsContent = {
  title: string;
  points: string[];
};

export type FormattedMembershipTier = {
  name: string;
  requirement: string;
  benefit: string;
};

export function formatCurrencyForLocale(locale: AppLocale, currency: string, amount: number) {
  const region = localeRegions[locale] ?? 'en-US';
  return new Intl.NumberFormat(region, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export const DEFAULT_EXAMPLE_COSTS: Record<AppLocale, ExampleCostsContent> = {
  en: {
    title: 'Example costs',
    subtitle: 'Realistic runs to help you plan. Prices update as engines evolve.',
    labels: { engine: 'Engine', duration: 'Duration', resolution: 'Resolution', audio: 'Audio' },
    cards: [
      {
        title: 'Social clip (vertical)',
        engine: 'Pika 2.2',
        duration: '5s',
        resolution: '1080×1920',
        audio: 'Off',
        note: 'Charged only if it succeeds.',
        pricingScenario: { engineId: 'pika-text-to-video', durationSec: 5, resolution: '1080p', memberTier: 'member' },
      },
      {
        title: 'Cinematic test (landscape)',
        engine: 'Veo 3.1',
        duration: '8s',
        resolution: '1920×1080',
        audio: 'On',
        note: 'Price before you generate.',
        pricingScenario: { engineId: 'veo-3-1', durationSec: 8, resolution: '1080p', memberTier: 'member' },
      },
      {
        title: 'Flagship Seedance 2.0 run',
        engine: 'Seedance 2.0',
        duration: '10s',
        resolution: '1280×720',
        audio: 'On',
        note: 'Seedance 2 uses token-based pricing. This example assumes 1280×720 at 24 fps, applies the displayed app price rule, then rounds up to the next cent.',
        pricingScenario: {
          engineId: 'seedance-2-0',
          durationSec: 10,
          resolution: '720p',
          aspectRatio: '16:9',
          memberTier: 'member',
        },
      },
    ],
  },
  fr: {
    title: 'Exemples de coûts',
    subtitle: 'Runs réalistes pour planifier. Les prix évoluent avec les modèles.',
    labels: { engine: 'Modèle', duration: 'Durée', resolution: 'Résolution', audio: 'Audio' },
    cards: [
      {
        title: 'Clip social (vertical)',
        engine: 'Pika 2.2',
        duration: '5 s',
        resolution: '1080×1920',
        audio: 'Silencieux',
        note: 'Débité uniquement si le rendu aboutit.',
        pricingScenario: { engineId: 'pika-text-to-video', durationSec: 5, resolution: '1080p', memberTier: 'member' },
      },
      {
        title: 'Test cinématographique (paysage)',
        engine: 'Veo 3.1',
        duration: '8 s',
        resolution: '1920×1080',
        audio: 'Inclus',
        note: 'Prix affiché avant génération.',
        pricingScenario: { engineId: 'veo-3-1', durationSec: 8, resolution: '1080p', memberTier: 'member' },
      },
      {
        title: 'Séquence premium Seedance 2.0',
        engine: 'Seedance 2.0',
        duration: '10 s',
        resolution: '1280×720',
        audio: 'Inclus',
        note: 'Seedance 2 suit une formule basée sur les tokens. Cet exemple part de 1280×720 à 24 fps, applique la règle de prix affichée dans l’app, puis arrondit au centime supérieur.',
        pricingScenario: {
          engineId: 'seedance-2-0',
          durationSec: 10,
          resolution: '720p',
          aspectRatio: '16:9',
          memberTier: 'member',
        },
      },
    ],
  },
  es: {
    title: 'Costos de ejemplo',
    subtitle: 'Ejecuciones realistas para planificar. Los precios cambian cuando evolucionan los motores.',
    labels: { engine: 'Motor', duration: 'Duración', resolution: 'Resolución', audio: 'Audio' },
    cards: [
      {
        title: 'Clip social (vertical)',
        engine: 'Pika 2.2',
        duration: '5 s',
        resolution: '1080×1920',
        audio: 'Silencioso',
        note: 'Se cobra solo si termina correctamente.',
        pricingScenario: { engineId: 'pika-text-to-video', durationSec: 5, resolution: '1080p', memberTier: 'member' },
      },
      {
        title: 'Test cinematográfico (horizontal)',
        engine: 'Veo 3.1',
        duration: '8 s',
        resolution: '1920×1080',
        audio: 'Incluido',
        note: 'Precio visible antes de generar.',
        pricingScenario: { engineId: 'veo-3-1', durationSec: 8, resolution: '1080p', memberTier: 'member' },
      },
      {
        title: 'Secuencia premium Seedance 2.0',
        engine: 'Seedance 2.0',
        duration: '10 s',
        resolution: '1280×720',
        audio: 'Incluido',
        note: 'Seedance 2 usa una fórmula basada en tokens. Este ejemplo parte de 1280×720 a 24 fps, aplica la regla de precio mostrada en la app y redondea al céntimo superior.',
        pricingScenario: {
          engineId: 'seedance-2-0',
          durationSec: 10,
          resolution: '720p',
          aspectRatio: '16:9',
          memberTier: 'member',
        },
      },
    ],
  },
  zh: {
    title: '费用示例',
    subtitle: '真实运行场景助您规划预算。价格随引擎升级实时变动。',
    labels: { engine: '模型引擎', duration: '时长', resolution: '分辨率', audio: '音频' },
    cards: [
      {
        title: '社交媒体短片（竖屏）',
        engine: 'Pika 2.2',
        duration: '5 秒',
        resolution: '1080×1920',
        audio: '关闭',
        note: '仅在渲染成功时扣费。',
        pricingScenario: { engineId: 'pika-text-to-video', durationSec: 5, resolution: '1080p', memberTier: 'member' },
      },
      {
        title: '电影感测试片段（横屏）',
        engine: 'Veo 3.1',
        duration: '8 秒',
        resolution: '1920×1080',
        audio: '包含',
        note: '生成前可查看精确报价。',
        pricingScenario: { engineId: 'veo-3-1', durationSec: 8, resolution: '1080p', memberTier: 'member' },
      },
      {
        title: 'Seedance 2.0 高画质序列',
        engine: 'Seedance 2.0',
        duration: '10 秒',
        resolution: '1280×720',
        audio: '包含',
        note: 'Seedance 2 采用基于 token 的计费公式。本示例基于 1280×720 @ 24 fps，遵循应用内公示的计价规则并向上取整至分。',
        pricingScenario: {
          engineId: 'seedance-2-0',
          durationSec: 10,
          resolution: '720p',
          aspectRatio: '16:9',
          memberTier: 'member',
        },
      },
    ],
  },
};

export const DEFAULT_PRICE_FACTORS: Record<AppLocale, PriceFactorsContent> = {
  en: {
    title: 'What affects price',
    points: [
      'Duration scales linearly (4s / 8s / 12s).',
      'On token-priced routes like Seedance 2, both resolution and aspect ratio change the pixel count and the cost.',
      'Audio can add a premium on some engines; others, like Seedance 2, price audio on/off the same.',
      'Engine tier (Seedance / Veo / Kling / LTX) sets the base rate.',
      'Generate still shows the final quote before submission.',
    ],
  },
  fr: {
    title: 'Ce qui influence le prix',
    points: [
      'La durée évolue linéairement (4 s / 8 s / 12 s).',
      'Sur les routes à tokens comme Seedance 2, la résolution et le ratio changent le nombre de pixels et donc le coût.',
      'L’audio peut ajouter une prime sur certains modèles ; d’autres, comme Seedance 2, gardent le même prix avec ou sans audio.',
      'Le niveau du modèle (Seedance / Veo / Kling / LTX) fixe le tarif de base.',
      'Generate affiche quand même le devis final avant validation.',
    ],
  },
  es: {
    title: 'Qué afecta el precio',
    points: [
      'La duración escala de forma lineal (4 s / 8 s / 12 s).',
      'En rutas con tokens como Seedance 2, la resolución y el ratio cambian el número de píxeles y por tanto el costo.',
      'El audio puede añadir un recargo en algunos motores; otros, como Seedance 2, mantienen el mismo precio con o sin audio.',
      'El nivel del motor (Seedance / Veo / Kling / LTX) define la tarifa base.',
      'Generate sigue mostrando el precio final antes de enviar.',
    ],
  },
  zh: {
    title: '影响价格的因素',
    points: [
      '时长呈线性缩放（4秒 / 8秒 / 12秒）。',
      '在类似 Seedance 2 的按 token 计费方案中，分辨率和宽高比均会改变像素总量与生成成本。',
      '在部分模型上开启音频可能会产生额外费用；其他模型（如 Seedance 2）无论是否包含音频价格均相同。',
      '模型级别（Seedance / Veo / Kling / LTX）决定基础费率。',
      '生成前应用内始终会显示提交前的最终报价。',
    ],
  },
};
