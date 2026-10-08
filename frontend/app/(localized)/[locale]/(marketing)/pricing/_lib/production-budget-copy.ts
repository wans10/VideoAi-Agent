import type { AppLocale } from '@/i18n/locales';
const en = {
  title: 'Build a shot budget in three passes.', note: 'A planning guide. These are not package prices or a saved project budget.',
  columns: ['Production pass', 'What to decide', 'What to budget for'],
  rows: [
    ['Look development', 'Select a representative shot and settle the visual direction.', 'Reference images and short test generations.'],
    ['Shot production', 'Choose duration, framing, model and required audio for each shot.', 'Each generation, including successful takes you choose not to use.'],
    ['Finishing', 'Review the chosen takes at the intended delivery size.', 'Any separate upscaling, subject separation or audio work.'],
  ],
  rule: 'A ten-second final edit may require several generations. Estimate from the planned attempts, not only the finished runtime.',
  prices: 'Compare generation scenarios', terms: 'Credits and refunds',
};
type Copy = typeof en;
const zh: Copy = {
  title: '分三轮安排镜头预算。', note: '用于制作筹备的参考，不是套餐报价或已保存的项目预算。', columns: ['制作轮次', '先决定什么', '为哪些工作留预算'],
  rows: [['视觉试拍', '挑一个有代表性的镜头，确认视觉方向。', '参考图与短片段的试生成。'], ['镜头制作', '逐镜确定时长、构图、模型与所需音频。', '每次生成，包括成功生成但最终未采用的镜头。'], ['后期整理', '按目标交付尺寸审看选定的镜头。', '另行使用的超分辨率、主体分离或音频处理。']],
  rule: '成片十秒，可能需要多次生成。请按计划尝试的次数估算，而不只看成片时长。', prices: '按生成场景查价', terms: '余额与退款规则',
};
const fr: Copy = {
  title: 'Préparez le budget en trois passes.', note: 'Un guide de préparation, pas un forfait ni un budget de projet enregistré.', columns: ['Passe de production', 'Décision à prendre', 'Dépenses à prévoir'],
  rows: [['Recherche visuelle', 'Choisir un plan représentatif et fixer la direction visuelle.', 'Images de référence et courts essais.'], ['Production des plans', 'Définir durée, cadrage, modèle et son pour chaque plan.', 'Chaque génération, y compris les prises réussies mais non retenues.'], ['Finition', 'Examiner les prises retenues à la taille de diffusion.', 'Agrandissement, détourage ou travail audio séparés.']],
  rule: 'Dix secondes montées peuvent demander plusieurs générations. Estimez les essais prévus, pas seulement la durée finale.', prices: 'Comparer les scénarios', terms: 'Crédits et remboursements',
};
const es: Copy = {
  title: 'Organiza el presupuesto en tres pasadas.', note: 'Una guía de planificación, no un paquete ni un presupuesto guardado.', columns: ['Fase de producción', 'Qué decidir', 'Qué presupuestar'],
  rows: [['Desarrollo visual', 'Elegir un plano representativo y fijar la dirección visual.', 'Referencias y generaciones cortas de prueba.'], ['Producción de planos', 'Definir duración, encuadre, modelo y audio por plano.', 'Cada generación, incluidas las tomas correctas que no se utilicen.'], ['Acabado', 'Revisar las tomas elegidas al tamaño de entrega.', 'Ampliación, separación del sujeto o trabajo de audio por separado.']],
  rule: 'Diez segundos de montaje pueden requerir varias generaciones. Estima los intentos previstos, no solo la duración final.', prices: 'Comparar escenarios', terms: 'Créditos y reembolsos',
};
export function getProductionBudgetCopy(locale: AppLocale) { return ({ en, zh, fr, es })[locale]; }
