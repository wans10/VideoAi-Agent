# MaxVideoAI × Keyvo 分支审查与合并方案

审查日期：2026-10-08（Asia/Shanghai）。目标：将 `feat/white-label-keyvo` 的有效定制纳入当前 `MaxVideoAI`，保留上游新功能、正确计费与定制体验。本次只进行了分析、临时 Git 对象中的模拟合并、静态检查和定制分支测试；没有切换分支、解决工作树冲突、创建合并提交、推送或部署。

## 1. 结论与合并选择

**可合并，但当前不能直接发布。推荐从 `MaxVideoAI@d0acb5e` 创建独立集成分支，合并 `feat/white-label-keyvo@9ed63ad`，按责任处理 114 个冲突文件，再补上新架构的中文、Keyvo 和 CNY 适配。** 不推荐整目录覆盖、全局 `ours/theirs`、重放全部定制提交或将提交列表直接 squash 成一份巨大补丁。

关键阻断包括：新 Studio 积分购买与 CNY 钱包冲突、手工价目表返回路径及请求版本头适配、旧迁移 checksum 阻断、新后台 worker 的 Docker 调度、支付订单超时恢复。旧 Canvas 在上游已经退役，旧定制不能原样恢复。

这里有两个不同的产品目标：

- **本仓库的 MaxVideoAI 分支也要变为 Keyvo 定制产品**：采用本报告的 `MaxVideoAI → integrate → PR 回 MaxVideoAI` 路径。
- **MaxVideoAI 要长期作为原作者上游镜像**：应保留 MaxVideoAI 原样，将它合入新的 Keyvo 集成分支，最终 PR 回 `feat/white-label-keyvo`。合并后的树可以相同，但维护和 PR 目标不同。

按你的字面要求，以下具体命令使用第一种方向。必须明确：这会让本仓库的 MaxVideoAI 包含 Keyvo 品牌、中文单语言、人民币及付款定制，以后同步原作者时它不再是纯镜像。原作者仓库本身不会被本地操作改变。

## 2. Git 事实与范围

|项目|已核实结果|
|---|---|
|当前工作分支|`feat/white-label-keyvo`|
|定制 HEAD|`9ed63ad`，本地与 origin 跟踪引用相同|
|上游 HEAD|`d0acb5ee1aafea1440f164d9ae351f957681320d`，本地与 origin 跟踪引用相同|
|上游前一提交|`983cb57d17a476f41add324778023f3ef68c4360`|
|最初定制起点|`64f8c76`|
|实际共同祖先|`a58d5cb1b83b5f8dc7120c5e7a6eab9135b76535`|
|已发生的上游合并|`e5f2e0c` 已合入 `a58d5cb`；因此不能将它视作尚未接入的上游|
|当前 origin|`https://github.com/wans10/VideoAi-Agent.git`|
|开始审查时工作树|干净|
|引用时效性|分析当前本地对象和 origin 跟踪引用；本次没有联网 fetch，报告不是远端未来提交的证明|

```text
64f8c76 ── a58d5cb ── 983cb57 ── d0acb5e  MaxVideoAI
    ╲          ╲
     定制提交 ── e5f2e0c ── 后续定制 ── 9ed63ad  feat/white-label-keyvo
```

`983cb57` 自身：1,907 个差异项、121,933 行新增、80,020 行删除。`d0acb5e` 自身：241 个差异项、7,866 行新增、471 行删除。这是大规模结构及业务升级，不是两个小修复。

从共同祖先计算、开启 Git rename 检测时：上游 2,072 个差异项（129,595 行新增、80,287 行删除）；定制 1,384 个差异项（75,469 行新增、8,423 行删除）。为了不遗漏被移动的旧路径，完整清单使用 **`--no-renames` 的物理路径口径**：

|范围|物理路径数|新增|修改|删除|
|---|---:|---:|---:|---:|
|上游|2,110|1,157|650|303|
|定制|1,384|248|1,136|0|
|双方均变化|236||||
|仅上游|1,874||||
|仅定制|1,148||||
|并集|3,258||||

模拟合并：**114 个冲突文件 = 108 个内容冲突 + 6 个修改/删除冲突**。双方变化但未报告文本冲突的路径为 122 个，也必须审查。rename 检测中的 2,072/235 与物理路径中的 2,110/236 属于不同统计口径；本报告后续采用物理路径口径。

