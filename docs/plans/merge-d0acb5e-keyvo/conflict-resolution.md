# 冲突处理表

模拟方向：`MaxVideoAI d0acb5e` 为 ours，`feat/white-label-keyvo 9ed63ad` 为 theirs。共 114 个冲突文件；此表是待执行方案，未解决冲突或提交合并。

|序号|文件|类型|处理原则|
|---:|---|---|---|
|1|`content/comparisons/gemini-omni-flash-vs-veo-3-1.json`|content|保留上游能力/下架/价格真实性变动；重施 Keyvo 与中文适配；同步 zh|
|2|`content/comparisons/ltx-2-3-fast-vs-ltx-2-5-fast.json`|content|保留上游能力/下架/价格真实性变动；重施 Keyvo 与中文适配；同步 zh|
|3|`content/comparisons/ltx-2-3-fast-vs-seedance-2-0.json`|content|保留上游能力/下架/价格真实性变动；重施 Keyvo 与中文适配；同步 zh|
|4|`content/comparisons/ltx-2-3-fast-vs-wan-2-5.json`|content|保留上游能力/下架/价格真实性变动；重施 Keyvo 与中文适配；同步 zh|
|5|`content/comparisons/ltx-2-3-pro-vs-ltx-2-5-pro.json`|content|保留上游能力/下架/价格真实性变动；重施 Keyvo 与中文适配；同步 zh|
|6|`content/comparisons/veo-3-1-fast-vs-veo-3-1-lite.json`|content|保留上游能力/下架/价格真实性变动；重施 Keyvo 与中文适配；同步 zh|
|7|`content/models/en/seedance-1-5-pro.json`|content|保留上游能力/下架/价格真实性变动；重施 Keyvo 与中文适配；同步 zh|
|8|`content/models/en/seedance-2-0-fast.json`|content|保留上游能力/下架/价格真实性变动；重施 Keyvo 与中文适配；同步 zh|
|9|`content/models/en/seedream-5-0-pro.json`|content|保留上游能力/下架/价格真实性变动；重施 Keyvo 与中文适配；同步 zh|
|10|`content/models/en/sora-2-pro.json`|content|保留上游能力/下架/价格真实性变动；重施 Keyvo 与中文适配；同步 zh|
|11|`content/models/en/sora-2.json`|content|保留上游能力/下架/价格真实性变动；重施 Keyvo 与中文适配；同步 zh|
|12|`content/models/es/seedance-1-5-pro.json`|content|保留上游能力/下架/价格真实性变动；重施 Keyvo 与中文适配；同步 zh|
|13|`content/models/es/seedance-2-0-fast.json`|content|保留上游能力/下架/价格真实性变动；重施 Keyvo 与中文适配；同步 zh|
|14|`content/models/es/seedream-5-0-pro.json`|content|保留上游能力/下架/价格真实性变动；重施 Keyvo 与中文适配；同步 zh|
|15|`content/models/es/sora-2-pro.json`|content|保留上游能力/下架/价格真实性变动；重施 Keyvo 与中文适配；同步 zh|
|16|`content/models/es/sora-2.json`|content|保留上游能力/下架/价格真实性变动；重施 Keyvo 与中文适配；同步 zh|
|17|`content/models/fr/seedance-1-5-pro.json`|content|保留上游能力/下架/价格真实性变动；重施 Keyvo 与中文适配；同步 zh|
|18|`content/models/fr/seedance-2-0-fast.json`|content|保留上游能力/下架/价格真实性变动；重施 Keyvo 与中文适配；同步 zh|
|19|`content/models/fr/seedream-5-0-pro.json`|content|保留上游能力/下架/价格真实性变动；重施 Keyvo 与中文适配；同步 zh|
|20|`content/models/fr/sora-2-pro.json`|content|保留上游能力/下架/价格真实性变动；重施 Keyvo 与中文适配；同步 zh|
|21|`content/models/fr/sora-2.json`|content|保留上游能力/下架/价格真实性变动；重施 Keyvo 与中文适配；同步 zh|
|22|`frontend/app/(core)/(workspace)/app/_components/WorkspaceAppReadyView.tsx`|content|以当前上游责任拆分为基准，按块移植 Keyvo/中文/视觉；验证新功能、主题、可访问性与原媒体行为|
|23|`frontend/app/(core)/(workspace)/app/_hooks/useWorkspacePricingGate.ts`|content|以当前上游责任拆分为基准，按块移植 Keyvo/中文/视觉；验证新功能、主题、可访问性与原媒体行为|
|24|`frontend/app/(core)/(workspace)/app/_lib/workspace-topup.ts`|content|保留上游报价/版本/交易锁/恢复协议；在明确客户币种边界移植 CNY；供应商 USD 原始事实不改|
|25|`frontend/app/(core)/(workspace)/app/studio/AGENTS.md`|content|上游 conversation/_shared/旧 URL 重定向为结构基准；移植 Keyvo、中文、CNY；保留退役边界|
|26|`frontend/app/(core)/(workspace)/app/studio/_components/StudioPreviewAccess.client.tsx`|content|上游 conversation/_shared/旧 URL 重定向为结构基准；移植 Keyvo、中文、CNY；保留退役边界|
|27|`frontend/app/(core)/(workspace)/app/studio/projects/page.tsx`|content|上游 conversation/_shared/旧 URL 重定向为结构基准；移植 Keyvo、中文、CNY；保留退役边界|
|28|`frontend/app/(core)/(workspace)/app/studio/workspace/[projectId]/page.tsx`|content|上游 conversation/_shared/旧 URL 重定向为结构基准；移植 Keyvo、中文、CNY；保留退役边界|
|29|`frontend/app/(core)/(workspace)/app/studio/workspace/_components/StudioHeaderSession.tsx`|modify/delete|保留上游删除；迁移仍适用的中文/品牌/货币责任到 conversation 或 _shared；不得恢复旧 Canvas|
|30|`frontend/app/(core)/(workspace)/app/studio/workspace/_controllers/useCanvasController.ts`|modify/delete|保留上游删除；迁移仍适用的中文/品牌/货币责任到 conversation 或 _shared；不得恢复旧 Canvas|
|31|`frontend/app/(core)/(workspace)/app/studio/workspace/_hooks/useWorkspaceShotPricing.ts`|modify/delete|保留上游删除；迁移仍适用的中文/品牌/货币责任到 conversation 或 _shared；不得恢复旧 Canvas|
|32|`frontend/app/(core)/(workspace)/app/studio/workspace/_lib/models/model-capability-registry.ts`|modify/delete|保留上游删除；迁移仍适用的中文/品牌/货币责任到 conversation 或 _shared；不得恢复旧 Canvas|
|33|`frontend/app/(core)/(workspace)/app/studio/workspace/_lib/workspace-generation.ts`|modify/delete|保留上游删除；迁移仍适用的中文/品牌/货币责任到 conversation 或 _shared；不得恢复旧 Canvas|
|34|`frontend/app/(core)/(workspace)/app/studio/workspace/_styles/shell.module.css`|modify/delete|保留上游删除；迁移仍适用的中文/品牌/货币责任到 conversation 或 _shared；不得恢复旧 Canvas|
|35|`frontend/app/(core)/(workspace)/app/studio/workspace/page.tsx`|content|上游 conversation/_shared/旧 URL 重定向为结构基准；移植 Keyvo、中文、CNY；保留退役边界|
|36|`frontend/app/(core)/login/_lib/login-helpers.ts`|content|以当前上游责任拆分为基准，按块移植 Keyvo/中文/视觉；验证新功能、主题、可访问性与原媒体行为|
|37|`frontend/app/(localized)/[locale]/(marketing)/(home)/_lib/home-route-data/launch-promotions.ts`|content|以当前上游责任拆分为基准，按块移植 Keyvo/中文/视觉；验证新功能、主题、可访问性与原媒体行为|
|38|`frontend/app/(localized)/[locale]/(marketing)/(home)/page.tsx`|content|以当前上游责任拆分为基准，按块移植 Keyvo/中文/视觉；验证新功能、主题、可访问性与原媒体行为|
|39|`frontend/app/(localized)/[locale]/(marketing)/ai-video-engines/[slug]/_lib/compare-page-pricing.ts`|content|保留上游报价/版本/交易锁/恢复协议；在明确客户币种边界移植 CNY；供应商 USD 原始事实不改|
|40|`frontend/app/(localized)/[locale]/(marketing)/examples/[model]/page.tsx`|content|以当前上游责任拆分为基准，按块移植 Keyvo/中文/视觉；验证新功能、主题、可访问性与原媒体行为|
|41|`frontend/app/(localized)/[locale]/(marketing)/examples/_components/examples-page-view.tsx`|content|以当前上游责任拆分为基准，按块移植 Keyvo/中文/视觉；验证新功能、主题、可访问性与原媒体行为|
|42|`frontend/app/(localized)/[locale]/(marketing)/examples/_lib/examples-page-copy.ts`|content|以当前上游责任拆分为基准，按块移植 Keyvo/中文/视觉；验证新功能、主题、可访问性与原媒体行为|
|43|`frontend/app/(localized)/[locale]/(marketing)/integrations/_components/IntegrationHeroSection.tsx`|content|保留上游协议/版本资源/host evidence；保留定制公开入口隐藏；重新检查上游新增入口|
|44|`frontend/app/(localized)/[locale]/(marketing)/integrations/_content/editorial.ts`|content|保留上游协议/版本资源/host evidence；保留定制公开入口隐藏；重新检查上游新增入口|
|45|`frontend/app/(localized)/[locale]/(marketing)/integrations/_content/en.ts`|content|保留上游协议/版本资源/host evidence；保留定制公开入口隐藏；重新检查上游新增入口|
|46|`frontend/app/(localized)/[locale]/(marketing)/integrations/_content/es.ts`|content|保留上游协议/版本资源/host evidence；保留定制公开入口隐藏；重新检查上游新增入口|
|47|`frontend/app/(localized)/[locale]/(marketing)/integrations/_content/fr.ts`|content|保留上游协议/版本资源/host evidence；保留定制公开入口隐藏；重新检查上游新增入口|
|48|`frontend/app/(localized)/[locale]/(marketing)/integrations/_content/n8n.ts`|content|保留上游协议/版本资源/host evidence；保留定制公开入口隐藏；重新检查上游新增入口|
|49|`frontend/app/(localized)/[locale]/(marketing)/integrations/_content/shared.ts`|content|保留上游协议/版本资源/host evidence；保留定制公开入口隐藏；重新检查上游新增入口|
|50|`frontend/app/(localized)/[locale]/(marketing)/mcp/_components/McpPageView.tsx`|content|保留上游协议/版本资源/host evidence；保留定制公开入口隐藏；重新检查上游新增入口|
|51|`frontend/app/(localized)/[locale]/(marketing)/mcp/_lib/mcp-host-proof.ts`|content|保留上游协议/版本资源/host evidence；保留定制公开入口隐藏；重新检查上游新增入口|
|52|`frontend/app/(localized)/[locale]/(marketing)/models/[slug]/_components/MarketingModelPageLayout.tsx`|content|以当前上游责任拆分为基准，按块移植 Keyvo/中文/视觉；验证新功能、主题、可访问性与原媒体行为|
|53|`frontend/app/(localized)/[locale]/(marketing)/models/_lib/models-catalog-cards.ts`|content|以当前上游责任拆分为基准，按块移植 Keyvo/中文/视觉；验证新功能、主题、可访问性与原媒体行为|
|54|`frontend/app/(localized)/[locale]/(marketing)/pay-as-you-go-ai-video-generator/_content/es.ts`|content|以当前上游责任拆分为基准，按块移植 Keyvo/中文/视觉；验证新功能、主题、可访问性与原媒体行为|
|55|`frontend/app/(localized)/[locale]/(marketing)/pay-as-you-go-ai-video-generator/_content/fr.ts`|content|以当前上游责任拆分为基准，按块移植 Keyvo/中文/视觉；验证新功能、主题、可访问性与原媒体行为|
|56|`frontend/app/api/examples/route.ts`|content|以当前上游责任拆分为基准，按块移植 Keyvo/中文/视觉；验证新功能、主题、可访问性与原媒体行为|
|57|`frontend/app/api/generate/_lib/billing-preflight.ts`|content|保留上游报价/版本/交易锁/恢复协议；在明确客户币种边界移植 CNY；供应商 USD 原始事实不改|
|58|`frontend/app/api/generate/_lib/byteplus-submission.ts`|content|保留上游请求验证/计费/生命周期；移植直连优先、LLM Hub、Qwen 与输出校验；逐项审查参数和已受理状态|
|59|`frontend/app/api/generate/_lib/initial-video-job.ts`|content|保留上游请求验证/计费/生命周期；移植直连优先、LLM Hub、Qwen 与输出校验；逐项审查参数和已受理状态|
|60|`frontend/app/api/studio/timeline-exports/route.ts`|content|上游 conversation/_shared/旧 URL 重定向为结构基准；移植 Keyvo、中文、CNY；保留退役边界|
|61|`frontend/app/api/wallet/route.ts`|content|保留上游报价/版本/交易锁/恢复协议；在明确客户币种边界移植 CNY；供应商 USD 原始事实不改|
|62|`frontend/components/HeaderBar.tsx`|content|以当前上游责任拆分为基准，按块移植 Keyvo/中文/视觉；验证新功能、主题、可访问性与原媒体行为|
|63|`frontend/components/app/AppAssistantConnections.tsx`|content|以当前上游责任拆分为基准，按块移植 Keyvo/中文/视觉；验证新功能、主题、可访问性与原媒体行为|
|64|`frontend/components/app/AppSiteMenu.client.tsx`|content|以当前上游责任拆分为基准，按块移植 Keyvo/中文/视觉；验证新功能、主题、可访问性与原媒体行为|
|65|`frontend/components/composer/WorkspaceReferenceInventory.client.tsx`|content|以当前上游责任拆分为基准，按块移植 Keyvo/中文/视觉；验证新功能、主题、可访问性与原媒体行为|
|66|`frontend/components/composer/workspace-reference-copy.ts`|content|以当前上游责任拆分为基准，按块移植 Keyvo/中文/视觉；验证新功能、主题、可访问性与原媒体行为|
|67|`frontend/components/examples/ExamplesGalleryGrid.client.tsx`|content|以当前上游责任拆分为基准，按块移植 Keyvo/中文/视觉；验证新功能、主题、可访问性与原媒体行为|
|68|`frontend/components/header/HeaderWalletStatus.tsx`|content|以当前上游责任拆分为基准，按块移植 Keyvo/中文/视觉；验证新功能、主题、可访问性与原媒体行为|
|69|`frontend/components/legal/CookieBanner.tsx`|content|以当前上游责任拆分为基准，按块移植 Keyvo/中文/视觉；验证新功能、主题、可访问性与原媒体行为|
|70|`frontend/components/marketing/MarketingNav.tsx`|content|以当前上游责任拆分为基准，按块移植 Keyvo/中文/视觉；验证新功能、主题、可访问性与原媒体行为|
|71|`frontend/components/marketing/mcp/mcp-editorial-copy.ts`|content|保留上游协议/版本资源/host evidence；保留定制公开入口隐藏；重新检查上游新增入口|
|72|`frontend/components/starters/StarterMediaShelf.client.tsx`|content|以当前上游责任拆分为基准，按块移植 Keyvo/中文/视觉；验证新功能、主题、可访问性与原媒体行为|
|73|`frontend/config/localized-slugs.json`|content|逐键合并上游新路由和 zh 路由；检查重定向/canonical/sitemap|
|74|`frontend/config/navigation.ts`|content|以当前上游责任拆分为基准，按块移植 Keyvo/中文/视觉；验证新功能、主题、可访问性与原媒体行为|
|75|`frontend/lib/api-generation.ts`|content|保留上游请求验证/计费/生命周期；移植直连优先、LLM Hub、Qwen 与输出校验；逐项审查参数和已受理状态|
|76|`frontend/lib/examples/modelLanding.ts`|content|以当前上游责任拆分为基准，按块移植 Keyvo/中文/视觉；验证新功能、主题、可访问性与原媒体行为|
|77|`frontend/lib/examples/modelLandingData.en.ts`|content|以当前上游责任拆分为基准，按块移植 Keyvo/中文/视觉；验证新功能、主题、可访问性与原媒体行为|
|78|`frontend/lib/examples/modelLandingData.es.ts`|content|以当前上游责任拆分为基准，按块移植 Keyvo/中文/视觉；验证新功能、主题、可访问性与原媒体行为|
|79|`frontend/lib/examples/modelLandingData.fr.ts`|content|以当前上游责任拆分为基准，按块移植 Keyvo/中文/视觉；验证新功能、主题、可访问性与原媒体行为|
|80|`frontend/lib/theme-bootstrap.ts`|content|以当前上游责任拆分为基准，按块移植 Keyvo/中文/视觉；验证新功能、主题、可访问性与原媒体行为|
|81|`frontend/messages/en.json`|content|逐键合并；新增及修改键同步 zh；禁止整字典覆盖|
|82|`frontend/messages/es.json`|content|逐键合并；新增及修改键同步 zh；禁止整字典覆盖|
|83|`frontend/messages/fr.json`|content|逐键合并；新增及修改键同步 zh；禁止整字典覆盖|
|84|`frontend/next.config.js`|content|保留上游条件缓存；合并 standalone、zh tracing、CloudFront；验证 Docker bundle 和公共/认证缓存隔离|
|85|`frontend/server/pricing/quote-billing.ts`|content|保留上游报价/版本/交易锁/恢复协议；在明确客户币种边界移植 CNY；供应商 USD 原始事实不改|
|86|`frontend/src/config/fal-engines/seedream.ts`|content|以当前上游责任拆分为基准，按块移植 Keyvo/中文/视觉；验证新功能、主题、可访问性与原媒体行为|
|87|`frontend/src/hooks/useThemePreference.ts`|content|以当前上游责任拆分为基准，按块移植 Keyvo/中文/视觉；验证新功能、主题、可访问性与原媒体行为|
|88|`frontend/src/lib/tools-background-removal.ts`|content|以当前上游责任拆分为基准，按块移植 Keyvo/中文/视觉；验证新功能、主题、可访问性与原媒体行为|
|89|`frontend/src/server/agent-api/confirm-generation.ts`|content|保留上游请求验证/计费/生命周期；移植直连优先、LLM Hub、Qwen 与输出校验；逐项审查参数和已受理状态|
|90|`frontend/src/server/agent-api/prepare-generation.ts`|content|保留上游请求验证/计费/生命周期；移植直连优先、LLM Hub、Qwen 与输出校验；逐项审查参数和已受理状态|
|91|`frontend/src/server/agent-api/reference-assets.ts`|content|以当前上游责任拆分为基准，按块移植 Keyvo/中文/视觉；验证新功能、主题、可访问性与原媒体行为|
|92|`frontend/src/server/generations/agent-generation-policy.ts`|content|保留上游请求验证/计费/生命周期；移植直连优先、LLM Hub、Qwen 与输出校验；逐项审查参数和已受理状态|
|93|`frontend/src/server/images/estimate-image-generation.ts`|content|保留上游请求验证/计费/生命周期；移植直连优先、LLM Hub、Qwen 与输出校验；逐项审查参数和已受理状态|
|94|`frontend/src/server/images/execute-image-generation.ts`|content|保留上游请求验证/计费/生命周期；移植直连优先、LLM Hub、Qwen 与输出校验；逐项审查参数和已受理状态|
|95|`frontend/src/server/images/image-generation-pricing.ts`|content|保留上游报价/版本/交易锁/恢复协议；在明确客户币种边界移植 CNY；供应商 USD 原始事实不改|
|96|`frontend/src/server/mcp/instructions.ts`|content|保留上游协议/版本资源/host evidence；保留定制公开入口隐藏；重新检查上游新增入口|
|97|`frontend/src/server/timeline-exports/billing.ts`|content|保留上游报价/版本/交易锁/恢复协议；在明确客户币种边界移植 CNY；供应商 USD 原始事实不改|
|98|`frontend/src/server/tools/upscale-pricing-context.ts`|content|保留上游报价/版本/交易锁/恢复协议；在明确客户币种边界移植 CNY；供应商 USD 原始事实不改|
|99|`frontend/src/styles/app-experience.css`|content|以当前上游责任拆分为基准，按块移植 Keyvo/中文/视觉；验证新功能、主题、可访问性与原媒体行为|
|100|`frontend/src/styles/marketing-mcp.css`|content|以当前上游责任拆分为基准，按块移植 Keyvo/中文/视觉；验证新功能、主题、可访问性与原媒体行为|
|101|`frontend/src/styles/marketing-redesign.css`|content|以当前上游责任拆分为基准，按块移植 Keyvo/中文/视觉；验证新功能、主题、可访问性与原媒体行为|
|102|`tests/compare-page-pricing-display.test.ts`|content|保留上游行为断言和定制有效断言；按新责任路径及双币种重写；不以删除断言消除失败|
|103|`tests/connected-studio-montage-browser-integration.test.ts`|content|保留上游行为断言和定制有效断言；按新责任路径及双币种重写；不以删除断言消除失败|
|104|`tests/examples-gallery-opening.test.ts`|content|保留上游行为断言和定制有效断言；按新责任路径及双币种重写；不以删除断言消除失败|
|105|`tests/fixtures/mcp-tool-selection-curated-policy.json`|content|保留上游行为断言和定制有效断言；按新责任路径及双币种重写；不以删除断言消除失败|
|106|`tests/marketing-theme-boundary.test.ts`|content|保留上游行为断言和定制有效断言；按新责任路径及双币种重写；不以删除断言消除失败|
|107|`tests/maxvideoai-editor-workspace-architecture.test.ts`|content|保留上游行为断言和定制有效断言；按新责任路径及双币种重写；不以删除断言消除失败|
|108|`tests/mcp-marketing-copy.test.ts`|content|保留上游行为断言和定制有效断言；按新责任路径及双币种重写；不以删除断言消除失败|
|109|`tests/model-page-decision-data.test.ts`|content|保留上游行为断言和定制有效断言；按新责任路径及双币种重写；不以删除断言消除失败|
|110|`tests/payg-page-rendering.test.ts`|content|保留上游行为断言和定制有效断言；按新责任路径及双币种重写；不以删除断言消除失败|
|111|`tests/studio-localization-contract.test.ts`|content|保留上游行为断言和定制有效断言；按新责任路径及双币种重写；不以删除断言消除失败|
|112|`tests/theme-preference.test.ts`|content|保留上游行为断言和定制有效断言；按新责任路径及双币种重写；不以删除断言消除失败|
|113|`tests/workspace-pricing-gate-hook-contract.test.ts`|content|保留上游行为断言和定制有效断言；按新责任路径及双币种重写；不以删除断言消除失败|
|114|`tests/workspace-topup.test.ts`|content|保留上游行为断言和定制有效断言；按新责任路径及双币种重写；不以删除断言消除失败|
