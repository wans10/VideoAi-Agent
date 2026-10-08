# Keyvo 合并系统核查最终报告

核查日期：2026-10-09。新分支：`audit/keyvo-completeness-d0acb5e`。隔离工作树：`/private/tmp/VideoAi-Agent-keyvo-integrate`。

## 结论

候选历史同时包含 `MaxVideoAI@d0acb5e`（含 `983cb57`）和 `feat/white-label-keyvo@9ed63ad` 的全部提交。真正合并提交 `6bd4c69` 的双父为这两个源分支 HEAD；后续兼容修复保留在新分支历史中。本次使用程序核查再次发现并修复 **11 类问题**，因此先前审查不能作为“无 BUG”的证明。

**这是已提交、可继续 CI 验证的集成候选，不是已通过发布门禁的版本。** 路径、AST 和 JSON 核查没有发现未解释的新增导出或 JSON 字段丢失；这不等于所有内部行为都获得功能等价证明。完整检查存在未通过和跳过项目，详见下表。原 `MaxVideoAI` 和原定制分支未移动，原工作树未切换，没有推送、发布或部署。

## 核查范围与方法

原定制起点为 `64f8c76`；实际共同祖先为 `a58d5cb`，因为定制历史已经合入过该上游版本。本次核查当前本地 Git 对象，没有网络 fetch，因此不声称覆盖远端后来产生的提交。

运行 `node scripts/audit-keyvo-merge.mjs`：

1. 验证两个源 HEAD 都是候选 HEAD 的祖先；不靠提交标题判断。
2. 对基线、上游、定制、最终工作代码作四树比较，禁用 rename 省略，枚举双方变化路径并集 **3,258 条**。
3. 为每条路径保存四方 Git blob ID，识别源文件原样保留、集成改动和基线回退。
4. TypeScript AST 比较新增公共导出与调用数量；递归 JSON leaf 比较单方新增/修改字段。18 项品牌替换必须精确匹配 `MaxVideoAI → Keyvo`，其他偏差直接失败。
5. 对调用减少信号执行对应契约及真实 HTTP/组件渲染回归；调用数量本身不是行为证明。
6. 保存所有运行源码、测试、脚本、Docker 和迁移的 blob 摘要，以及新审计脚本/测试；提交后核对相同 blob，不用工作树测试冒充已提交快照验证。

完整清单见 [programmatic-coverage.json](programmatic-coverage.json)。[call-signal-contracts.json](call-signal-contracts.json) 保存全部 38 个调用减少信号的测试映射与验证边界。[git-coverage.json](git-coverage.json) 是本轮修复前的初始 HEAD 快照，不能当作最终结果。双方仅一侧变化但候选不同的文件都是明确可见的适配项，不能被“Git 已合并”掩盖。

## 本轮新增修复与复现

