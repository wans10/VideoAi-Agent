# a58d5cb → feat/videoai-studio-design 合并分析与执行计划

分析日期：2026-10-01（Asia/Shanghai）。修订版：已纳入本次8项审查建议，并以实际脚本、路由和调用链校正执行细节。本文件是分析与计划交付，不表示已实施合并、迁移或部署。

## 1. 结论与范围

建议以当前 `feat/videoai-studio-design` 为基线创建临时集成分支，普通三方 merge `a58d5cb`，按业务模块解决冲突并补充兼容适配。不要直接用 MaxVideoAI 文件覆盖定制分支，不要全局使用 `-X ours` / `-X theirs`，也不要将这个大提交拆成无依赖的文件拷贝。

需要保留的是**定制功能与已确认体验**，不是保持所有旧实现逐字不变。上游的 Sora 归档、真实报价、安全序列化、媒体权限和性能修复应进入最终结果；中文、CNY 钱包、LLM Hub Pay、direct-first Provider 路由、VideoAI 品牌、顶部导航、影院首页和 Docker/1Panel 应继续有效。

按本次审查确认，旧 GSC/SEO 后台只有 zh 文案适配，没有专属核心业务定制；采用上游弃用方案，删除旧视图及服务端 OAuth/token/cache/client 链路，旧页面统一重定向、旧操作鉴权后返回 410。保留外部 Search Console 入口与内部 video SEO，并补齐新入口中文。不为保存已失去载体的翻译而恢复整套废弃功能。

### 1.1 已核实的 Git 基线

| 项目 | 值 |
|---|---|
| 当前分支 | `feat/videoai-studio-design` |
| 当前 HEAD | `3ac9faedfb7a3f3b7b9d68769a6a9a4c2232fecf` |
| 源提交 | `a58d5cb1b83b5f8dc7120c5e7a6eab9135b76535` |
| 源提交信息 | `同步上游更新`，作者 wans10，2026-09-30 20:36:35 +0800 |
| 源提交父提交 / 两分支共同祖先 | `64f8c76cd1789b512d5a3e63560797989f4a7db7` |
| 本地 MaxVideoAI 与 origin/MaxVideoAI | 均指向 a58d5cb |
| 定制分支相对共同祖先 | 43 个提交；1,006 个文件；新增 57,361 行、删除 6,808 行 |
| 上游提交相对共同祖先 | 1,159 个文件；新增 78,123 行、删除 14,493 行 |
| 上游文件状态 | A 517 / M 616 / D 26 |
| 定制文件状态 | A 146 / M 860 / D 0 |
| 双方共同改动 | 187 个文件 |
| 仅上游改动 / 仅定制改动 | 972 / 819 个文件 |
| 合并预演冲突 | 77 个文件：69 content、4 modify/delete、4 add/add |

开始分析时工作区干净，当前分支与对应 origin 没有 ahead/behind 提示。未 fetch，因此远端结论仅代表本地已保存的远端引用，不代表服务器此刻没有新提交。正式执行前需要 fetch 并重新核实目标 HEAD；源范围始终固定为 a58d5cb，不擅自纳入后续源提交。

a58d5cb 只有一个父提交，不是 Git merge commit；当前仓库将这一轮上游更新压成单个同步提交，因此不能从它的 commit message 还原原始上游的逐提交时间线。这里的功能分析来自其父提交到 a58d5cb 的实际文件差异。

### 1.2 预演方法与证据

通过 `/tmp/videoai-merge-probe.git` 临时 bare 仓库引用当前仓库对象，再运行 `git merge-tree --write-tree --name-only <目标SHA> <源SHA>`，得到真实三方冲突集合。临时对象写入仅发生在 /tmp，未 checkout、merge、提交或修改当前分支。预演树包含冲突标记，不能直接用于运行或部署。

附件：

- [完整上游文件清单](upstream-files.csv)：1,159 行，包含状态、模块、双方是否共同修改、是否 Git 冲突。
- [完整定制文件清单](custom-files.csv)：1,006 行，用于行为保留审查。
- [187 个交集文件与处理方向](overlap-files.csv)。
- [77 个冲突逐文件策略](conflicts.md)。
- [43 个定制提交](custom-commits.md)。

## 2. a58d5cb 具体更新了什么

以下按业务职责分类；不同职责会共享文件，分类不可相加。文件数中还包含大量文档、测试、性能 JSON 和图片证据，不能把新增行数直接当成功能代码量。

### 2.1 模型生命周期：Sora 归档与发现政策

- `model-registry.json` 将 `sora-2`、`sora-2-pro` 从 `current` 改为 `deep_legacy`，关闭 app 与 pricing 发布，关闭 current examples 身份；历史模型页面、比较、示例和 sitemap 身份按登记继续存在。
- 新增 `model-generation-policy.ts`，在公共生成路由与可信付费入口对归档模型返回 `410 / ENGINE_RETIRED`，而不是自动换模型。
- 新增模型归档页面、严格 archive 内容解析与各 EN/FR/ES Sora 内容，归档页展示当前替代模型和历史素材入口，不提供可购买 Product Offer 或生成 CTA。
- Workspace 草稿/设置恢复、模型候选、参考输入与 Studio 能力投影更新，归档历史作业保留原模型身份，要求用户明确选择下一模型。
- 新增 discoverable example identity 投影；公共总图库和导航按 registry allowlist 过滤，专门历史 family/model/watch 页面仍保留历史视频。过滤发生在 SQL limit 之前。
- 补充 Pika、Veo 的历史 internal/public alias，重新生成 runtime、catalog、roster。

**对定制分支的影响：**这是实际产品行为变更。当前 zh Sora 内容没有上游新增的 archive 对象，必须补齐，否则严格归档读取可能失败；不能用原中文生成介绍继续宣传已归档模型，也不能在 LLM Hub fallback 中绕过归档 gate。

### 2.2 MiniMax H3 / H3 Max 能力与价格修正

H3：

