import type { AppLocale } from '@/i18n/locales';

export type EditorialStandardsSectionId =
  | 'authorship'
  | 'sources'
  | 'process'
  | 'corrections'
  | 'benchmarks'
  | 'disclosure';

export type EditorialStandardsCopy = {
  meta: { title: string; description: string };
  hero: {
    eyebrow: string;
    title: string;
    intro: string;
    reviewedLabel: string;
    reviewedDate: '2026-07-12';
  };
  sections: Array<{
    id: EditorialStandardsSectionId;
    title: string;
    body: string;
    bullets?: string[];
  }>;
  links: { about: string; benchmarks: string; contact: string };
};

const COPY: Record<AppLocale, EditorialStandardsCopy> = {
  en: {
    meta: {
      title: 'Editorial Standards',
      description:
        'Learn how VideoAI handles authorship, sources, corrections, benchmark updates, and commercial-interest disclosure.',
    },
    hero: {
      eyebrow: 'VideoAI editorial practice',
      title: 'Editorial standards for practical AI video research.',
      intro:
        'These standards explain who is accountable for our content, how claims are sourced, and how material corrections or methodology changes are published.',
      reviewedLabel: 'Last reviewed',
      reviewedDate: '2026-07-12',
    },
    sections: [
      {
        id: 'authorship',
        title: 'Authorship and accountability',
        body:
          'Adrien Millot, Founder & Product Lead, is the primary author and editorial lead for VideoAI. If another contributor authors or materially reviews a page, that person will be identified on the page.',
      },
      {
        id: 'sources',
        title: 'How we label sources',
        body:
          'We keep provider documentation, VideoAI product configuration, anonymized observed production metrics, and VideoAI editorial judgment distinct.',
        bullets: [
          'Provider specifications link to the provider or product source.',
          'Observed timing describes rolling production behavior, not a controlled experiment.',
          'Editorial scores are VideoAI judgments under the published methodology.',
        ],
      },
      {
        id: 'process',
        title: 'Before publication',
        body:
          'Material product claims are checked against current routes, source links, visible pricing behavior, and supported controls before publication or a substantial update.',
      },
      {
        id: 'corrections',
        title: 'Corrections',
        body:
          'Send factual corrections to contact@llmhub.com.cn with the page URL and supporting source. Material corrections update the page and its modified date; they do not rewrite the original publication date.',
      },
      {
        id: 'benchmarks',
        title: 'Benchmark updates',
        body:
          'Benchmark definitions, formulas, prompt protocols, observed latency rules, and methodology changes are versioned in Benchmark Lab. Historical editorial scores are not relabeled as documented prompt-pack runs.',
      },
      {
        id: 'disclosure',
        title: 'Commercial-interest disclosure',
        body:
          'VideoAI sells access to the models it compares. We disclose that commercial relationship and separate sourced facts, observed production metrics, and editorial judgment.',
      },
    ],
    links: { about: 'About the editor', benchmarks: 'Open Benchmark Lab', contact: 'Contact VideoAI' },
  },
  fr: {
    meta: {
      title: 'Normes éditoriales',
      description:
        'Découvrez comment VideoAI gère les auteurs, les sources, les corrections, les mises à jour des benchmarks et la transparence commerciale.',
    },
    hero: {
      eyebrow: 'Pratique éditoriale VideoAI',
      title: 'Des normes éditoriales pour une recherche vidéo IA concrète.',
      intro:
        'Ces normes expliquent qui répond de nos contenus, comment les affirmations sont sourcées et comment les corrections importantes ou les changements de méthode sont publiés.',
      reviewedLabel: 'Dernière révision',
      reviewedDate: '2026-07-12',
    },
    sections: [
      {
        id: 'authorship',
        title: 'Auteur et responsabilité',
        body:
          'Adrien Millot, Founder & Product Lead, est l’auteur principal et le responsable éditorial de VideoAI. Si une autre personne écrit ou relit substantiellement une page, elle sera identifiée sur cette page.',
      },
      {
        id: 'sources',
        title: 'Comment nous identifions les sources',
        body:
          'Nous distinguons la documentation des fournisseurs, la configuration produit VideoAI, les mesures de production observées et anonymisées, et le jugement éditorial VideoAI.',
        bullets: [
          'Les spécifications fournisseurs renvoient vers la source fournisseur ou produit.',
          'Les temps observés décrivent un comportement de production glissant, pas une expérience contrôlée.',
          'Les scores éditoriaux sont des jugements VideoAI appliquant la méthodologie publiée.',
        ],
      },
      {
        id: 'process',
        title: 'Avant publication',
        body:
          'Les affirmations produit importantes sont vérifiées avec les routes actuelles, les liens sources, le comportement tarifaire visible et les contrôles disponibles avant publication ou mise à jour substantielle.',
      },
      {
        id: 'corrections',
        title: 'Corrections',
        body:
          'Envoyez les corrections factuelles à contact@llmhub.com.cn avec l’URL de la page et une source justificative. Une correction importante met à jour la page et sa date de modification sans réécrire la date de publication initiale.',
      },
      {
        id: 'benchmarks',
        title: 'Mises à jour des benchmarks',
        body:
          'Les définitions, formules, protocoles de prompts, règles de latence observée et changements de méthode sont versionnés dans Benchmark Lab. Les scores éditoriaux historiques ne sont pas présentés comme des exécutions documentées du pack de prompts.',
      },
      {
        id: 'disclosure',
        title: 'Transparence sur l’intérêt commercial',
        body:
          'VideoAI commercialise l’accès aux modèles comparés. Nous déclarons cette relation commerciale et séparons les faits sourcés, les mesures de production observées et le jugement éditorial.',
      },
    ],
    links: { about: 'À propos du responsable', benchmarks: 'Ouvrir Benchmark Lab', contact: 'Contacter VideoAI' },
  },
  es: {
    meta: {
      title: 'Estándares editoriales',
      description:
        'Conoce cómo VideoAI gestiona la autoría, las fuentes, las correcciones, las actualizaciones de benchmarks y la transparencia comercial.',
    },
    hero: {
      eyebrow: 'Práctica editorial de VideoAI',
      title: 'Estándares editoriales para investigar video con IA de forma práctica.',
      intro:
        'Estos estándares explican quién responde por nuestro contenido, cómo se sustentan las afirmaciones y cómo publicamos correcciones importantes o cambios de metodología.',
      reviewedLabel: 'Última revisión',
      reviewedDate: '2026-07-12',
    },
    sections: [
      {
        id: 'authorship',
        title: 'Autoría y responsabilidad',
        body:
          'Adrien Millot, Founder & Product Lead, es el autor principal y responsable editorial de VideoAI. Si otra persona escribe o revisa de manera sustancial una página, se la identificará en esa página.',
      },
      {
        id: 'sources',
        title: 'Cómo identificamos las fuentes',
        body:
          'Separamos la documentación de proveedores, la configuración del producto VideoAI, las métricas de producción observadas y anonimizadas, y el criterio editorial de VideoAI.',
        bullets: [
          'Las especificaciones de proveedores enlazan a la fuente del proveedor o del producto.',
          'Los tiempos observados describen el comportamiento móvil de producción, no un experimento controlado.',
          'Las puntuaciones editoriales son criterios de VideoAI bajo la metodología publicada.',
        ],
      },
      {
        id: 'process',
        title: 'Antes de publicar',
        body:
          'Las afirmaciones importantes sobre el producto se comprueban con las rutas actuales, las fuentes, el comportamiento visible de precios y los controles disponibles antes de publicar o hacer una actualización sustancial.',
      },
      {
        id: 'corrections',
        title: 'Correcciones',
        body:
          'Envía correcciones factuales a contact@llmhub.com.cn con la URL de la página y una fuente de respaldo. Una corrección importante actualiza la página y su fecha de modificación sin cambiar la fecha de publicación original.',
      },
      {
        id: 'benchmarks',
        title: 'Actualizaciones de benchmarks',
        body:
          'Las definiciones, fórmulas, protocolos de prompts, reglas de latencia observada y cambios de metodología se versionan en Benchmark Lab. Las puntuaciones editoriales históricas no se presentan como ejecuciones documentadas del pack de prompts.',
      },
      {
        id: 'disclosure',
        title: 'Transparencia sobre el interés comercial',
        body:
          'VideoAI comercializa el acceso a los modelos que compara. Declaramos esa relación comercial y separamos los datos con fuente, las métricas de producción observadas y el criterio editorial.',
      },
    ],
    links: { about: 'Acerca del responsable', benchmarks: 'Abrir Benchmark Lab', contact: 'Contactar a VideoAI' },
  },
  zh: {
    meta: {
      title: '编辑准则与标准',
      description: '了解 VideoAI 如何处理内容署名、事实来源、勘误更新、评测基准调整及商业利益披露。',
    },
    hero: {
      eyebrow: 'VideoAI 编辑规范',
      title: '面向实用 AI 视频研究的编辑标准。',
      intro: '这些标准阐述了内容的责任人、各项主张的事实依据，以及重大勘误或评测方法论变更的发布流程。',
      reviewedLabel: '最近审核',
      reviewedDate: '2026-07-12',
    },
    sections: [
      {
        id: 'authorship',
        title: '作者与责任归属',
        body: 'Adrien Millot（创始人兼产品主管）是 VideoAI 的主要作者和编辑负责人。若有其他撰稿人编写或实质性审阅页面，其身份将在页面上明确标示。',
      },
      {
        id: 'sources',
        title: '数据来源标识',
        body: '我们严格区分模型提供商官方文档、VideoAI 产品配置、匿名化的生产环境实测指标以及 VideoAI 专业编辑评判。',
        bullets: [
          '提供商技术规格直接链接至官方或产品原始出处。',
          '实测耗时反映持续滚动的实际运行表现，而非人工受控环境下的理论极限。',
          '编辑评分为 VideoAI 在公开方法论框架下的专业评测结论。',
        ],
      },
      {
        id: 'process',
        title: '发布前审核',
        body: '在发布或进行重大更新之前，所有关于产品的核心陈述均会结合现行路由、数据源、实际展示的价格以及可用控制项进行严格核验。',
      },
      {
        id: 'corrections',
        title: '事实勘误',
        body: '如发现事实性错误，请发送邮件至 contact@llmhub.com.cn，并附上页面链接及支撑材料。重大勘误将在更新页面的同时调整修改日期，并保留原始发布日期。',
      },
      {
        id: 'benchmarks',
        title: '评测基准更新',
        body: '所有评测定义、计算公式、提示词测试方案、实测延迟计算规则以及方法论演进均在 Benchmark Lab 中实行版本化管理。历史编辑评分绝不混同于提示词套件的实测记录。',
      },
      {
        id: 'disclosure',
        title: '商业利益透明声明',
        body: 'VideoAI 提供其所对比模型的接入与生成服务。我们完全透明地公开这一商业关系，并坚决将客观来源事实、生产实测指标与主观编辑评价清晰隔离。',
      },
    ],
    links: { about: '了解负责人背景', benchmarks: '前往评测实验室', contact: '联系 VideoAI' },
  },
};

export function getEditorialStandardsCopy(locale: AppLocale): EditorialStandardsCopy {
  return COPY[locale] ?? COPY.en;
}
