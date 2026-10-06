import type { AppLocale } from '@/i18n/locales';
import { getModelFamilyDefinition } from '@/config/model-families';
import { getLocalizedModelData } from '@/lib/examples/modelLandingData';
import { buildGenericLocalizedModelData } from '@/lib/examples/modelLandingGenericData';
import { getExampleFamilyIds, getExampleFamilyVariantLabels } from '@/lib/model-families';
import type {
  CanonicalExampleModelSlug,
  ExampleModelLanding,
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
      ? `Exemples vidéo IA ${label} (prompts + réglages) | Keyvo`
      : locale === 'es'
        ? `Ejemplos de video con IA de ${label} (prompts + ajustes) | Keyvo`
        : locale === 'zh'
          ? `${label} AI 视频案例（提示词 + 参数设置）| Keyvo`
          : `${label} AI Video Examples (Prompts + Settings) | Keyvo`);
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
    guideTitle: localized.guideTitle,
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
        title: localized.sectionTitles?.[0] ?? sectionPromptTitle,
        body: localized.promptPatterns,
      },
      {
        title: localized.sectionTitles?.[1] ?? sectionLimitsTitle,
        body: localized.strengthsLimits,
      },
      {
        title: localized.sectionTitles?.[2] ?? sectionPricingTitle,
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
