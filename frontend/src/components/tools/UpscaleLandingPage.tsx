import { resolveDictionary } from '@/lib/i18n/server';
import { ProductionReviewNotes } from './production/ProductionReviewNotes';
import { ToolWorkspacePreview } from '@/components/tools/landing/ToolWorkspacePreview';
import { QUICK_TOOL_ART } from './toolbox-art';
import Image from 'next/image';
import { ArrowRight, Maximize2 } from 'lucide-react';
import type { Dictionary } from '@/lib/i18n/types';
import { Link } from '@/i18n/navigation';
import { FAQSchema } from '@/components/seo/FAQSchema';
import { ButtonLink } from '@/components/ui/Button';
import { MarketingHeroImage } from '@/components/marketing/MarketingHeroImage';

const DETAIL_IMAGE_URL =
  'https://media.maxvideoai.com/rendersthumbs/301cc489-d689-477f-94c4-0b051deda0bc/7a859184-b718-4481-ae01-35efe66f4c9a.webp';

type UpscaleLandingContent = Dictionary['toolMarketing']['upscale'];

function serializeJsonLd(data: object) {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

function SectionIntro({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body?: string;
}) {
  return (
    <div className="max-w-3xl">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">{title}</h2>
      {body ? <p className="mt-3 text-sm leading-7 text-text-secondary sm:text-base">{body}</p> : null}
    </div>
  );
}

function HeroVisual({ imageAlt, note }: { imageAlt: string; note: string }) {
  return (
    <div className="relative aspect-[16/10] overflow-hidden rounded-[28px] shadow-[0_42px_120px_rgba(15,23,42,0.18)] dark:shadow-[0_42px_120px_rgba(0,0,0,0.42)]">
      <MarketingHeroImage
        src={QUICK_TOOL_ART['upscale-image']}
        alt={imageAlt}
        imageClassName="object-cover object-top"
        sizes="(max-width: 1024px) 100vw, 560px"
      />
      <span className="tool-art-note">{note}</span>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.00)_58%,rgba(255,255,255,0.10))] dark:bg-[linear-gradient(180deg,rgba(3,7,18,0.02),rgba(3,7,18,0.00)_58%,rgba(3,7,18,0.12))]" />
    </div>
  );
}