|问题|修复行为|程序证据|
|---|---|---|
|Qwen HTTP 4xx 的诊断 request_id 被视为已受理|带官方错误 code 的确定性拒绝允许终止并退款；网络/非权威异常继续保持 pending|`keyvo-system-audit-regressions.test.ts`，`qwen-before-fix.log`|
|Qwen malformed request_id 被接受|拒绝数字、对象、数组、空白及控制字符 ID；客户端和执行层均验证|同上；原 Qwen 执行/客户端契约|
|支付 HTTPS URL 可含用户名密码|网关返回、已保存订单恢复和浏览器跳转三边界拒绝 URL credentials|`llmhub-pay-protocol.test.ts`、`llmhub-pay-checkout-recovery.test.ts`，`payment-before-fix.log`|
|素材架构升级丢失中文标题及文案|恢复中文版 shelf、标题、alt、audio aria，保留上游共享数据 hook|`keyvo-merged-localization-render.test.ts`，`localization-before-fix.log`|
|比较报价不可用提示英文|zh 返回中文不可用状态|同上|
|普通 Stripe 钱包充值硬编码 USD|客户 CNY 金额按 CNY identity 换算，session/payment-intent 保存 CNY 钱包 metadata|`keyvo-wallet-route-currency.test.ts`，`wallet-before-fix.log`|
|图片模型目录给 CNY 报价加美元符号|使用报价 currency 的单位 formatter，避免二次换算|真实 catalogue builder，`catalog-before-fix.log`|
|移动导航登录/生成标签英文|访客登录和已登录生成分别渲染中文；保留上游菜单更新契约|`marketing-navigation-rendering.test.ts`，`navigation-before-fix.log`|
|直接付款服务独立硬编码 USD|canonical CNY quote 按 CNY 换算，冻结正确钱包和 settlement metadata|实际 direct-payment 服务，`direct-wallet-before-fix.log`|
|后台人工充值和钱包展示币种不一致|表单/路由默认客户币种；CNY 路由拒绝 USD 充值；后台余额和累计额按客户币种隔离；单条历史收据保留其原币种|实际 admin 路由、SSR metrics/ledger/form、既有 admin 合约；`admin-wallet-before-fix.log`|
|迁移后的 Studio 访问入口缺中文|访客、可用和暂不可用状态中文，保留登录返回参数和新对话模式|实际 SSR 三状态，`studio-access-before-fix.log`|

新回归使用真实应用模块，替换外部支付/数据库/Next Router 等边界；不会调用真实付费网关。修复前日志含部分测试夹具调整，只有明确业务断言失败作为缺陷证据。导航夹具另修正为分别覆盖访客与已登录状态，没有删除“生成”断言。

## 定制与上游契约覆盖

|领域|执行的程序核查|边界|
|---|---|---|
|Keyvo 品牌/中文/auth/域名/MCP 隐藏|四树 JSON/AST、`keyvo-auth-config`、production navigation、MCP marketing/plugin、中文 SSR、CNY build prebuild|不是全站每段文字均已逐条语义验证|
|人民币客户价与供应商历史事实|完整切换/回滚费率测试、CNY packs PostgreSQL、直接付款实际 handler、价格 SSR|保留供应商 USD 输入和历史 USD 收据，不全局替换 USD|
|LLMHub Pay|真实签名协议、checkout lost-response/saved-url 恢复、已有数据库幂等/入账集成|未做真实支付宝/微信支付或外网回调验收|
|Qwen / GPT Image 2.5 / provider routing|Qwen payload/execution/audit、LLMHub output/routing、Vertex Veo routing、图片断线 recovery|未付费调用真实供应商|
|Docker/数据库迁移兼容|Keyvo migration runner disposable PostgreSQL、CNY pack migration、直接付款数据库重试|未运行生产数据库升级或 Docker 生产调度|
|上游新 Studio 与编辑/恢复|完整 fast、数据库/media、browser、三个隔离 Studio lane；退役及 localization 契约|部分检查被 PG17/完整 ffprobe/Playwright Chromium 环境阻断|

旧 Canvas UI、旧 invitation/beta 导流按上游退役契约处理，不原样复活。旧修改 API 维持认证后 410；新 Studio 保留对话、报价确认、持久请求身份及共享 timeline。公开 conversation export 仍按原候选开关关闭，不能宣称已具备生产导出 worker。旧画布中的中文金额调用由现有对话资金路径承接，不意味着旧界面仍存在。

图片执行器 `.trim` 调用减少包括会计 preflight 提取以及旧 membership 参数去除；新的 `prepareImageGenerationAccounting` 和版本化 canonical pricing 承接这些责任，相关 recovery/报价/事务测试保留。`api-generation` 的 image tariff header/refresh 改由 `submitImageGeneration` 承接；409 回归验证无第二次 paid POST。随机支付身份改为稳定订单身份由真实重试测试验证。

## 检查结果

