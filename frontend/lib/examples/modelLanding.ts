import type { AppLocale } from '@/i18n/locales';
import { getModelFamilyDefinition } from '@/config/model-families';
import { getLocalizedModelData } from '@/lib/examples/modelLandingData';
import { getExampleFamilyIds, getExampleFamilyVariantLabels } from '@/lib/model-families';
import type {
  CanonicalExampleModelSlug,
  ExampleModelLanding,
  LocalizedModelDescriptor,
} from '@/lib/examples/modelLandingTypes';

export { getHubExamplesFaq } from '@/lib/examples/modelLandingFaq';
export type { ExampleFaqItem, ExampleModelLanding, ExampleSectionItem } from '@/lib/examples/modelLandingTypes';

export function getCanonicalExampleModelSlugs(): CanonicalExampleModelSlug[] {
  return getExampleFamilyIds();
}

export function getExampleModelLabel(_locale: AppLocale, slug: string): string | null {
  const normalized = slug.trim().toLowerCase() as CanonicalExampleModelSlug;
  return getModelFamilyDefinition(normalized)?.label ?? null;
}

function formatLocalizedList(locale: AppLocale, items: string[]): string {
  if (!items.length) return '';
  if (items.length === 1) return items[0];
  if (locale === 'zh') return items.join('、');
  const conjunction = locale === 'fr' ? 'et' : locale === 'es' ? 'y' : 'and';
  if (items.length === 2) return `${items[0]} ${conjunction} ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, ${conjunction} ${items[items.length - 1]}`;
}

