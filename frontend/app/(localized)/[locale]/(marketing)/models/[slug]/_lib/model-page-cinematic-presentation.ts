import type { AppLocale } from '@/i18n/locales';
import { parseModelCinematicContent } from './model-page-cinematic-content';
import { buildCinematicPresentation } from './model-page-cinematic-data';
import type { ModelEditorialImage } from './model-page-editorial-images';
import type { ModelExamplesContent } from './model-page-examples-content';

/** Parses a locale's reviewed cinematic copy and builds the model page presentation (null when not opted in). */
export function buildModelCinematicPresentation(
  cinematic: unknown,
  modelSlug: string,
  examples: ModelExamplesContent,
  editorialImages: ModelEditorialImage[],
  locale: AppLocale,
) {
  return buildCinematicPresentation(parseModelCinematicContent(cinematic, modelSlug), examples, editorialImages, locale);
}