全部 3,258 个路径列于 [file-inventory.tsv](file-inventory.tsv) 与 [file-inventory.json](file-inventory.json)。每条包含区域、双方 A/M/D、归属、冲突类型和处理原则。全部 114 个冲突列于 [conflict-resolution.md](conflict-resolution.md)，没有省略剩余冲突文件。清单完成的是路径级覆盖与规则分类，**不代表每个文件都经过人工逐行审计或独立运行验证**。这是本次审查的明确能力边界，不能承诺不存在任何隐藏缺陷。

## 3. 两次上游更新的实质

### 3.1 983cb57

- Studio 从私有 Canvas 转向对话工作区：新增 `conversation/[projectId]`、共享 `_shared`、对话项目入口、服务端命令/日志/恢复；大量旧 Canvas React Flow、控制器、样式与测试被删除或迁移。旧 projects/workspace URL 改为重定向；私有 editor 修改 API 变为认证后 410。
- 价格系统新增手工客户价目表、数据库状态和版本、selector/连续数量、价格切换证据、管理员工具、报价 revision、在扣款事务内锁定 revision。`customer-tariffs.json` 的 production reader 开关为 active，不意味着目标数据库已经完成激活。
- 直接支付从松散 PaymentIntent 检查升级到绑定请求、用户和报价的 direct-payment quote 生命周期。定制不能恢复旧的仅比较金额路径。
- 生成、参考素材、模型事实和退款继续收紧；包括 Seedance Draft/final 的独立报价/关联状态，输入媒体计价和供应商成本事实。必须保留收费前验证、已受理与未受理区分。
- `seedance-1-5-pro` 改为 deep_legacy，app 与 pricing 不发布，family copy 排除。页面和历史 SEO 并未简单删除。
- 营销、示例、首页和模型媒体生命周期/缓存更新；新增内容与样例；不能只保留定制视图而放弃新的服务端 data/quote/media 责任。
- Quality CI 拆为 fast、数据库/媒体 integration、财务 tariffs、browser 等 lane，并增加夜间/manual lane 和 selector 脚本；依赖、工具和测试运行脚本同步变化。

### 3.2 d0acb5e

- 对话 Studio 的媒体分析、持续任务、预算、恢复和 worker 扩展；新增 cron/worker API、任务组件与 `64_studio_media_analysis.sql`、`65_studio_task_budgets.sql`。前台 POST 接受请求不等于后台任务一定执行。
- 图片工作区和视频操作继续调整；图片 session、composer persistence、gallery/display state、starter 等是新增适配面。
- Receipt UI/API 和用户可见失败消息更新。
- 比较页、示例页与首页数据/价格呈现继续调整；六个比较 JSON 冲突来自最新更新，也要与中文版本同步。
- Cookie/Consent/Clarity/analytics 生命周期更新；主题及品牌 CSS 合并不能回退这些加载和隐私选择行为。

精确提交文件清单：[983cb57](upstream-983cb57-files.tsv)、[d0acb5e](upstream-d0acb5e-files.tsv)。这些大提交的说明只有“同步上游更新”，以上以实际文件/代码为依据，不使用提交标题代替分析。

## 4. 定制功能盘点与保留边界

|定制域|已识别内容|合并保留/重做范围|
|---|---|---|
|Docker/1Panel|多 stage web/migrations、mock、Compose、nginx、迁移脚本、Docker Hub workflow|保留自托管能力；适配新 worker、migration、CI 和镜像 provenance|
|中文|zh locale、slug、全站字典、模型/比较/工具/文档、登录与运行时 fallback|保留现有中文；翻译上游新增/变化内容，不仅复制旧 zh 字典|
|中文单语言|site-experience policy、307 旧语言跳转、sitemap/metadata、核心无前缀路由|保留 policy；新增 Studio/public routes 也要落入相同 policy|
|视觉/品牌|VideoAI 中间版本、电影制作体验、首页/工具/示例/价格/账户、最终 Keyvo 与 app.keyvo.cn|最终仅 Keyvo；复用上游数据/媒体 owner；历史来源和协议标识保留|
|支付/钱包|LLM Hub Pay V2 RSA、支付宝/微信、CNY 支付、客户 8× CNY、ledger/default/preferences|保留；修正不确定创建恢复，接入新价目表/积分/报价锁；不可混币种|
|推理供应商|直连优先、LLM Hub fallback、模型映射、MP4 内容复制/几何校验/退款/poll|保留验证过的基本模式与已受理保护；供应商收费事实另行维护|
|Google Vertex|凭据 readiness、Veo regional 与 global 模型分离|保留；不要因旧部署环境而回退上游新参数/验证|
|Qwen Image 3|两个 registry model、北京 endpoint、1 输出/1–3 references、计价、owned storage/thumbnail|保留 authored model 与 adapter；补新价目表覆盖、任务状态及恢复适配|
|GPT Image 2.5|Flare/Sunburst Base64、PNG/JPEG 解码、尺寸/数量验证、存储 rollback、1920×1088、显式 Auto 尺寸|保留实际协议修复；不能被上游旧实现覆盖；计价与网关 invoice 仍需独立证明|
|图片断线恢复|读取同一 owned job，无第二次 paid POST，账号变更检查|保留；合入新报价 headers/error refresh，避免永久 409|
|媒体/示例|bundled public examples、模型 generic data、源域 CloudFront、国内分享 portal|保留真正需要的 fallback 和 originals/thumbnail 区分；公共 optimizer 不接签名私有链接|
|MCP 隐藏|导航/footer/快捷入口隐藏、publication flags；协议/OAuth/既有连接管理仍保留|保留隐藏策略，并查新 public Studio/assistant 入口；隐藏不等于禁用 transport|
|测试/文档|中文、品牌、支付、routing、Qwen/GPT、UI、历史合并验证|保留有效断言；旧 Canvas 测试按退役边界处理；历史通过记录不作为当前证据|

