import type { FocusVsPair } from './types';

export const SPECIALIZED_FOCUS_VS_PAIRS: FocusVsPair[] = [
  {
    slugA: 'pika-text-to-video',
    slugB: 'ltx-2-3-fast',
    nameA: 'Pika 2.2',
    nameB: 'LTX 2.3 Fast',
    onlyFor: ['pika-text-to-video'],
    copyA: {
      en: {
        title: 'Use Pika 2.2 when you want:',
        items: [
          'Stylized, social-first motion',
          'Fast loops and playful variants',
          'Edit-friendly silent clips',
        ],
      },
      fr: {
        title: 'Utilisez Pika 2.2 quand vous voulez :',
        items: [
          'Motion stylisé, social-first',
          'Boucles rapides et variantes ludiques',
          'Clips silencieux faciles à monter',
        ],
      },
      es: {
        title: 'Usa Pika 2.2 cuando quieras:',
        items: [
          'Motion estilizado y social-first',
          'Loops rápidos y variantes lúdicas',
          'Clips silenciosos fáciles de editar',
        ],
      },
      zh: {
        title: '在以下场景推荐使用 Pika 2.2：',
        items: [
          '风格化、专为社交媒体打造的动效呈现',
          '快速循环动画与趣味多变的视觉效果',
          '便于后期剪辑合成的无声短视频素材',
        ],
      },
    },
    copyB: {
      en: {
        title: 'Use LTX 2.3 Fast when you need:',
        items: [
          'A broader draft route',
          'Text or image workflows',
          'Higher-resolution review options',
        ],
      },
      fr: {
        title: 'Utilisez LTX 2.3 Fast quand vous avez besoin :',
        items: [
          'Une route brouillon plus large',
          'Workflows texte ou image',
          'Options de revue plus haute résolution',
        ],
      },
      es: {
        title: 'Usa LTX 2.3 Fast cuando necesites:',
        items: [
          'Una ruta draft más amplia',
          'Flujos desde texto o imagen',
          'Opciones de revisión con más resolución',
        ],
      },
      zh: {
        title: '在以下场景推荐使用 LTX 2.3 Fast：',
        items: [
          '适用范围更广的草稿探索路径',
          '灵活支持文本生视频与图生视频工作流',
          '支持更高分辨率的预览与快速审核',
        ],
      },
    },
  },
  {
    slugA: 'minimax-hailuo-02-text',
    slugB: 'ltx-2-fast',
    nameA: 'Hailuo 02',
    nameB: 'LTX 2 Fast',
    onlyFor: ['minimax-hailuo-02-text'],
    copyA: {
      en: {
        title: 'Use Hailuo 02 when you want:',
        items: [
          'Physics-heavy motion drafts',
          'Fast visual iteration on a budget',
          'Quick storyboard animatics',
        ],
      },
      fr: {
        title: 'Utilisez Hailuo 02 quand vous voulez :',
        items: [
          'Tests motion axés physique',
          'Itération visuelle rapide à petit budget',
          'Animatics storyboard rapides',
        ],
      },
      es: {
        title: 'Usa Hailuo 02 cuando quieras:',
        items: [
          'Borradores de motion con física',
          'Iteración visual rápida con bajo presupuesto',
          'Animatics de storyboard rápidos',
        ],
      },
      zh: {
        title: '在以下场景推荐使用 Hailuo 02：',
        items: [
          '具备复杂物理特性的动态效果草稿',
          '预算友好的快速视觉构思迭代',
          '快速生成动态分镜预览动效',
        ],
      },
    },
    copyB: {
      en: {
        title: 'Use LTX 2 Fast when you need:',
        items: [
          'More room per clip for pacing',
          'Drafts that stay closer to camera intent',
          'An easy upgrade path to LTX 2.3 Pro',
        ],
      },
      fr: {
        title: 'Utilisez LTX 2 Fast quand vous avez besoin :',
        items: [
          'Plus de durée par clip pour le pacing',
          'Tests plus proches de l’intention caméra',
          'Chemin simple vers LTX 2.3 Pro',
        ],
      },
      es: {
        title: 'Usa LTX 2 Fast cuando necesites:',
        items: [
          'Más duración por clip para el pacing',
          'Borradores más cercanos a la intención de cámara',
          'Camino fácil hacia LTX 2.3 Pro',
        ],
      },
      zh: {
        title: '在以下场景推荐使用 LTX 2 Fast：',
        items: [
          '单镜头预留更多时长，便于精准把控节奏',
          '生成结果更能忠实还原运镜意图',
          '可轻松平滑升级至更高画质的 LTX 2.3 Pro',
        ],
      },
    },
  },
];
