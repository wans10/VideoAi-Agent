import type { FocusVsPair } from './types';

export const WAN_FOCUS_VS_PAIRS: FocusVsPair[] = [
  {
    slugA: 'wan-2-5',
    slugB: 'wan-2-6',
    nameA: 'Wan 2.5',
    nameB: 'Wan 2.6',
    copyA: {
      en: {
        title: 'Use Wan 2.5 when you want:',
        items: [
          'Native audio in the same render',
          'Simple short beats at lower cost',
          'Quick ideation with sound-led timing',
        ],
      },
      fr: {
        title: 'Utilisez Wan 2.5 quand vous voulez :',
        items: [
          'Audio natif dans le même rendu',
          'Beats courts simples à moindre coût',
          'Idéation rapide avec timing guidé par le son',
        ],
      },
      es: {
        title: 'Usa Wan 2.5 cuando quieras:',
        items: [
          'Audio nativo en el mismo render',
          'Beats cortos simples a menor coste',
          'Ideación rápida con timing guiado por el audio',
        ],
      },
      zh: {
        title: '在以下场景推荐使用 Wan 2.5：',
        items: [
          '同批次渲染中直接生成原生音频',
          '更低成本制作简短小片段',
          '配合音频节奏进行快速创意探索',
        ],
      },
    },
    copyB: {
      en: {
        title: 'Use Wan 2.6 when you need:',
        items: [
          'Reference-to-video consistency',
          'Timestamped multi-shot sequences',
          'More aspect-ratio control and structure',
        ],
      },
      fr: {
        title: 'Utilisez Wan 2.6 quand vous avez besoin :',
        items: [
          'Cohérence en reference-to-video',
          'Séquences multi-shots horodatées',
          'Plus de contrôle de format et de structure',
        ],
      },
      es: {
        title: 'Usa Wan 2.6 cuando necesites:',
        items: [
          'Consistencia en reference-to-video',
          'Secuencias multi-shot con timestamps',
          'Más control de formato y estructura',
        ],
      },
      zh: {
        title: '在以下场景推荐使用 Wan 2.6：',
        items: [
          '参考图生视频的高度一致性',
          '带时间戳的多镜头长序列控制',
          '更灵活的宽高比与画幅结构控制',
        ],
      },
    },
  },
];
