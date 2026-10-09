# Keyvo 剩余验收结果（2026-10-09）

生产运行版本由用户报告为 `1167faa43b58c34d9aa6b3b5741758f96c533469`。本轮没有替用户部署生产，也没有创建新的支付订单。

## 生产验证

新版迁移容器已重建并成功退出，生产数据库 83 个迁移文件均有执行记录，之前缺失的定价表已创建。Nano Banana Lite 估价从 HTTP 500 恢复为 HTTP 200。

三次真实图片生成均成功，数据库确认实际路由为 Google Vertex、BytePlus ModelArk、Alibaba Qwen。每项分别扣费 CNY 32、40、24 分；按三个确切任务 ID 汇总为 3 笔 charge、合计 96 分。钱包余额最终为 ¥141.12。Seedream 和 Qwen 验证交错运行，单项前后余额不能直接归因到一项；逐任务流水和总账差额一致。

三项原图及缩略图均返回 HTTP 200，作品库重新读取均有对应结果。Nano Banana Lite 同一任务重复提交后，供应商请求 ID、钱包余额、流水及输出数量均未变化。生产浏览器完成登录、下载原图、刷新、打开完整预览，下载字节数与已验收原图一致。

供应商后台实际最终扣费未独立验证。前轮适配器调用的估算为 USD 0.03360475，本轮生产钱包收费 ¥0.96；不能把钱包收入直接当作供应商成本。本轮报价保护上限为每项 ¥1，未自动创建新任务重试。

## 新发现与修复

生产浏览器发现 `/_vercel/insights/script.js` 与 `/_vercel/speed-insights/script.js` 两类 404。原因是非 Vercel Docker 站点仍加载 Vercel 专用统计脚本。候选修复由服务端 `VERCEL=1` 决定是否加载；既有营销与同意策略保持不变。动态组件回归测试同时验证 Docker 禁用及 Vercel 保留。

后台 CI 原来使用缺失的 `RUNTIME_AUDIT_DATABASE_URL`，导致后台认证测试失败。候选脚本 `scripts/qa/run-isolated-admin-smoke.ts` 创建一次性 PostgreSQL，执行完整 bootstrap 与迁移，插入确切后台管理员、任务、流水与连接的视频示例目标测试数据，使用本地认证协议夹具。所有后台测试仍参与；不将生产数据库凭据上传 CI。

后台测试还发现 30 秒总期限覆盖不了 Next 冷编译和初始数据读取，设置测试总期限为 90 秒；定价测试显式等待实际库存 API 并检查 HTTP 200，独立断言期限不变。定价库存 API 与价格预览测试已通过。后续排序测试发现空夹具默认选择图像 starter，导致视频 opening 不存在；夹具新增明确连接的视频 examples 目标，继续全量验证。图库测试进一步遗漏了展开 Families 分类的点击步骤，已补上实际用户步骤。

## 程序化验证

- 修复相关 analytics / CI policy：14 项通过。
- 支付签名、精确金额与幂等结算：6 项通过。
- 一次性 PostgreSQL 支付超时、并发重试、延迟通知：1 项通过。
- 一次性 PostgreSQL 已支付图片恢复：1 项通过。
- 一次性 PostgreSQL CNY 助手预留、结算、退款、豁免：1 项通过。
- 通用 Studio 图片 USD 夹具：4 项通过。将 USD 充值夹具强制放入 CNY 环境会报 currency_mismatch；回到其 USD 契约通过，CNY 账务另行覆盖。
- TypeScript 通过；ESLint 0 errors / 10 warnings；exposure 通过；actionlint 通过；diff 检查通过。
- GitHub 素材测试 14 项中 13 通过、1 失败；release gate 仍失败，来源与审批 SHA 不是候选祖先。

原 `1167faa` Quality CI 最终数据库与真实媒体、财务全量、CNY 合约均通过；fast 被取消、admin 浏览器失败，最终 Quality CI 失败。不能将成功构建镜像等同于质量 CI 全绿。

## 尚未建立的发布证据

- 本次新增修复的全量后台检查与新的 GitHub CI 状态。
- 新修复部署后的生产浏览器复核与实际容器身份。
- 本次候选的真实签名 notify 与 return 全链路观测：此前 ¥80 支付由候选 checkout、旧版本 callback 组成混合版本验收。既有订单幂等恢复通过，但不会重放伪造的网关签名或创建额外支付。
- 真实供应商失败后的生产退款；隔离测试通过不能自动替代真实失败验收。
- 所有视频供应商全部模式的真实验收：未假设 ¥10 可以覆盖所有付费视频。
- 素材需要保留合法来源历史并替换当前 Keyvo 产品证明、取得真实审批。原作者主机证明不自动证明 Keyvo 主机功能；未伪造审批、未添加假祖先、未放宽素材检查。

本轮可以确认上述成功图片链路和数据库升级。不能给出所有功能、全部供应商模式和全部发布门禁均无问题的结论。