- 新增 480P，768P 原始供应商单价从 $0.08/s 改为 $0.06/s；480P 为 $0.05/s，2K / 4K 保留 $0.13 / $0.16/s。
- Prompt 最大长度由 7,000 调整为 50,000；新增 seed、prompt expansion（disabled / fast / balanced / quality）、target soundtrack。
- i2v 支持首帧、尾帧或两者，而不再强制首帧；ref2v 支持纯音频参考，t2v/ref2v 的比例约束分开。
- 补充媒体上传格式、owned asset 和 combined reference duration 约束。

H3 Max：

- 新增 1080P；480P / 768P / 1080P 原始输出成本分别为 $0.05 / $0.08 / $0.16 每秒。
- 新增 disabled prompt expansion、seed、target soundtrack；ref2v 新增 auto 比例；i2v 允许仅尾帧；音频可独立作为 ref2v 输入。
- 参考计价不再只等候供应商实际 token；新增基于**已验证媒体尺寸与时长**的保守 normalized-media token budget，用于生成前固定报价，区分预算与实际供应商 token 来源。
- 4,096 token 包含池和超额 $0.02/1K 的计算继续存在；参考模式输出成本按选定分辨率计算。
- 所有相关 UI schema、payload、媒体校验、MCP/agent-api、预检、价格事实与测试同步更新。

**处理要求：**采用上游能力与 USD 成本事实；通过现有 customer-currency 边界生成一次 CNY 客户报价，不能把供应商 USD rates 直接写成 CNY。同步中文模型正文、workspace 字段提示和 Studio 的 schema 消费。

### 2.3 Wan 3 / Wan 3 Prime 多模态与输入视频计价

- 新增 `wan3-pricing.ts`，输出报价纳入受信任的输入视频时长；补齐站点预检、generation payload、Alibaba adapter、MCP/agent-api 的一致性。
- 媒体验证涵盖输入视频、参考音频与相关模式约束，拒绝未经验证的来源时长；计价不应信任浏览器自报的任意数字。
- EN/FR/ES 模型说明修正为 input video + output seconds 成本；相关报价和 payload parity 测试新增。
- 这不是“统一涨价”：没有输入视频的模式与带输入视频的模式要分别建立样本；新增价格差异需要记录。

**处理要求：**高级模式走支持其形状的 direct Provider。现有 LLM Hub t2v/单图 i2v 范围不能被扩展成自动承接 ref2v/v2v/extend 等未经验证请求。

### 2.4 公共图库、统一 Reader、复刻与首页读取

- 图库从卡片/旧弹窗拆为 focused reader 模块：context、presentation、focus/navigation、styles、copy 与 gallery reader hook。
- 卡片 preview 更轻量，限制挂载与播放意图，改善开屏预览预算；reader 保留手动播放、poster、尺寸与 original/auto 策略。
- `/api/examples/[id]` 与 watch-detail server loader 提供详情；新增 example recreation 投影，使看视频、查参数、当前报价、进入生成衔接。
- 新增 `videos-catalog-page.ts`、`videos-query.ts`、`videos-playlists.ts`：数据库先确定页成员、排序和 total，再加载当前页昂贵媒体字段；单 statement/snapshot 一致性，改善旧窗口之外的分页覆盖。
- Curation precedence、opening、去重、discoverable model 过滤与公开/删除状态统一；新增家庭/模型 gallery 投影与比较报价上下文。
- 首页引入更明确的 server 数据读取/缓存/时序边界，移除部分请求时 schema bootstrap；首页报价 demo、模型页 hero、compare loading、Header auth/legal 有针对性的性能变更。
- 新增性能计时与 CrUX/Vercel 导出、gallery CWV 诊断/对比 CI 和大量证据数据。

**处理要求：**保留当前影院首页与定制数据兜底，同时接入新读取职责。新分页函数不可绕开 bundled fallback；显式人工策展为空、排除素材、Sora 总图库过滤、删除/私有素材均不能被“空结果就兜底”重新公开。新的性能证据来自上游部署，不能当作本项目合并后的测量结果。

### 2.5 新增视频分享

- 私人生成结果由授权 owner 创建不可猜测 `/s/[token]`，共享记录保存源身份和 owner，读取时解析当前源；可撤销且不索引，不泄露 prompt/account。
- 公共示例使用已有 `/video/[id]`；公共下载 API 只下载验证通过的 owned CDN 示例，不接收任意 URL。
- Result、媒体库及 watch 页接入轻量 share panel，支持复制链接、邮件、原生文件分享与手动 MP4 下载；社交平台按钮不是自动发帖集成。
- Signed/临时/placeholder 原始素材不生成长期链接；撤销分享页不保证撤销收件人已保存的原始文件 URL。
- 新增 `49_video_share_links.sql`。

**处理要求：**补齐 zh 文案并换成 VideoAI 推荐署名/hashtag；严格保持 original 与 derivative 区别，分享只能由用户显式触发。本次计划不操作真实社交平台。

### 2.6 后台重构、运营数据与策展工作台

- 新 Admin dashboard、导航、frame/page header、overview 数据边界；users/jobs/engines/insights/moderation/system/transactions 等视图和控制更新。
- Insights 增加图表、趋势概述、筛选与 navigation owner；MCP live refresh 与 outcome 数据修正。
- Transactions 增加筛选/历史投影/审查、结算总额与 FX 证据，区分充值、退款、账本运动与实际结算；新增服务端审计读模型和 PostgreSQL 测试。
- Gallery 管理升级为 destination/placement/candidate/preview/curation workbench，支持手动与 hybrid、排除、opening 顺序、受保护 destinations 与 public projection 预览。
- 新 `52_playlist_curations.sql`、`53_playlist_opening.sql`；现有选择应保持顺序，opening 只有 4 slots，不应因部署自动改写内容。
- 上游主动弃用内置 GSC cockpit、URL inspection 等旧 SEO 面板，页面 redirect `/admin/seo`，旧 action 保持 admin auth 后返回 410；新入口指向外部 Search Console 和内部 video SEO。
- Theme token 编辑器弃用，转向代码拥有的样式，新增 settings 等入口。