定制独有的非 merge 提交共 63 个，完整列表见 [custom-commits.txt](custom-commits.txt)。它包含前期 Docker/中文/付款及多次修复，不应只 cherry-pick 最后十个白标提交。按 64f8c76 范围看到的 65 个提交包含已接入的上游提交和 merge，不能直接当作“65 个需要重放的定制”。

## 5. 已确认问题和风险

### F1 — 高：支付订单创建超时后，成功通知可能永远无法入账（当前定制问题）

证据：`frontend/app/api/llmhub-pay/checkout/route.ts:63–70` 只在 create 调用成功返回后设置 providerCreated；异常且 false 就调用 `markLlmhubPayOrderFailed`。`frontend/server/llmhub-pay/orders.ts:79` 仅允许 pending 订单结算。

复现时序：本地 pending → 网关创建成功 → 10 秒超时/返回丢失/成功响应解析异常 → 本地 failed → 网关有效 TRADE_SUCCESS 通知 → settle 拒绝 `llmhub_order_not_pending`，notify 返回 500；重复通知也不会恢复。不能从现有 signed happy-path 测试推断这条路径安全。

方案：明确区分确定拒绝与创建结果不确定；后者保留 pending/unknown 并按同一个商户订单号 signed query 对账，不新建付费订单；只有确定未创建/失败才终结。有效通知/查询仍需在锁下核对商户、订单、金额、payment type、provider ID，并幂等写 receipt。增加 lost response、query recovery、notify/create 并发与 DB 中断的 disposable PostgreSQL 测试。另需补真实支付宝/微信支付验证；本次未调用网关。

### F2 — 高：修改过的历史 migration 31 会阻断现有 Docker 数据库升级（合并兼容问题）

上游修改 `neon/migrations/31_mcp_trial_entitlements.sql`，保留 migration 60 的 raster 校正 replay 语义。定制 `docker/scripts/migrate.sh:31–35` 对同一 filename 的旧 checksum 不同直接退出。

如果 31 已由旧镜像登记，合并后迁移容器会停止，web 的 service_completed_successfully 依赖也不能启动。这是条件明确的确定性阻断，不是“数字 49 重复”的同一个问题。

方案：读取目标数据库 migration ledger 的 filename/checksum；以审阅过的新 forward migration 承接必要变化，或设计绑定旧/新 checksum 和真实 schema 的显式 reconciliation。不要修改 ledger checksum 假装已执行，不要随意关闭检查，不要回退新 31 的 replay 防护。已上线的定制 49/50/51 filename 必须保持，不能为了整齐直接改名。

### F3 — 高：新 Studio 积分包及旧付费 assistance 使用 USD，与 CNY 钱包不兼容（合并后功能阻断）

上游 `frontend/src/server/studio/assistance-credit-ledger.ts:38` 以 currency USD 调用 reserveWalletChargeInExecutor；`assistance-ledger.ts:178/216` 的 reservation/refund 也固定 USD。定制 `frontend/src/lib/wallet.ts` 在 CUSTOMER_CURRENCY=CNY 时明确拒绝非 CNY 扣款。

结果：CNY 用户即使余额充足，也无法购买上游新积分包；旧付费 assistance 恢复路径也必须考虑。报价 tariff、packs schema `[200,500,1000]`、creditsPerDollar=1000、客户端 pack 显示和写入 lot 的 amount_cents 都有关联，不能只把 currency 字符串改为 CNY，否则把美元分当人民币分会改变价格/权益 8 倍。

