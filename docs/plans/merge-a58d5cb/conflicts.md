# a58d5cb 合并冲突清单

基于 `3ac9faedfb7a3f3b7b9d68769a6a9a4c2232fecf` 与 `a58d5cb1b83b5f8dc7120c5e7a6eab9135b76535`，共同祖先 `64f8c76`。临时 bare Git 仓库中运行 merge-tree，未修改工作区或当前分支。共 77 个冲突：69 content、4 modify/delete、4 add/add。二进制 add/add 无法逐段合并。

| 文件 | 类型 | 处理方向 |
|---|---|---|
| `.gitignore` | content | 并集保留双方忽略项 |
| `content/docs/brand-safety.mdx` | content | 采用更新后事实与 Sora 归档，保留定制品牌/链接，更新对应 zh 内容 |
| `content/en/blog/access-sora-2-without-invite.mdx` | content | 采用更新后事实与 Sora 归档，保留定制品牌/链接，更新对应 zh 内容 |
| `content/en/blog/sora-2-sequenced-prompts.mdx` | content | 采用更新后事实与 Sora 归档，保留定制品牌/链接，更新对应 zh 内容 |
| `content/es/blog/accede-a-sora-2-sin-invitacion.mdx` | content | 采用更新后事实与 Sora 归档，保留定制品牌/链接，更新对应 zh 内容 |
| `content/es/blog/indicaciones-secuenciadas-de-sora-2-con-sonido-e-identidad-de-marca.mdx` | content | 采用更新后事实与 Sora 归档，保留定制品牌/链接，更新对应 zh 内容 |
| `content/es/docs/brand-safety.mdx` | content | 采用更新后事实与 Sora 归档，保留定制品牌/链接，更新对应 zh 内容 |
| `content/fr/blog/acceder-a-sora-2-sans-invitation.mdx` | content | 采用更新后事实与 Sora 归档，保留定制品牌/链接，更新对应 zh 内容 |
| `content/fr/blog/invites-sequencees-sora-2-avec-son-et-image-de-marque.mdx` | content | 采用更新后事实与 Sora 归档，保留定制品牌/链接，更新对应 zh 内容 |
| `content/fr/docs/brand-safety.mdx` | content | 采用更新后事实与 Sora 归档，保留定制品牌/链接，更新对应 zh 内容 |
| `content/models/en/sora-2-pro.json` | content | 合并上游模型事实/归档与定制身份；同步 zh 及其他语言 |
| `content/models/en/sora-2.json` | content | 合并上游模型事实/归档与定制身份；同步 zh 及其他语言 |
| `content/models/en/wan-3-prime.json` | content | 合并上游模型事实/归档与定制身份；同步 zh 及其他语言 |
| `content/models/en/wan-3.json` | content | 合并上游模型事实/归档与定制身份；同步 zh 及其他语言 |
| `content/models/es/sora-2-pro.json` | content | 合并上游模型事实/归档与定制身份；同步 zh 及其他语言 |
| `content/models/es/sora-2.json` | content | 合并上游模型事实/归档与定制身份；同步 zh 及其他语言 |
| `content/models/es/wan-3-prime.json` | content | 合并上游模型事实/归档与定制身份；同步 zh 及其他语言 |
| `content/models/es/wan-3.json` | content | 合并上游模型事实/归档与定制身份；同步 zh 及其他语言 |
| `content/models/fr/sora-2-pro.json` | content | 合并上游模型事实/归档与定制身份；同步 zh 及其他语言 |
| `content/models/fr/sora-2.json` | content | 合并上游模型事实/归档与定制身份；同步 zh 及其他语言 |
| `content/models/fr/wan-3-prime.json` | content | 合并上游模型事实/归档与定制身份；同步 zh 及其他语言 |
| `content/models/fr/wan-3.json` | content | 合并上游模型事实/归档与定制身份；同步 zh 及其他语言 |
| `data/benchmarks/engine-key-specs.v1.json` | content | 合并上游模型事实/归档与定制身份；同步 zh 及其他语言 |
| `frontend/app/(core)/admin/seo/actions/page.tsx` | content | 采纳上游GSC弃用：删除旧组件/测试；旧页面redirect、旧action鉴权后410；新SEO入口补中文 |
| `frontend/app/(core)/admin/seo/cockpit/_components/SeoCockpitCommandDeck.tsx` | modify/delete | 采纳上游GSC弃用：删除旧组件/测试；旧页面redirect、旧action鉴权后410；新SEO入口补中文 |
| `frontend/app/(core)/admin/seo/cockpit/_components/SeoCockpitView.tsx` | modify/delete | 采纳上游GSC弃用：删除旧组件/测试；旧页面redirect、旧action鉴权后410；新SEO入口补中文 |
| `frontend/app/(core)/admin/seo/gsc/_components/GscDashboardView.tsx` | modify/delete | 采纳上游GSC弃用：删除旧组件/测试；旧页面redirect、旧action鉴权后410；新SEO入口补中文 |
| `frontend/app/(core)/admin/seo/url-inspection/page.tsx` | content | 采纳上游GSC弃用：删除旧组件/测试；旧页面redirect、旧action鉴权后410；新SEO入口补中文 |
| `frontend/app/(core)/layout.tsx` | content | 三方逐段合并上游职责与定制行为；禁止整文件 ours/theirs |
| `frontend/app/(core)/video/[id]/_lib/video-watch-page-utils.ts` | content | 三方逐段合并上游职责与定制行为；禁止整文件 ours/theirs |
| `frontend/app/(localized)/[locale]/(marketing)/ai-video-engines/[slug]/_lib/compare-page-faq.ts` | content | 三方逐段合并上游职责与定制行为；禁止整文件 ours/theirs |
| `frontend/app/(localized)/[locale]/(marketing)/examples/_components/examples-page-view.tsx` | content | 三方逐段合并上游职责与定制行为；禁止整文件 ours/theirs |
| `frontend/app/(localized)/[locale]/(marketing)/integrations/_content/n8n.ts` | content | 三方逐段合并上游职责与定制行为；禁止整文件 ours/theirs |
| `frontend/app/(localized)/[locale]/(marketing)/mcp/_components/McpFaqResourcesSection.tsx` | content | 三方逐段合并上游职责与定制行为；禁止整文件 ours/theirs |
| `frontend/app/(localized)/[locale]/(marketing)/models/[slug]/_lib/model-page-schema.ts` | content | 采用真实报价与安全序列化；保留 VideoAI/site origin/CNY 一次转换；删除虚构 Offer |
| `frontend/app/(localized)/[locale]/(marketing)/pay-as-you-go-ai-video-generator/_content/en.ts` | content | 三方逐段合并上游职责与定制行为；禁止整文件 ours/theirs |
| `frontend/app/(localized)/[locale]/(marketing)/pay-as-you-go-ai-video-generator/_content/es.ts` | content | 三方逐段合并上游职责与定制行为；禁止整文件 ours/theirs |
| `frontend/app/(localized)/[locale]/(marketing)/pay-as-you-go-ai-video-generator/_content/fr.ts` | content | 三方逐段合并上游职责与定制行为；禁止整文件 ours/theirs |
| `frontend/app/(localized)/[locale]/(marketing)/pricing/_lib/pricing-jsonld.ts` | content | 采用真实报价与安全序列化；保留 VideoAI/site origin/CNY 一次转换；删除虚构 Offer |
| `frontend/app/(localized)/[locale]/(marketing)/pricing/page.tsx` | content | 三方逐段合并上游职责与定制行为；禁止整文件 ours/theirs |
| `frontend/app/api/generate/_lib/route-context.ts` | content | 先执行归档拒绝；保留 direct-first / LLM Hub fallback 和原计费/权限边界 |
| `frontend/components/admin-system/shell/AdminFrame.tsx` | content | 上游后台信息架构/数据能力 + 定制样式/中文/CNY |
| `frontend/components/admin-system/shell/AdminPageHeader.tsx` | content | 上游后台信息架构/数据能力 + 定制样式/中文/CNY |
| `frontend/components/admin/SidebarNav.tsx` | content | 上游后台信息架构/数据能力 + 定制样式/中文/CNY |
| `frontend/components/examples/ExampleGalleryCard.tsx` | content | 三方逐段合并上游职责与定制行为；禁止整文件 ours/theirs |
| `frontend/components/marketing/MarketingDesktopNav.tsx` | content | 保留已验收顶部导航/影院首页/纸色朱红设计；移植上游性能与数据生命周期 |
| `frontend/components/marketing/MarketingNav.tsx` | content | 保留已验收顶部导航/影院首页/纸色朱红设计；移植上游性能与数据生命周期 |
| `frontend/components/marketing/home/HomeConversionSections.tsx` | content | 保留已验收顶部导航/影院首页/纸色朱红设计；移植上游性能与数据生命周期 |
| `frontend/components/marketing/home/HomePriceAppSurface.client.tsx` | content | 保留已验收顶部导航/影院首页/纸色朱红设计；移植上游性能与数据生命周期 |
| `frontend/components/marketing/home/HomePriceDemo.client.tsx` | content | 保留已验收顶部导航/影院首页/纸色朱红设计；移植上游性能与数据生命周期 |
| `frontend/components/marketing/mcp/mcp-editorial-copy.ts` | content | 三方逐段合并上游职责与定制行为；禁止整文件 ours/theirs |
| `frontend/lib/content/markdown.ts` | content | 三方逐段合并上游职责与定制行为；禁止整文件 ours/theirs |
| `frontend/lib/examples/modelLandingData.es.ts` | content | 三方逐段合并上游职责与定制行为；禁止整文件 ours/theirs |
| `frontend/lib/examples/modelLandingData.fr.ts` | content | 三方逐段合并上游职责与定制行为；禁止整文件 ours/theirs |
| `frontend/lib/i18n/dictionary-data/en-content.ts` | content | 逐键合并新文案，保留定制标题/品牌，补齐 zh 键 |
| `frontend/lib/marketing/spec-capability-copy.ts` | content | 合并上游模型事实/归档与定制身份；同步 zh 及其他语言 |
| `frontend/lib/seo/llms-text.ts` | content | 三方逐段合并上游职责与定制行为；禁止整文件 ours/theirs |
| `frontend/lib/seo/site-organization-schema.ts` | content | 采用真实报价与安全序列化；保留 VideoAI/site origin/CNY 一次转换；删除虚构 Offer |
| `frontend/messages/en.json` | content | 逐键合并新文案，保留定制标题/品牌，补齐 zh 键 |
| `frontend/messages/es.json` | content | 逐键合并新文案，保留定制标题/品牌，补齐 zh 键 |
| `frontend/messages/fr.json` | content | 逐键合并新文案，保留定制标题/品牌，补齐 zh 键 |
| `frontend/middleware.ts` | content | 保留默认中文与定制域名；接入认证语言连续性，/s/:path*与/auth/:path*直通，保护恢复code |
| `frontend/public/assets/tools/redesign/angle-workspace-v2.webp` | add/add | 保留定制版中文工作区截图；上游图另名保留用于参考 |
| `frontend/public/assets/tools/redesign/background-removal-workspace-v2.webp` | add/add | 保留定制版中文工作区截图；上游图另名保留用于参考 |
| `frontend/public/assets/tools/redesign/character-builder-workspace-v2.webp` | add/add | 保留定制版中文工作区截图；上游图另名保留用于参考 |
| `frontend/public/assets/tools/redesign/upscale-workspace-v2.webp` | add/add | 保留定制版中文工作区截图；上游图另名保留用于参考 |
| `frontend/public/site.webmanifest` | content | 保留 VideoAI 名称、图标与主题；整合新增标准字段 |
| `frontend/server/videos.ts` | content | 上游数据库分页/curation + 当前 bundled fallback；显式空策展不得被兜底覆盖 |
| `frontend/src/components/tools/landing/tool-workspace-assets.ts` | content | 三方逐段合并上游职责与定制行为；禁止整文件 ours/theirs |
| `frontend/src/config/fal-engines/minimax-h3-max.ts` | content | 采用上游新能力和原始 USD 成本；保留定制显示身份，补齐中文 |
| `frontend/src/styles/marketing-home.css` | content | 保留已验收顶部导航/影院首页/纸色朱红设计；移植上游性能与数据生命周期 |
| `scripts/llms-guard.ts` | content | 按合并后真实契约调整；保留上游业务断言与定制断言，建立基线差异 |
| `tests/gsc-oauth-auth.test.ts` | modify/delete | 采纳上游GSC弃用：删除旧组件/测试；旧页面redirect、旧action鉴权后410；新SEO入口补中文 |
| `tests/happy-horse-compare-page.test.ts` | content | 按合并后真实契约调整；保留上游业务断言与定制断言，建立基线差异 |
| `tests/marketing-jsonld-schema-audit.test.ts` | content | 采用真实报价与安全序列化；保留 VideoAI/site origin/CNY 一次转换；删除虚构 Offer |
| `tests/marketing-route-styles-contract.test.ts` | content | 按合并后真实契约调整；保留上游业务断言与定制断言，建立基线差异 |
| `tests/mcp-seo-signals.test.ts` | content | 按合并后真实契约调整；保留上游业务断言与定制断言，建立基线差异 |