[check-results.json](check-results.json) 保存精确数量和每个失败测试的原始诊断；各组会重叠，不能加总当作独立覆盖率。

|检查|结果|
|---|---|
|四树 / AST / JSON|无基线回退、缺失新增导出或未解释 JSON 偏差；调用减少逐项列出，不能自动当作无害|
|最终完整 fast|7,059 项：7,056 通过、2 失败、1 跳过；随后新增 Studio 渲染单独 27/27 通过|
|完整数据库/media integration|721 项：699 通过、18 失败、4 跳过；随后后台/direct 修复的相关测试重新执行|
|浏览器 lane|13 项：7 通过、6 失败|
|隔离 Studio lane|4 项全部失败，停在 PostgreSQL 17 要求|
|最终定制功能组合|133 项：132 通过、0 失败、1 跳过；随后 Studio 中文增补 27/27 通过|
|调用信号对应契约|60 项：59 通过、0 失败、1 跳过|
|本轮所有缺陷最终组合回归|49/49 通过，无跳过|
|最终 TypeScript|通过|
|最终 ESLint|0 errors，10 warnings；Studio 后增补单文件复验|
|CNY production build / prebuild|最终冻结源码完整构建通过，含最后 Studio 中文增补；日志 `build-final-snapshot.log`|
|公开 exposure / git diff whitespace|通过|
|完整费率切换/回滚|2/2 通过；26,826 检查点 / 14,999 单元；7 次 tariff SQL；原子拒绝、历史保留及回滚通过|

**仍未通过的门禁，不能当作产品无问题的证明：**

- Fast 的 GitHub 素材 release provenance 断言：若干 `publishable_proof` 引用在当前仓库不是可验证祖先。没有伪造来源 SHA 或削弱断言；需取回真实来源历史/重新建立真实素材证明后复验。
- Fast 的 WAV duration 断言：本地包内 ffprobe 架构不匹配；替换的本机裁剪版 ffprobe 只能读 MP4，不能解析 WAV。未通过完整原生工具复验前，这条路径仍未验证。
- Integration 的 13 项明确要求 PostgreSQL 17；现有可运行工具为 PG16。其余 5 项停在 PNG ffprobe。没有把 PG16 当 PG17 合格证。
- Browser 的 5 项停在 PG17；真实 Remotion MP4 render 要求已安装 Playwright Chromium，现有系统 Chrome 替代不能满足该测试的安装检查。7 项真实 Chrome 浏览器行为通过，不代表完整 Studio 端到端已通过。
- Isolated Studio 4 项停在 PG17。全部失败/skip 明细保留，不改测试使其消失。

## 后续合并条件

新分支保留完整合并历史和本轮修复，可在具备 Node22、PG17、完整原生 FFmpeg/ffprobe、Playwright Chromium 及真实 Git 来源历史的 CI 中执行全部 lane。上述门禁通过并补齐真实网关/部署迁移验收后，才适合继续 PR 到目标分支。本次没有推进 `MaxVideoAI`，不声称生产可发布或零隐藏缺陷。

最终源码 SHA-256 摘要：`f5f40aeb615b0fbd5f09bbada794a43e3604377d12bdd6ae76675f669e6a811e`，覆盖 5,390 条源代码/测试/脚本/迁移路径；完整四树数据内提供每个 blob。

提交前最终补录：完整 initial cutover 1,077.914 秒、local activation 698.538 秒，均通过。源码 HEAD 在整个财务验收中保持 `c643e4f`，本轮修复通过保存的工作树 blob 摘要与最终提交核对；没有以修改 HEAD 规避源绑定。

审计工具纠正：提交索引核对发现符号链接曾按其目标内容哈希，而 Git 保存的是链接文本。工具已改用 `lstat/readlink`，重新生成证据并核对最终 Git blob。日志只规范化行尾空白，保留测试输出和失败内容。初次提交命令未在核对失败后停止，故以追加提交保留真实纠正历史。
