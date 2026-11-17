# Keyvo 国内搜索引擎提交指南（给非技术负责人）

本指南配合分支 `sandbox/seo-cn` 的代码使用。代码已经准备好：站点支持"验证文件"和"验证 meta 标签"两种验证方式，并提供百度主动推送脚本。你要做的是去各平台注册、验证、提交，并把平台给你的验证信息发给开发。

引用的百度官方资料（已读）：<https://ziyuan.baidu.com/college/courseinfo?id=267&page=1>（验证方式）、<https://ziyuan.baidu.com/college/courseinfo?id=267&page=2>（API 推送、sitemap、额度）。其他平台的操作细节我没有读到官方文档，凡标"未验证"的请以平台页面当前提示为准。

## 0. 先决条件（一次性）

1. 站点必须用你实际给用户的地址验证：**`https://app.keyvo.cn`**。`keyvo.cn` 会 301 跳转到它，所以验证和提交都用 `app.keyvo.cn`。百度要求验证期间不要跳转到别的域名、不要屏蔽百度爬虫。
2. 验证文件或标签要**一直保留**，百度会定期复查。
3. 开发给你的发布流程：把验证信息发给开发后，他加到服务器配置，你再回平台点"验证"。不要自己改服务器文件。

## 1. 你要发给开发的东西（任选其一，按平台给的方式）

| 方式 | 你发什么 | 开发怎么做 | 生效时间 |
|---|---|---|---|
| 验证文件（推荐，百度/360/搜狗/必应都有） | 平台让你下载的那个文件（例如 `baidu_verify_xxxx.html`、`BingSiteAuth.xml`、`sogousiteverification.txt`），原样发给开发，不要改文件名和内容 | 放入 `frontend/public/`，随下一次发布上线，访问 `https://app.keyvo.cn/<文件名>` 即可 | 发布后立即 |
| meta 标签 | 平台给的那段 `<meta name="..." content="XXXX">` 里的 **content 值**（只要引号里那串） | 在**生产环境变量**里设置（见下表）并重启容器 | 重启后；首页每 60 秒重新生成一次，其他页面可能需要重新发布 |

meta 标签对应的环境变量（设置在运行 `app.keyvo.cn` 的容器/1Panel 环境变量里，不要写进代码仓库）：

| 平台 | 环境变量 | 输出的标签 |
|---|---|---|
| 百度 | `BAIDU_SITE_VERIFICATION` | `baidu-site-verification` |
| 必应 | `BING_SITE_VERIFICATION` | `msvalidate.01` |
| 360 | `SO360_SITE_VERIFICATION` | `360-site-verification` |
| 搜狗 | `SOGOU_SITE_VERIFICATION` | `sogou_site_verification` |
| 神马 | `SHENMA_SITE_VERIFICATION` | `shenma-site-verification` |

没设置的变量不会输出任何标签。标签名是按各平台惯例写的，**未验证**各平台当前是否改名；如果平台给的标签名不同，请把整段标签发给开发。

## 2. 各平台步骤

### 2.1 百度搜索资源平台（最重要，先做）— <https://ziyuan.baidu.com>

1. 用百度账号登录，进入"站点管理 → 添加网站"，填 `https://app.keyvo.cn`，选择"网站类型"（按平台提示选，如综合/工具类）。
2. 选验证方式：文件验证或 HTML 标签验证（百度只提供这两种，已读官方说明）。把文件或标签的 content 值发给开发，按上表上线后，回平台点"完成验证"。
3. 提交 sitemap：左侧"普通收录 → sitemap"，填 `https://app.keyvo.cn/sitemap.xml`（索引文件）。如果平台不接受索引文件，就分别提交 `https://app.keyvo.cn/sitemap-zh.xml` 和 `https://app.keyvo.cn/sitemap-models.xml`。官方说 sitemap 一般 1 小时内处理，但不保证收录，且 sitemap 不影响排名。
4. API 推送：同一页面"API 提交"会显示接口地址和你的 **token（16 位）**。把 token 单独、私下发给开发（不要发群、不要提交到仓库）。开发会把它放进环境变量 `BAIDU_PUSH_TOKEN` 并运行 `scripts/baidu-push-urls.mjs`。官方说明每天额度由你提交的新链接质量决定、会动态调整；**重复提交旧链接会浪费额度，严重时被降额度**。所以脚本默认只推新页面和有更新的页面，每次默认最多 10 条，并且是"演练模式"，必须手动加 `--submit` 才真正发送。
5. 可选：如果 Keyvo 是有主体的企业，之后在平台里做站点属性/官网认证（需要企业材料；"品牌词"展示效果与此有关，具体效果**未验证**）。

### 2.2 360 站长平台 — <https://zhanzhang.so.com>