## 后台最终全量检查的新结果

一次完整后台运行共 27 项：25 通过、1 跳过、1 失败。失败是 Insights 截图与 hydration 竞争：Playwright 默认截图注入 `caret-color: transparent`，React 报告该属性与服务器 DOM 不一致。候选截图设为 `caret: initial`，保留全部 console/page error 断言并单独复验。用户详情跳过因本地认证夹具未提供 service-role 管理接口数据；不计入通过。图库跨宽度、排序、定价预览、过期缓存、计费产品和会员历史均已通过。

Insights 修复后独立复验 1/1 通过；保留前轮全量 25 pass / 1 fail / 1 skip，不宣称同次全绿。最终聚合 26 个不同后台测试通过，1 个用户详情未覆盖。最后提交前 20 项 focused 检查、TypeScript、exposure、actionlint 和 diff 检查通过。

## 638ee295 部署后及 CI 跟进

用户报告 13.212.96.236 更新为 638ee295c61d882fa1a1ebb784fb122e26373d18；容器身份尚未独立核验。登录、账单、受保护数据库健康均 HTTP 200。真实登录浏览器下载原图 879131 字节、刷新和预览成功，errors=[]；Vercel 统计脚本 404 已消失。

该版本 Docker build 成功；Quality CI 最终失败。CNY、数据库/媒体及全量财务均通过；浏览器 11 pass / 2 fail，后台步骤未执行；fast 在约 20 分钟取消，日志已含素材来源祖先失败。

两个失败分别是刷新时抓到旧文档响应、Chromium 回收响应体，以及单次过期注入允许解码器重试旧签名成功。测试修复读取新导航路由的真实响应，并持续拒绝确切过期 URL，继续验证新签名、解码帧、编辑持久化、导出恢复与账户隔离。未修改业务实现或放宽素材断言。fast/browser/integration/tariffs 时限分别调整为 40/30/35/90 分钟，保留完整覆盖。

使用候选已提交源码归档（不含环境及依赖）建立测试服务器合成 Git 快照，应用源码仍为 638ee295。修改前独立复现 1 pass / 1 fail（首项时间线在 5 秒内未挂载，第二项通过）；修改后同次完整 2 pass / 0 fail / 0 skip。相关逻辑/CI policy 12 项、浏览器网络隔离夹具 1 项通过；TypeScript、actionlint、exposure、diff 通过。根目录测试 ESLint 无配置，未将其算为 lint 通过。

这只建立两个已失败场景的修复证据，不代表完整新 CI 或全量后台通过；素材来源及既有真实支付/失败退款覆盖缺口继续保留。详见 638ee-ci-followup.json。本轮没有新增付费请求。

## dda02c2 Quality CI 最终结果

Quality CI 37922498181 最终失败；Docker 构建成功。数据库/媒体、全量财务、CNY 全部通过。Studio 浏览器同次 13 pass / 0 fail / 0 skip；完整后台同次 26 pass / 0 fail / 1 skip，用户详情依赖 service-role 数据的场景仍未覆盖。

fast 完整跑完 7062 项：7058 pass / 2 fail / 2 skip。失败一是既有素材来源/审核 SHA 不是候选祖先；失败二是上次提高财务时限后遗漏了 quality-ci-contract 的旧 60 分钟精确断言。后者是本轮新增的测试配置不一致，已同步四个任务的明确预算，未删除断言或放宽最终质量门禁。14 项相关契约与选择策略复验全部通过；actionlint、diff 通过。素材门禁未修改。

详见 dda02-ci-result.json。新修复仅测试与报告，业务代码仍与用户生产运行的 638ee295 相同；无需仅为此再更新生产。新的提交 CI 尚需等待，不能把本次补测当作远程全量通过。

## fc2d559 Quality CI 与后台重试问题

Quality CI 37925898948 最终失败；fast 同次完整 7062 项中 7059 pass / 1 fail / 2 skip，唯一失败为素材来源祖先。时限契约已通过；Studio 13 pass / 0 fail / 0 skip，数据库/媒体、财务、CNY、Docker 均成功。

后台 CI 实际为 25 pass / 1 flaky / 1 skip：过期定价库存首轮等待 Seedance 2.0 Mini summary 超过 15 秒，重试通过。不能仅据 job success 将其报告为 26 个首轮通过。测试现在等待真实初始库存 API HTTP 200，再验证初始价格及注入 401；原缓存清除断言保持。使用已有 638ee 应用归档（与 fc2d 业务代码相同）的完整隔离后台复验 26 pass / 0 fail / 1 skip，关闭重试，耗时 4.9 分钟。14 项 CI 契约、TypeScript、actionlint、diff 通过。

素材方案需用户选择 Keyvo 展示重新采集审核，或保留 MaxVideoAI 展示整合真实原作者历史。未伪造审核、替换来源 SHA、删除检查器或引入假祖先。本轮没有新业务实现改动、付费请求或生产部署。
