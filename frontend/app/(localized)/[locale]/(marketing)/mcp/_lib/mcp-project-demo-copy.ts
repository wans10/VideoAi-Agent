import type { AppLocale } from '@/i18n/locales';

export type McpProjectDemoCopy = {
  title: string;
  subtitle: string;
  steps: readonly [string, string, string];
  product: string;
  productHeadline: string;
  productDescription: string;
  discover: string;
  videoSlot: string;
  photoCaption: string;
  videoCaption: string;
  user: string;
  chatTitle: string;
  assistantName: string;
  prompt: string;
  promptDetails: string;
  answer: string;
  approval: string;
  cta: string;
  photoAlt: string;
  videoAlt: string;
  scrollHint: string;
  playLabel: string;
  resumeScrollLabel: string;
};

export const MCP_PROJECT_DEMO_COPY: Record<AppLocale, McpProjectDemoCopy> = {
  en: {
    title: 'Your project is already here. Add its video.',
    subtitle: 'From context in your assistant to a video in your site.',
    steps: ['The project', 'The request', 'The video in your site'],
    product: 'Connected watch',
    productHeadline: 'Switch to motion.',
    productDescription: 'Precision. Energy. Freedom.',
    discover: 'Discover',
    videoSlot: 'Product video',
    photoCaption: 'The product photo is the starting point.',
    videoCaption: 'The product comes to life in your site.',
    user: 'You',
    chatTitle: 'Codex or Claude + VideoAI',
    assistantName: 'Codex or Claude',
    prompt: 'Create a video for this site with VideoAI and integrate it with scroll-controlled animation: it moves forward as I scroll down and backward as I scroll up.',
    promptDetails: 'Keep the site’s style and add a discreet play button. Compare two suitable, available models with their trade-offs and prices. Ask me for any missing references. Wait for my model choice and approval of the exact quote before generating and integrating the video.',
    answer: 'I’ll use the project context and compare two suitable models.',
    approval: 'Choose a model · review the quote · approve',
    cta: 'Start with your own project',
    photoAlt: 'A titanium watch with a cobalt-blue strap and lime dial on a graphite pedestal.',
    videoAlt: 'The same watch in a dynamic product scene with blue and lime light trails.',
    scrollHint: 'Scroll to bring it to life',
    playLabel: 'Play video',
    resumeScrollLabel: 'Return to scroll animation',
  },
  fr: {
    title: 'Votre projet est déjà là. Ajoutez sa vidéo.',
    subtitle: 'Du contexte dans votre assistant au résultat dans votre site.',
    steps: ['Le projet', 'La demande', 'La vidéo intégrée'],
    product: 'Montre connectée',
    productHeadline: 'Passez en mode mouvement.',
    productDescription: 'Précision. Énergie. Liberté.',
    discover: 'Découvrir',
    videoSlot: 'Vidéo de présentation',
    photoCaption: 'La photo produit, point de départ.',
    videoCaption: 'Le produit s’anime dans votre site.',
    user: 'Vous',
    chatTitle: 'Codex ou Claude + VideoAI',
    assistantName: 'Codex ou Claude',
    prompt: 'Crée une vidéo pour ce site avec VideoAI et intègre-la avec une animation pilotée par le défilement : elle avance quand je descends et recule quand je remonte.',
    promptDetails: 'Conserve le style du site et ajoute un bouton lecture discret. Compare deux modèles disponibles et adaptés, avec leurs compromis et leurs prix. Demande-moi les références manquantes. Attends mon choix du modèle, puis mon accord sur le devis exact, avant de générer et d’intégrer la vidéo.',
    answer: 'Je reprends le contexte du projet et compare deux modèles adaptés.',
    approval: 'Choix du modèle · devis · votre accord',
    cta: 'Commencer avec votre projet',
    photoAlt: 'Une montre titanium au bracelet bleu cobalt et au cadran acidulé sur un socle graphite.',
    videoAlt: 'La même montre dans une scène produit dynamique avec des traînées lumineuses bleues et acidulées.',
    scrollHint: 'Faites défiler pour animer',
    playLabel: 'Lire la vidéo',
    resumeScrollLabel: 'Revenir au défilement',
  },
  es: {
    title: 'Tu proyecto ya está aquí. Añade su vídeo.',
    subtitle: 'Del contexto en tu asistente al resultado en tu web.',
    steps: ['El proyecto', 'La petición', 'El vídeo en tu web'],
    product: 'Reloj conectado',
    productHeadline: 'Activa el movimiento.',
    productDescription: 'Precisión. Energía. Libertad.',
    discover: 'Descubrir',
    videoSlot: 'Vídeo de presentación',
    photoCaption: 'La foto del producto es el punto de partida.',
    videoCaption: 'El producto cobra vida en tu web.',
    user: 'Tú',
    chatTitle: 'Codex o Claude + VideoAI',
    assistantName: 'Codex o Claude',
    prompt: 'Crea un vídeo para esta web con VideoAI e intégralo con una animación controlada por el desplazamiento: avanza al bajar y retrocede al subir.',
    promptDetails: 'Mantén el estilo de la web y añade un botón de reproducción discreto. Compara dos modelos disponibles y adecuados, con sus ventajas, limitaciones y precios. Pídeme las referencias que falten. Espera mi elección del modelo y mi aprobación del precio exacto antes de generar e integrar el vídeo.',
    answer: 'Usaré el contexto del proyecto y compararé dos modelos adecuados.',
    approval: 'Elige el modelo · revisa el precio · autoriza',
    cta: 'Empezar con tu proyecto',
    photoAlt: 'Un reloj de titanio con correa azul cobalto y esfera lima sobre un pedestal de grafito.',
    videoAlt: 'El mismo reloj en una escena dinámica con estelas de luz azules y lima.',
    scrollHint: 'Desplázate para animarlo',
    playLabel: 'Reproducir vídeo',
    resumeScrollLabel: 'Volver a la animación al desplazarse',
  },
  zh: {
    title: '你的项目已就绪。为它注入生动视频。',
    subtitle: '从助手上下文无缝过渡到网站落地实效。',
    steps: ['项目素材', '发起请求', '网站中的成片展示'],
    product: '智能穿戴手表',
    productHeadline: '开启流转动感。',
    productDescription: '精准。活力。自由。',
    discover: '探索详情',
    videoSlot: '产品展示视频',
    photoCaption: '产品静态照片是创作的起点。',
    videoCaption: '在你的网站中，产品焕发逼真生机。',
    user: '你',
    chatTitle: 'Codex 或 Claude + VideoAI',
    assistantName: 'Codex 或 Claude',
    prompt: '使用 VideoAI 为这个网站制作一段视频，并结合页面滚动控制动效：向下滚动时视频向前播放，向上滚动时视频倒放。',
    promptDetails: '保持网站原有的设计风格，并增加一个低调精致的播放按钮。对比两个适合且可用的模型，说明各自优劣与价格。如缺少参考图请向我索取。在生成与嵌入视频前，等待我选定模型并确认精准报价。',
    answer: '我将结合当前项目上下文，对比两个最契合的模型与费用方案。',
    approval: '选择模型 · 核对价格 · 授权生成',
    cta: '在你的项目中开启创作',
    photoAlt: '钛金属手表，配备钴蓝表带与荧光绿表盘，陈列于深灰石质展台。',
    videoAlt: '同一款手表在流动光影中旋转展示，环绕蓝绿光轨。',
    scrollHint: '滚动鼠标以联动画面动效',
    playLabel: '播放视频',
    resumeScrollLabel: '恢复滚动播放控制',
  },
};

export function getMcpProjectDemoPrompt(locale: AppLocale): string {
  const copy = MCP_PROJECT_DEMO_COPY[locale];
  return `${copy.prompt} ${copy.promptDetails}`;
}
