# Keyvo 白标修复与验证

2026-10-06，分支 `feat/white-label-keyvo`，基于 `ca689b9`。修改尚未提交或部署。

已修复 Supabase 站点/回调白名单/邮件主题；robots、llms、sitemap 默认域名；组织与服务 JSON-LD；首页、定价、文档、法律、密码重置、公共分享和其他复用展示文案；启动/存储/分组失败信息。公开 SEO 的共享构造器改用 SITE_ORIGIN 和共享品牌常量。模型配置中的展示文字更新后通过脚本再生 engine-catalog；没有手改生成投影。

中文可接受使用政策已有完整中文正文。法律页面标明“服务：Keyvo”，不把产品品牌声明为法律实体。运营联系方式、历史作者署名、原始媒体 URL、包名、持久化键和冻结 MCP 文档保持原有身份。

新增 AST 文案覆盖门禁及 Supabase 认证配置测试；同步旧品牌/域名测试断言。PAYG 测试按已有隐藏 MCP 的发布策略更新结构预期，仍验证精确标题顺序、段落、链接与展示区位置。

验证证据：

- 原相关回归增加覆盖测试后：226/226 通过（`keyvo-final-regression.log`）。
- 新增认证配置与分类失败测试定向运行：13/13 通过（`keyvo-added-tests.log`，含原失败信息测试）。
- 独立白标脚本：16/16 通过（`audit-results.json`）。
- 10 个本地 HTTP 路由全部 200；可见正文、标题和 JSON-LD 未检测到旧品牌或旧商业域名（`http-results.json`）。首页、定价、文档及法律 canonical 使用 `https://app.keyvo.cn`。
- TypeScript、ESLint API、公开暴露检查和 git diff --check 通过。
- 模型 registry/runtime/catalog 检查以及公共视频、首页 poster 门禁通过。
- Next.js 生产构建退出码 0，完成 1001/1001 静态页面生成（`build.log`）。保留 Supabase 依赖在 Edge Runtime 使用 process.version 的警告；没有将该警告隐去。

环境说明：frontend/node_modules/.bin 为空，使用已安装工具的直接入口/API，Node 24.20.0；模型 roster 的包装命令因找不到 frontend `.bin/tsx` 无法运行，registry/runtime/catalog 的直接检查已通过。生产构建通过直接 Next 入口单独尝试，最终状态见 `build.log`；没有绕过生产部署来源门禁或部署。

未验证线上 DNS/TLS、托管 Supabase 配置、真实邮件、真实支付或商户展示名、已登录账户浏览器操作及数据库内容。仓库修复不自动同步托管认证配置。隐藏的 MCP 安装历史、旧来源媒体及作者署名不是本次承诺的全面品牌迁移范围。

复跑脚本：`scripts/audit-keyvo-branding.cjs`、`scripts/audit-keyvo-http.cjs`。前一次审计目录中的 REPORT.md 是修复前结论；其中部分机器结果已由复跑更新，本目录记录修复后结论。