function buildGenericLocalizedModelData(
  locale: AppLocale,
  label: string,
  variantsSentence: string
): LocalizedModelDescriptor {
  if (locale === 'fr') {
    return {
      subtitle: `Exemples ${label} sur toute la famille, avec prompts réutilisables, réglages et repères de prix.`,
      intro: `Utilisez cette page pour relire des exemples ${label} avant de lancer de nouveaux rendus. ${variantsSentence} Comparez mouvement, cadrage et durée, puis ouvrez un exemple pour voir son coût enregistré, puis ouvrez les pages modèles liées pour les specs et limites propres à chaque mode.`,
      promptPatterns: `Les exemples ${label} sont plus fiables quand le prompt sépare sujet, mouvement caméra, environnement et durée. Commencez par un clip court, puis itérez sur le cadrage et le mouvement.`,
      strengthsLimits: `Cette galerie sert à comparer comment la famille ${label} gère le mouvement, la composition et la cohérence. Les capacités changent encore selon le modèle et le mode, donc validez le flux exact sur la page modèle avant de passer en production.`,
      pricingNotes: `Le coût enregistré affiché sur la fiche d’un exemple varie selon le modèle, la durée, la résolution et le mode. Gardez le même brief pour comparer correctement coût et qualité dans la famille ${label}.`,
      faq: [
        {
          question: `Quand utiliser la page d’exemples ${label} ?`,
          answer: `Quand vous voulez comparer rapidement plusieurs variantes ${label} avant de choisir la meilleure page modèle pour produire.`,
        },
        {
          question: `Est-ce que tous les modèles ${label} se comportent pareil ?`,
          answer: `Non. La famille partage une logique commune, mais les durées, modes, résolutions et coûts restent spécifiques à chaque modèle.`,
        },
        {
          question: `Comment choisir le bon modèle ${label} ?`,
          answer: `Commencez par les exemples pour voir le rendu, puis ouvrez les pages modèles liées pour confirmer les specs, limites et prix.`,
        },
      ],
    };
  }

  if (locale === 'es') {
    return {
      subtitle: `Ejemplos de ${label} en toda la familia, con prompts reutilizables, ajustes y referencias de precio.`,
      intro: `Usa esta página para revisar ejemplos de ${label} antes de lanzar nuevos renders. ${variantsSentence} Compara movimiento, encuadre y duración, y abre un ejemplo para ver su coste registrado, y luego abre las páginas de modelo relacionadas para ver límites y especificaciones por modo.`,
      promptPatterns: `Los ejemplos de ${label} funcionan mejor cuando el prompt separa sujeto, movimiento de cámara, entorno y duración. Empieza con clips cortos y luego ajusta encuadre y movimiento.`,
      strengthsLimits: `La galería te ayuda a comparar cómo la familia ${label} maneja movimiento, composición y consistencia. Las capacidades siguen variando por modelo y modo, así que valida el flujo exacto en la página del modelo antes de escalar producción.`,
      pricingNotes: `El coste registrado de la ficha de un ejemplo cambia según modelo, duración, resolución y modo. Mantén el mismo brief para comparar bien coste y calidad dentro de la familia ${label}.`,
      faq: [
        {
          question: `¿Cuándo usar la página de ejemplos de ${label}?`,
          answer: `Úsala cuando quieras comparar rápidamente varias variantes de ${label} antes de elegir la mejor página de modelo para producir.`,
        },
        {
          question: `¿Todos los modelos de ${label} se comportan igual?`,
          answer: `No. La familia comparte una lógica común, pero duración, modos, resolución y coste siguen dependiendo de cada modelo.`,
        },
        {
          question: `¿Cómo elijo el modelo correcto de ${label}?`,
          answer: `Empieza por los ejemplos para ver el resultado y luego abre las páginas de modelo relacionadas para validar límites, especificaciones y precio.`,
        },
      ],
    };
  }

  if (locale === 'zh') {
    return {
      subtitle: `${label} 全系列案例，包含可复用提示词、参数设置与价格参考。`,
      intro: `在发起新渲染前，可使用此页面查看 ${label} 案例。${variantsSentence} 对比运动幅度、构图和时长，点击案例查看历史生成费用，并访问关联的模型页面了解各模式的详细规格与限制。`,
      promptPatterns: `${label} 案例在提示词分别清晰描述主体、镜头运动、环境和节奏时效果最佳。建议从短片段开始，在画面基准稳定后再迭代构图与运动。`,
      strengthsLimits: `本案例库用于对比 ${label} 系列在处理动态、构图和连贯性方面的表现。各项功能仍因模型与模式而异，在扩大生产规模前请确认模型页面的工作流说明。`,
      pricingNotes: `案例详情页中显示的生成费用会根据模型、时长、分辨率和模式有所不同。保持相同需求有助于在 ${label} 系列内客观对比成本与质量。`,
      faq: [
        {
          question: `何时使用 ${label} 案例页面？`,
          answer: `当您想在挑选最适合生产的模型前，快速对比多个 ${label} 变体效果时。`,
        },
        {
          question: `所有 ${label} 模型表现都一样吗？`,
          answer: `不一样。虽然同属一个模型系列，但在时长、支持模式、分辨率和生成费用上仍各有差异。`,
        },
        {
          question: `如何挑选合适的 ${label} 模型？`,
          answer: `建议先通过案例查看输出质感，然后前往对应的模型详情页确认规格、限制和实时定价。`,
        },
      ],
    };
  }

  return {
    subtitle: `${label} examples across the full family, with reusable prompts, settings, and pricing signals.`,
    intro: `Use this page to review ${label} examples before launching new renders. ${variantsSentence} Compare motion, framing, and duration, then open an example to see its recorded render cost. Use the related model pages for mode-specific specs and limits.`,
    promptPatterns: `${label} examples usually work best when prompts separate subject, camera movement, environment, and timing. Start with short clips, then iterate on framing and motion once the baseline looks right.`,
    strengthsLimits: `This gallery helps you compare how the ${label} family handles motion, composition, and consistency. Capabilities still vary by model and mode, so confirm the exact workflow on the related model pages before scaling production.`,
    pricingNotes: `Recorded render costs vary by model, duration, resolution, and mode. Open example detail pages to compare cost and quality across the ${label} family with a stable brief.`,
    faq: [
      {
        question: `When should I use the ${label} examples page?`,
        answer: `Use it when you want to compare multiple ${label} variants quickly before choosing the best model page for production.`,
      },
      {
        question: `Do all ${label} models behave the same way?`,
        answer: `No. They share a family baseline, but duration, modes, resolution, and cost still vary by model.`,
      },
      {
        question: `How do I choose the right ${label} model?`,
        answer: `Start with examples to judge output quality, then open the related model pages to confirm specs, limits, and pricing.`,
      },
    ],
  };
}

