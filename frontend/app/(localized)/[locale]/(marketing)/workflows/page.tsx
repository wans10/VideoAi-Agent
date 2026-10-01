import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { resolveDictionary } from '@/lib/i18n/server';
import { ButtonLink } from '@/components/ui/Button';
import type { AppLocale } from '@/i18n/locales';
import { buildSlugMap } from '@/lib/i18nSlugs';
import { buildSeoMetadata } from '@/lib/seo/metadata';
import { getExamplesHref } from '@/lib/examples-links';
import { getTranslations } from 'next-intl/server';

const WORKFLOWS_SLUG_MAP = buildSlugMap('workflows');

export const revalidate = 600;

type WorkflowExampleEntry = { label: string; slug: string; brandId: string };
type WorkflowStep = { title: string; description: string };
type WorkflowFeature = { title: string; description: string };
type WorkflowFaq = { question: string; answer: string };

const FALLBACK_EXAMPLES: WorkflowExampleEntry[] = [
  { label: 'Seedance 2.0', slug: 'seedance-2-0', brandId: 'bytedance' },
  { label: 'Seedance 2.0 Fast', slug: 'seedance-2-0-fast', brandId: 'bytedance' },
  { label: 'Kling 3 Pro', slug: 'kling-3-pro', brandId: 'kling' },
  { label: 'Veo 3.1', slug: 'veo-3-1', brandId: 'google-veo' },
  { label: 'LTX 2.3 Fast', slug: 'ltx-2-3-fast', brandId: 'lightricks' },
  { label: 'Kling 3 Standard', slug: 'kling-3-standard', brandId: 'kling' },
  { label: 'MiniMax H3', slug: 'minimax-h3', brandId: 'minimax' },
  { label: 'Pika Text-to-Video', slug: 'pika-text-to-video', brandId: 'pika' },
  { label: 'Wan 2.6', slug: 'wan-2-6', brandId: 'wan' },
  { label: 'MiniMax Hailuo 02', slug: 'minimax-hailuo-02-text', brandId: 'minimax' },
];

const WORKFLOW_FALLBACKS: Record<
  AppLocale,
  {
    hero: { title: string; subtitle: string; primaryCta: string; secondaryCta: string; tertiaryCta: string };
    how: { title: string; steps: WorkflowStep[] };
    capabilities: { title: string; items: WorkflowFeature[] };
    examples: { title: string; subtitle: string; viewLabel: string };
    faq: { title: string; items: WorkflowFaq[] };
    cta: { title: string; subtitle: string; primaryCta: string; secondaryCta: string };
  }
