import type { BestForCtaCopy, HubCopy } from './ai-video-engines-copy-types';

export const ZH_HUB_COPY: HubCopy = {
  hero: {
    eyebrow: '对比模型',
    title: '对比 AI 视频生成模型',
    intro:
      '任意选择两个模型，一键开启横向对比。使用此中心快速浏览热门对决、按核心限制筛选，并在生成前核验实际价格。涵盖文生视频、图生视频及视频重绘模型，助你为镜头选定最合适的方案。',
    compareNow: {
      left: '模型 A',
      right: '模型 B',
      compare: '对比模型',
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
    useCasesFallback: '交互式标签可即时优化推荐。所有链接均为纯 HTML，便于检索。',
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
    storyboards: '分镜脚本',
  },
  useCaseLabels: {
    cinematic: '电影级写实',
    ads: '商业广告',
    social: '社媒短视频',
    product: '商品展示',
    storyboards: '分镜脚本',
    audio: '原生音频',
    'no-audio': '无音频',
    'best-value': '高性价比',
    'best-quality': '最高画质',
    'text-to-video': '文生视频',
    'image-to-video': '图生视频',
    'video-to-video': '视频重绘',
  },
  popularCompareLabel: '对比',
  catalogLabels: {
    sortAll: '全部',
    toggles: {
      includeWaitlistEarlyAccess: '包含候补名单 / 抢先体验',
    },
    filters: {
      mode: '生成模式',
      audio: '音频支持',
      duration: '生成时长',
      resolution: '分辨率',
      status: '状态',
      provider: '提供方',
      clear: '清空筛选',
    },
    options: {
      all: '全部',
      modeT2v: '文生视频',
      modeI2v: '图生视频',
      modeV2v: '视频重绘',
      audioOn: '有音频',
      audioOff: '无音频',
      durationShort: '< 8秒',
      durationMedium: '8-11秒',
      durationLong: '12秒+',
      resolution720: '720p+',
      resolution1080: '1080p+',
      resolution4k: '4K',
      statusLive: '已上线',
      statusEarly: '抢先体验',
    },
    specs: {
      modes: '生成模式',
      audio: '音频',
      status: '状态',
      duration: '最长时长',
      resolution: '最高分辨率',
      yes: '是',
      no: '否',
      unknown: '未知',
      secondsSuffix: '秒',
      statusLive: '已上线',
      statusEarly: '抢先体验',
    },
    ctas: {
      model: '模型详情',
      compare: '对比',
    },
    empty: '没有符合这些筛选条件的模型。',
  },
  listLabels: {
    searchPlaceholder: '搜索对比组合...',
    loadMore: '加载更多',
    empty: '未找到符合搜索条件的对比组合。',
  },
  faq: [
    {
      question: '如何快速对比两款 AI 视频模型？',
      answer:
        '使用页面顶部的“对比模型”小组件，分别选择模型 A 和模型 B，点击“对比模型”即可打开标准对决页面。在两个 AI 模型上使用相同的提示词进行测试，即可在正式生成前直观对比运动连贯性与提示词还原度。',
    },
    {
      question: '为什么不同对比组合中展示的核心优势不同？',
      answer:
        '每款模型在生成速度、提示词还原度、动态真实感、时长以及音频支持方面各有侧重。最佳选择取决于具体的镜头需求与制作周期。在生成前对比模型，能够有效节省制作时间与成本。',
    },
    {
      question: '可以同时对比文生视频和图生视频模型吗？',
      answer:
        '可以。本中心包含混合模式对决，方便你横向对比主打文本提示词、图片参考输入或两者的模型。此外，当可用时也可纳入视频重绘模型。',
    },
    {
      question: '在两款实力接近的模型之间该如何抉择？',
      answer:
        '建议先按应用场景标签进行初步筛选，再通过直接的并排对比进行验证。若难分高下，可使用相同的文本提示词或参考图进行试跑，根据最终成片格式优先权衡还原度、运动稳定性与渲染交付速度。',
    },
  ],
};

export const ZH_BEST_FOR_CTA: BestForCtaCopy = {
  title: '想要场景推荐而非单独对决？',
  body: '打开场景指南，查看电影质感、参考控制、广告、UGC、4K 与多镜头分镜的排名推荐。',
  label: '浏览场景推荐指南',
};