**处理要求：**新数据/工作台保留，外观适配 VideoAI，新增 UI 补 zh 与 CNY。GSC 4 个 modify/delete 冲突中有 3 个组件和 1 个测试，相关 helper 又被上游无冲突删除；采用上游删除及弃用契约，不恢复旧 JSX、OAuth、token refresh、cache/client 或已删除的旧测试；保留用于重定向和 410 的路由入口及其 admin 权限。Theme editor 没有定制差异，可采用上游弃用策略；不会因此删除 VideoAI 代码样式。

### 2.7 新增 Editorial 内容与发布系统

- 新 draft ingestion、schema/checks、媒体上传/存储、审批/correction、admin article/inventory/status。
- 公共文章采用 `.article.json` + MDX metadata wrapper，严格验证 slug、locale、标题、发布日期等一致性；新增 7 篇 EN/FR/ES 文章组，共 42 个 wrapper/artifact 文件。
- Markdown reader 增加 editorial artifact，gray-matter raw cache 处理与**实际源快照哈希**缓存键，解决跨构建旧内容污染；这里应采用源 hash，不退回定制分支的固定版本缓存字符串。
- 发布队列、Git/CI/验证与本地 worker/control/QA/review scripts 新增，属于额外运营系统。
- 新迁移 `49_editorial_drafts.sql`、`50_editorial_checks.sql`、`51_editorial_publications.sql`。

**处理要求：**代码与 schema 可合入；运行时保持 publication gate 关闭直到本项目配置齐全。上游 worker 的 siteRoot、main、GitHub/Vercel/通知对象不适用于当前 Docker 分支，不能直接启用。新公开文章品牌、owned CTA、zh fallback 与 reciprocity 要审核；不机械翻译或伪造新中文文章。若 zh 没有对应文章，遵循现有明确 fallback/noindex 规则，不生成虚假 hreflang。

### 2.8 MCP 客户端体验与多模态一致性

- instructions 与工具描述重新划分职责：全局/单工具都有 <=2,000 UTF-8 bytes 上限；广告 gate 与真实能力一致。
- tool result 提供完整 structured result 和无损紧凑 JSON text fallback，保留 media/result links；遵循 retry.afterSeconds，null 结束自动轮询。
- HTTP 请求读取过程中按 byte 限制、提前取消；无 Content-Length 也不能绕过；认证 challenge、ownership 和 private/no-store 保留。
- reference upload widget 升级 URI，旧 URI 用 frozen legacy document 保持可读取；重试需要新单次 capability，保留已成功 asset IDs，更新 model context 使用累计成功集合。
- prepare/confirm、预算、recommendations、model details、蒙太奇/audio 工具与 H3/Wan 参考字段 parity 更新；精确报价、明确授权、单次付费尝试与模糊结果恢复持续是服务端边界。
- Plugin bundle 升到 0.3.6，分发 manifest、技能说明、n8n 与 host/client 指南更新。

**处理要求：**保持此前明确暂缓的 MCP 部署地址决定；不把协议 ID、存储键、上游安装地址全局改名。新 server gate 不得为通过测试而开启，MCP/agent-api 的计价新增路径也需要 CNY 审核。

### 2.9 登录、语言连续性、退出、密码恢复与邮件

- Marketing URL 语言保持 URL-owned cache；进入 core 时将同源 referer 语言持久化 cookie，排除 prefetch；显式 `lang` 重定向 no-store/no-referrer，非本地化路径保持原路由。
- 新 auth-request-url 与开发环境 URL normalization 配置，改善 loopback/cookie origin；登录和 signup consent/loading 流程更新。
- signout/reconsent/session 生命周期新增行为与测试，避免错误退出范围和 stale callbacks。
- 新 `/auth/reset-password` 流程，支持 code/token hash/session proof，校验后更新密码；邮件 redirect destination 白名单和 safe next。
- mailer config/失败映射及认证邮件模板更新；删除冗余 EMAIL_FROM_NAME 配置。

**处理要求：**新 recovery helper 的 locale 白名单仅有 en/fr/es，核心新页面品牌仍为 MaxVideoAI，需要补 zh 与 VideoAI。`createCoreLocaleResponse` 新逻辑保留英文无前缀页面语言是合理的，但当前入口默认中文政策必须另测；cookie domain 的 `.maxvideoai.com` 硬编码不应推广到本项目域名，保持现有主域策略，不扩大到其他子域。Supabase allowlist/邮件模板需部署时核对，而非只测试 React。

### 2.9.1 新用户界面中文必补清单

| 模块 | 文件/目录 | 验收 |
|---|---|---|
| 独立分享与分享面板 | `frontend/app/(core)/s/[token]/`、`frontend/components/library/VideoSharePanel.client.tsx`、`video-share-copy.ts` | zh标题、公开/撤销/错误提示、VideoAI署名、无英文默认回退 |
| 密码恢复 | `frontend/app/auth/reset-password/`、`PasswordRecoveryForm.client.tsx`、`frontend/lib/password-recovery.ts` | COPY含zh、消息键完整、邮件lang/next、错误与成功状态 |
| 案例Reader/复刻 | `frontend/components/examples/ExampleReader.client.tsx`、`example-reader-copy.ts`及context/recreation提示 | zh参数、参考素材要求、报价与复刻错误、弹窗焦点和按钮 |
| 模型归档 | `ModelArchivePage.tsx`、`content/models/zh/sora-2*.json` | 完整中文archive对象、替代选择、历史链接，无生成Offer |

**路由直通回归：**当前 `NON_LOCALIZED_PREFIXES` 已有 `/auth`，因此不能把重置路由404写成已复现缺陷；新增 `/s/` 后仍需验证实际中间件。特别检查带 `code` 的 `/auth/reset-password` 不被通用OAuth回调分支截走。覆盖GET、显式 `lang=zh`、cookie/同源referer、prefetch、token_hash及code；不得产生 `/zh/s/...` 或 `/zh/auth/...`，保留恢复凭据及安全next。直通只免除locale改写，不绕过token ownership、鉴权或输入校验。