> = {
  en: {
    hero: {
      title: 'Workflows',
      subtitle: 'Your repeatable AI video workflow: pick an engine, set the shot, preview price, and generate variants you can reuse.',
      primaryCta: 'Generate now',
      secondaryCta: 'Browse examples',
      tertiaryCta: 'Compare models',
    },
    how: {
      title: 'How it works (live)',
      steps: [
        { title: 'Choose engine & mode', description: 'Text-to-video, image-to-video, plus references when supported.' },
        { title: 'Set shot settings', description: 'Duration, aspect, resolution, iterations, and audio when available.' },
        { title: 'Write prompt + add references', description: 'Add a prompt and optional reference assets.' },
        { title: 'Generate + review variants', description: 'Preview a grid, copy prompts, and download per clip.' },
      ],
    },
    capabilities: {
      title: 'What you can do today',
      items: [
        { title: 'Live price-before-you-generate', description: 'The price chip updates as settings change.' },
        { title: 'Generate 1-4 variants per run', description: 'Iterations create multiple takes in one go.' },
        { title: 'Copy prompt from any result', description: 'Reuse prompts directly from past takes.' },
        { title: 'Continue / Refine', description: 'Prefill settings from a chosen take and iterate.' },
        { title: 'Per-clip downloads', description: 'Download each clip individually.' },
        { title: 'History you can revisit', description: 'Find runs in /jobs and the public gallery.' },
      ],
    },
    examples: {
      title: 'Examples (real prompts you can reuse)',
      subtitle: 'Open an example -> reuse the prompt -> run it in /app.',
      viewLabel: 'View',
    },
    faq: {
      title: 'FAQ (live)',
      items: [
        { question: 'How does "price before you generate" work?', answer: 'The price chip updates as you change engine, duration, and resolution. You are charged only on success.' },
        { question: 'What do iterations mean?', answer: 'Iterations generate 1-4 variants in a single run using the same settings.' },
        { question: 'Why do duration/resolution/aspect options differ by engine?', answer: 'Each engine exposes its own caps, so the UI only shows what that engine supports.' },
        { question: 'When is audio available?', answer: 'Audio appears only on engines that support it, with a toggle when available.' },
        { question: 'Where do I find past runs?', answer: 'Open /jobs for your history and /examples for curated prompts you can reuse.' },
      ],
    },
    cta: {
      title: 'Start generating in seconds',
      subtitle: 'Pick an engine, set your shot, preview price, generate variants.',
      primaryCta: 'Generate now',
      secondaryCta: 'Browse examples',
    },
  },
  fr: {
    hero: {
      title: 'Flux de travail',
      subtitle: 'Votre workflow vidéo IA reproductible : choisissez un modèle, réglez le plan, prévisualisez le prix et générez des variantes réutilisables.',
      primaryCta: 'Générer maintenant',
      secondaryCta: 'Voir des exemples',
      tertiaryCta: 'Comparer les modèles',
    },
    how: {
      title: 'Comment ça marche (en direct)',
      steps: [
        { title: 'Choisir modèle et mode', description: 'Texte vers vidéo, image vers vidéo, plus références quand prises en charge.' },
        { title: 'Régler les paramètres du plan', description: 'Durée, format, résolution, itérations et audio quand disponible.' },
        { title: 'Écrire le prompt + ajouter des références', description: 'Ajoutez un prompt et des assets de référence optionnels.' },
        { title: 'Générer + revoir les variantes', description: 'Aperçu en grille, copier les prompts et télécharger par clip.' },
      ],
    },
    capabilities: {
      title: "Ce que vous pouvez faire aujourd'hui",
      items: [
        { title: 'Prix avant génération en direct', description: 'Le badge de prix se met à jour quand les réglages changent.' },
        { title: 'Générer 1-4 variantes par exécution', description: 'Les itérations créent plusieurs prises en une seule exécution.' },
        { title: 'Copier le prompt depuis un résultat', description: 'Réutilisez les prompts directement depuis les prises précédentes.' },
        { title: 'Continuer / Affiner', description: "Pré-remplit les réglages depuis une prise choisie et permet d'itérer." },
        { title: 'Téléchargements par clip', description: 'Téléchargez chaque clip individuellement.' },
        { title: 'Historique à revisiter', description: 'Retrouvez vos exécutions dans /jobs et la galerie publique.' },
      ],
    },
    examples: {
      title: 'Exemples (prompts réels réutilisables)',
      subtitle: 'Ouvrez un exemple -> réutilisez le prompt -> lancez-le dans /app.',
      viewLabel: 'Voir',
    },
    faq: {
      title: 'FAQ (en direct)',
      items: [
        { question: 'Comment fonctionne "prix avant génération" ?', answer: "Le badge de prix se met à jour quand vous changez de modèle, durée et résolution. Vous n'êtes facturé qu'en cas de succès." },
        { question: 'Que signifient les itérations ?', answer: 'Les itérations génèrent 1-4 variantes en une seule exécution avec les mêmes réglages.' },
        { question: 'Pourquoi les options de durée/résolution/format varient selon le modèle ?', answer: "Chaque modèle expose ses propres limites, donc l'interface n'affiche que ce qu'il supporte." },
        { question: "Quand l'audio est-il disponible ?", answer: "L'audio apparaît seulement sur les modèles qui le supportent, avec un interrupteur quand disponible." },
        { question: 'Où trouver mes exécutions passées ?', answer: 'Ouvrez /jobs pour votre historique et /examples pour des prompts réutilisables.' },
      ],
    },
    cta: {
      title: 'Commencer à générer en quelques secondes',
      subtitle: 'Choisissez un modèle, réglez votre plan, prévisualisez le prix, générez des variantes.',
      primaryCta: 'Générer maintenant',
      secondaryCta: 'Voir des exemples',
    },
  },
  es: {
    hero: {
      title: 'Flujos de trabajo',
      subtitle: 'Tu flujo de trabajo de video IA repetible: elige un motor, ajusta el plano, previsualiza el precio y genera variantes reutilizables.',
      primaryCta: 'Generar ahora',
      secondaryCta: 'Ver ejemplos',
      tertiaryCta: 'Comparar modelos',
    },
    how: {
      title: 'Cómo funciona (en vivo)',
      steps: [
        { title: 'Elegir motor y modo', description: 'Texto a video, imagen a video y referencias cuando se admiten.' },
        { title: 'Configurar el plano', description: 'Duración, formato, resolución, iteraciones y audio cuando está disponible.' },
        { title: 'Escribir el prompt + agregar referencias', description: 'Agrega un prompt y assets de referencia opcionales.' },
        { title: 'Generar y revisar variantes', description: 'Vista en grilla, copia prompts y descarga por clip.' },
      ],
    },
    capabilities: {
      title: 'Lo que puedes hacer hoy',
      items: [
        { title: 'Precio antes de generar en vivo', description: 'El chip de precio se actualiza al cambiar la configuración.' },
        { title: 'Genera 1-4 variantes por ejecución', description: 'Las iteraciones crean varias tomas en una sola ejecución.' },
        { title: 'Copia el prompt de cualquier resultado', description: 'Reutiliza prompts directamente de tomas anteriores.' },
        { title: 'Continuar / Refinar', description: 'Precarga ajustes de una toma elegida y sigue iterando.' },
        { title: 'Descargas por clip', description: 'Descarga cada clip de forma individual.' },
        { title: 'Historial que puedes revisar', description: 'Encuentra tus ejecuciones en /jobs y la galería pública.' },
      ],
    },
    examples: {
      title: 'Ejemplos (prompts reales que puedes reutilizar)',
      subtitle: 'Abre un ejemplo -> reutiliza el prompt -> ejecútalo en /app.',
      viewLabel: 'Ver',
    },
    faq: {
      title: 'FAQ (en vivo)',
      items: [
        { question: '¿Cómo funciona "precio antes de generar"?', answer: 'El chip de precio se actualiza cuando cambias motor, duración y resolución. Solo se cobra si el render se completa.' },
        { question: '¿Qué significan las iteraciones?', answer: 'Las iteraciones generan 1-4 variantes en una sola ejecución con los mismos ajustes.' },
        { question: '¿Por qué las opciones de duración/resolución/formato varían según el motor?', answer: 'Cada motor expone sus propios límites, por eso la interfaz solo muestra lo que admite.' },
        { question: '¿Cuándo hay audio disponible?', answer: 'El audio aparece solo en motores que lo soportan, con un interruptor cuando está disponible.' },
        { question: '¿Dónde encuentro ejecuciones pasadas?', answer: 'Abre /jobs para tu historial y /examples para prompts reutilizables.' },
      ],
    },
    cta: {
      title: 'Empieza a generar en segundos',
      subtitle: 'Elige un motor, configura el plano, previsualiza el precio y genera variantes.',
      primaryCta: 'Generar ahora',
      secondaryCta: 'Ver ejemplos',
    },
  },
  zh: {
    hero: {
      title: '创作工作流',
      subtitle: '可复现的高效 AI 视频工作流：挑选生成引擎、设定镜头参数、实时预览价格，并生成可重用的多个候选变体。',
      primaryCta: '立即开始生成',
      secondaryCta: '浏览精选案例',
      tertiaryCta: '对比主流模型',
    },
    how: {
      title: '工作原理（实时生成）',
      steps: [
        { title: '选择引擎与生成模式', description: '文生视频、图生视频，以及支持时的参考资产输入。' },
        { title: '设定镜头关键参数', description: '时长、画面比例、清晰度、变体数量以及音频开关。' },
        { title: '编写提示词 + 添加参考', description: '输入细致的画面描述，可按需上传参考图片或视频。' },
        { title: '生成并评估不同变体', description: '以网格视图实时预览，一键复制提示词并按镜头下载。' },
      ],
    },
    capabilities: {
      title: '现已支持的核心功能',
      items: [
        { title: '生成前价格实时可见', description: '调整模型、时长或分辨率时，价格标签实时联动更新。' },
        { title: '单次运行生成 1-4 个变体', description: '使用相同参数一次性渲染多个不同随机种子的候选版本。' },
        { title: '一键复用任意生成提示词', description: '直接从满意的历史镜头中复制并改良提示词。' },
        { title: '无缝继续 / 精细微调', description: '一键回填选定镜头的全部参数，持续迭代生成。' },
        { title: '按独立镜头导出下载', description: '高质量无水印独立下载每个生成的视频片段。' },
        { title: '完整的生成历史记录', description: '在任务中心与作品库中随时回顾过往生成的作品。' },
      ],
    },
    examples: {
      title: '可复用的真实提示词案例',
      subtitle: '查看精选案例 -> 复制提示词 -> 在工作区中即刻生成。',
      viewLabel: '查看',
    },
    faq: {
      title: '常见问题解答',
      items: [
        { question: '“生成前明确价格”是如何运作的？', answer: '当你切换模型、修改时长或分辨率时，页面上的价格标签会实时重算。只有在生成成功完成时才会扣费。' },
        { question: '生成变体（Iterations）代表什么？', answer: '它允许你在单次任务中使用相同的参数配置同时生成 1 到 4 个不同风格细节的候选视频。' },
        { question: '为什么不同模型的时长和分辨率选项不尽相同？', answer: '每个 AI 视频引擎的底层技术能力不同，界面会智能展示该模型当前实际支持的可用参数。' },
        { question: '什么时候可以生成包含音频的视频？', answer: '音频控制项仅在原生支持音效的模型上显示，开启后将同时渲染对齐的声音与画面。' },
        { question: '我可以在哪里查看我之前生成的视频？', answer: '进入任务中心（/jobs）查看个人历史生成，或在案例库（/examples）寻找可复用的提示词灵感。' },
      ],
    },
    cta: {
      title: '数秒内开启你的视频创作',
      subtitle: '选择引擎、设定镜头、查看价格、生成专属视频变体。',
      primaryCta: '立即开始生成',
      secondaryCta: '查看精选案例',
    },
  },
};

