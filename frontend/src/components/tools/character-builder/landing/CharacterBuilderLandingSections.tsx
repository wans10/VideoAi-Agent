import type { CharacterStudioMarketingFilm } from './character-studio-marketing-assets';
import { ProductionReviewNotes } from '../../production/ProductionReviewNotes';
import type { AppLocale } from '@/i18n/locales';
import type { CharacterBuilderLandingContent } from './character-builder-landing-assets';
import {
  CharacterBuilderFaqSection,
  CharacterBuilderFinalCtaSection,
  CharacterBuilderRelatedSection,
} from './CharacterBuilderLandingConversionSections';
import {
  CharacterBuilderHeroSection,
  type CharacterBuilderJourneyCopy,
  CharacterBuilderHowItWorksSection,
} from './CharacterBuilderLandingLeadSections';
import { CharacterBuilderOutputsWorkflowSection } from './CharacterBuilderLandingWorkflowSections';

export function CharacterBuilderLandingSections({ content, films = [], locale, journey }: { content: CharacterBuilderLandingContent; films?: CharacterStudioMarketingFilm[]; locale: AppLocale; journey: CharacterBuilderJourneyCopy }) {
  return (
    <>
      <CharacterBuilderHeroSection content={content} journey={journey} />
      <ProductionReviewNotes locale={locale} kind="character" />
      <CharacterBuilderHowItWorksSection content={content} />
      <CharacterBuilderOutputsWorkflowSection content={content} films={films} locale={locale} />
      <CharacterBuilderRelatedSection content={content} />
      <CharacterBuilderFinalCtaSection content={content} />
      <CharacterBuilderFaqSection content={content} />
    </>
  );
}