### 2.10 SEO、真实 Offer、发现文档与安全序列化

- 新通用 JSON-LD 安全序列化，以及 Product 可见报价 owner：同一个 public offer 同时驱动页面显示和 Product schema；给出实际场景（模式、时长、分辨率、音频），而非虚构最低价。
- 删除 pricing/service 等没有对应实际产品的固定 Offer，并移除不实 SearchAction；归档模型不生成 Product Offer。
- model/blog/docs/watch/比较 JSON-LD、llms.txt/discovery 与 sitemap assumptions 更新，新增 machine check。
- 文档、博客和模型介绍更新，尤其 Sora 归档、H3 与 Wan 新事实。

**处理要求：**新 publicOffer 路径不是现有 CNY 表示层的简单替换。应先从 USD canonical snapshot 获取真实 offer，再在一个边界转换 CNY，让 visible amount 与 schema priceCurrency/price 一致。删除定制中固定 ¥80 pricing Service Offer 的原因是“不是实际生成 Offer”，不应因保留 CNY 而保留虚构商品。保留 VideoAI Organization / site origin，不能恢复原项目社交声明。

### 2.11 支付/财务审计增量

- Wallet reserve / 初始 image/video job 增加私有 `auditPricingSnapshot`，写入 `app_receipts.metadata.pricing_audit_snapshot`；原 price-only pricing_snapshot 继续保持。
- Stripe Session/PaymentIntent 增加 `fx_rate`、`fx_source`、margin、timestamp metadata；invoice_creation metadata 保留 topup/user 身份，invoice.paid handler 与凭据读路径更新。
- `/api/receipts` 对 topup 输出原结算 amount/currency，历史缺失不编造，私有 metadata 与供应商利润不得泄露客户 API。

**处理要求：**此类文件很多可自动合并，但上游 docs 和后台 labels 默认 USD。CNY ledger、CNY settlement 与 canonical USD vendor cost 要逐一检查；新的审计快照不得数值为 CNY 却标 USD，或 vendor cost 也被 8×。LLM Hub Pay 现有文档仍残留旧 USD-wallet 描述，要与后来的 CNY migration 和实际代码统一，不以旧文档覆盖账本行为。

### 2.12 依赖、构建与交付

- Next / eslint-config-next：15.5.18 → 15.5.25；sharp：0.34.5 → 0.35.4；lockfile 同步，新增依赖安全下限测试。
- Next 增加 webpack memory optimizations，开发环境 skipMiddlewareUrlNormalize；Quality CI timeout 20 → 35 分钟。
- 新 deployment alignment check、性能脚本、SEO/MCP/CWV 检查命令与诊断 workflows。
- 上游未替代定制 Dockerfile、compose、1Panel 和 docker-build-push workflow，因此它们通常自动保留，但新 sharp binary 与 standalone tracing、fonts/artifact/worker 文件必须验证镜像内容。
- 上游 `deployment:check` 硬编码原 GitHub main、maxvideoai.com/api 域名和 Vercel provenance。本项目不能直接运行它并以失败判断当前 Docker 部署错误，也不能为了过它改用原生产地址。

## 3. 定制开发保留清单与合并原则

| 定制职责 | 必须保持的结果 | 主要检查点 |
|---|---|---|
| Docker / 1Panel | 目标分支推送能构建；web/migration 镜像与独立 worker 正常 | standalone、pnpm/pricing tracing、Node 22、原生 sharp、CNY build arg、环境注入 |
| 四语言与中文默认 | zh 路由不崩溃/循环；明确 EN/FR/ES URL 保留各自语言；新 core 仍按默认政策 | locales、messages、dictionary、slug/hreflang、login/recovery/share、新 archive |
| 阿里中国/国际 endpoint | DashScope/MaaS 配置继续有效 | 新多模态 payload 与 endpoint resolver、权限 gate |
| LLM Hub Pay V2 | RSA 签名/验签、金额核验、订单锁/幂等、支付宝/微信入口 | 迁移49、回调重复/伪造/乱序、CNY fen 与 wallet cents |
| CNY 客户报价/钱包 | canonical USD → CNY 固定8×一次；新 charge/refund/topup 都 CNY | 源 amount provenance、拒绝 currency mismatch、receipt default、header balance |
| Direct-first / fallback | 有配置的 Alibaba/BytePlus/Vertex 优先，安全的 pre-acceptance rejection 才 fallback | 保留 job/charge；accepted ID 或 timeout 不重新付费提交；LLM Hub cron/lease/refund |
| Bundled public examples | 无数据库/构建跳过/允许的缺省缺数据场景能读公开素材 | 新 catalog/read projection、public eligibility、不覆盖显式空策展 |
| VideoAI 设计与品牌 | 纸色/墨色/朱红；顶部 sticky 导航；影院首页；已验收 logo/contact/site origin | nav/header/footer/menu、HomePrice、new reader/admin/archive/reset 页面、webmanifest |
| Studio | 独立 editor；Canvas/Viewer/Timeline/media/save ACK/export/live 守卫保持 | 语言/主题、schema变化、模型认证、退出保存、生产不允许 mock toggle |
| 后台 SEO 迁移 | 采纳上游 GSC/cockpit/inspection 弃用，保留外部 Search Console 与内部 video SEO | 旧页面重定向、旧 action 鉴权后410、新入口中文、无残留服务端依赖 |

基线文档中明确暂缓的法人/经营实体事实与 MCP 运行地址继续暂缓。新合并不可引入编造信息，不把尚未配置的新 Editorial 发布系统写成已经启用。

## 4. 冲突分组与处理策略

77 个文件详见 conflicts.md，187 个共同改动文件全部进入人工/测试审查，不只看 Git conflict markers。

