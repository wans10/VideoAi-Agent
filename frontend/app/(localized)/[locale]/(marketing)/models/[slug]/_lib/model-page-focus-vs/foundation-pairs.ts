import type { FocusVsPair } from './types';
import { WAN_FOCUS_VS_PAIRS } from './wan-pairs';

export const FOUNDATION_FOCUS_VS_PAIRS: FocusVsPair[] = [
  {
    slugA: 'sora-2',
    slugB: 'sora-2-pro',
    nameA: 'Sora 2',
    nameB: 'Sora 2 Pro',
    copyA: {
      en: {
        title: 'Use Sora 2 when you want:',
        items: [
          'Fast idea → clip iteration',
          'Storyboards, concepts, UGC-style beats, short ads',
          'A quick first pass where 720p is enough',
        ],
      },
      fr: {
        title: 'Utilisez Sora 2 quand vous voulez :',
        items: [
          'Itération rapide d’idée → clip',
          'Storyboards, concepts, beats UGC, pubs courtes',
          'Un premier jet rapide où le 720p suffit',
        ],
      },
      es: {
        title: 'Usa Sora 2 cuando quieras:',
        items: [
          'Iteración rápida de idea → clip',
          'Storyboards, conceptos, beats estilo UGC, anuncios cortos',
          'Un primer borrador rápido cuando 720p es suficiente',
        ],
      },
      zh: {
        title: '在以下场景推荐使用 Sora 2：',
        items: [
          '快速创意验证与片段生成',
          '分镜、概念设计、UGC 风格短片及短视频广告',
          '720p 即可满足需求的初版预览',
        ],
      },
    },
    copyB: {
      en: {
        title: 'Use Sora 2 Pro when you need:',
        items: [
          'Higher resolution output',
          'More control for finals (including audio control in the UI)',
          'Cleaner final takes after you’ve validated the idea',
        ],
      },
      fr: {
        title: 'Utilisez Sora 2 Pro quand vous avez besoin :',
        items: [
          'Sortie en plus haute résolution',
          'Plus de contrôle pour les finals (y compris le contrôle audio dans l’UI)',
          'Plans finaux plus propres après validation de l’idée',
        ],
      },
      es: {
        title: 'Usa Sora 2 Pro cuando necesites:',
        items: [
          'Salida de mayor resolución',
          'Más control para finales (incluye control de audio en la UI)',
          'Tomas finales más limpias tras validar la idea',
        ],
      },
      zh: {
        title: '在以下场景推荐使用 Sora 2 Pro：',
        items: [
          '更高分辨率的成片输出',
          '更精准的成片控制（包括界面中的音频控制）',
          '创意验证后的高质量最终镜头',
        ],
      },
    },
  },
  {
    slugA: 'veo-3-1-fast',
    slugB: 'veo-3-1',
    nameA: 'Veo 3.1 Fast',
    nameB: 'Veo 3.1',
    copyA: {
      en: {
        title: 'Use Veo 3.1 Fast when you want:',
        items: [
          'Rapid concept testing and volume drafts',
          'Cheaper A/B ad variants and social loops',
          'Quick iteration before upgrading winners',
        ],
      },
      fr: {
        title: 'Utilisez Veo 3.1 Fast quand vous voulez :',
        items: [
          'Tests de concepts rapides et tests en volume',
          'Variantes A/B moins chères et boucles social',
          'Itération rapide avant de passer les meilleurs en version supérieure',
        ],
      },
      es: {
        title: 'Usa Veo 3.1 Fast cuando quieras:',
        items: [
          'Pruebas rápidas de concepto y borradores en volumen',
          'Variantes A/B más baratas y loops sociales',
          'Iteración rápida antes de pasar a los ganadores',
        ],
      },
      zh: {
        title: '在以下场景推荐使用 Veo 3.1 Fast：',
        items: [
          '快速概念测试与批量草稿生成',
          '高性价比的 A/B 广告变体与社交循环视频',
          '在升级高质版本前的快速试错迭代',
        ],
      },
    },
    copyB: {
      en: {
        title: 'Use Veo 3.1 when you need:',
        items: [
          'Higher-fidelity frames and polish',
          'Sound in the same pass when you want it',
          'More reliable follow-through on prompts',
        ],
      },
      fr: {
        title: 'Utilisez Veo 3.1 quand vous avez besoin :',
        items: [
          'Fidélité d’image plus élevée et finition',
          'Son dans le même rendu quand vous en avez besoin',
          'Suivi des prompts plus fiable',
        ],
      },
      es: {
        title: 'Usa Veo 3.1 cuando necesites:',
        items: [
          'Mayor fidelidad y pulido',
          'Sonido en la misma pasada cuando lo necesitas',
          'Seguimiento de prompts más fiable',
        ],
      },
      zh: {
        title: '在以下场景推荐使用 Veo 3.1：',
        items: [
          '更高保真度的画面质感与精细度',
          '同一次渲染中一并生成高质量音频',
          '更稳定、更精准的提示词遵循度',
        ],
      },
    },
  },
  ...WAN_FOCUS_VS_PAIRS,
];
