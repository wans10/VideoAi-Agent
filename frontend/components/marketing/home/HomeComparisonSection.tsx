import { Link } from '@/i18n/navigation';
import { BenchmarkMethodologyLink } from '@/components/marketing/BenchmarkMethodologyLink';
import type { AppLocale } from '@/i18n/locales';
import type { HomeComparisonData } from './home-comparison-types';
import { HomeComparisonPreview } from './HomeComparisonPreview';

const COPY = {
 en: { eyebrow:'Find your video model', title:'Compare before you create.', body:'Explore all video models and compare quality, features and pricing. Choose the right model for your next video.', cta:'Compare all models', generate:'Create with Wan 3', method:'Editorial ratings · /10' },
 fr: { eyebrow:'Trouvez votre modèle vidéo', title:'Comparez avant de créer.', body:'Explorez tous les modèles vidéo et comparez la qualité, les fonctionnalités et les tarifs. Choisissez celui qui convient à votre prochaine vidéo.', cta:'Comparer tous les modèles', generate:'Créer avec Wan 3', method:'Évaluations éditoriales · /10' },
 es: { eyebrow:'Encuentra tu modelo de video', title:'Compara antes de crear.', body:'Explora todos los modelos de video y compara calidad, funciones y precios. Elige el adecuado para tu próximo video.', cta:'Comparar todos los modelos', generate:'Crear con Wan 3', method:'Evaluaciones editoriales · /10' },
 zh: { eyebrow:'模型效果对比',title:'生成前对比各模型表现。',body:'选定基准模型，多维度横向PK。对比综合评分与各项指标，还可打开完整对比页查看完整规格与定价。',cta:'查看对比详情',generate:'用 Wan 3 创作',method:'专业评测打分 · 满分 10 分' },
};
export function HomeComparisonSection({ locale, scores }: { locale: AppLocale; scores: HomeComparisonData }) {
 const copy = COPY[locale] ?? COPY.en;
 return <article id="compare" className="studio-comparison">
  <header className="studio-comparison-heading"><div><p className="editorial-eyebrow">{copy.eyebrow}</p><h2>{copy.title}</h2></div><div><p>{copy.body}</p>
   <div className="comparison-discovery-actions">
    <Link currentLocale={locale} className="comparison-hub-cta" href="/ai-video-engines" prefetch={false} data-analytics-event="comparison_card_click" data-analytics-cta-name="all_comparisons" data-analytics-cta-location="comparison_intro">{copy.cta}<span aria-hidden>↗</span></Link>
    <Link currentLocale={locale} className="comparison-generate-link" href={{pathname:'/app',query:{engine:'wan-3'}}} prefetch={false}>{copy.generate}<span aria-hidden>→</span></Link>
   </div>
   <p className="comparison-editorial-label">{copy.method}</p></div></header>
  <HomeComparisonPreview locale={locale} data={scores} methodology={<BenchmarkMethodologyLink locale={locale}/>}/>
 </article>;
}