1. **品牌 / 顶部导航 / 影院首页 / CSS：**以定制 JSX 和已确认构图为外观基线，移入新 hook、auth/loading、精确 offer 和数据获取机制。先删除冲突的重复结构，再验证 cascade，不能用两套 CSS 叠加遮盖。
2. **模型内容 / capability / benchmarks：**采用新的事实、Sora archive、H3/Wan rates 与限制，保留 VideoAI 表述和 zh；不整文件采用旧版本，否则新约束消失。
3. **定价 / JSON-LD：**使用新真实 offer owner、安全 serializer；补 CNY 一次投影；pricing 虚构 Offer 与不实 SearchAction 应删除，保留客户货币是另外一项要求。
4. **视频读模型 / 示例卡片：**上游数据库分页/curation/统一 Reader 为职责基线；定制 bundled fallback 在服务端集中适配；UI 使用定制风格且不改变 original/action URLs。
5. **后台 GSC modify/delete：**接受上游删除旧组件及测试，保留新弃用测试。旧页面重定向 `/admin/seo`，旧 action 保留 admin auth 后410；不恢复 GSC OAuth/token/cache/client。新后台壳、Search Console/video SEO 入口补中文。
6. **middleware / core layout / 生成 route-context：**保留中文/CNY/VideoAI/provider 配置；接新 cookie continuity、auth URL、归档 gate。明确 `/s/:path*`、`/auth/:path*` 为非本地化直通路径，检查 matcher 与各重定向分支，而不只加入一个 prefix。归档拒绝先于 provider/fallback/reservation，不给历史草稿借用另一个 model。
7. **message JSON / 多语言正文：**按 key / 语义合并，zh 新增 key 与 archive严格完整；必须覆盖下述四个新增用户模块，并同时更新 `scripts/generate-zh-models.py`，不可只保留当前 zh 文件而宣称支持新功能。
8. **4 个二进制 add/add：**`angle`、`background-removal`、`character-builder`、`upscale` 的 `*-workspace-v2.webp` 默认采用当前定制中文工作区截图。若需保存上游图，另名添加且不改变原页面加载身份，避免误展示 MaxVideoAI。
9. **webmanifest / gitignore / scripts / tests：**manifest保留 VideoAI；gitignore取并集；测试按最终实际契约合并，保留金额/权限/排序/生命周期约束，不用批量改 expected 掩盖问题。

## 5. 执行阶段、操作与交付

### 阶段 A：冻结基线、隔离与基线验证

正式执行时：

```sh
git status --short --branch
git fetch origin
git rev-parse feat/videoai-studio-design origin/feat/videoai-studio-design a58d5cb
git merge-base feat/videoai-studio-design a58d5cb
```

若目标发生移动，更新清单和预演。存在用户改动则保留并隔离，不能直接 stash/reset 消除。创建目标备份引用及独立 worktree（以下名称是建议；存在时更换名称）：

```sh
git branch backup/studio-before-a58d5cb feat/videoai-studio-design
git worktree add ../VideoAi-Agent-merge-a58d5cb -b integrate/a58d5cb-studio feat/videoai-studio-design
```

在隔离目录先运行基线 lint/typecheck/相关测试，保存准确 commit、Node版本、环境与失败列表。当前文档曾记录基线失败，但必须复测，不能引用历史数量当本次结果。新 worktree 的安装依赖和本地 preview 环境独立准备；不复制/输出真实密钥。Node 使用声明的22版本。

阶段A增加配置增量清单：三方比对 `frontend/.env.local.example`、`.env.production.example`、Dockerfile/build workflow/compose及新增代码读取的env。逐项记录新增/移除/改名、默认值、必填条件、server-only或NEXT_PUBLIC/build-time、镜像/worker注入owner。密码恢复邮件、SITE_ORIGIN/分享链接、SEO脚本目标以及Editorial gate均纳入核对。现有证据显示上游 `.env.local.example` 主要删除EMAIL_FROM_NAME与旧GSC项，不预先断言新增了专用分享域名或密码邮件变量；只有代码实际读取的配置才要求补齐。不要输出私钥或完整连接字符串。

交付：before-test报告、关键页面与已授权受保护界面截图、冲突列表、完整定制保留清单。

### 阶段 B：建立真实 merge

在集成 worktree：

```sh
git merge --no-ff --no-commit a58d5cb1b83b5f8dc7120c5e7a6eab9135b76535
```

该步骤预期因冲突暂停。以 merge-base / ours / theirs 三方版本逐段审核；每组完成记录“采用上游行为、保留定制行为、测试、剩余风险”。完成前保留 merge状态，不把任意中间树当有效版本。Git merge commit 本身只能在全部冲突解决后创建；主题适配可在其后独立 commit。

推荐解决顺序：

1. package/config/types、registry原始政策、共享 pricing/capability/helper。
2. 新迁移与 bootstrap owner、Provider gate/输入验证/计费记录。
3. videos/catalog/curation/watch detail + bundled fallback。
4. middleware/auth/reset/reconsent + 四语言；`/s/:path*`、`/auth/:path*`直通，密码恢复code不进入普通OAuth回跳，增加实际middleware回归单测。
5. Marketing/model/archive/offer/首页/header + 设计适配。
6. Admin新信息架构 + 上游GSC弃用方案及中文入口。
7. Editorial/MCP/plugin兼容、脚本部署目标、文案、二进制选择。
8. 测试与文档，再生所有 projections。

合并中不混入无关架构清理。若某 owner变大需要拆职责，先查对应 architecture/contract；不是本任务要求的大清理，不必为了计划运行全仓 architecture audit。

### 阶段 C：数据库与运营适配

新增上游六个迁移均应保留：

| 文件 | 作用 | 前置与验收 |
|---|---|---|
| 49_editorial_drafts.sql | Editorial drafts | ingestion/admin schema |
| 49_video_share_links.sql | 分享token/owner/revocation | 分享API前显式运行 |
| 50_editorial_checks.sql | Editorial checks | drafts schema |
| 51_editorial_publications.sql | 发布队列/状态 | drafts/checks |
| 52_playlist_curations.sql | 策展规则 | playlist基础表 |
| 53_playlist_opening.sql | opening slots / 4-slot约束 | migration52 |