方案：保持 supplier nanoUSD 和已存在 immutable USD tariff 事实，新增客户币种/版本与明确转换，统一 pack 展示、报价、receipt、lot credit 数量和退款；新购历史记录带币种/转换 provenance。历史 USD receipt 不原地改写。新 task/analysis 共享的资金路径一并审查。

### F4 — 高：manual tariff 新 return 分支绕过旧 CNY 投影；必须适配整个新价格路径（合并实现风险）

定制 `quote-billing.ts` 在旧函数最终返回 `customerSnapshot(snapshot)`。上游新增 `if (manual) return projectCanonicalQuoteToSnapshot(...)` 早退。只保留底部转换会让 legacy path 为 CNY、manual path 为 USD。wallet、trusted quote、display currency checks 会因此失败或出现价格不一致。

同样需审查 quote-public、admin preview、direct-payment quote、Storyboard workflow、tool/upscale、audio、image estimate/execute 的新增返回分支。目标 DB 初始 state inactive 可能暂时掩盖问题；activation 后才出现。

方案：选择一种一致的价目表币种契约。建议保持 authored/supplier USD 的地方有明确 source，唯一 customer projection 返回 CNY；CNY-authored tariff 不二次乘 8。保留 manualTariff/revision/cellId/量纲和供应商 original cost。activation 工具和 pricing baseline 也必须验证相同契约。不得为了通过请求而绕过 revision/transaction locks。Qwen 两个新增模型需确认 active tariff selector/cell coverage，否则可能 missing_cell 阻止生成。

### F5 — 高：图片断线恢复 helper 与上游报价版本头相冲突（合并实现风险）

定制 `frontend/lib/image-generation-client.ts:55` 只发送旧 PRICING_POLICY_HEADER。上游 `frontend/lib/api-generation.ts:204` 的 runImageGeneration 接收第二参数 pricingSnapshot，并通过 customerTariffRequestHeaders(snapshot) 发 `x-maxvideoai-customer-tariff`，错误时 notifyCustomerPricingRefresh。

上游图片 API/execute/pricing 读取此 header；manual quote header 缺失会返回 409 PRICING_REFRESH_REQUIRED。选择定制简化 runImageGeneration 版本将丢掉第二参数和 header；选择上游版本将丢掉定制断线恢复。

方案：让恢复 helper 接收当前 snapshot/headers，保留上游 runImageGeneration 签名、revision header 与 refresh event；保留只读同一 job 的恢复和账号保护。409 不触发自动重发 paid POST；刷新后用户重新确认。图片调用点同步上游第二参数。

### F6 — 高：新 worker 不随 Docker web 部署自动运行（部署缺口）

d0acb5e 新增 studio tasks/analyses worker。当前 1Panel Compose 仅 db-migrate 与 web，无 scheduler/worker 服务；`frontend/vercel.json` cron 在 Docker 上不会执行。

方案：盘点合并后所有 cron 与 worker，按上游实际 route/token/lease contract 配置 1Panel 定时任务或独立 worker，至少涵盖既有 video provider polls、reconcile 与新增 tasks/analyses。确认 PROCESS 接受→checkpoint→lease→结束/取消/资金恢复，不只检查 HTTP 200。禁止公网无鉴权 cron。没有实际主机调度证据，不能宣布任务功能可上线。

### F7 — 中高：Qwen 异常处理对“不确定受理”及 durable refund 的区分不完整（当前定制问题，包含继承边界）

`alibaba-qwen-image-client.ts:110` 在 JSON 解析失败即抛出，无独立 acceptance ID/checkpoint。`alibaba-qwen-image-execution.ts:76` 只在整个返回解析成功后记录 request ID；catch 对超时、provider parse、copy/thumbnail/completion 等异常统一调用 persistFailedImageGeneration，默认立即退款并声称 refunded_wallet。

共享 `image-generation-failure.ts:125` 先写 failed/refunded 状态，`193` 后才写退款；这个顺序是继承已有 helper，**不能算成全部由你的定制新引入**。但 Qwen 新 adapter 现在也接入了它：退款写失败可留下状态声称已退款而 receipt 尚未存在。超时也可能是供应商已受理，前端查询恢复无法找到完成结果。

