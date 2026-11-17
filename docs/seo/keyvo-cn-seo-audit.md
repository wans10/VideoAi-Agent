# Keyvo 国内搜索（百度等）SEO 审计报告

审计日期：2026-11-17。范围：`sitemap-zh.xml`（36 条）与 `sitemap-models.xml`（17 条）里的全部中文公开页，共 53 个页面。
本报告写给产品负责人，先读"一、结论摘要"，细节和证据在后面。"修复状态"一栏说明本次分支（`sandbox/seo-cn`）已经改了什么。

## 审计方法与局限

- 没有访问线上站点。我在测试容器里用仓库代码起了一个本地 Next 开发服务（`NEXT_PUBLIC_SITE_URL=https://app.keyvo.cn`），按 sitemap 构造器生成的 URL 逐页抓取 HTML，再解析 `<title>`、description、h1、canonical、hreflang、Open Graph / Twitter、JSON-LD。
- 本地数据库是空的（只有迁移建出来的表）。因此：案例页的真实视频卡片、价格页的价格表和 FAQ 区块在这次抓取里没有渲染。凡是依赖线上数据的结论，下面都标了"未验证"。
- 没有调用任何搜索引擎接口，关于百度行为的说法见"内容计划"文档里的"未验证"标注。
- 标题宽度按"汉字=1，英文/数字=0.5"估算。百度结果页大约显示 30 个汉字的标题、78 个汉字的描述（该数字是业内经验值，**未验证**为百度官方当前规则）。

## 一、结论摘要

1. **页面本身是健康的**：53 个页面全部返回 200，都是服务端渲染，每页有且只有 1 个 h1、1 个 canonical（指向 `https://app.keyvo.cn/zh...`）、`lang="zh"`、`viewport`，没有页面被 noindex，没有重复的标题或描述，JSON-LD 全部是合法 JSON。
2. **hreflang 没有外泄**：zh 页面本身不输出任何 hreflang 链接；`sitemap-zh.xml` 和 `sitemap-models.xml` 里的 alternate 只有 `zh` 和 `x-default` 两个，没有 en/fr/es。没有发现 404 或重定向的 sitemap 条目。
3. **分享卡片（微信/QQ 用的 og:title、og:description、og:image）都是绝对的 https 地址**，并且在 `app.keyvo.cn` 或 `media.maxvideoai.com` 上。后者是样例视频封面的来源，你已决定以后自托管，这里不改，只提醒：国内网络访问境外域名的图片可能很慢，微信抓取分享图有失败风险。
4. **最大的品牌问题：10 个模型页的标题、描述和分享卡片写的是 "VideoAI" 而不是 Keyvo**（Happy Horse 1.1、Seedream 5.0 Pro、Kling 3 4K / Pro / Standard、Kling 3.0 Omni 4K / Pro / Standard、Kling 3 Turbo Pro / Standard），页面正文里还有 1~10 处 "VideoAI"。搜索 "Keyvo" 时这些页面会显得不属于这个品牌。已修复，见下文。
5. **有 5 处页面标题/描述/结构化数据提到了 Keyvo 没有上架的模型**：`/zh/models/video`（Haiper、Luma）、`/zh/models/image`（Nano Banana、Midjourney）、`/zh/pay-as-you-go-ai-video-generator`（描述、FAQ 与应用 JSON-LD 里的 FLUX 3 Max、LTX、Google Veo）、`/zh/tools`（"镜头视角控制"工具已隐藏）、`/zh/about`（"模型比较"功能已隐藏）。已修复这五处的元数据与结构化数据。
6. **sitemap 的 lastmod 在线上大面积缺失**：生产镜像不含 Git 历史，代码依赖 `git log` 取每页更新日期，线上取不到，所以只有手工登记的条目有日期，sitemap 索引里 `sitemap-video-pages.xml` 与 `sitemap-video.xml` 没有 lastmod。已修复（登记日期 + 构建日期兜底），见下文。
7. **robots.txt 屏蔽了 Bytespider（字节跳动爬虫）**：今日头条搜索/抖音搜索使用这个爬虫。如果希望在头条搜索里出现，需要放开；这与"是否允许字节系 AI 训练"是同一条规则，**你还没决定，本次没有改动**。百度（Baiduspider）、360、搜狗、神马、必应的爬虫没有被屏蔽。
8. **站点已有 Organization + WebSite 结构化数据**（每页都有），但原先描述是英文、logo 指向 favicon、没有品牌别名。已改为中文描述、`alternateName: "Keyvo 影像工作室"`（这个名字已出现在站点标题与导航里）、logo 改为 `/assets/branding/app-icon-512.png`。没有写任何 `sameAs`（没有真实账号地址）。
9. **缺少 SoftwareApplication / BreadcrumbList 的页面很多**：首页只有 Organization + WebSite；模型页只有 FAQPage（没有面包屑，也没有 SoftwareApplication/Product）。这些要和可见内容一致、且涉及价格，本次没有擅自添加，放入内容计划。
10. **仍然偏薄（正文汉字少于 600）的页面都是法律/信息页**，不需要为排名加内容；唯一的异常是 `/zh/legal/reconsent`（52 字，用户登录后确认协议的流程页），已设为 noindex 并移出 sitemap。