export function getExampleModelLanding(locale: AppLocale, slug: string): ExampleModelLanding | null {
  const normalized = slug.trim().toLowerCase() as CanonicalExampleModelSlug;
  const family = getModelFamilyDefinition(normalized);
  if (!family) return null;

  const label = family.label;
  const variants = getExampleFamilyVariantLabels(normalized);
  const variantsList = formatLocalizedList(locale, variants);
  const variantsSentence =
    variantsList.length > 0
      ? locale === 'fr'
        ? `Cette page regroupe ${variantsList}.`
        : locale === 'es'
          ? `Esta página reúne ${variantsList}.`
          : locale === 'zh'
            ? `本页面汇集了 ${variantsList}。`
            : `This page includes ${variantsList}.`
      : locale === 'fr'
        ? `Cette page regroupe plusieurs modèles ${label}.`
        : locale === 'es'
          ? `Esta página reúne varios modelos de ${label}.`
          : locale === 'zh'
            ? `本页面包含多个 ${label} 模型。`
            : `This page includes multiple ${label} models.`;
  const localized = getLocalizedModelData(locale)[normalized] ?? buildGenericLocalizedModelData(locale, label, variantsSentence);
  const metaTitle =
    localized.metaTitle ??
    (locale === 'fr'
      ? `Exemples vidéo IA ${label} (prompts + réglages) | MaxVideoAI`
      : locale === 'es'
        ? `Ejemplos de video con IA de ${label} (prompts + ajustes) | MaxVideoAI`
        : locale === 'zh'
          ? `${label} AI 视频案例（提示词 + 参数设置）| MaxVideoAI`
          : `${label} AI Video Examples (Prompts + Settings) | MaxVideoAI`);
  const sectionPromptTitle =
    locale === 'fr'
      ? `Prompts sur les modèles ${label}`
      : locale === 'es'
        ? `Patrones de prompt en modelos de ${label}`
        : locale === 'zh'
          ? `${label} 模型的提示词模式`
          : `Prompt patterns across ${label} models`;
  const sectionLimitsTitle =
    locale === 'fr'
      ? 'Forces et limites par modèle'
      : locale === 'es'
        ? 'Fortalezas y límites por modelo'
        : locale === 'zh'
          ? '各模型的优势与局限'
          : 'Strengths and limits by model';
  const sectionPricingTitle =
    locale === 'fr'
      ? 'Notes de prix (selon le modèle)'
      : locale === 'es'
        ? 'Notas de precio (según el modelo)'
        : locale === 'zh'
          ? '价格参考（因模型而异）'
          : 'Pricing notes (varies by model)';

  return {
    slug: normalized,
    label,
    metaTitle,
    metaDescription:
      localized.metaDescription ??
      (locale === 'fr'
        ? `Exemples vidéo IA ${label} avec prompts, réglages et coût enregistré sur chaque fiche. ${variantsSentence}`
        : locale === 'es'
          ? `Ejemplos de video con IA de ${label} con prompts, ajustes y coste registrado en cada ficha. ${variantsSentence}`
          : locale === 'zh'
            ? `${label} AI 视频案例，详情页包含提示词、参数设置和历史生成费用。${variantsSentence}`
            : `${label} examples with prompts, settings, and recorded cost on each detail page. ${variantsSentence}`),
    heroTitle:
      localized.heroTitle ??
      (locale === 'fr' ? `Exemples ${label}` : locale === 'es' ? `Ejemplos de ${label}` : locale === 'zh' ? `${label} 案例` : `${label} Examples`),
    heroSubtitle: localized.subtitle,
    intro: localized.intro,
    summary:
      localized.summary ??
      (locale === 'fr'
        ? `${variantsSentence} Ouvrez un exemple pour consulter son prompt, ses réglages et le coût enregistré avant de lancer un nouveau rendu.`
        : locale === 'es'
          ? `${variantsSentence} Abre un ejemplo para consultar su prompt, ajustes y coste registrado antes de lanzar un nuevo render.`
          : locale === 'zh'
            ? `${variantsSentence} 在发起新渲染前，打开任意案例即可查看其提示词、参数设置及历史生成费用。`
            : `${variantsSentence} Open an example to review its prompt, settings, and recorded render cost before running a new render.`),
    sections: [
      {
        title: sectionPromptTitle,
        body: localized.promptPatterns,
      },
      {
        title: sectionLimitsTitle,
        body: localized.strengthsLimits,
      },
      {
        title: sectionPricingTitle,
        body: localized.pricingNotes,
      },
    ],
    faqTitle:
      locale === 'fr'
        ? `FAQ modèles ${label}`
        : locale === 'es'
          ? `FAQ de modelos ${label}`
          : locale === 'zh'
            ? `${label} 模型常见问题`
            : `${label} models FAQ`,
    faqItems: localized.faq,
  };
}