与当前 `49_llmhub_pay_topups.sql`、`50_cny_preferred_currency.sql`、`51_cny_wallet_receipt_default.sql` 数字前缀重叠，**当前 runner 用完整 filename作为主键和 checksum，不会仅因数字相同覆盖**。不过必须验证完整字典序与前置表依赖；不得重命名已应用迁移或修改其历史内容。新空库和“已部署定制库”都要执行迁移演练，第二次执行不重复作用。

**双轨迁移回归（必须执行）：**Docker `docker/scripts/migrate.sh` 按完整filename/checksum跳过已执行文件；本地 `scripts/apply-neon-migrations.sh` 每次按shell glob顺序**全量执行全部SQL文件，不检查checksum或迁移账本，也不跳过任何已应用文件**，使用 `--single-transaction`。重复运行能否成功完全依赖SQL自身的可重入性；已有库上可能报错或再次执行数据修改，绝不是增量迁移或幂等跳过。固定locale并记录两入口的完整文件顺序，检查同号文件与schema前置，不把“无同名覆盖”等同于幂等性通过。已部署的三个定制迁移绝不改名或改内容；本项目从未执行的上游文件也默认保留原名，只有明确依赖问题才单独评审。

| 场景 | 演练 | 必须断言 |
|---|---|---|
| 纯新库 | 基础schema/bootstrap → 全部迁移；每种入口再跑一次 | 前置表存在、无外键/事务包装失败、重复运行无重复数据、CNY默认和新schema正确 |
| 已有定制库升级 | 还原合成定制schema/历史迁移账本和CNY支付样本 → Docker账本入口应用未记录迁移，本地入口全量重跑；重复运行并交叉切换两入口 | 三个已应用checksum不变、订单/余额/receipt/媒体身份不变、无重复credit、新表与opening约束正确 |

本地脚本硬性要求direct `*.neon.tech`且拒绝pooler，因此临时Docker PostgreSQL URL不能直接交给它。回归需要测试专用适配/受控fixture：在disposable库执行相同SQL排序与psql参数，并独立测试原脚本的host校验；若要端到端运行原脚本，应使用隔离Neon测试分支，不指向生产。容器存在也不等于 `tests/helpers/disposable-postgres` 所需工具就绪，需检查实际helper前置。遇到非幂等SQL或内外事务冲突，记录并修复新迁移或测试/runner适配，不改历史迁移以绕过checksum。

阶段C复查配置增量清单：启动预览/迁移/worker的条件必填项、缺省行为、分享same-origin、Supabase恢复allowlist、已弃用GSC变量移除、新SEO脚本配置。验证缺少可选配置的明确降级，不把静默异常当成功。

现有 migrate.sh 在 SQL执行后另行写 checksum；执行成功但账本记录前中断、以及两个 migration container 并发需要演练或部署时串行保证。某些新 migration 自身事务包装不同，不能不检查就统一外包 BEGIN。

上游移除 read-path ensureBillingSchema，Docker bootstrap 必须包含新读取必要的schema owner，但 migration 应由单独迁移流程提前完成；不把新 DDL塞回请求路径。数据库准备、Gallery collection creation/curation、Editorial publication/通知、生产付款属于独立运行操作，本分析不执行。

Editorial publication gate保持关闭，worker repo/ref/CI/siteRoot/envPath/通知目标待本项目运行契约明确后开启。分享/curation代码可以合入，但schema readiness必须在预览/生产启动前满足。

### 阶段 D：生成投影与依赖一致性

先修正 `scripts/generate-zh-models.py` 的生成及校验契约：archive严格翻译/校验、归档模型不强制生成CTA、H3硬编码覆盖新增480P/字段、H3 Max/Wan新结构与specs、未知字段保留、中文链接与既有定制文案。当前脚本会重写全部zh文件，且H3使用独立硬编码字典；仅手改JSON会在下一次显式生成时被覆盖。

核实调用链：现有 `model:registry:generate` / `model:registry:check` **不调用这个Python脚本**，前者生成runtime投影、后者只读校验。风险是以后显式运行Python造成内容回退，以及新archive校验读取不完整zh；不是registry命令自行删除字段。为脚本添加隔离输出目录或测试fixture能力，再针对Sora/H3/H3 Max/Wan样本验证；同一输入生成两次结果一致，审查全量diff，不能在主工作区盲跑。

顺序：英文新结构审核 → Python契约及翻译更新 → 隔离生成/校验 → 人工审查并同步zh内容 → 再生registry/catalog/roster → 只读check。需要明确调用时用 `python3 scripts/generate-zh-models.py`，但仅在已具备隔离输出或可审查worktree后执行。

按完成后的 registry 和 raw engine事实再生，不能直接合并旧生成片段作为最终真源：

```sh
pnpm install --frozen-lockfile
pnpm model:registry:generate
pnpm engine:catalog
pnpm model:generate:write
pnpm model:registry:check
pnpm model:launch-assets:check
```

命令模式说明：`model:registry:generate` 显式传 `--write` 写runtime，`engine:catalog` 默认写catalog，`model:generate:write` 显式写roster。最后的 `model:registry:check` 虽是复合命令，但只重新计算预期投影并比较磁盘文件：runtime子命令没有 `--write`、catalog子命令传 `--check`、roster子命令没有 `--write`；漂移时失败，不自动修复或写回。它不调用写入版 `model:registry:generate`。不得因脚本名称包含generate而把只读检查说成再次写文件。

锁文件先确认与最终两边 package修改一致；若 frozen失败，在隔离分支用项目既定pnpm版本重建后审查依赖差异，再验证 frozen。

检查原始 registry是唯一 authored源；生成catalog中的定制 fallback媒体如果当前来自手工改动，先找可再生的 authored owner再迁移，禁止再次写进生成文件。home poster/source/rendition manifest不手工改，已有immutable媒体保留；只有实际关键 poster变更时运行 prepare，其余运行read-only gate。