## 二、逐页检查表（修复前的状态）

列：路径 | 标题（宽度）| 描述（宽度）| h1 | 额外结构化数据（除 Organization、WebSite 外）| 正文汉字数。
抓取时全部为 HTTP 200；canonical 均为本页自身的 https://app.keyvo.cn/zh... 地址；全部页面 og:url、og:image 为绝对 https 地址，og:locale = zh_CN，twitter:card = summary_large_image。

| 路径 | 标题 | 描述 | h1 | 额外结构化数据 | 正文汉字 |
|---|---|---|---|---|---|
| /zh | 按需付费 AI 视频生成平台 \| Keyvo (16) | 按需付费的 AI 视频生成平台：Seedance、Kling、Wan、Hap… (65.5) | 把脑中的一场戏，拍成眼前的一镜。 | — | 3054 |
| /zh/about | 关于 Keyvo (5) | 了解 Keyvo 的制作工作台、模型比较，以及所引用内容的项目来源。 (30.5) | 更清晰、高效地挑选与使用前沿 AI  | WebPage/BreadcrumbList | 882 |
| /zh/ai-video-prompt-generator | AI 视频提示词生成器与助手 \| Milo — Keyvo (20) | 告别空白提示词。认识 Milo，Keyvo 的视频、图片与音频创意 AI 助… (53.5) | 你提供创意， Milo 帮你写好提示 | WebPage/FAQPage | 1660 |
| /zh/changelog | 更新日志 — Keyvo (8) | 透明公开关于模型引擎、工作流与生成队列性能的最新动态。 (27) | 更新日志 | — | 812 |
| /zh/company | 公司与信任 — Keyvo (9) | 查看 Keyvo 关于公司、编辑准则、产品运营、内容权益、隐私和法律条款的资… (36.5) | Keyvo 背后的人员、标准与政策。 | — | 498 |
| /zh/contact | 联系 Keyvo — 技术支持与商务合作 (15.5) | 联系 Keyvo 团队获取技术支持、商务合作洽谈及企业接入咨询。 (28.5) | 联系团队 | — | 1005 |
| /zh/docs | 文档 — 新手入门、定价计费、任务处理与退款政策 — Keyvo (26.5) | Keyvo 使用指南：账户引导、预先报价、生成任务、媒体库、品牌安全及自动退… (37) | 文档中心 | CollectionPage/BreadcrumbList | 1446 |
| /zh/docs/brand-safety | 内容安全检查 — Keyvo 文档 (12.5) | 了解模型提供商检查、被阻止的生成，以及如何审核输入与结果。 (29) | 内容安全检查 | — | 764 |
| /zh/docs/get-started | Keyvo 入门指南 — Keyvo 文档 (13.5) | 创建个人账号、充值钱包、确认生成前价格，并跟踪任务。 (26) | Keyvo 入门指南 | — | 819 |
| /zh/editorial-standards | 编辑准则与标准 — Keyvo (11) | 了解 Keyvo 如何处理内容署名、事实来源、勘误更新、评测基准调整及商业利… (38.5) | 面向实用 AI 视频研究的编辑标准。 | WebPage/BreadcrumbList | 998 |
| /zh/examples | AI 视频案例：提示词、模型与生成费用记录 — Keyvo (23.5) | 浏览真实 AI 视频案例，打开视频查看提示词、参数、时长与生成费用，一键复刻… (39) | 镜头放映室 | BreadcrumbList/ItemList/FAQPage | 3854 |
| /zh/examples/hailuo | MiniMax AI 视频案例（提示词 + 参数设置）\| Keyvo (23.5) | MiniMax 案例：提示词、参数设置与当前生成价格估算，可打开对应详情页查… (56.5) | MiniMax 案例 | BreadcrumbList/ItemList/FAQPage | 3991 |
| /zh/examples/happy-horse | Happy Horse AI 视频案例（提示词 + 参数设置）\| Keyvo (25.5) | Happy Horse 案例：提示词、参数设置与当前生成价格估算，可打开对应… (53) | Happy Horse 案例 | BreadcrumbList/ItemList/FAQPage | 2354 |
| /zh/examples/kling | Kling AI 视频案例（提示词 + 参数设置）\| Keyvo (22.5) | Kling 案例：提示词、参数设置与当前生成价格估算，可打开对应详情页查看。… (96.5) | Kling 案例 | BreadcrumbList/ItemList/FAQPage | 4266 |
| /zh/examples/seedance | Seedance AI 视频案例（提示词 + 参数设置）\| Keyvo (24) | Seedance 案例：提示词、参数设置与当前生成价格估算，可打开对应详情页… (50) | Seedance 案例 | BreadcrumbList/ItemList/FAQPage | 4172 |
| /zh/examples/wan | Wan AI 视频案例（提示词 + 参数设置）\| Keyvo (21.5) | Wan 案例：提示词、参数设置与当前生成价格估算，可打开对应详情页查看。本页… (50.5) | Wan 案例 | BreadcrumbList/ItemList/FAQPage | 3878 |
| /zh/legal | 法律中心 — Keyvo (8) | 我们法律协议、隐私承诺与合规资源的权威来源。 (22) | 法律中心 | — | 251 |
| /zh/legal/acceptable-use | 可接受使用政策 — Keyvo (11) | 规范 Keyvo 使用的规则，包括对滥用或非法内容的限制。 (25.5) | 可接受使用政策 | — | 543 |
| /zh/legal/cookies-list | Cookie 清单 — Keyvo (9.5) | Keyvo 使用的 Cookie 和 SDK 清单。 (16.5) | Cookie 与 SDK 清单 | — | 200 |
| /zh/legal/mentions | 运营者信息 — Keyvo (9) | Keyvo 运营者、备案与联系方式等公示信息。 (20) | 运营者信息 | — | 236 |
| /zh/legal/privacy | 隐私政策 — Keyvo (8) | Keyvo 如何收集、使用、存储和保护个人数据。 (21) | 隐私政策 | — | 2101 |
| /zh/legal/reconsent | 法律更新确认 — Keyvo (10) | 查看并确认更新后的 Keyvo 法律文件。 (17.5) | 查看更新 | — | 52 |
| /zh/legal/subprocessors | 子处理者 — Keyvo (8) | Keyvo 用于提供服务的第三方服务商。 (17) | 子处理方清单 | — | 362 |
| /zh/legal/takedown | 通知与下架 — Keyvo (9) | 举报通过 Keyvo 生成的滥用或非法内容。 (18.5) | 通知与下架 | — | 533 |
| /zh/legal/terms | 服务条款 — Keyvo (8) | Keyvo 服务条款，规范对平台及 AI 辅助视频生成工具的访问与使用。 (31) | 服务条款 | — | 2302 |
| /zh/models | AI 视频与图像模型：技术规格、限制与定价 \| Keyvo (23.5) | 在 Keyvo 上生成前，全面对比 AI 视频与图像模型的价格、最大时长、分… (52.5) | 为您的下一个灵感找到最合适的模型 | — | 2642 |
| /zh/models/image | AI 图像模型：规格、限制与定价 \| Keyvo (18.5) | AI 图像生成模型目录，包含 Nano Banana、Midjourney … (46) | AI 图像模型（规格、限制与定价） | — | 774 |
| /zh/models/video | AI 视频模型：规格、限制与定价 \| Keyvo (18.5) | AI 视频生成模型目录，涵盖 Kling、Haiper、Luma 等。在生成… (44) | AI 视频模型（规格、限制与定价） | — | 1565 |
| /zh/pay-as-you-go-ai-video-generator | 按需付费 AI 视频生成器（生成前获知精准价格） — Keyvo (26) | 无需订阅即可制作 AI 视频。对比 FLUX 3 Max、MiniMax H… (62) | 按需付费 AI 视频生成器 | — | 679 |
| /zh/pricing | AI 视频生成计费与模型价格对比 \| Keyvo (18.5) | 按模型、时长、分辨率与音频对比 AI 视频价格。查看 720p、1080p … (52.5) | 把预算留给值得拍的镜头。 | FAQPage | 940 |
| /zh/return-policy | 退款与退换政策 \| Keyvo (11) | 了解 Keyvo 数字化 AI 视频生成服务和钱包额度的退款规则、生成失败处… (48.5) | 退款与退换政策 | — | 255 |
| /zh/status | 服务状态 — Keyvo (8) | 查看当前 Keyvo 服务公告，获取受影响 AI 视频生成任务的帮助。 (29.5) | 服务状态 | — | 642 |
| /zh/studio | Studio — 通过对话创作图片、视频和音频 — Keyvo (22.5) | 在 Keyvo Studio 中使用参考素材创作图片、视频和音频，审核生成报… (44) | 创作、编辑、探索。 只需告诉 Mil | WebPage/BreadcrumbList/FAQPage | 1228 |
| /zh/tools | AI 前期制作工具箱：图像与视频工作流 \| Keyvo (21.5) | 在生成视频前构建可复用的角色参考素材与更具表现力的起始首帧。探索用于一致性角… (59.5) | 先把这一场戏准备好。 | — | 692 |
| /zh/tools/character-builder | AI 角色一致性生成器 \| 面向图片与视频的可复用角色参考 — Keyvo (30) | 基于单张照片、可选服饰参考或全新构想，创建可复用的肖像锚点与 8 宫格 AI… (74.5) | 先认识这个人，再安排他的镜头。 | FAQPage/BreadcrumbList/Service/HowTo | 1635 |
| /zh/workflows | AI 视频创作工作流：实时透明计费与多变体生成 \| Keyvo (25.5) | 在单一工作区内生成 AI 视频：选择模型、设置时长/分辨率/宽高比、预览实时… (60.5) | 创作工作流 | FAQPage | 1189 |
| /zh/models/happy-horse-1-1 | Happy Horse 1.1：定价、原生音频与参考视频 \| VideoAI (25.5) | 在 VideoAI 上探索 Happy Horse 1.1 定价、原生音频、… (51) | Happy Horse 1.1 | FAQPage | 2278 |
| /zh/models/seedance-2-5 | Seedance 2.5 AI 视频生成器：30秒、1080p 与音频 — Keyvo (27) | 使用文本、帧、多模态参考、视频编辑、延伸及可选音频，生成最长 30 秒、最高… (50.5) | Seedance 2.5 | FAQPage | 2290 |
| /zh/models/seedream-5-0-pro | Seedream 5.0 Pro - 专业字节跳动图像生成 \| VideoAI (24.5) | 使用 VideoAI 中的 Seedream 5.0 Pro 创建专业静态图… (45.5) | Seedream 5.0 Pro - | FAQPage | 1826 |
| /zh/models/kling-3-4k | Kling 3 4K：原生 4K 价格与案例 \| VideoAI (20) | 使用 Kling 3 4K 生成原生 4K 交付成片，适用于定稿图生视频镜头… (47) | Kling 3 4K | FAQPage | 3006 |
| /zh/models/kling-3-pro | Kling 3 Pro：价格、原生音频与 15 秒镜头控制 \| VideoAI (26.5) | 生成具备分镜控制、原生音频、1080p 画质、3–15 秒时长的 Kling… (56) | Kling 3 Pro | FAQPage | 3003 |
| /zh/models/kling-3-standard | Kling 3 Standard：价格、1080p 草稿与案例 \| VideoAI (25) | 使用 Kling 3 Standard 进行高性价比的 1080p 首帧草稿… (58) | Kling 3 Standard | FAQPage | 3026 |
| /zh/models/kling-o3-4k | Kling 3.0 Omni 4K：原生 4K 参考生视频 \| VideoAI (23.5) | 使用 Kling 3.0 Omni 4K 生成原生 4K 参考图引导与分镜引… (52) | Kling 3.0 Omni 4K | FAQPage | 2585 |
| /zh/models/kling-o3-pro | Kling 3.0 Omni Pro：参考图、故事板分镜与 V2V \| VideoAI (27) | 使用 Kling 3.0 Omni Pro 进行参考图生视频、分镜故事板输入… (58) | Kling 3.0 Omni Pro | FAQPage | 3066 |
| /zh/models/kling-o3-standard | Kling 3.0 Omni Standard：参考图草稿与视频生视频 (V2V) \| VideoAI (31.5) | 使用 Kling 3.0 Omni Standard 进行更低成本的参考图生… (57.5) | Kling 3.0 Omni Sta | FAQPage | 2864 |
| /zh/models/kling-3-turbo-pro | Kling 3 Turbo Pro：1080p 画质、原生音频与价格 \| VideoAI (27.5) | 通过文本或首帧图像生成 3–15 秒 1080p 的 Kling 3 Tur… (48) | Kling 3.0 Turbo Pr | — | 1984 |
| /zh/models/kling-3-turbo-standard | Kling 3 Turbo Standard：720p 画质、原生音频与价格 \| VideoAI (29.5) | 通过文本或首帧图像生成 3–15 秒 720p 的 Kling 3 Turb… (50) | Kling 3.0 Turbo St | — | 2012 |
| /zh/models/kling-v4 | Kling 4.0 —— 掌控场景、参考与声音 \| Keyvo (20.5) | 探索 Kling 4.0：3–30 秒视频、720p 与 1080p、定时分… (47) | Kling 4.0 —— 掌控场景、 | FAQPage | 2982 |
| /zh/models/kling-v4-flash | Kling 4.0 Flash —— 以 720p 导演一段短场景 \| Keyvo (24.5) | 可从提示词开始创作，让起始图像动起来，或用视觉参考引导新场景。输出为 720… (37.5) | Kling 4.0 Flash —— | FAQPage | 2158 |
| /zh/models/minimax-h3 | MiniMax H3 AI 视频生成器：2K、参考控制与原生音频 — Keyvo (28) | 通过文本、首尾帧或图像、视频及音频参考生成 4–15 秒 768P 或 2K… (51) | MiniMax H3 | FAQPage | 2349 |
| /zh/models/minimax-h3-max | MiniMax H3 Max AI 视频：快速 768P、参考图与音频 — Keyvo (27.5) | 从文本、帧图像或混合图像、视频及音频参考生成 5–15 秒的 MiniMax… (50.5) | MiniMax H3 Max | — | 1925 |
| /zh/models/wan-3 | Wan 3 AI 视频模型、创作工作流与定价方案 — Keyvo (23.5) | 全面了解 Wan 3 在文生、图生及多模态参考视频中的应用，涵盖各模式限制、… (57.5) | Wan 3 | — | 2464 |
| /zh/models/wan-3-prime | Wan 3 Prime AI 视频模型与高规格工作流 — Keyvo (22.5) | 在生成前全面了解 Wan 3 Prime 的生成模式、时长、参考素材、提示词… (57) | Wan 3 Prime | — | 2411 |