function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export async function generateMetadata(props: { params: Promise<{ locale: AppLocale }> }): Promise<Metadata> {
  const params = await props.params;
  const locale = params.locale;
  const t = await getTranslations({ locale, namespace: 'workflows.meta' });
  return buildSeoMetadata({
    locale,
    title: t('title'),
    description: t('description'),
    hreflangGroup: 'workflows',
    slugMap: WORKFLOWS_SLUG_MAP,
    imageAlt: 'Workflows - VideoAI',
    robots: {
      index: true,
      follow: true,
    },
  });
}

export default async function WorkflowsPage(props: { params: Promise<{ locale: AppLocale }> }) {
  const params = await props.params;
  const locale = params.locale;
  const { dictionary } = await resolveDictionary({ locale });
  const content = dictionary.workflows;
  const fallback = WORKFLOW_FALLBACKS[locale] ?? WORKFLOW_FALLBACKS.en;
  const steps: WorkflowStep[] =
    Array.isArray(content.how?.steps) && content.how.steps.length ? content.how.steps : fallback.how.steps;
  const features: WorkflowFeature[] =
    Array.isArray(content.capabilities?.items) && content.capabilities.items.length
      ? content.capabilities.items
      : fallback.capabilities.items;
  const exampleEntries: WorkflowExampleEntry[] =
    Array.isArray(content.examples?.items) && content.examples.items.length ? content.examples.items : FALLBACK_EXAMPLES;
  const faqItems: WorkflowFaq[] =
    Array.isArray(content.faq?.items) && content.faq.items.length ? content.faq.items : fallback.faq.items;

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map((entry) => ({
      '@type': 'Question',
      name: entry.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: entry.answer,
      },
    })),
  };

  return (
    <div className="container-page max-w-5xl section">
      <div className="stack-gap-xl">
        <header className="stack-gap-sm">
          <h1 className="text-3xl font-semibold text-text-primary sm:text-5xl">
            {content.hero?.title ?? fallback.hero.title}
          </h1>
          <p className="sm:max-w-[62ch] text-sm text-text-muted">
            {content.hero?.subtitle ?? fallback.hero.subtitle}
          </p>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/app" prefetch={false} size="lg" className="shadow-card" linkComponent={Link}>
              {content.hero?.primaryCta ?? fallback.hero.primaryCta}
            </ButtonLink>
            <ButtonLink href={{ pathname: '/examples' }} variant="outline" size="lg" linkComponent={Link}>
              {content.hero?.secondaryCta ?? fallback.hero.secondaryCta}
            </ButtonLink>
            <Link
              href={{ pathname: '/models' }}
              className="text-sm font-semibold text-text-secondary underline underline-offset-4 transition hover:text-text-primary"
            >
              {content.hero?.tertiaryCta ?? fallback.hero.tertiaryCta}
            </Link>
          </div>
        </header>

        <section id="how-it-works" className="rounded-2xl border border-hairline bg-surface/80 p-6 shadow-card">
          <div className="stack-gap-sm">
            <h2 className="text-xl font-semibold text-text-primary sm:text-2xl">
              {content.how?.title ?? fallback.how.title}
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((step, index) => (
                <div key={step.title} className="rounded-2xl border border-hairline bg-surface p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-hairline text-xs font-semibold text-text-muted">
                      {index + 1}
                    </span>
                    <h3 className="text-sm font-semibold text-text-primary">{step.title}</h3>
                  </div>
                  <p className="mt-2 text-sm text-text-secondary">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="what-you-can-do" className="rounded-2xl border border-hairline bg-surface/80 p-6 shadow-card">
          <div className="stack-gap-sm">
            <h2 className="text-xl font-semibold text-text-primary sm:text-2xl">
              {content.capabilities?.title ?? fallback.capabilities.title}
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <div key={feature.title} className="rounded-2xl border border-hairline bg-surface p-4">
                  <h3 className="text-sm font-semibold text-text-primary">{feature.title}</h3>
                  <p className="mt-2 text-sm text-text-secondary">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="examples" className="rounded-2xl border border-hairline bg-surface/80 p-6 shadow-card">
          <div className="stack-gap-sm">
            <h2 className="text-xl font-semibold text-text-primary sm:text-2xl">
              {content.examples?.title ?? fallback.examples.title}
            </h2>
            <p className="text-sm text-text-secondary">
              {content.examples?.subtitle ?? fallback.examples.subtitle}
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {exampleEntries.map((entry) => {
                const accentId = entry.brandId || 'google';
                const exampleHref = getExamplesHref(entry.slug) ?? { pathname: '/examples' };
                return (
                <Link
                  key={entry.slug}
                  href={exampleHref}
                  className="group flex items-center justify-between rounded-2xl border border-hairline bg-surface px-4 py-3 text-left transition hover:bg-surface-2 hover:shadow-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <span className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                    <span
                      aria-hidden
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: `var(--engine-${accentId}-bg)` }}
                    />
                    {entry.label}
                  </span>
                  <span className="text-xs text-text-muted transition group-hover:text-text-primary">
                    {(content.examples as { viewLabel?: string } | undefined)?.viewLabel ?? fallback.examples.viewLabel} &rarr;
                  </span>
                </Link>
              );
              })}
            </div>
          </div>
        </section>

        <section id="faq" className="rounded-2xl border border-hairline bg-surface/80 p-6 shadow-card">
          <div className="stack-gap-sm">
            <h2 className="text-xl font-semibold text-text-primary sm:text-2xl">
              {content.faq?.title ?? fallback.faq.title}
            </h2>
            <div className="space-y-3">
              {faqItems.map((entry) => (
                <details
                  key={entry.question}
                  className="group rounded-2xl border border-hairline bg-surface px-4 py-3"
                >
                  <summary className="cursor-pointer list-none text-sm font-semibold text-text-primary">
                    {entry.question}
                  </summary>
                  <p className="mt-2 text-sm text-text-secondary">{entry.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-hairline bg-surface/80 p-6 shadow-card">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-text-primary sm:text-2xl">
                {content.cta?.title ?? fallback.cta.title}
              </h2>
              <p className="mt-2 text-sm text-text-secondary">
                {content.cta?.subtitle ?? fallback.cta.subtitle}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/app" prefetch={false} size="lg" className="shadow-card" linkComponent={Link}>
                {content.cta?.primaryCta ?? fallback.cta.primaryCta}
              </ButtonLink>
              <ButtonLink href={{ pathname: '/examples' }} variant="outline" size="lg" linkComponent={Link}>
                {content.cta?.secondaryCta ?? fallback.cta.secondaryCta}
              </ButtonLink>
            </div>
          </div>
        </section>
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqJsonLd) }} />
    </div>
  );
}
