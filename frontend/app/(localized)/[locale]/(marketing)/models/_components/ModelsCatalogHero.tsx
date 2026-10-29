import { ArrowRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { UIIcon } from '@/components/ui/UIIcon';
import type { ModelsCatalogDecisionBadge, ModelsCatalogTopPick } from '../_lib/models-catalog-decision-data';
import { ModelsCatalogTopPicksPanel } from './ModelsCatalogTopPicksPanel';

type ModelsCatalogHeroProps = {
  badges: ModelsCatalogDecisionBadge[];
  eyebrow: string;
  heroAccentParts: {
    emphasis: string;
    prefix: string;
  };
  heroSubhead: string;
  heroTitleParts: {
    accent: string;
    lead: string;
  };
  primaryCtaLabel: string;
  secondaryCtaLabel: string;
  topPicks: ModelsCatalogTopPick[];
  topPicksTitle: string;
  topPicksViewAllLabel: string;
};

export function ModelsCatalogHero({
  badges,
  eyebrow,
  heroAccentParts,
  heroSubhead,
  heroTitleParts,
  primaryCtaLabel,
  secondaryCtaLabel,
  topPicks,
  topPicksTitle,
  topPicksViewAllLabel,
}: ModelsCatalogHeroProps) {
  return (
    <section className="catalog-editorial-hero relative isolate overflow-hidden border-b border-hairline bg-bg">
      <div className="container-page relative z-10 max-w-[1248px] py-10 sm:py-12 lg:min-h-[430px] lg:py-10">
        <div className="catalog-reference-opening">
          <div className="min-w-0">
            <header className="min-w-0 max-w-[720px]">
              <p className="videoai-kicker">{eyebrow}</p>
              <h1 className="mt-4 text-balance text-[40px] font-semibold leading-[1.04] tracking-normal text-text-primary sm:text-[54px] lg:text-[58px] xl:text-[60px]">
                {heroTitleParts.lead}
                {heroTitleParts.accent ? (
                  <>
                    <br />
                    <span>
                      {heroAccentParts.prefix}
                      {heroAccentParts.emphasis}
                    </span>
                  </>
                ) : null}
              </h1>
              <p className="mt-5 max-w-[62ch] text-base font-medium leading-relaxed text-text-secondary sm:text-lg">
                {heroSubhead}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href="#models-grid"
                  className="inline-flex min-h-11 items-center gap-2 rounded-[8px] bg-text-primary px-5 text-sm font-semibold text-bg shadow-[0_14px_28px_rgba(15,23,42,0.16)] transition hover:-translate-y-0.5 hover:opacity-90"
                >
                  {primaryCtaLabel}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </a>
              </div>
            </header>

            <div className="mt-7 flex flex-wrap gap-3">
              {badges.map((badge) => (
                <span
                  key={badge.label}
                  className="inline-flex items-center gap-2 rounded-full border border-hairline bg-surface/86 px-3 py-2 text-xs font-semibold text-text-secondary shadow-sm backdrop-blur"
                >
                  <UIIcon icon={badge.icon} size={14} />
                  {badge.label}
                </span>
              ))}
            </div>
          </div>


        </div>
        {topPicks.length ? <ModelsCatalogTopPicksPanel title={topPicksTitle} viewAllLabel={topPicksViewAllLabel} items={topPicks}/> : null}
      </div>
    </section>
  );
}
