import type { ReactNode } from 'react';
import { buildCompareRoute } from '@/lib/compare-hub/pairs';
import { Link } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/locales';
import { HomeComparisonScores } from './HomeComparisonScores.client';
import type { HomeComparisonData } from './home-comparison-types';

const COPY = {
 en: { overall:'Editorial score', criterion:'Criterion', excerpt:'criteria scored · 3 shown here', summary:'Overall score: average of prompt adherence, motion and temporal consistency, using the same calculation as the full comparison. Models were scored separately; these are not same-prompt test results.', labels:['Follows your prompt','Visual quality','Natural movement'] },
 fr: { overall:'Note éditoriale', criterion:'Critère', excerpt:'critères notés · 3 affichés ici', summary:'Note globale : moyenne du respect des instructions, du mouvement et de la cohérence temporelle, comme dans le comparatif complet. Les modèles ont été évalués séparément, pas avec des prompts identiques.', labels:['Suit vos instructions','Qualité visuelle','Mouvements naturels'] },
 es: { overall:'Nota editorial', criterion:'Criterio', excerpt:'criterios evaluados · 3 mostrados aquí', summary:'Nota global: promedio del seguimiento de instrucciones, el movimiento y la coherencia temporal, igual que en la comparación completa. Los modelos se evaluaron por separado, no con prompts idénticos.', labels:['Sigue tus instrucciones','Calidad visual','Movimiento natural'] },
 zh: { overall:'编辑评分', criterion:'评分项', excerpt:'项评分 · 此处展示 3 项', summary:'综合评分：提示词遵循度、动作表现与时间一致性的平均值，计算方式与完整对比相同。各模型分别评分，并非相同提示词下的测试结果。', labels:['遵循你的提示词','画面质量','动作自然度'] },
};

export function HomeComparisonPreview({ locale, data, methodology }: { locale: AppLocale; data: HomeComparisonData; methodology: ReactNode }) {
  const copy = COPY[locale];
  const right = data.opponents[0];
  if (!right) return null;
  const route = buildCompareRoute(data.left.slug, right.slug);
  const tips = { en: ['How closely the result follows the instructions.', 'Detail, lighting and visible artifacts.', 'How natural and coherent the movement looks.'], fr: ['La fidélité du résultat aux instructions données.', 'Détails, lumière et défauts visibles.', 'Le naturel et la cohérence des mouvements.'], es: ['Qué tanto respeta el resultado las instrucciones.', 'Detalle, luz y defectos visibles.', 'Qué tan natural y coherente se ve el movimiento.'], zh: ['结果与指令的贴合程度。', '细节、光线与可见瑕疵。', '动作看起来是否自然、连贯。'] }[locale];
  const metrics = copy.labels.map((label, i) => ({id:String(i), label, tooltip:tips[i], leftValue:data.left.scores[i] ?? null, rightValue:right.scores[i] ?? null}));
  return <div className="choice-scorecard comparison-preview">
    <p className="comparison-example-label">{{en:'Example comparison',fr:'Exemple de comparatif',es:'Ejemplo de comparación',zh:'对比示例'}[locale]} <span aria-hidden>·</span> {data.left.name} vs {right.name}</p>
    <HomeComparisonScores metrics={metrics} label={`${Math.min(data.left.criteriaCount, right.criteriaCount)} ${copy.excerpt}`} right={right} overallLabel={copy.overall} leftOverall={data.left.overall} leftName={data.left.name} leftLogo={data.left.logo} criterionLabel={copy.criterion}/>

    <Link currentLocale={locale} className="comparison-active-link" href={{pathname:'/ai-video-engines/[slug]',params:{slug:route.slug},query:route.order ? {order:route.order} : undefined}} prefetch={false} data-analytics-event="comparison_card_click" data-analytics-cta-name={route.slug} data-analytics-cta-location="comparison_intro">{{en:'Open this comparison',fr:'Voir ce comparatif',es:'Ver esta comparación',zh:'查看此对比'}[locale]} <span aria-hidden>↗</span></Link>
    <div className="comparison-footnotes"><details className="comparison-global-note"><summary>{ {en:'How is the score calculated?',fr:'Comment la note est-elle calculée ?',es:'¿Cómo se calcula la nota?',zh:'评分是如何计算的？'}[locale] }</summary><p>{copy.summary}</p></details>{methodology}</div>
  </div>;
}
