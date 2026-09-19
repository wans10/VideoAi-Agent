import type { BestForCtaCopy, HubCopy } from './ai-video-engines-copy-types';

export const ZH_HUB_COPY: HubCopy = {
  hero: {
    eyebrow: '对比模型',
    title: '对比 AI 视频生成模型',
    intro:
      '任意选择两个模型，一键开启横向对比。快速浏览热门对决、按核心规格筛选，并在生成前核验实际价格。涵盖文生视频、图生视频及视频重绘模型，助你为镜头选定最合适的方案。',
    compareNow: {
      left: '模型 A',
      right: '模型 B',
      compare: '开始对比',
      searchPlaceholder: '搜索模型...',
      noResults: '未找到相关模型',
      strengthsLabel: '核心优势',
      strengthsFallback: '通用视频生成',
      modeLabels: {
        extend: '镜头延展',
        retake: '重拍分镜',
        t2v: '文生视频',
        i2v: '图生视频',
        v2v: '视频重绘',
      },
    },
  },
  sections: {
    popularTitle: '热门对比',
    popularIntro: '精选主流模型家族之间最受关注的对决组合。',
    useCasesTitle: '按应用场景对比',
    useCasesIntro: '选择你的创作目标，开启针对性的推荐对比。',
    enginesTitle: '选择模型进行对比',
    enginesIntro: '仅展示便于对比的核心规格。完整模型使用建议请前往各模型详情页。',
    enginesToggle: '显示模型目录 ({count})',
    enginesToggleHintClosed: '点击展开',
    enginesToggleHintOpen: '点击折叠',
    allComparisonsTitle: '全部对比组合',
    allComparisonsIntro:
      '先浏览重点对比，或直接在完整目录中搜索。需要了解合规规范？请参阅合规说明。',
    faqTitle: 'AI 视频模型对比常见问题',
    complianceLabel: '查看合规说明',
    quickStartLabel: '快速开始',
    prelaunchSpotlightLabel: '发布前瞻速览',
    prelaunchModelLabel: 'Seedance 2.0 规格档案',
    prelaunchCompareLabel: 'Seedance 2.0 对比 Sora 2',
    prelaunchCompareSecondaryLabel: 'Pika 2.2 对比 Seedance 2.0',
    useCasesFallback: '选择具体用途，寻找契合你项目的对比推荐。',
  },
  tagLabels: {
    audio: '音频生成',
    cinematic: '电影级写实',
    quality: '极致画质',
    long: '长镜头',
    ads: '商业广告',
    product: '商品展示',
    value: '高性价比',
    general: '通用模型',
    i2v: '图生视频',
    social: '社媒短视频',
    fast: '高速生成',
  },
  faq: [
    {
      question: '应该如何选择适合我镜头的 AI 视频模型？',
      answer:
        '先明确你的核心输入形式：只有文本描述时首选文生视频模型；有关键帧或产品图时使用图生视频；需要修改现有视频动作时选用视频重绘。在此基础上综合考量所需时长、分辨率以及是否需要原生音效。',
    },
    {
      question: '对比页面展示的价格是准确的吗？',
      answer:
        '是的。所有价格均基于各模型当前实际按量付费报价计算，生成前应用内还会向你展示最终确认价格，绝无隐藏费用。',
    },
    {
      question: '我可以对比同一个模型家族内的不同版本吗？',
      answer:
        '可以。例如你可以直接对比 Kling 3.0 与 Kling 3.0 Pro、或 Wan 2.1 与 Wan 2.5，直观了解专业版与基础版在画质、耗时及价格上的差异。',
    },
  ],
};

export const ZH_BEST_FOR_CTA: BestForCtaCopy = {
  eyebrow: '匹配你的需求',
  title: '按应用场景挑选模型',
  description: '电影质感、商品广告还是高速草稿？浏览为特定创作场景量身推荐的最佳模型清单。',
  cta: '探索全部场景指南',
  ariaLabel: '按场景查看推荐模型',
};