### 阶段 E：验证与验收

见下一节。全部 conflict resolved且必要检查通过后，创建 merge commit，确保两父历史与完整上游祖先保留。后续适配修正可拆为 reviewed commits，例如 CNY offer兼容、zh新表面、后台弃用适配和release docs。

交付集成分支/具体review diff、模块决策记录、测试报告、before/after截图/CWV、迁移与运行清单，之后才更新目标分支。普通合并历史无需force-push；不要rebase掉现有定制提交。

## 6. 验证矩阵与通过条件

### 6.1 静态 / 构建检查

在集成分支执行：

```sh
npm --prefix frontend run lint
npm run lint:exposure
pnpm exec tsc --noEmit -p frontend/tsconfig.json
pnpm model:registry:check
pnpm model:launch-assets:check
pnpm --prefix frontend run i18n:check
pnpm --prefix frontend run media:public-renditions:check
pnpm --prefix frontend run media:home-posters:check
git diff --check
```

完成下述分级focused检查且依赖就绪后，再执行完整 `pnpm test:validate`、`npm --prefix frontend run build`。新增 `mcp:client:check`、`seo:machine:check`、`cwv:check` 在完成本项目域名/CNY/zh适配后执行；它们是离线/确定性验证，不触发真实付费。不要盲跑硬编码原站生产的 deployment/CWV导出或运营worker。

### 6.1.1 分级测试运行策略

上游涉及278个测试文件是**136新增、138修改、4删除**，不是278个全新测试。按依赖分级，不只按文件名猜测。

1. **第一梯队：离线快速门禁。**使用本节已有的实际lint/typecheck命令，运行经审核无DB/浏览器/ffmpeg/外部请求的单元与契约文件，例如 `pnpm exec tsx --tsconfig frontend/tsconfig.json --test tests/videoai-design-contract.test.ts tests/cny-payment-quote.test.ts tests/llmhub-pay-protocol.test.ts`。列表执行前检查依赖与fixtures；用 `node scripts/run-validation-tests.mjs --plan`查看完整入口计划，再建立明确的离线allowlist。不要直接把排除 `*-postgres` 后的所有测试称为离线。
2. **第二梯队：数据库集成。**确认psql及helper所需PostgreSQL服务端工具，启动隔离实例或适配容器连接后执行明确的 `*-postgres.test.ts`组及迁移双轨回归。设置启动、单测与清理timeout，健康检查失败立即报环境问题；不长时间等待或fallback到生产DB。数据库必需测试的skip单独报告，发布前必须在可运行环境完成。
3. **第三梯队：浏览器/媒体/Studio与完整回归。**Chromium/ffmpeg/认证预览环境就绪后运行对应集成/E2E/CWV。最后运行完整 `pnpm test:validate`，它枚举顶层全部test.ts并另外串行运行4个Studio integration文件，包含Postgres及其他依赖，**不是纯单元入口**。root没有通用 `pnpm lint` / `pnpm tsc` 脚本，使用上面已核实命令。

CI按依赖分job，先快速门禁再集成；设置bounded timeout与失败日志，区分断言失败、工具缺失和skip。全套受依赖阻塞时继续完成离线部分，但不能宣称完整验证通过。

### 6.2 Focused测试组

测试文件清单是建议入口，执行时使用实际合并后的文件和模块对应套件；新增业务兼容测试不应只有source-text字符串匹配。

| 范围 | 现有/上游重点测试 | 应补的本项目场景 |
|---|---|---|
| CNY/支付 | cny-customer-wallet、cny-payment-quote、billing-currency-policy、llmhub-pay-protocol/notify/architecture、wallet-checkout-session、transaction-audit-persistence-postgres | 新public offer显示/schema金额相同、审计源USD与客户CNY分离、重复notify/refund仅一次 |
| Direct/fallback | llmhub-provider-routing、llmhub-video-poll、image-direct-fallback-policy、generate-route-context、alibaba-model-studio-submission、provider-reference-parity | archived先拒绝不扣费；H3/Wan新字段不被adapter丢失；timeout/acceptedID不fallback再提交 |
| 新模型/定价 | minimax-h3*、minimax-h3-max*、wan-3-input-video-pricing、wan-reference-pricing-runtime、preflight-media-pricing、h3-wan-generation-payload-parity-review | CNY一次转换；首/尾帧、audio-only、target soundtrack、480P/1080P、可信元数据不足拒绝 |
| Archive/发现 | sora-sunset、sora-discovery/postgres、model-registry-parity/redirects、product-schema-visible-offer/customer-price | zh Sora严格archive成功；无生成按钮/Offer；保存历史草稿要求明确新选择 |
| Auth/语言 | auth-locale-continuity、auth-signout-scope、auth-local-origin、password-recovery、login-password-reset、core-workspace-locale、videoai-design-contract | zh recovery邮件/页面；中文default；EN无前缀连续性；prefetch不写cookie；signout指定scope |
| 图库/策展 | examples-catalog-pagination-postgres、gallery-read-postgres、gallery-release-rehearsal-postgres、admin-playlist-curation-postgres、example-reader-*-dom | 513+记录无漏页/重复；当前页hydration；无DB/构建fallback；人工空策展不回填；私有/删除永不曝光 |
| 分享 | video-sharing、video-watch-share-dom、media-library-contract | zh/VideoAI署名；同源token、无prompt、非owner拒绝、撤销后不可看、signed原图拒绝长期URL |
| Editorial | editorial-schema/checks、repository/queue-postgres、markdown-content-cache、editorial-jsonld-ssr、editorial-publication-* | zh fallback SEO；内容hash缓存更新；gate关闭无外部写；Docker包含artifact |
| MCP | mcp-instructions、mcp-result-serialization、mcp-transport-contract、mcp-reference-upload-app、mcp-provider-reference-parity | 累计成功ID重试、旧URI frozen、请求提前取消、保留CNY/模型路由 |
| Studio | test:editor:contracts、test:editor、studio-localization-contract、timeline-export-* | shared schema变更不自动认证新模型；归档fail-closed；save/ACK与主题/zh不回退 |
| 设计/性能 | videoai-design-contract、marketing-navigation-rendering、home-route-architecture、home-price-demo-loading、examples-lcp-performance、model-page-loading-performance | 顶部导航几何/菜单焦点；CNY quote；新Reader样式；poster/image优化与加载预算 |
| 后台 | admin关键flow/e2e、insights、transactions、curation、retired-theme | 旧GSC页面redirect、旧API鉴权后410、无旧服务端依赖；新settings/SEO入口中文 |