## 三、发现的问题与处理状态

| # | 问题 | 影响 | 状态 |
|---|---|---|---|
| 1 | 10 个模型页标题/描述/分享卡片含 "VideoAI" | 品牌词搜索不一致，分享卡片显示错误品牌 | 已修：`frontend/lib/seo/brand-text.ts`，统一在 `buildSeoMetadata`（所有页的标题/描述/OG/Twitter 出口）和 `getEngineLocalized`（中文模型正文）里把 VideoAI / MaxVideoAI 换成 Keyvo。这样以后同步上游新内容也不会复发 |
| 2 | 首页标题品牌在末尾，且没有"文生视频/图生视频"这类用户真正搜索的词 | 品牌词与功能词覆盖弱 | 已改（见第四节） |
| 3 | `/zh/models/video`、`/zh/models/image` 描述提到未上架模型 | 误导用户和搜索引擎 | 已改 |
| 4 | 按需付费页描述、FAQ、WebApplication 结构化数据列出 FLUX 3 Max / LTX / Google Veo | 结构化数据暴露了隐藏模型 | 已改文案中的模型清单；该页其余内容里仍有以模型 ID 为键的隐藏模型条目（页面按可见性过滤，**未验证线上是否渲染**），见"未处理" |
| 5 | `/zh/tools` 描述提到已隐藏的镜头视角工具 | 同上 | 已改 |
| 6 | `/zh/about` 描述写"模型比较"（该功能对 Keyvo 隐藏）；标题仅 5 个字 | 过短、含不实说明 | 已改 |
| 7 | 案例分类页描述被截断（`/zh/examples/kling` 达 96 宽度，"…"结尾），且全部用同一句模板 | 描述被搜索引擎截断，缺少信息量 | 已改：只列前 3 个版本并加"等" |
| 8 | `/zh/legal/reconsent` 在 sitemap 内，且可被索引 | 无内容的流程页 | 已改：noindex，移出 sitemap |
| 9 | sitemap lastmod 缺失 | 搜索引擎无法判断更新 | 已改：新增 `frontend/config/keyvo-sitemap-timestamps.ts`（按路径登记真实更新日期，优先于上游登记）；仍没有日期的路径用构建日期兜底（`SITEMAP_BUILD_DATE`，由 next.config.js 在构建时写入，不是请求时间）；视频 sitemap 无条目时同样用构建日期 |
| 10 | Organization/WebSite 英文描述、logo 为 favicon | 品牌实体信息与中文站不匹配 | 已改 |
| 11 | 站点未提供搜索引擎站长验证机制 | 无法完成百度/360/搜狗/神马/必应验证 | 已加：环境变量 + 静态验证文件，见提交指南 |
| 12 | 没有 `applicable-device`（百度移动适配声明） | 百度可能不确定 PC/移动适配 | 已加 `<meta name="applicable-device" content="pc,mobile">`（根布局） |
| 13 | HTML 响应没有 `Cache-Control: no-transform` | 运营商/转码可能改写页面 | **未加**：Next 自己为每个页面写 Cache-Control（ISR/no-store 各不相同），中间件和 next.config headers 都不能在一个地方安全追加而不覆盖现有缓存契约；如要加，应在反向代理（nginx/1Panel）层统一追加，见提交指南 |
| 14 | robots.txt 屏蔽 Bytespider | 头条搜索无法收录 | **未改**，等你决定 |
| 15 | 价格页有 FAQPage 结构化数据，但本次抓取里 FAQ 区块没渲染（空库） | 如果线上 FAQ 区块不可见，则结构化数据与内容不符 | 代码里 FAQ 区块与结构化数据用同一份 `faqEntries`（前 6 条一致），判断线上一致；**未验证线上** |
| 16 | 价格页 FAQ 文案提到 Google Veo | 正文含未上架模型 | 未改（属于内容文案，已列入内容计划） |
| 17 | `/zh/workflows` 正文含 Veo/LTX/Sora/Pika | 同上 | 未改，列入内容计划 |
| 18 | `docs/get-started` 标题 "Keyvo 入门指南 — Keyvo 文档" 品牌重复 | 轻微 | 未改（改标题会同时改 h1） |
| 19 | 所有模型页/案例页的 FAQPage：问题均在可见正文中出现（逐条核对，0 条缺失） | 通过 | — |
| 20 | `twitter:site`/`twitter:creator` 写的是 `@Keyvo`，没有证据这是真实账号 | 国内无影响 | 未改，建议你确认或以后删除 |

