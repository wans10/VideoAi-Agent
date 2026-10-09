# 远程测试数据库核查（2026-10-09）

分支 `audit/keyvo-completeness-d0acb5e`，基于 `a1ac330`。用户明确授权空远程 test 库用于测试；连接密码未保存到代码、报告、日志或提交。

## 已验证

远程 PostgreSQL **18.6**，连接成功，首次检查用户表数为 0，有 CREATE 权限，SSL 未开启。真实 Docker 基础 schema bootstrap 成功。随后执行仓库生成的迁移计划：**83 个普通迁移成功，重复执行全部跳过**；**1 个 concurrent 索引成功，重跑跳过**。最终迁移账本 84 条，public 表 97 张。

由于本机 psql 为不可运行的 x86 程序，本轮用 Node 客户端执行生成计划，不宣称 Docker/psql 资格门禁通过。适配器第一次将 concurrent SQL 多语句发送，导致 PostgreSQL 隐式事务错误；已逐语句执行修正。普通迁移原始文件与事务/checksum 条件未修改。

可复验脚本：`scripts/qa/keyvo-remote-migration-audit.cjs`。要求 DATABASE_URL 精确指向授权 test 数据库；脚本拒绝其他数据库名。它会执行迁移写操作。无凭据结果见 `migration-result.json`。

真实应用业务验证脚本：`scripts/qa/keyvo-remote-wallet-audit.ts`，通过 DATABASE_URL 注入连接；显式设置 NEXT_PUBLIC_CUSTOMER_CURRENCY=CNY，并使用 TSX frontend tsconfig。它创建 UUID 测试账号和收据，测试数据保留在 test 库以便复查。输出路径通过 KEYVO_REMOTE_AUDIT_OUTPUT 指定。

已通过：CNY 钱包读取、三个 Sol 积分包（源价200/500/1000分→CNY扣1600/4000/8000分，保留2000/5000/10000积分）、重试不重复扣款、事务回滚恢复余额、另一账号余额隔离、混合币种拒绝时不扣款。结果见 `business-result.json`。

## 新发现并修复

同账号拥有正余额 USD 和 CNY 时，钱包读取显示 CNY，扣款层因混合币种拒绝，Studio 原先却返回 INSUFFICIENT_FUNDS 并建议充值。此次修复只纠正错误分类/提示：返回 PARAMETER_INVALID，附 wallet_currency_mismatch 原因，要求协调币种余额；不放宽混合币种拒绝策略、不转换或改写历史 USD。

修复前失败见 `mixed-currency-before-fix.json`，修复后在真实已迁移远程库复验通过。既有 `keyvo-cny-credit-packs-postgres.test.ts` 新增混合币种拒绝且不增加扣款断言。

## 验证限制

当前本机 Node24，不能冒充要求的 Node22。TypeScript frontend 检查通过。聚焦测试 9 通过，1 失败：Studio credits dialog 无法加载缺失依赖；ESLint 可执行文件也缺失。本轮没有完整重跑之前的所有 lane，不用远程业务成功覆盖这些缺口。新增 disposable 回归尚未在本地 PG17 环境执行。

远程服务器是 PG18，既有明确要求“本地 socket-only、临时 PG17”的测试仍未通过；媒体工具、Chromium 和 GitHub 素材 provenance 门禁也未由本次数据库验证解决。故结论仍是：远程迁移与所列业务已验证，新错误提示已修复；完整发布门禁待补验。未推送、部署或移动原两个源分支。