注册登录 → 添加站点 `https://app.keyvo.cn` → 选文件验证或 meta 验证 → 提交 sitemap（同上地址）。操作细节**未验证**，以页面为准。

### 2.3 搜狗站长平台 — <https://zhanzhang.sogou.com>

流程同上。搜狗对新站点的收录通常较慢，且对 https/备案状态可能有要求（**未验证**）。

### 2.4 神马站长平台（UC/夸克搜索）— <https://zhanzhang.sm.cn>

流程同上。神马与阿里系账号关联，可能需要实名/主体认证（**未验证**）。

### 2.5 必应站长工具 — <https://www.bing.com/webmasters>

你说 `keyvo.cn` 已经验证过。注意：**已验证的资源必须与 `https://app.keyvo.cn` 匹配，或者在 Bing 中把它作为 `keyvo.cn` 的子域名一并管理**。如果 Bing 里验证的是 `keyvo.cn` 而站点实际内容在 `app.keyvo.cn`，需要再添加 `https://app.keyvo.cn`（用 BingSiteAuth.xml 或 `BING_SITE_VERIFICATION`）。必应国内版会不会收录以及 IndexNow 在国内是否生效，**未验证**。

### 2.6 今日头条搜索 / 抖音搜索

目前站点的 `robots.txt` 屏蔽了字节跳动的爬虫 `Bytespider`，头条/抖音搜索大概率因此无法收录。是否放开涉及"是否允许字节系 AI 训练使用站点内容"，**需要你先做决定**，本次没有改动。

## 3. 谁快谁慢

| 动作 | 速度（经验值，除百度 sitemap 外**未验证**） |
|---|---|
| 验证站点所有权 | 发布后几分钟到几小时 |
| 提交 sitemap（百度） | 官方：一般 1 小时内处理 |
| 百度 API 推送 | 官方称最快，但"被推送"不等于"被收录" |
| 页面被收录（出现在 site: 结果里） | 新站通常几天到几周，不保证 |
| 品牌词 `Keyvo` 排到前面 | 数周到数月，取决于站点权重、外部提及 |
| "AI 视频生成""文生视频"等通用词出现在前几页 | 竞争很大，通常需要数月且依赖大量原创内容和外部链接，**不要期待短期结果** |

## 4. 怎么检查收录

1. 百度搜索框输入 `site:app.keyvo.cn`，看有几条结果。0 条不代表有问题，新站常见。
2. 百度资源平台"普通收录"里看提交量、收录量；"站点诊断/抓取诊断"可以测试百度是否能正常抓取首页。
3. 搜索 `Keyvo`、`Keyvo AI视频`，看官网是否出现。
4. 每次发布新页面后再推送一次（开发运行脚本），不要每天重复推同一批链接。

## 5. 诚实预期

- **品牌词**（Keyvo）：只要被收录、没有重名强竞争对手，通常能排到前列，主要取决于收录速度和外部是否有人提到 Keyvo。
- **通用词**（AI视频生成、文生视频、图生视频）：这些是百度上竞争最激烈的词，由大厂和老站占据。本站短期内不会进入前几页。可行路径是长尾（具体模型的使用说明、提示词、价格）加原创内容，详见 `keyvo-cn-content-plan.md`。
- **备案**：页脚已有 ICP 备案号（`津ICP备2025029271号-2`）。备案对国内搜索引擎的信任度有帮助，但我没有找到百度对"必须备案才收录"的官方说明（**未验证**）。
- 我们**没有也不会**承诺任何关键词排名。

## 6. 开发侧操作备忘（发给开发即可）

```bash
# 演练：读取线上 sitemap，列出会推送的新/更新页面，不发送
node scripts/baidu-push-urls.mjs
# 真推送（BAIDU_PUSH_TOKEN 只放环境变量，不会被打印）
BAIDU_PUSH_TOKEN=... BAIDU_PUSH_MAX=10 node scripts/baidu-push-urls.mjs --submit
```

- 状态文件默认 `.baidu-push-state.json`（已推送的 URL 与当天已用额度），不要提交进仓库。
- 可选环境变量：`SITE`（默认 `https://app.keyvo.cn`）、`BAIDU_PUSH_DAILY_MAX`（默认 10）。
- 脚本只会选 `/zh` 下的公开页面；隐藏模型（`keyvo-model-allowlist.json` 中不是 public 的）、对比页、博客、账户页都不会推送。
- 响应里 `remain` 是百度返回的当天剩余额度，请以百度后台为准调整 `BAIDU_PUSH_DAILY_MAX`。
- `Cache-Control: no-transform` 没有在应用里设置（见审计报告第 13 项）。如需防止运营商转码，请在 nginx/1Panel 反向代理里对 `text/html` 追加该响应头，不要加到静态资源和媒体上。
