import type { AppLocale } from '@/i18n/locales';

export type AboutCopy = {
  meta: { title: string; description: string };
  hero: { eyebrow: string; title: string; subtitle: string };
  identity: { label: string; body: string };
  sections: Array<{ title: string; body: string }>;
  independence: { title: string; body: string };
  links: { standards: string; benchmarks: string; company: string; legal: string };
};

const COPY: Record<AppLocale, AboutCopy> = {
  en: {
    meta: {
      title: 'About MaxVideoAI',
      description:
        'Meet the founder of MaxVideoAI and learn how the product, model comparisons, and editorial methodology are maintained.',
    },
    hero: {
      eyebrow: 'About MaxVideoAI',
      title: 'A clearer way to choose and use AI video models.',
      subtitle:
        'MaxVideoAI brings model comparison, price-before-generation, and production workflows into one focused workspace.',
    },
    identity: {
      label: 'Built and maintained by',
      body:
        'Adrien builds the product, evaluates model behavior, and maintains MaxVideoAI’s practical guides and benchmark methodology.',
    },
    sections: [
      {
        title: 'What we build',
        body:
          'One workspace for comparing current and legacy AI video models, preparing inputs, seeing the price before generation, and reviewing outputs.',
      },
      {
        title: 'Why model choice matters',
        body:
          'Different shots need different strengths. MaxVideoAI keeps model capabilities, pricing, examples, and controls visible so the choice stays practical.',
      },
      {
        title: 'How we evaluate models',
        body:
          'Provider specifications, observed production timing, and MaxVideoAI editorial scores are kept separate and linked to their methodology.',
      },
    ],
    independence: {
      title: 'Our commercial relationship',
      body:
        'MaxVideoAI sells access to the models it covers. We disclose that relationship and separate sourced facts, observed production metrics, and editorial judgment.',
    },
    links: {
      standards: 'Read Editorial Standards',
      benchmarks: 'Open Benchmark Lab',
      company: 'Company & Trust',
      legal: 'Legal center',
    },
  },
  fr: {
    meta: {
      title: 'À propos de MaxVideoAI',
      description:
        'Découvrez le fondateur de MaxVideoAI et la manière dont le produit, les comparatifs et la méthodologie éditoriale sont maintenus.',
    },
    hero: {
      eyebrow: 'À propos de MaxVideoAI',
      title: 'Une manière plus claire de choisir et d’utiliser les modèles vidéo IA.',
      subtitle:
        'MaxVideoAI réunit comparaison des modèles, prix avant génération et workflows de production dans un espace de travail ciblé.',
    },
    identity: {
      label: 'Conçu et maintenu par',
      body:
        'Adrien développe le produit, évalue le comportement des modèles et maintient les guides pratiques ainsi que la méthodologie de benchmark de MaxVideoAI.',
    },
    sections: [
      {
        title: 'Ce que nous construisons',
        body:
          'Un seul espace pour comparer les modèles vidéo IA actuels et legacy, préparer les entrées, voir le prix avant génération et examiner les rendus.',
      },
      {
        title: 'Pourquoi le choix du modèle compte',
        body:
          'Chaque plan demande des qualités différentes. MaxVideoAI garde capacités, prix, exemples et contrôles visibles pour rendre le choix concret.',
      },
      {
        title: 'Comment nous évaluons les modèles',
        body:
          'Les spécifications fournisseurs, les temps de production observés et les scores éditoriaux MaxVideoAI restent séparés et reliés à leur méthodologie.',
      },
    ],
    independence: {
      title: 'Notre relation commerciale',
      body:
        'MaxVideoAI commercialise l’accès aux modèles présentés. Nous déclarons cette relation et séparons les faits sourcés, les mesures de production observées et le jugement éditorial.',
    },
    links: {
      standards: 'Lire les normes éditoriales',
      benchmarks: 'Ouvrir Benchmark Lab',
      company: 'Entreprise & confiance',
      legal: 'Centre juridique',
    },
  },
  es: {
    meta: {
      title: 'Acerca de MaxVideoAI',
      description:
        'Conoce al fundador de MaxVideoAI y cómo se mantienen el producto, las comparativas y la metodología editorial.',
    },
    hero: {
      eyebrow: 'Acerca de MaxVideoAI',
      title: 'Una forma más clara de elegir y usar modelos de video con IA.',
      subtitle:
        'MaxVideoAI reúne comparación de modelos, precio antes de generar y flujos de producción en un solo espacio de trabajo.',
    },
    identity: {
      label: 'Creado y mantenido por',
      body:
        'Adrien desarrolla el producto, evalúa el comportamiento de los modelos y mantiene las guías prácticas y la metodología de benchmarks de MaxVideoAI.',
    },
    sections: [
      {
        title: 'Lo que desarrollamos',
        body:
          'Un espacio para comparar modelos de video con IA actuales y legacy, preparar entradas, ver el precio antes de generar y revisar resultados.',
      },
      {
        title: 'Por qué importa elegir el modelo',
        body:
          'Cada toma necesita fortalezas diferentes. MaxVideoAI mantiene visibles las capacidades, los precios, los ejemplos y los controles para facilitar una decisión práctica.',
      },
      {
        title: 'Cómo evaluamos los modelos',
        body:
          'Las especificaciones de proveedores, los tiempos de producción observados y las puntuaciones editoriales de MaxVideoAI se mantienen separados y vinculados a su metodología.',
      },
    ],
    independence: {
      title: 'Nuestra relación comercial',
      body:
        'MaxVideoAI comercializa el acceso a los modelos que presenta. Declaramos esa relación y separamos los datos con fuente, las métricas de producción observadas y el criterio editorial.',
    },
    links: {
      standards: 'Leer estándares editoriales',
      benchmarks: 'Abrir Benchmark Lab',
      company: 'Empresa y confianza',
      legal: 'Centro legal',
    },
  },
  zh: {
    meta: {
      title: '关于 MaxVideoAI',
      description: '认识 MaxVideoAI 的创作者，了解我们的产品理念、模型横向对比及编辑评测方法论的维护原则。',
    },
    hero: {
      eyebrow: '关于 MaxVideoAI',
      title: '更清晰、高效地挑选与使用前沿 AI 视频模型。',
      subtitle: 'MaxVideoAI 将多模型横向对比、生成前透明报价与生产级制作工作流融于一体，打造专注于创意的生成环境。',
    },
    identity: {
      label: '构建与维护者',
      body: 'Adrien 负责产品的核心架构与研发、持续评测各家前沿模型表现，并维护 MaxVideoAI 的实用指南与评测基准方法论。',
    },
    sections: [
      {
        title: '我们所构建的产品',
        body: '一个整合当下最新及经典 AI 视频模型的一站式工作区，支持精细准备输入参数、生成前获知准确价格，并实时预览交付成果。',
      },
      {
        title: '为何模型选型至关重要',
        body: '不同的镜头需要不同的模型强项。MaxVideoAI 将模型能力边界、实时定价、实测案例与控制项全面透明化，助你做出切实高效的决策。',
      },
      {
        title: '我们如何评估模型',
        body: '官方提供商规格、生产实测耗时与 MaxVideoAI 专业编辑评分严格区分，并公开对应的方法论支撑。',
      },
    ],
    independence: {
      title: '商业关系声明',
      body: 'MaxVideoAI 提供其评测模型的商业化接入与生成服务。我们完全透明地公开这一商业属性，并坚决将客观来源事实、生产实测指标与主观编辑评价清晰隔离。',
    },
    links: {
      standards: '查阅编辑准则',
      benchmarks: '前往评测实验室',
      company: '企业与信任',
      legal: '法律合规中心',
    },
  },
};

export function getAboutCopy(locale: AppLocale): AboutCopy {
  return COPY[locale] ?? COPY.en;
}
