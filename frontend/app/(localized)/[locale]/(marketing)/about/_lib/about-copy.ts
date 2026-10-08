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
      title: 'About Keyvo',
      description:
        'Learn about the Keyvo production workspace, model comparisons and the origins of its editorial material.',
    },
    hero: {
      eyebrow: 'About Keyvo',
      title: 'A clearer way to choose and use AI video models.',
      subtitle:
        'Keyvo brings model comparison, price-before-generation, and production workflows into one focused workspace.',
    },
    identity: {
      label: 'Original project attribution',
      body:
        'Adrien Millot is the founder of the original MaxKeyvo project. This profile credits the source of inherited editorial material; it does not identify the operator of this Keyvo deployment.',
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
          'Different shots need different strengths. Keyvo keeps model capabilities, pricing, examples, and controls visible so the choice stays practical.',
      },
      {
        title: 'How we evaluate models',
        body:
          'Provider specifications, observed production timing, and Keyvo editorial scores are kept separate and linked to their methodology.',
      },
    ],
    independence: {
      title: 'Our commercial relationship',
      body:
        'Keyvo sells access to the models it covers. We disclose that relationship and separate sourced facts, observed production metrics, and editorial judgment.',
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
      title: 'À propos de Keyvo',
      description:
        'Découvrez l’espace de production Keyvo, ses comparatifs et les sources de ses contenus éditoriaux.',
    },
    hero: {
      eyebrow: 'À propos de Keyvo',
      title: 'Une manière plus claire de choisir et d’utiliser les modèles vidéo IA.',
      subtitle:
        'Keyvo réunit comparaison des modèles, prix avant génération et workflows de production dans un espace de travail ciblé.',
    },
    identity: {
      label: 'Auteur du projet d’origine',
      body:
        'Adrien Millot est le fondateur du projet original MaxKeyvo. Ce profil attribue les contenus éditoriaux repris à leur source et ne désigne pas l’exploitant de ce site Keyvo.',
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
          'Chaque plan demande des qualités différentes. Keyvo garde capacités, prix, exemples et contrôles visibles pour rendre le choix concret.',
      },
      {
        title: 'Comment nous évaluons les modèles',
        body:
          'Les spécifications fournisseurs, les temps de production observés et les scores éditoriaux Keyvo restent séparés et reliés à leur méthodologie.',
      },
    ],
    independence: {
      title: 'Notre relation commerciale',
      body:
        'Keyvo commercialise l’accès aux modèles présentés. Nous déclarons cette relation et séparons les faits sourcés, les mesures de production observées et le jugement éditorial.',
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
      title: 'Acerca de Keyvo',
      description:
        'Conoce el espacio de producción Keyvo, sus comparativas y el origen de su contenido editorial.',
    },
    hero: {
      eyebrow: 'Acerca de Keyvo',
      title: 'Una forma más clara de elegir y usar modelos de video con IA.',
      subtitle:
        'Keyvo reúne comparación de modelos, precio antes de generar y flujos de producción en un solo espacio de trabajo.',
    },
    identity: {
      label: 'Autor del proyecto original',
      body:
        'Adrien Millot es el fundador del proyecto original MaxKeyvo. Este perfil identifica la fuente del contenido editorial heredado, no al operador de este sitio Keyvo.',
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
          'Cada toma necesita fortalezas diferentes. Keyvo mantiene visibles las capacidades, los precios, los ejemplos y los controles para facilitar una decisión práctica.',
      },
      {
        title: 'Cómo evaluamos los modelos',
        body:
          'Las especificaciones de proveedores, los tiempos de producción observados y las puntuaciones editoriales de Keyvo se mantienen separados y vinculados a su metodología.',
      },
    ],
    independence: {
      title: 'Nuestra relación comercial',
      body:
        'Keyvo comercializa el acceso a los modelos que presenta. Declaramos esa relación y separamos los datos con fuente, las métricas de producción observadas y el criterio editorial.',
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
      title: '关于 Keyvo',
      description: '了解 Keyvo 的制作工作台、模型比较，以及所引用内容的项目来源。',
    },
    hero: {
      eyebrow: '关于 Keyvo',
      title: '更清晰、高效地挑选与使用前沿 AI 视频模型。',
      subtitle: 'Keyvo 将多模型横向对比、生成前透明报价与生产级制作工作流融于一体，打造专注于创意的生成环境。',
    },
    identity: {
      label: '原项目来源署名',
      body: 'Adrien Millot 是原始 MaxKeyvo 项目的创始人。此处保留继承内容的来源署名，不代表当前 Keyvo 站点的运营主体。',
    },
    sections: [
      {
        title: '我们所构建的产品',
        body: '一个整合当下最新及经典 AI 视频模型的一站式工作区，支持精细准备输入参数、生成前获知准确价格，并实时预览交付成果。',
      },
      {
        title: '为何模型选型至关重要',
        body: '不同的镜头需要不同的模型强项。Keyvo 将模型能力边界、实时定价、实测案例与控制项全面透明化，助你做出切实高效的决策。',
      },
      {
        title: '我们如何评估模型',
        body: '官方提供商规格、生产实测耗时与 Keyvo 专业编辑评分严格区分，并公开对应的方法论支撑。',
      },
    ],
    independence: {
      title: '商业关系声明',
      body: 'Keyvo 提供其评测模型的商业化接入与生成服务。我们完全透明地公开这一商业属性，并坚决将客观来源事实、生产实测指标与主观编辑评价清晰隔离。',
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
