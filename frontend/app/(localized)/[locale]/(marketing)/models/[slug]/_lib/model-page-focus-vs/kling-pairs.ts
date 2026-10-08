import type { FocusVsPair } from './types';
import { KLING_3_FOCUS_VS_PAIRS } from './kling-3-pairs';

export const KLING_FOCUS_VS_PAIRS: FocusVsPair[] = [
  {
    slugA: 'kling-2-5-turbo',
    slugB: 'kling-2-6-pro',
    nameA: 'Kling 2.5 Turbo',
    nameB: 'Kling 2.6 Pro',
    copyA: {
      en: {
        title: 'Use Kling 2.5 Turbo when you want:',
        items: [
          'Fast silent clips with strong motion',
          'Budget B-roll loops for edits',
          'Quick look-dev and drafts',
        ],
      },
      fr: {
        title: 'Utilisez Kling 2.5 Turbo quand vous voulez :',
        items: [
          'Clips silencieux rapides avec forte motion',
          'Boucles B-roll budget pour le montage',
          'Look-dev rapide et tests',
        ],
      },
      es: {
        title: 'Usa Kling 2.5 Turbo cuando quieras:',
        items: [
          'Clips silenciosos rápidos con motion fuerte',
          'Loops B-roll económicos para edición',
          'Look-dev rápido y borradores',
        ],
      },
      zh: {
        title: '在以下场景推荐使用 Kling 2.5 Turbo：',
        items: [
          '具备强动态效果的高速无声视频',
          '性价比极高的剪辑用 B-roll 循环素材',
          '快速外观探索与前期草稿制作',
        ],
      },
    },
    copyB: {
      en: {
        title: 'Use Kling 2.6 Pro when you need:',
        items: [
          'Native audio with dialogue and SFX',
          'Polished ad/story beats',
          'Stronger continuity on camera direction',
        ],
      },
      fr: {
        title: 'Utilisez Kling 2.6 Pro quand vous avez besoin :',
        items: [
          'Audio natif avec dialogue et SFX',
          'Beats pub/story plus polis',
          'Continuité plus forte sur la direction caméra',
        ],
      },
      es: {
        title: 'Usa Kling 2.6 Pro cuando necesites:',
        items: [
          'Audio nativo con diálogo y SFX',
          'Beats publicitarios/story más pulidos',
          'Continuidad más fuerte en la dirección de cámara',
        ],
      },
      zh: {
        title: '在以下场景推荐使用 Kling 2.6 Pro：',
        items: [
          '包含对白和音效的原生音频生成',
          '更精致成熟的广告与故事叙事片段',
          '更具连贯性的运镜调度与机位控制',
        ],
      },
    },
  },
  {
    slugA: 'kling-2-6-pro',
    slugB: 'kling-3-pro',
    nameA: 'Kling 2.6 Pro',
    nameB: 'Kling 3 Pro',
    copyA: {
      en: {
        title: 'Use Kling 2.6 Pro when you want:',
        items: [
          'Native audio with dialogue and SFX',
          'Short cinematic beats without extra setup',
          'Solid results for 5–10s clips',
        ],
      },
      fr: {
        title: 'Utilisez Kling 2.6 Pro quand vous voulez :',
        items: [
          'Audio natif avec dialogue et SFX',
          'Beats ciné courts sans setup complexe',
          'Résultats solides sur 5–10s',
        ],
      },
      es: {
        title: 'Usa Kling 2.6 Pro cuando quieras:',
        items: [
          'Audio nativo con diálogo y SFX',
          'Beats cinemáticos cortos sin setup extra',
          'Resultados sólidos en clips de 5–10s',
        ],
      },
      zh: {
        title: '在以下场景推荐使用 Kling 2.6 Pro：',
        items: [
          '包含对白和音效的原生音频生成',
          '无需复杂设置的快速电影感镜头',
          '5–10 秒高质量短片段的稳定输出',
        ],
      },
    },
    copyB: {
      en: {
        title: 'Use Kling 3 Pro when you need:',
        items: [
          'Multi-prompt sequencing across scenes',
          'Element references for stronger continuity',
          'Voice IDs and shot-type control up to 15s',
        ],
      },
      fr: {
        title: 'Utilisez Kling 3 Pro quand vous avez besoin :',
        items: [
          'Séquençage multi-prompts par scène',
          'Éléments de référence pour plus de continuité',
          'Voice IDs et shot-type jusqu’à 15s',
        ],
      },
      es: {
        title: 'Usa Kling 3 Pro cuando necesites:',
        items: [
          'Secuencias multi-prompt por escena',
          'Referencias de elementos para mayor continuidad',
          'Voice IDs y control de shot type hasta 15s',
        ],
      },
      zh: {
        title: '在以下场景推荐使用 Kling 3 Pro：',
        items: [
          '跨场景的多提示词分镜连续生成',
          '元素参考功能，确保角色与道具高度一致',
          '最长 15 秒的声音角色与镜头类型精细控制',
        ],
      },
    },
  },
  ...KLING_3_FOCUS_VS_PAIRS,
];
