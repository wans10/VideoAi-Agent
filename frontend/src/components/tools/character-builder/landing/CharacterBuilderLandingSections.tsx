import { ProductionReviewNotes } from '../../production/ProductionReviewNotes';
import { resolveLocale } from '@/lib/i18n/server';
import { ToolWorkspacePreview } from '@/components/tools/landing/ToolWorkspacePreview';
import type { CharacterBuilderLandingContent } from './character-builder-landing-assets';
import {
  CharacterBuilderFaqSection,
  CharacterBuilderFinalCtaSection,
  CharacterBuilderRelatedSection,
} from './CharacterBuilderLandingConversionSections';
import {
  CharacterBuilderHeroSection,
  CharacterBuilderHowItWorksSection,
} from './CharacterBuilderLandingLeadSections';
import { CharacterBuilderOutputsWorkflowSection } from './CharacterBuilderLandingWorkflowSections';

export async function CharacterBuilderLandingSections({ content }: { content: CharacterBuilderLandingContent }) {
  const locale = await resolveLocale();
  return (
    <>
      <CharacterBuilderHeroSection content={content} />
      <ProductionReviewNotes locale={locale} kind="character" />
      <CharacterBuilderHowItWorksSection content={content} />
      <ToolWorkspacePreview tool="character-builder" title={content.hero.showcase.topLabel} body={content.hero.showcase.windowLabel} />
      <CharacterBuilderOutputsWorkflowSection content={content} />
      <CharacterBuilderRelatedSection content={content} />
      <CharacterBuilderFinalCtaSection content={content} />
      <CharacterBuilderFaqSection content={content} />
    </>
  );
}