方案：区分明确 rejection、受理不确定、已拿到输出但持久化失败；尽早持久化 provider identity/恢复信息，后台对账或人工核对，不重复 paid POST；refund durable 后再转 refunded/terminal。按认证过的供应商能力设计恢复，不能编造不存在的 query endpoint。为 direct adapter 传递 accounting/payment mode，而非默认所有错误都 paid_wallet/refunded_wallet；included/trusted paths 要针对实际可达情形测试。

### F8 — 中：payment order 的 wallet currency 没有冻结（当前数据契约风险）

pending order 存 wallet_amount_cents 和 quote_metadata，结算时却使用当前 CUSTOMER_CURRENCY，而不是订单创建时的币种。当前 CNY 始终不变时不触发；但版本回滚/切换 USD 或旧订单跨迁移结算时会把金额写成不同单位。

方案：订单创建持久化 wallet_currency/转换策略版本，结算读取不可变订单币种，禁止运行时环境重解释历史订单。切换时 pending/paid/retry/in-flight 全部核对。库中的旧 USD 钱包不能依赖“当时无注册用户”的旧文档假设。

### F9 — 中：合并后新增中文键和品牌遗漏（已实际盘点）

将上游 en 字典 flatten 与定制 zh 比较，缺 15 个键，完整见 [upstream-keys-missing-zh.txt](upstream-keys-missing-zh.txt)：auth.continuation studio/mcp、mcpStaging、nav studio/startCreating 和 topup 报价字段。

此外 33 个仅上游路径包含旧品牌/domain，见 [upstream-only-brand-review.txt](upstream-only-brand-review.txt)。这只是候选列表：其中有包名/协议 ID/历史 attribution 必须保留，也有新 Studio UI/error/schema 的真实品牌残留；不能全部 replace。

方案：所有新字典键、修改键和 hardcoded UI 都完成中文；审核公开 Studio route visibility、schema origin、登录 continuation、报价/credits/analysis/task panels。已有品牌测试在旧分支通过不能证明新的上游文件满足 Keyvo。

### F10 — 中：CI 不会覆盖 PR 到 MaxVideoAI，镜像发布也不等于 release gate（当前配置问题）

上游 Quality CI 只监听 PR/push 的 main，定制 Docker workflow 不监听 MaxVideoAI，且多个历史定制分支都参与镜像发布。若 PR 目标是 MaxVideoAI，会缺正常 Quality required check；合并 MaxVideoAI 不一定构建 Keyvo 镜像。`latest` 跨分支推送存在镜像选择竞态。

方案：为真实目标添加 Quality trigger/branch protection，保留 lane selector 的实际财务/数据库/browser覆盖。增加 CNY build/test lane，而不只默认 USD。发布镜像绑定明确 commit SHA/digest，业务 release 依赖 Quality 成功；不要让任意历史分支共享无约束 latest。本报告发现 CNY 环境下一项旧 Canvas 测试固定 USD，见 F13。

### F11 — 中：迁移 runner 的 concurrency 与 concurrent migration 覆盖不足（当前 runner 问题）

migrate.sh 将执行 SQL 与登记 checksum 分两次 psql；中间崩溃会出现执行成功但未登记。多 migrator 并发也无全局锁。脚本只扫描 maxdepth 1，合并新增 `neon/migrations/concurrent/66_public_deleted_media_index.sql` 不会被它执行。

相同数字前缀 49/50/51 的两个不同 filename 在当前 filename PK 中可以共存，不构成直接 PK 冲突；但要审查依赖顺序。不能为统一编号改已执行文件。concurrent index 要有独立非事务路径/登记机制；一般迁移执行与登记要支持失败恢复与串行锁，BEGIN/COMMIT 文件与 transaction wrapper 必须一致设计。

### F12 — 中：1Panel 配置提交了数据库默认口令（当前定制问题）

`docker-compose.1panel.yml` 的两个 DATABASE_URL fallback 包含非空静态用户名/密码/host；不要把它当示例而继续使用。报告不重复口令。若它在真实环境使用过，必须更换数据库凭据，并改为显式要求环境配置（缺失即 fail），镜像、日志、Git 历史与访问权限按实际暴露范围处理。仅从当前仓库不能判断是否为真实有效口令或是否已经更换。

### F13 — 低：现有分支 diff hygiene 与 CNY 测试契约有遗漏（已验证）

默认运行 38 个文件 427 项全部通过；NEXT_PUBLIC_CUSTOMER_CURRENCY=CNY 下 426 通过、1 失败：`tests/maxvideoai-editor-generation-blocks.test.ts:2659` 固定期待 USD，而实现返回 CNY。该用例涉及旧 Canvas，将由上游退役处理，但新测试仍必须覆盖等价的客户 CNY 能力，不能拿删测试当作价格正确性证据。