export async function UpscaleLandingPage({ content }: { content: UpscaleLandingContent }) {
  const {dictionary, locale}=await resolveDictionary();
  const c=dictionary.toolMarketing.journey;
  const faqEntries = content.faq.map((entry) => ({ question: entry.q, answer: entry.a }));
  const modelGuide = content.modelGuide;
  const serviceJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: content.meta.title,
    description: content.meta.description,
    serviceType: 'AI image and video upscale',
    provider: {
      '@type': 'Organization',
      name: 'Keyvo',
      url: 'https://app.keyvo.cn',
    },
    areaServed: 'Worldwide',
  };

  return (
    <div className="bg-bg tool-detail-page tool-upscale-page">
      <FAQSchema questions={faqEntries} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(serviceJsonLd) }} />

      <section className="border-b border-hairline bg-[linear-gradient(180deg,#ffffff,#f6f8fb)] dark:bg-[linear-gradient(180deg,#070b12,#0b111c)]">
        <div className="container-page grid min-h-[720px] max-w-6xl gap-10 py-16 lg:grid-cols-[minmax(0,0.86fr)_minmax(0,1fr)] lg:items-center lg:py-20">
          <div>
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-hairline bg-white px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-text-muted shadow-card dark:bg-white/[0.055] dark:shadow-[0_18px_54px_rgba(0,0,0,0.22)]">
              <Maximize2 className="h-3.5 w-3.5 text-brand" />
              {content.hero.badge}
            </div>
            <h1 className="mt-6 text-5xl font-semibold tracking-tight text-text-primary sm:text-6xl">
              {content.hero.title}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-text-secondary sm:text-lg">{content.hero.body}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <ButtonLink href="/app/tools/upscale" linkComponent={Link} size="lg">
                {content.hero.primaryCta}
                <ArrowRight className="h-4 w-4" />
              </ButtonLink>
              <ButtonLink href="/tools" linkComponent={Link} variant="outline" size="lg">
                {content.hero.secondaryCta}
              </ButtonLink>
            </div>

          </div>

          <HeroVisual imageAlt={`${content.hero.badge} — ${c.proof}`} note={c.proof} />
        </div>
      </section>

      <ProductionReviewNotes locale={locale} kind="upscale" />
      <ToolWorkspacePreview tool="upscale" title={content.hero.studioLabel} body={content.workflow.overlay.body} />
      <section className="section">
        <div className="container-page max-w-6xl stack-gap-md">
          <SectionIntro eyebrow={content.models.eyebrow} title={content.models.title} body={content.models.body} />

          <div className="overflow-hidden rounded-[22px] border border-hairline bg-surface shadow-card">
            <div className="grid gap-4 border-b border-hairline bg-bg px-5 py-5 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1fr)] lg:items-end">
              <SectionIntro eyebrow={modelGuide.eyebrow} title={modelGuide.title} body={modelGuide.body} />
              <div className="grid gap-2 sm:grid-cols-3">
                {content.hero.metrics.map((metric) => (
                  <div key={metric.label} className="rounded-[12px] border border-hairline bg-surface px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-muted">{metric.label}</p>
                    <p className="mt-1 text-sm font-semibold text-text-primary">{metric.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <details className="tool-model-details"><summary>{modelGuide.title}<span aria-hidden="true">+</span></summary><div className="overflow-x-auto">
              <table className="min-w-[920px] w-full border-collapse text-left">
                <thead className="bg-surface-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                  <tr>
                    <th scope="col" className="px-5 py-4">{modelGuide.columns.model}</th>
                    <th scope="col" className="px-5 py-4">{modelGuide.columns.bestFor}</th>
                    <th scope="col" className="px-5 py-4">{modelGuide.columns.quality}</th>
                    <th scope="col" className="px-5 py-4">{modelGuide.columns.price}</th>
                    <th scope="col" className="px-5 py-4">{modelGuide.columns.useWhen}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {modelGuide.rows.map((row) => (
                    <tr key={row.model} className="align-top">
                      <th scope="row" className="px-5 py-5 text-sm font-semibold text-text-primary">{row.model}</th>
                      <td className="px-5 py-5 text-sm leading-6 text-text-secondary">{row.bestFor}</td>
                      <td className="px-5 py-5 text-sm leading-6 text-text-secondary">{row.quality}</td>
                      <td className="px-5 py-5 text-sm leading-6 text-text-secondary">{row.price}</td>
                      <td className="px-5 py-5 text-sm leading-6 text-text-secondary">{row.useWhen}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div></details>
          </div>
        </div>
      </section>

      <section className="border-y border-hairline bg-surface section">
        <div className="container-page grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1fr)] lg:items-center">
          <div className="relative aspect-[16/11] overflow-hidden rounded-[28px] border border-hairline bg-bg shadow-card">
            <Image src={DETAIL_IMAGE_URL} alt="" fill sizes="(max-width: 1024px) 100vw, 560px" className="object-cover" />
            <div className="absolute inset-x-5 bottom-5 rounded-[20px] border border-white/20 bg-black/45 p-4 text-white backdrop-blur">
              <p className="text-sm font-semibold">{content.workflow.overlay.title}</p>
              <p className="mt-1 text-xs leading-5 text-slate-200">{content.workflow.overlay.body}</p>
            </div>
          </div>

          <div className="stack-gap-md">
            <SectionIntro eyebrow={content.workflow.eyebrow} title={content.workflow.title} />
            <div className="grid gap-3">
              {content.workflow.steps.map((step, index) => (
                <div key={step.title} className="grid grid-cols-[44px_minmax(0,1fr)] gap-4 rounded-[18px] border border-hairline bg-bg p-4 shadow-sm">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-brand text-sm font-semibold text-on-brand">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-text-primary">{step.title}</h3>
                    <p className="mt-1 text-sm leading-7 text-text-secondary">{step.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container-page max-w-5xl stack-gap-md">
          <SectionIntro eyebrow={content.faqSection.eyebrow} title={content.faqSection.title} />
          <div className="grid gap-3">
            {content.faq.map((entry) => <details key={entry.q} name="upscale-faq" className="tool-faq-item"><summary>{entry.q}<span aria-hidden="true">+</span></summary><p>{entry.a}</p></details>)}
          </div>
        </div>
      </section>
    </div>
  );
}