## 四、本次改写的标题与描述（节选，改后）

| 页面 | 标题 | 描述 |
|---|---|---|
| /zh | Keyvo｜按需付费 AI 视频生成平台，文生视频与图生视频 | Keyvo 是按需付费的 AI 视频生成平台，支持文生视频、图生视频，Kling 可灵、Seedance、Wan、MiniMax 海螺等模型任选，生成前先看价格，无需订阅。 |
| /zh/pricing | AI 视频价格表：按模型、时长与分辨率计费 \| Keyvo | Keyvo 按需付费 AI 视频价格：按模型、时长、分辨率与音频对比 720p、1080p、4K 预设价格，生成前先看实时报价，无需订阅。 |
| /zh/about | 关于 Keyvo \| AI 视频生成平台 | 了解 Keyvo 按需付费的 AI 视频生成工作台，以及我们的编辑原则和所引用内容的项目来源。 |
| /zh/models/video | AI 视频模型：规格、限制与定价 \| Keyvo | Keyvo 上的 AI 视频生成模型目录，涵盖 Kling 可灵、Wan、Seedance、MiniMax 海螺、Happy Horse。生成前核对时长、分辨率与价格。 |
| /zh/models/image | AI 图像模型：规格、限制与定价 \| Keyvo | Keyvo 上的 AI 图像生成模型目录。生成前核对参考图限制、分辨率与价格，再决定使用哪个模型。 |
| /zh/pay-as-you-go-ai-video-generator | 按需付费 AI 视频生成器：生成前先看价格 — Keyvo | 无需订阅，充值后按需生成 AI 视频。Kling 4.0、Seedance 2.5、Wan 3、MiniMax H3 等模型任选，生成前先看价格，失败任务全额退款。 |
| /zh/tools | （不变） | 去掉了已隐藏的"镜头视角控制"工具 |
| /zh/examples/{kling,wan,…} | （不变） | `<模型> AI 视频案例合集：查看提示词、参数设置与价格参考，点开案例即可复刻。涵盖 …`（最多列 3 个版本） |
| 10 个模型页 | 标题与描述中的 VideoAI 改为 Keyvo | 同左 |

说明："可灵""海螺"是国内用户常用的中文名（Kling、MiniMax Hailuo）。站点正文里仍以英文名展示，这里把中文名放进描述，是为了覆盖用户的搜索习惯；如果你不希望出现，可以删掉。"失败任务全额退款"沿用该页面已有的承诺（页面信任条目里已有同一句）。

## 五、未处理、建议后续（不影响收录）

- 标题风格不统一（"— Keyvo"与"| Keyvo"混用），不影响收录。
- 模型页缺少 BreadcrumbList / SoftwareApplication，首页缺少 SoftwareApplication：需要和可见价格一致，建议在内容计划里与"价格说明"一起做。
- 站点没有 `hreflang`（中文单语言站点，这是对的），不要为了"国际化"重新加。
- 公司/信息类页面的描述偏短（17~30 宽度），可在有空时补充，优先级低。
- 视频观看页（`/zh/video/...`）被 robots.txt 屏蔽（Disallow: /video/ 与 /v/），而 `sitemap-video*.xml` 在索引里：二者矛盾。目前没有可收录的视频页，所以没有实际影响；如果以后要让视频页被收录，需要同时调整两处。
