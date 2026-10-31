import type { AppLocale } from '@/i18n/locales';
import type { HomeShowcaseSceneId } from '@/app/(localized)/[locale]/(marketing)/(home)/_lib/home-route-data/showcase';

export type HomeShowcaseCopy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  placeholder: string;
  submit: string;
  hint: string;
  chipsLabel: string;
  chips: Array<{ label: string; prompt: string }>;
  scenesLabel: string;
  scenes: Array<{ id: HomeShowcaseSceneId; label: string; description: string; prompt: string }>;
  wallTitle: string;
  wallSubtitle: string;
  wallAll: string;
  loadMore: string;
  loading: string;
  loadError: string;
  detailsCta: string;
  noPreview: string;
  audioAvailable: string;
};

const ZH: HomeShowcaseCopy = {
  eyebrow: 'Keyvo · AI 影像工作室',
  title: '把脑中的一场戏，\n拍成眼前的一镜。',
  subtitle: '输入一段画面描述，开始创作。生成前明确报价，仅为成功的生成付费，无需订阅。',
  placeholder: '描述你想看到的画面：主体、场景、镜头运动与光线……',
  submit: '生成',
  hint: '按 Enter 开始创作，Shift + Enter 换行。进入制作台后可调整模型、时长与画幅。',
  chipsLabel: '试试这些灵感',
  chips: [
    { label: '雨夜街头', prompt: '雨夜的老街，霓虹灯倒映在湿漉漉的石板路上，一个撑着红伞的女孩缓缓走过，镜头从低角度缓慢推进，电影质感。' },
    { label: '产品短片', prompt: '一瓶香水放在深色石台上，柔和的侧光，水珠沿瓶身滑落，镜头环绕缓慢旋转，高级商业广告质感。' },
    { label: '古风武侠', prompt: '清晨的竹林，薄雾缭绕，一位白衣剑客在竹梢间轻盈跃起，剑光划过，慢动作，东方美学。' },
    { label: '萌宠日常', prompt: '一只橘猫戴着小围裙在厨房里认真地揉面团，面粉飞扬，阳光从窗外洒进来，温暖治愈的画面。' },
  ],
  scenesLabel: '按场景开始',
  scenes: [
    { id: 'marketing', label: '营销广告', description: '产品短片与品牌广告', prompt: '一款新品运动鞋悬浮在纯色背景前缓慢旋转，光影流动，特写展示材质细节，节奏明快的品牌广告片。' },
    { id: 'cinematic', label: '影视叙事', description: '镜头语言与叙事片段', prompt: '黄昏的海边悬崖，一位旅人望向远处的灯塔，海风吹动衣角，镜头由远及近缓慢推进，电影级调色。' },
    { id: 'creative', label: '创意设计', description: '风格化与动态视觉', prompt: '抽象的彩色液态金属在黑色背景中流动变形，高对比度，丝滑循环的动态视觉，适合作为品牌开场动画。' },
    { id: 'everyone', label: '大众创作', description: '人人都能做的趣味短片', prompt: '一只毛茸茸的卡通小兔子抱着一大束彩色花朵在草地上蹦蹦跳跳，明亮可爱的色彩，欢快的氛围。' },
  ],
  wallTitle: '灵感作品',
  wallSubtitle: '真实生成的案例。悬停预览，点开查看提示词与生成参数。',
  wallAll: '浏览全部案例',
  loadMore: '加载更多',
  loading: '加载中…',
  loadError: '加载失败，点击重试',
  detailsCta: '查看提示词与参数',
  noPreview: '暂无预览',
  audioAvailable: '播放时含音频',
};

const EN: HomeShowcaseCopy = {
  eyebrow: 'Keyvo · AI video studio',
  title: 'Turn the scene in your head\ninto a shot on screen.',
  subtitle: 'Describe a scene to start. You see the price before generating and pay only for successful renders, with no subscription.',
  placeholder: 'Describe what you want to see: subject, setting, camera movement and light…',
  submit: 'Generate',
  hint: 'Press Enter to start, Shift + Enter for a new line. Model, duration and framing are adjustable in the studio.',
  chipsLabel: 'Try an idea',
  chips: [
    { label: 'Rainy street', prompt: 'A rain-soaked old street at night, neon reflecting on wet stone, a girl with a red umbrella walks past, slow low-angle push-in, cinematic.' },
    { label: 'Product film', prompt: 'A perfume bottle on a dark stone plinth, soft side light, water droplets sliding down the glass, slow orbiting camera, premium commercial look.' },
    { label: 'Martial arts', prompt: 'A misty bamboo forest at dawn, a swordsman in white leaps between the treetops, a flash of steel, slow motion, eastern aesthetics.' },
    { label: 'Pet moment', prompt: 'A ginger cat in a tiny apron kneads dough in a sunlit kitchen, flour drifting through the air, warm and heartwarming.' },
  ],
  scenesLabel: 'Start from a scene',
  scenes: [
    { id: 'marketing', label: 'Advertising', description: 'Product films and brand spots', prompt: 'A new sneaker floats and slowly rotates in front of a plain backdrop, flowing light, close-ups of material detail, a fast-paced brand spot.' },
    { id: 'cinematic', label: 'Cinematic', description: 'Camera language and story beats', prompt: 'A traveller on a seaside cliff at dusk looks toward a distant lighthouse, wind in the clothes, slow push-in, cinematic colour grade.' },
    { id: 'creative', label: 'Creative design', description: 'Stylised motion visuals', prompt: 'Abstract coloured liquid metal flows and morphs against black, high contrast, a smooth looping motion visual for a brand opener.' },
    { id: 'everyone', label: 'For everyone', description: 'Fun shorts anyone can make', prompt: 'A fluffy cartoon bunny hops across a meadow carrying a huge bouquet of bright flowers, cheerful and colourful.' },
  ],
  wallTitle: 'Inspiration',
  wallSubtitle: 'Real generated examples. Hover to preview, open for the prompt and settings.',
  wallAll: 'Browse all examples',
  loadMore: 'Load more',
  loading: 'Loading…',
  loadError: 'Could not load. Tap to retry',
  detailsCta: 'View prompt & settings',
  noPreview: 'No preview',
  audioAvailable: 'Audio available on playback',
};

/** Keyvo serves Chinese pages; every other locale keeps readable English copy. */
export function getHomeShowcaseCopy(locale: AppLocale): HomeShowcaseCopy {
  return locale === 'zh' ? ZH : EN;
}
