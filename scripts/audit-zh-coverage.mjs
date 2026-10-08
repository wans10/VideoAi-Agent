import { readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => JSON.parse(readFileSync(path.join(root, file), 'utf8'));
const files = (directory) => existsSync(directory) ? readdirSync(directory).filter((file) => /\.(json|mdx?)$/.test(file)).sort() : [];
function flatten(value, prefix = '', result = {}) {
  if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, child]) => flatten(child, prefix ? `${prefix}.${key}` : key, result));
  } else result[prefix] = value;
  return result;
}
function frontMatter(file) {
  const source = readFileSync(file, 'utf8');
  const header = /^---\n([\s\S]*?)\n---/.exec(source)?.[1] ?? '';
  return { slug: /^slug:\s*["']?([^"'\n]+)["']?$/m.exec(header)?.[1], canonicalSlug: /^canonicalSlug:\s*["']?([^"'\n]+)["']?$/m.exec(header)?.[1] };
}
const en = flatten(read('frontend/messages/en.json'));
const zh = flatten(read('frontend/messages/zh.json'));
const proseCandidate = (value) => typeof value === 'string' && /[A-Za-z]{3}\s+[A-Za-z]{3}/.test(value) && (!/[\u3400-\u9fff]/.test(value) || /\b(?:Compare|Specs & Pricing|What's New|Speed 对比 Quality|AI Video Model Comparison)\b/.test(value)) && !/^(?:\/|https?:\/\/)/.test(value);
const properName = /^(?:(?:OpenAI |Google )?(?:Sora|Veo)|LTX|MiniMax|Nano Banana|Happy Horse|Grok Imagine|GPT Image|FLUX|Kling|KLING|Pika(?: Labs| Text)|Luma|Seed Audio|Google Lyria|Mirelo|Recraft|VideoAI Studio|OGG Opus)/;
const copyCandidates = Object.entries(zh).filter(([key, value]) => proseCandidate(value) && !properName.test(value) && !/\.(?:id|slug|engineId|modelSlug|examplesSlug|providerKey|canonicalSlug|href|src|url|image|poster|mode|type)(?:\.|$)/.test(key)).map(([key, value]) => ({ key, value }));
const comparisonFiles = files('content/comparisons');
const missingComparisons = comparisonFiles.filter((file) => !read(`content/comparisons/${file}`).zh).map((file) => `/zh/ai-video-engines/${file.replace(/\.json$/, '')}`);
const englishModels = files('content/models/en');
const chineseModels = files('content/models/zh');
const missingModels = englishModels.filter((file) => !chineseModels.includes(file));
const missingMarkdown = [];
for (const [englishRoot, chineseRoot, route] of [['content/docs', 'content/zh/docs', 'docs'], ['content/en/best-for', 'content/zh/best-for', 'ai-video-engines/best-for'], ['content/en/blog', 'content/zh/blog', 'blog']]) {
  const chineseSlugs = new Set(files(chineseRoot).filter((file) => /\.mdx?$/.test(file)).map((file) => { const meta = frontMatter(path.join(chineseRoot, file)); return meta.canonicalSlug ?? meta.slug ?? file.replace(/\.mdx?$/, ''); }));
  for (const file of files(englishRoot).filter((file) => /\.mdx?$/.test(file))) {
    const meta = frontMatter(path.join(englishRoot, file));
    const slug = meta.canonicalSlug ?? meta.slug ?? file.replace(/\.mdx?$/, '');
    if (!chineseSlugs.has(slug)) missingMarkdown.push({ source: `${englishRoot}/${file}`, path: `/zh/${route}/${slug}` });
  }
}
const comparisonCopyCandidates = comparisonFiles.flatMap(file => Object.entries(flatten(read(`content/comparisons/${file}`).zh ?? {})).filter(([key, value]) => /(?:^|\.)(?:heroIntro|body|title|description|question|answer|label)$/.test(key) && typeof value === 'string' && /\b(?:View |quality|audio and|or Stay|Cinematic |Final |Lower |Uses|Compare |Upgrade)\b/.test(value)).map(([key, value]) => ({ file, key, value })));
const report = { comparisonCopyCandidates, missingMessageKeys: Object.keys(en).filter((key) => !(key in zh)), modelFiles: { english: englishModels.length, chinese: chineseModels.length, missing: missingModels }, comparisons: { total: comparisonFiles.length, missing: missingComparisons }, missingMarkdown, copyCandidates };
if (process.argv.includes('--json')) console.log(JSON.stringify(report, null, 2));
else {
  const lines = ['# 简体中文覆盖检查', '', '基于当前源码检查。缺少独立内容不等于整个页面都是英文：对比页可使用中文通用模板；文档和用途指南则会回退英文正文。候选英文文案须人工确认，专有名词、用户内容和提示词不应机械翻译。该脚本仅检查翻译资源和内容文件，不判断页面实际选择了哪种语言；集成页运行时文案由 `tests/mcp-marketing-copy.test.ts` 检查。此报告不代替全部页面渲染、登录后交互状态及线上部署检查。', '', `- 翻译资源缺少键：${report.missingMessageKeys.length}`, `- 模型文件：英文 ${englishModels.length} / 中文 ${chineseModels.length}；缺少 ${missingModels.length}`, `- 独立对比内容：${comparisonFiles.length} 份，缺少中文 ${missingComparisons.length} 份`, `- 缺少中文 Markdown：${missingMarkdown.length} 篇`, `- 翻译资源英文候选：${copyCandidates.length} 条`, `- 对比内容残留英文候选：${comparisonCopyCandidates.length} 条`, '', '## 本次已修复并验证', '', '- 新增 `/zh/return-policy`，保留英文原地址；中文页脚、法律中心和公司页链接指向中文版本。', '- 对比页无对决样片及原生 4K 场景的 FAQ 使用中文；相关推荐中的 vs 改为对比。', '- 修正翻译资源中的对比 SEO、模型介绍、法律摘要和更新日志；补齐案例导航、模型通用提示与文档日期标签。', '- 补齐 65 份对比内容、12 篇用途指南、3 篇文档和 7 篇完整结构化博客；当前 67 份对比与 15 篇博客均有中文内容。', '- 纠正美元价格乱码、8 宫格角色设定表被误称三视图，以及 Retake 的译名；澄清高分辨率与最长时长不能任意组合。', '- 博客保留原始提示词、引用来源标题、视频中的原始字幕及媒体和出版来源标识，中文界面明确提示示例提示词为英文。', '- 本地抽查退款、对比、用途指南、文档、博客和模型页，验证 HTTP 200、中文标题与正文、canonical、hreflang 和有效 JSON-LD；尚未部署。', '', '## 2026-10-02 集成页复核纠正', '', '- 前次检查漏掉了集成页运行时入口：zh 被回退至英文，只有上层标题被翻译。已接入中文内容，补齐共享复制控件和 OpenClaw 中文正文。', '- 修正 n8n 公开模板上架状态及尚未验证的宿主说明；五个集成页增加完整中文文案和服务端渲染回归检查。', '', '## 2026-10-02 共享组件与回退路径复核', '', '- 补齐案例页加载、预览、复用及品牌导航，模型价格链接、对比选择器和通用能力差异说明。', '- 补齐素材库空状态、参考选择器、素材详情与工具入口、助手入口、示例素材名称和 Studio 邀请登录提示。', '- 补齐批量预览、角色主体参考、高级设置和费用标签；Seedance 失败、生成前校验与已确认钱包退款提示使用中文。', '- 增加运行时文案、共享组件实际渲染和中文退款边界回归测试；不翻译原始提示词、文件名、模型名称或结构化参数。', '- 中文与相关功能回归 43 项通过，另有 51 项架构/素材契约检查通过；lint、TypeScript、公开暴露检查及 diff 检查通过。Studio 扩展测试在允许本地测试进程后为 524/539 通过，15 项因 initdb 初始化失败或 Node 24 与测试要求的 Node 22 不符而未通过。', '- 本地抽查 8 个中文公开页面（案例及 Kling 案例、价格、Kling 模型、MiniMax/Seedance 对比、Claude/n8n 集成、退款政策），均返回 200，核对 canonical、hreflang 和有效 JSON-LD。登录后完整交互、管理员界面及线上版本尚未全部验证，本批修改尚未部署。', '', '## 缺少独立中文对比内容', '', ...missingComparisons.map((entry) => `- ${entry}`), '', '## 缺少中文文章', '', ...missingMarkdown.map((entry) => `- ${entry.path}（${entry.source}）`), '', '## 待人工复核的英文候选', '', ...copyCandidates.map((entry) => `- ${entry.key}：${entry.value}`), '', '## 复现', '', '`node scripts/audit-zh-coverage.mjs`；机器可读清单：`node scripts/audit-zh-coverage.mjs --json`。', ''];
  if (process.argv.includes('--write')) writeFileSync('docs/engineering/zh-coverage-audit.md', lines.join('\n'));
  else console.log(lines.join('\n'));
}
