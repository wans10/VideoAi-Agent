import { ArrowRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { EngineIcon } from '@/components/ui/EngineIcon';
import { BenchmarkMethodologyLink } from '@/components/marketing/BenchmarkMethodologyLink';
import type { ModelGalleryCard } from '@/components/marketing/ModelsGallery';
import type { AppLocale } from '@/i18n/locales';

type ModelsCatalogRecommendedSectionProps = {
  locale: AppLocale;
  title: string;
  subtitle: string;
  cards: ModelGalleryCard[];
  allModelsLabel: string;
  statsLabels: {
    from: string;
    duration: string;
    resolution: string;
  };
};

export function ModelsCatalogRecommendedSection({
  locale,
  title,
  subtitle,
  cards,
  allModelsLabel,
  statsLabels,
}: ModelsCatalogRecommendedSectionProps) {
  return (
    <section id="recommended" className="scroll-mt-24 border-b border-hairline bg-bg py-6">
      <div className="container-page max-w-[1248px]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-text-primary">{title}</h2>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-text-secondary">{subtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <BenchmarkMethodologyLink locale={locale} variant="pill" />
            <a href="#models-grid" className="inline-flex items-center gap-2 text-xs font-semibold text-text-secondary hover:text-text-primary">
              {allModelsLabel}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </a>
          </div>
        </div>
        <ol className="studio-recommendation-list">
          {cards.map((card, index) => <li key={card.id}>
            <Link href={card.href} prefetch={false}>
              <span className="studio-recommendation-number" aria-hidden>{String(index + 1).padStart(2, '0')}</span>
              <div>
                <div className="studio-model-provider"><EngineIcon engine={{ id: card.engineId ?? card.id, label: card.label, brandId: card.brandId ?? undefined }} size={16} framed={false} /><span>{card.provider}</span></div>
                <h3>{card.label}</h3>
                <p className="studio-recommendation-description">{card.description}</p>
                <dl>
                  <div><dt>{statsLabels.duration}</dt><dd>{card.stats?.maxDuration ?? '—'}</dd></div>
                  <div><dt>{statsLabels.resolution}</dt><dd>{card.stats?.maxResolution ?? '—'}</dd></div>
                </dl>
              </div>
              <div className="studio-recommendation-price"><span>{statsLabels.from}</span><strong>{card.stats?.priceFrom ?? '—'}</strong><ArrowRight size={18} aria-hidden /></div>
            </Link>
          </li>)}
        </ol>
      </div>
    </section>
  );
}
