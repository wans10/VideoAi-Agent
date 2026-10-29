import type { AppLocale } from '@/i18n/locales';
import type { ComparePricingDisplay } from './compare-page-types';

// Route-local copy for the comparison pricing panel. Every locale is explicit so
// zh never falls through to the English branch.
type ScenarioInput = {
  durationSec: number;
  aspectRatio?: string | null;
  audio?: boolean | null;
};

export function getCompareScenarioChips(locale: AppLocale, scenario: ScenarioInput | null | undefined): string[] {
  if (!scenario) return [];
  const mode = pick(locale, { en: 'Text to video', fr: 'Texte vers vidéo', es: 'Texto a vídeo', zh: '文生视频' });
  const audio = scenario.audio
    ? pick(locale, { en: 'audio on', fr: 'audio activé', es: 'audio activado', zh: '开启音频' })
    : pick(locale, { en: 'audio off', fr: 'sans audio', es: 'sin audio', zh: '关闭音频' });
  const duration = locale === 'zh' ? `${scenario.durationSec} 秒` : `${scenario.durationSec} s`;
  return [mode, duration, scenario.aspectRatio, audio].filter((value): value is string => typeof value === 'string' && value.length > 0);
}

export function getCompareScenarioLabel(locale: AppLocale, scenario: ScenarioInput | null | undefined): string | null {
  if (!scenario) return null;
  return getCompareScenarioChips(locale, scenario).join(' · ');
}

export function compareScenarioChips(display: ComparePricingDisplay, locale: AppLocale): string[] {
  return getCompareScenarioChips(locale, display.scenario);
}

// Kept for the zh pricing-panel contract; the upstream panel no longer renders the
// "Scorecard price references" line, so this label has no live caller.
export function getCompareScoreLabel(locale: AppLocale): string {
  return pick(locale, {
    en: 'Scorecard price references',
    fr: 'Références tarifaires de la grille',
    es: 'Precios de referencia de la evaluación',
    zh: '评分参考价格',
  });
}

export function getComparePerVideoLabel(locale: AppLocale): string {
  return pick(locale, { en: 'per video', fr: 'par vidéo', es: 'por vídeo', zh: '每个视频' });
}

export function getCompareQuoteUnavailableLabel(locale: AppLocale): string {
  return pick(locale, {
    en: 'The current quote could not be confirmed. Check your settings in the app before generating.',
    fr: 'Le devis actuel ne peut pas être confirmé. Vérifiez les réglages dans l’app avant de générer.',
    es: 'No se puede confirmar el precio actual. Revisa los ajustes en la app antes de generar.',
    zh: '当前报价无法确认。生成前请在应用中检查设置。',
  });
}

export function comparePriceLines(display: ComparePricingDisplay, locale: AppLocale): string[] {
  if (display.quoteUnavailable) return [pick(locale, {
    en: 'Current quote unavailable; check settings before generating.',
    fr: 'Devis actuel indisponible ; vérifiez les réglages avant de générer.',
    es: 'Precio actual no disponible; comprueba los ajustes antes de generar.',
    zh: '当前报价不可用；生成前请检查设置。',
  })];
  const unit = getComparePerVideoLabel(locale);
  return display.priceRows?.length
    ? [compareScenarioChips(display, locale).join(' · '), ...display.priceRows.map(row => `${row.resolution}: ${row.totalPrice} ${unit} (${row.unitPrice})`)]
    : Array.from(new Set([display.headline, ...(display.secondaryLines ?? (display.subline ? [display.subline] : []))].filter(Boolean)));
}

function pick(locale: AppLocale, copy: Record<AppLocale, string>): string {
  return copy[locale] ?? copy.en;
}