`git diff --check` 在干净工作树当然通过；比较共同祖先的分支 diff 才暴露现有 trailing whitespace/EOF，详见两个 diffcheck log。属于整理项，不是核心业务错误。

### F14 — 待上线核实：实际供应商成本、历史账户、法律/运营配置与性能证据

- LLM Hub adapter 文档已明确既有成本来自此前供应商；真实 LLM Hub 扣费/invoice 未形成全模型证据。customer quote 不变不能推导 margin 安全。Qwen 固定会计汇率 8 属商业决策，不是实时市场汇率。
- 现有 cny-migration 文档以“无注册用户”解释不迁移旧钱包；这只是历史条件。现在是否有 USD receipt/余额/pending order/in-flight job，需读目标数据库核实。本次未访问生产数据库。
- Product-brand guide 已承认 legal operator/contact 信息未完成核实；请更新实际经营主体，不改历史作者归属。仓库 LICENSE 为 BUSL-1.1，附加授权只含非商业/内部评估/非生产研究，文本要求商业使用另获商业授权、修改声明与保留权利通知；本次未核实外部商业许可，不能假定已取得或没有取得。
- 公开隐藏 MCP 与 transport/OAuth 仍开启是既有明确设计；不应误报成已关闭全部服务。若业务要完全关闭 API，是另一项需求。
- 原 Vercel delivery guard 固定 camgraphe/MaxVideoAi/main 与 maxvideoai.com/api.maxvideoai.com，当前部署是 Keyvo/1Panel。Docker 不会因本地 production Vercel guard automatically fail，但这些脚本不能证明 Keyvo 生产一致性。必须形成明确自托管 source/commit/digest/domain/rollback 契约；不能把本报告当部署授权或绕过 root policy。
- bundled media 的 source identity、poster/derivative/readiness、国内访问与 first Play、移动首页 LCP、signed/original 下载、版权 attribution 需按 media guide 复核。当前测试不能代替合并后真实 HTTP/Range/CWV 数据。

## 6. 冲突解决原则和优先级

全量逐文件表见 [conflict-resolution.md](conflict-resolution.md)。按以下顺序完成，避免先改样式却未确定接口和资金语义。

1. **结构/退役边界**：Studio routes、AGENTS、6 个 modify/delete；上游删除保留，不恢复旧 Canvas。有效中文/品牌/价格逻辑迁入 conversation/_shared/current menu。旧项目数据删除不是自动 migration，禁止运行 retire-private-studio-canvas 脚本或广泛数据清理。
2. **价格/资金**：quote-billing/image pricing/billing-preflight/wallet/agent prepare-confirm/timeline/export/upscale、manual tariffs、direct paid quote、CNY projection，先定 units/version，再移植 UI。
3. **生成/恢复**：BytePlus/Alibaba/Vertex/LLM Hub/Qwen/GPT，保留新参数验证与 old adapter 协议修复；已受理不重发；job receipt/refund/state 一致。
4. **核心 workspace/API**：保留上游新的 composer/reference/session/gallery/actions，移植中文/品牌/币种/入口隐藏。122 个自动合并 overlap 逐项检查，尤其 wallet、billing products、provider routing、initial job、vercel cron 和 generated model projections。
5. **marketing/content**：上游 data/meta/schema/媒体 owner + 定制 named sections/theme/Chinese。模型英文/法西内容中的能力/下架更新传到 zh；比较 JSON 从上游真实事实出发重施定制。四语言数据不能整文件拿旧版本。
6. **主题/导航/MCP**：共享 preference 的当前路径优先；SSR bootstrap 与 client hook 一致，不再创建 Studio 独立 store。隐藏定制入口，同时保留协议/host evidence/immutable resources。
7. **registry/projections/build**：保留 Qwen 2 models 和上游 Seedance 1.5 retirement。model-registry 是 authored owner，runtime/catalog/roster 重新生成，不手工拼 generated JSON。构建和 cache 条件合并；zh tracing/standalone/CloudFront 仍在。
8. **tests/docs/CI/运营**：保留新结构/财务断言，增加新 CNY 与恢复用例，适配目标分支 Quality 和自托管 rollout。

6 个修改/删除文件会在 merge tree 被 Git 留下，但**它们依赖的旧目录主体已删除，留下并不等于可运行**：StudioHeaderSession、useCanvasController、useWorkspaceShotPricing、model-capability-registry、workspace-generation、shell.module.css。完整路径见 [retained-old-studio.txt](retained-old-studio.txt)。不能以这六个文件拼回旧 editor。