PostgreSQL用disposable实例，不用生产DB；需要 ffmpeg、Chromium、Node22的检查提前准备。依赖缺失导致skip必须在报告中可见，不计为通过。

### 6.3 浏览器与接口冒烟

桌面1440/1024，移动390/320；重要导航可加768/1280。至少覆盖：

- `/zh` 影院首页：首屏poster、主CTA、模型切换、报价、播放、向下comparison/tools/FAQ；顶部sticky/nav/menu/Escape/focus。
- `/zh/models`、`/zh/models/minimax-h3`、`/zh/models/minimax-h3-max`、`/zh/models/wan-3`、`/zh/models/sora-2`，以及EN/FR/ES代表详情。
- `/zh/pricing`、`/zh/examples`、Wan family、横/竖 `/video/[id]` Reader：切换、退出、参数/报价/复刻、分页、分享。
- `/login`、注册、恢复密码、`/auth/reset-password`：zh与EN连续性、过期链接、无会话、成功返回与错误状态。
- 受保护 `/app`、image/audio、library、billing、Studio projects/workspace、admin dashboard/transactions/playlists/seo：用允许的测试账户与预览库验证实际内容，不把重定向至login算功能通过。
- Studio生产入口Live、没有Mock toggle；Canvas到timeline、save退出、导出请求/worker/poll保持。
- **LLM Hub Pay Notify贯穿验证：**实际路由为 `/api/llmhub-pay/notify`（checkout生成的notifyUrl也指向这里），不是 `/api/billing/llmhub/notify`。Mock签名POST使用 `application/x-www-form-urlencoded`，不带会话Cookie/Origin/CSRF token，穿过实际middleware与route确认不发生locale/login重定向，不被新增JSON-only/CSRF策略拦截；有效通知应进入验签/订单核验并返回plain-text `success`。验签不合法400、错误content-type415、超16,384bytes413（含缺失/虚假Content-Length）、重复通知只入账一次仍success。仅对支付通知保留协议所需通道，不全局放宽API防护；使用mock平台密钥与隔离DB，不触发真实付款。尚未核实存在全局新增CSRF拦截，不将潜在风险写成已复现问题。
- CNY余额不足、报价过期、供应商安全拒绝/模糊结果、charge/refund；Stripe/LLM Hub Pay在mock或sandbox中验证完整回调，不在真实商户自动花钱。
- SEO输出：canonical/hreflang/JSON-LD、301矩阵、archive no Offer、token noindex、sitemap inclusion；actual DOM不能只看源码字符串。

### 6.4 性能与发布门槛

使用同一fixture、同一构建方式/Node、viewport、网络/CPU条件记录目标HEAD与集成HEAD：home、gallery hub、Wan family、横竖watch、model detail，桌面/移动cold与warm。关注LCP/CLS/INP、poster请求、视频字节、重复请求、DB query数/rows/bytes、首次Play。

以可重复的多轮结果判断回退，单次开发模式速度和上游旧CrUX报告不能证明合并收益。若出现可重复CWV回退，先修复或按模块回退该变更，再发布；保留实际original与下载质量。

上线前额外检查：Docker镜像digest/commit正确；CNY在build time生效；完整迁移完成；Supabase回调/恢复链接与域名一致；LLM Hub poll cron与Studio export worker就绪；Editorial保持关闭；Search Console入口正确且旧GSC链路已弃用；新分享公共HTTP/Range与权限正确。

## 7. 验收标准、回滚与工作量

完成条件：

1. 两边SHA均为最终分支祖先，43个定制提交未重写；无未解决冲突或误提交临时产物。
2. 定制保留矩阵逐项有行为证据；上游生命周期/价格/安全修复仍有效。文本自动合并不构成验收。
3. 必要build、registry/media/locale、安全/财务/权限/分页/Studio tests通过。其他基线失败要用同样环境的前后证据说明；新增失败不以“历史测试多”豁免。
4. 六个新迁移与三个定制迁移共存，干净库与已部署库演练通过；不得改写已有账本金额/素材可见性/历史模型身份。
5. UI保持当前顶部导航/影院首页/中文/CNY/VideoAI方向；新页面同样适配，无hydration/overflow/不可读主题问题。
6. 生产操作尚未执行的项目有明确runbook/gate，没有用上游运行证据冒充本项目完成。

回滚：集成阶段删除/放弃隔离worktree即可，不触碰原目标；目标合并后如需撤销，用针对merge commit的revert（如 `git revert -m 1 <mergeSHA>`，需结合后续适配提交），不force reset已共享分支。部署可切回previous已验证digest。数据库新增表/列默认保留，确认旧镜像兼容；不自动DROP新表或删分享/发布/订单记录。上游价格变更发布后已产生交易不能靠回滚代码重写历史。

估算：单人集中工作约5–8个工作日：基线/隔离0.5天，冲突与基础适配1.5–2天，CNY/provider/gallery/auth/zh兼容1.5–2.5天，后台/Editorial/设计0.5–1天，迁移/全测试/浏览器/CWV与review1–2天。该估计依赖可用Node22、PostgreSQL、浏览器、预览账户/环境；新失败或环境准备可能增加时间。不是仅77个文件点选版本即可完成的合并。

建议最终采用一个明确的两父merge + 少量职责清晰的兼容修正commit，在集成分支通过验证后再合回 `feat/videoai-studio-design`。不在此轮更换生产分支、部署平台、MCP服务身份或商业定价架构。
