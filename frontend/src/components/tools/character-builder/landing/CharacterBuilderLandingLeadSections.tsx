import production from '../../production/ProductionDepartments.module.css';
import type { resolveDictionary } from '@/lib/i18n/server';
import { CharacterReferenceShowcase } from './CharacterReferenceShowcase.client';
import { ArrowRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { ButtonLink } from '@/components/ui/Button';
import type { CharacterBuilderLandingContent } from './character-builder-landing-assets';
import styles from './CharacterStudioLanding.module.css';

export type CharacterBuilderJourneyCopy = Awaited<ReturnType<typeof resolveDictionary>>['dictionary']['toolMarketing']['journey'];

export function CharacterBuilderHeroSection({ content, journey: c }: { content: CharacterBuilderLandingContent; journey: CharacterBuilderJourneyCopy }) {
  return <header className={production.characterOpening}><div className="container-page">
    <div className={production.characterHeading}><p className={production.kicker}>{content.hero.badge}</p><h1>{content.hero.title}</h1></div>
    <div className={production.characterDesk}>
      <div className="character-hero-visual"><CharacterReferenceShowcase sheet={c.sheet} portrait={c.portrait} note={c.proof} views={c.views} /></div>
      <div className={production.characterBrief}><p>{content.hero.body}</p>
        <ButtonLink href="/app/tools/character-builder" linkComponent={Link} size="lg"
          data-analytics-event="tool_cta_click" data-analytics-cta-name="character_builder_try_tool_hero"
          data-analytics-cta-location="tool_character_builder_hero" data-analytics-tool-name="character_builder"
          data-analytics-tool-surface="public" data-analytics-target-family="app_tools">
          {content.hero.primaryCta}<ArrowRight className="h-4 w-4" />
        </ButtonLink>
      </div>
    </div>
  </div></header>;
}

export function CharacterBuilderHowItWorksSection({ content }: { content: CharacterBuilderLandingContent }) {
  return <section className={styles.section} id="create"><div className={styles.container}>
    <header className={styles.sectionHeading}><p className={styles.eyebrow}>01 / {content.studio.nav[0]}</p><h2>{content.studio.castingTitle}</h2><p>{content.studio.castingBody}</p></header>
    <ol className={styles.steps}>{content.howItWorks.steps.map((step, i) => <li key={step.title} id={`step-${i + 1}`}><span>0{i + 1}</span><div><h3>{step.title}</h3><p>{step.body}</p></div></li>)}</ol>
  </div></section>;
}