## 7. 可执行实施步骤（未执行）

### 阶段 A：锁定可重复输入并隔离候选

```bash
git status --short --branch
git fetch origin MaxVideoAI feat/white-label-keyvo
git rev-parse origin/MaxVideoAI origin/feat/white-label-keyvo
git merge-base origin/MaxVideoAI origin/feat/white-label-keyvo
# 如果引用不是 d0acb5e / 9ed63ad，先重新生成差异和冲突，不照搬本报告。
git worktree add -b integrate/keyvo-d0acb5e ../VideoAi-Agent-keyvo-integrate d0acb5e
cd ../VideoAi-Agent-keyvo-integrate
git merge --no-commit --no-ff 9ed63ad
```

最后命令预期因 114 个冲突非零退出，不代表实施失败。此方向 ours=MaxVideoAI，theirs=Keyvo；方向反转时 ours/theirs 也反转。**不要运行 `git checkout --ours .` / `--theirs .`，不要用 `-X ours/theirs` 粗略消掉冲突。** 若取消候选，用该隔离 worktree 的 git merge --abort，原共享 checkout 不受影响。

### 阶段 B：形成可审查合并提交

- 按第 6 节和 114 行表处理全部冲突。
- 修复 F1–F12 中实际适用的阻断/缺口；暂不启用的 feature flag 必须明确写入交付范围，不能“合并了代码”就宣称功能完成。
- 跑 `git diff --name-only --diff-filter=U`、全树冲突标记检查，确认为 0；逐项检查 122 个自动合并 overlap 与 1,874 个仅上游新/改/删路径中的 adaptation。
- 生成 model projections 并检查 authored registry；任何计价变更以 approved customer/pricing audit 记录，保留原 baseline。
- 一个有真实双父的 merge commit 保留溯源；后续修复可按价格/恢复/中文/部署提交，便于审查。若同次完成，也需 PR 分组说明，不用 history rewrite 销毁既有共享分支。
- 验证两个 tips 都是候选 ancestor，确认 upstream 被完整接入、定制不只是口头保留。

### 阶段 C：验证矩阵

|验证面|必须达到的证据|
|---|---|
|静态/构建|Node 22 + frozen lock install；frontend lint、tsc、exposure、registry/catalog/launch-assets、branch diff hygiene、frontend 完整 prebuild/build/postbuild|
|上游 CI|fast/integration/tariffs/browser 按 selector 运行且 required aggregation 成功；PR 目标 MaxVideoAI 也触发|
|币种|USD control 与 CNY 商用 lane；同一视频/图片/音频/fixed/Storyboard/export/assistance pack：显示=quote=receipt=debit；实际换算仅一次|
|manual price|DB inactive/active/missing/error、old/current revision、admin edit 与 debit race、continuous media quantities、Qwen coverage；不绕过校验|
|direct payment|quote/user/request/PaymentIntent绑定、到期/重试/并发、paid quote amount/currency、refund，不恢复旧松散检查|
|支付充值|支付宝/微信每种一笔低额授权支付；创建超时/notify早到/query/重复通知/DB rollback；钱包仅一次入账且金额单位正确|
|推理|直连正常、credentials缺失、明确拒绝fallback、超时/受理不确定不重发、accepted ID、存储失败/结果校验/退款恢复；模型基本/高级模式分别验证|
|GPT/Qwen|尺寸/格式/数量/reference/owned originals/thumb、请求超时、storage partial failure、账号隔离；生产 adapter/invoice 实测和风险组合分开记录|
|Studio|直接 conversation entry、旧 URL redirects、private APIs 410、quote-confirm、timeline/edit/export、assistance/credits、analysis/tasks worker lease/recovery，项目删除不删 library|
|认证/中文|旧 locale/cookie→zh、login/signup/reset/callback continuation、账号切换、浏览器 storage、所有新字典键与 hardcoded fallback|
|SEO/MCP|Keyvo canonical/JSON-LD/hreflang、published zh sitemap/redirect、隐藏入口与现有 revoke、冻结 MCP resource/protocol ID|
|媒体/性能|首页/示例/模型/比较实际 source/preview/original、poster几何/移动顺序、播放/Range/下载、前后同设备同网络 CWV、无可复现回退|
|数据库|disposable PostgreSQL 全量 migration + 当前 ledger 升级；31 checksum reconciliation、duplicate prefix、concurrent 66、crash/concurrency|
|镜像/运营|target commit → GitHub candidate → Quality → immutable image digest → 1Panel；bundle content/zh、env、worker鉴权、DB和storage健康、domain与digest一致|

