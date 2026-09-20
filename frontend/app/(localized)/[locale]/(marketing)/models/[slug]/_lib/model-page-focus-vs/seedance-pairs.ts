import type { FocusVsPair } from './types';

export const SEEDANCE_FOCUS_VS_PAIRS: FocusVsPair[] = [
  {
    slugA: 'seedance-1-5-pro',
    slugB: 'kling-3-standard',
    nameA: 'Seedance 1.5 Pro',
    nameB: 'Kling 3 Standard',
    onlyFor: ['seedance-1-5-pro'],
    copyA: {
      en: {
        title: 'Use Seedance 1.5 Pro when you want:',
        items: [
          'Camera-fixed stability and repeatable takes',
          'Seed control for variants',
          'Short 4–12s clips with audio on/off',
        ],
      },
      fr: {
        title: 'Utilisez Seedance 1.5 Pro quand vous voulez :',
        items: [
          'Stabilité camera_fixed et prises répétables',
          'Seed control pour variantes',
          'Clips courts 4–12 s avec audio on/off',
        ],
      },
      es: {
        title: 'Usa Seedance 1.5 Pro cuando quieras:',
        items: [
          'Estabilidad camera_fixed y tomas repetibles',
          'Seed control para variantes',
          'Clips cortos 4–12 s con audio on/off',
        ],
      },
      zh: {
        title: '在以下场景推荐使用 Seedance 1.5 Pro：',
        items: [
          '固定机位稳定性与高可复现性生成',
          '通过 Seed 随机数精确控制画面变体',
          '4–12 秒支持音频开/关的短片段生成',
        ],
      },
    },
    copyB: {
      en: {
        title: 'Use Kling 3 Standard when you need:',
        items: [
          'Multi-shot storyboards up to 15s',
          'Elements for consistent characters/props',
          'Voice IDs + optional end frame',
        ],
      },
      fr: {
        title: 'Utilisez Kling 3 Standard quand vous avez besoin :',
        items: [
          'Storyboards multi‑shot jusqu’à 15 s',
          'Elements pour personnages/props cohérents',
          'Voice IDs + image de fin optionnelle',
        ],
      },
      es: {
        title: 'Usa Kling 3 Standard cuando necesites:',
        items: [
          'Storyboards multi‑shot hasta 15 s',
          'Elements para personajes/props consistentes',
          'Voice IDs + end frame opcional',
        ],
      },
      zh: {
        title: '在以下场景推荐使用 Kling 3 Standard：',
        items: [
          '最长 15 秒的多镜头分镜故事短片',
          '元素参考功能，保持角色和道具一致性',
          '专属声音角色定制与可选尾帧控制',
        ],
      },
    },
  },
  {
    slugA: 'seedance-2-0-fast',
    slugB: 'seedance-2-0',
    nameA: 'Seedance 2.0 Fast',
    nameB: 'Seedance 2.0',
    onlyFor: ['seedance-2-0', 'seedance-2-0-fast'],
    copyA: {
      en: {
        title: 'Use Seedance 2.0 Fast when you want:',
        items: [
          'Rapid draft passes before client-facing finals',
          'Quick shot planning, pacing checks, and A/B motion tests',
          'A lighter Seedance tier for early creative exploration',
        ],
      },
      fr: {
        title: 'Utilisez Seedance 2.0 Fast quand vous voulez :',
        items: [
          'Des tests rapides avant les finals client',
          'Du shot planning, des checks de pacing et des tests A/B motion',
          'Un tier Seedance plus léger pour explorer tôt',
        ],
      },
      es: {
        title: 'Usa Seedance 2.0 Fast cuando quieras:',
        items: [
          'Borradores rápidos antes de los finales para cliente',
          'Shot planning, checks de pacing y tests A/B de motion',
          'Un tier Seedance más ligero para explorar antes',
        ],
      },
      zh: {
        title: '在以下场景推荐使用 Seedance 2.0 Fast：',
        items: [
          '面向客户交付最终成片前的快速草稿推敲',
          '快速镜头规划、节奏验证与 A/B 动态测试',
          '用于前期创意探索的高性价比轻量级模型',
        ],
      },
    },
    copyB: {
      en: {
        title: 'Use Seedance 2.0 when you need:',
        items: [
          'More polished motion and native audio for finals',
          'Stronger multi-shot continuity for launch work',
          'The main Seedance tier for flagship ads and hero scenes',
        ],
      },
      fr: {
        title: 'Utilisez Seedance 2.0 quand vous avez besoin :',
        items: [
          'D’un motion plus premium et d’un audio natif pour les finals',
          'D’une continuité multi-plans plus sûre pour les livrables de lancement',
          'Du tier principal Seedance pour pubs flagship et hero scenes',
        ],
      },
      es: {
        title: 'Usa Seedance 2.0 cuando necesites:',
        items: [
          'Más acabado de motion y audio nativo para finales',
          'Continuidad multi-shot más fiable para entregables de lanzamiento',
          'El tier principal de Seedance para anuncios flagship y hero scenes',
        ],
      },
      zh: {
        title: '在以下场景推荐使用 Seedance 2.0：',
        items: [
          '成片级更细腻的动态表现与原生音效合成',
          '针对旗舰宣发素材提供更稳固的多镜头连贯性',
          '打造重磅广告大片和视觉焦点的主力模型',
        ],
      },
    },
  },
];