### 阶段 D：PR 与发布

- 本任务只请求审查方案，当前不执行 PR/merge/deploy。
- 在隔离候选通过检查后创建目标 MaxVideoAI 的 PR，正文列出业务定制、上游责任升级、报价/货币契约、解决的恢复问题、测试证据、待关闭功能与运营要求。
- 发布仍必须遵守 root AGENTS 的交付政策。其默认 main/Vercel 路径与 Keyvo 自托管不一致，实施时需要明确适用的仓库/自托管交付契约；不将普通“合并”解释为生产部署/数据库变更授权。
- 迁移先备份/preview，检查当前 USD/CNY/pending jobs/orders；执行有界已审阅变更；新 web/worker 用固定 digest；在 app.keyvo.cn 核验 source/digest、auth、媒体、充值与任务。
- 回滚以已验证旧 digest 和 feature flags 为主；扩展 schema 通常保留。不得回滚镜像同时切客户币种造成 pending order 重解释；不得删除已付费 receipt/项目/library 或篡改 migration ledger。rollback 前核对新 Studio 数据旧版本可读性。

## 8. 本次实际验证及限制

|项目|结果/范围|
|---|---|
|Git DAG/双边路径/模拟 merge|完成；临时 object directory 写 merge tree，原 .git 不新增 merge commit|
|JSON syntax|base 273、upstream 280、custom 337 个 content/config/messages JSON 全部解析成功|
|当前 model runtime projection|检查通过，57 models；未代替完整 registry/catalog/launch-assets gate|
|Exposure check|通过|
|品牌 audit|运行通过；生成物已移到临时目录，不污染仓库固定日期 artifacts|
|TypeScript|当前定制分支 `tsc --noEmit --incremental false` 通过|
|frontend lint|显式当前 Node 路径按 package 的实际 lint 范围运行通过|
|定制重点 tests|10 个文件 53 项通过；38 个相关文件默认环境 427 项通过|
|CNY lane|同 38 文件：426 通过、1 固定 USD 的旧 Canvas 用例失败（F13）|
|DB/concurrency 扩展尝试|4 个 PostgreSQL 用例无法初始化 disposable DB；mirror watch 用例遇到 EMFILE。均不计为通过或业务实现失败|
|分支 diff check|发现现有空白问题；log 已附。干净工作树 diff check 通过不代表历史 branch diff 通过|
|未执行|解决后合并候选测试、完整生产 build、全仓库 validation、browser smoke/CWV、真实付费推理/支付、目标 DB/远端 CI、实际部署与调度检查|

运行环境为 Node 24.20.0，仓库要求 Node 22.x；因此当前测试通过是辅助证据，release 必须以 Node 22 重跑。开始时 `.bin` 缺失，offline install 未执行完成（pnpm 无 TTY 中止）；后通过已有实际 node_modules 的 loader/工具路径和 NODE_PATH 成功运行。首次扩大 glob 错把 3 个图片 fixtures 当测试，已排除并重跑；它们不列为项目缺陷。首次过宽 lint/错误 next lint/root 或旧 shell Node 导致的工具错误已纠正，以正确 lint 范围和显式 Node 路径结果为准。

不存在“已合并且全部通过”的候选。当前报告列出确定的问题、条件性的兼容问题和明确待验证事项；所有 3,258 个变更路径、114 个文本冲突均已留档，但不能把这些事实扩张成代码、生产状态和供应商外部行为零遗漏的保证。

## 9. 附件索引

- [114 个冲突逐文件处理表](conflict-resolution.md)
- [全部 3,258 个变更路径 TSV](file-inventory.tsv) / [JSON](file-inventory.json)
- [上游 983cb57 文件表](upstream-983cb57-files.tsv) / [d0acb5e 文件表](upstream-d0acb5e-files.tsv)
- [63 个定制独有提交](custom-commits.txt)
- [15 个缺失中文键](upstream-keys-missing-zh.txt)
- [33 个上游独有品牌/域名候选](upstream-only-brand-review.txt)
- [6 个残留旧 Studio 文件](retained-old-studio.txt)
- [默认环境 427 项测试](pure-tests.log) / [CNY 测试](cny-tests.log) / [53 项重点测试](targeted-tests2.log)
- [定制 diff 空白检查](custom-diffcheck.log) / [上游 diff 空白检查](upstream-diffcheck.log)
