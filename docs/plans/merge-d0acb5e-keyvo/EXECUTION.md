# Keyvo 集成执行记录

目标分支为 `MaxVideoAI`，候选在独立工作树 `/private/tmp/VideoAi-Agent-keyvo-integrate` 的 `integrate/keyvo-d0acb5e` 上实现。合并父提交为上游 `d0acb5ee1aafea1440f164d9ae351f957681320d` 与定制 `9ed63ada5cc95b7f53aae0de0f52859fb8b0387a`。原定制工作树不切换、不覆盖。

## 已处理

- 保留上游对话 Studio、持续任务、媒体分析、报价版本锁和直接支付绑定。旧 Canvas 保持退役、旧私有写 API 保持认证后的 410。
- 客户人民币报价只在美元源报价上转换一次；供应商成本事实保留美元。图片客户端传递报价 revision，过期报价返回刷新要求，不再次提交付费请求。
- Studio 新积分包扣款按人民币 8 倍换算，积分量与月度赠送不变。购买幂等，历史包显示真实凭证金额/币种。旧美元授权不在人民币部署新增消费，但历史恢复保留。
- 支付创建固定用户绑定请求身份，保存原订单号；超时保持 pending、允许晚到通知结算，重试查询原订单，不创建第二单。钱包结算币种来自订单创建时快照。只有签名确认的网关拒绝才能标记 failed。已创建支付地址保存并复用。
- Qwen 受理后尽早持久化 request ID。超时或受理后输出复制失败保持付费待核实，禁止自动重新生成或退款；退款持久化失败不能报告 refunded。
- 迁移 runner 单连接 advisory lock，每个普通 SQL 和 ledger 原子事务。31 仅允许已复核的精确旧 checksum 修正，保留历史记录并新增 reconciliation。并发索引通过独立 lane 执行。
- Docker scheduler 使用认证 cron 调度。人民币编译参数、数据库密码、cron 与健康检查凭证显式配置。Docker 发布依赖 Quality CI 成功且绑定源 SHA。
- 保留 Keyvo 品牌、中文发布、默认浅色和 LLMHub/Qwen 定制。上游新增 Studio 活跃界面接入中文文案，新增文章中文保留素材、来源与提示词。MCP 源证据及协议身份保留明确例外。
- 连接管理按 transport 开关显示，不因隐藏营销丧失撤销授权入口。供应商比较使用图片实际路由选择，不能把 LLMHub/Qwen 伪标成 Fal。

## 迁移与上线步骤

本次未运行任何生产数据库迁移、私有 Canvas 删除、推送或部署。

1. 使用直接 PostgreSQL 连接执行 `docker/scripts/run-migrations.sh`（base bootstrap 后普通迁移）。普通迁移的 `MIGRATIONS_DIR` 默认为容器 `/migrations`；本地需显式指定 `neon/migrations`。
2. 在普通迁移成功后，以直接连接运行 `MIGRATIONS_DIR=neon/migrations bash docker/scripts/migrate.sh --concurrent`。索引 66 必须在事务外执行，检查 `pg_index.indisvalid`。如果曾中断留下无效索引，人工核实并在独立维护会话修复后重放；普通 runner 不自动删除索引。
3. Docker 外部 scheduler 覆盖分析、任务和供应商轮询。当前上游公共对话导出关闭；保持 `STUDIO_CONVERSATION_EXPORTS_ENABLED=false`。启用最终影片导出前必须配置 canonical export worker、对象存储和引用授权，并通过相应导出端到端验证，不能仅打开前端开关。
4. Qwen 同步调用结果未知需凭 app_jobs/供应商 request ID 核实。当前不虚构供应商查询接口，也不自动退款重发。支付 pending 按原订单查询或签名 callback 核实；没有 definitively rejected 状态不得创建替代单。
5. 所有 CI lane 通过后才把集成候选纳入 MaxVideoAI。生产发布另外遵循 `docs/deployment/github-vercel.md`，当前执行并未授权绕过该流程。

## 验证与未完成事项（2026-10-09 更新）

最新完整 fast：7048 测试，7039 通过、8 失败、1 跳过，详见 `latest-fast-failures.json`。其中 Alibaba 架构扫描误包含 `.next/standalone` 副本，已修正为只检查 authored source，3/3 复验通过。6 个媒体用例受本地 ffprobe 环境阻塞：arm64 目录里的文件实际 x86_64，执行 `bad CPU type`；原生 FFmpeg 可执行。未更改或放宽媒体事实测量契约。另 1 个 GitHub 素材验证失败：来源 manifest 指定的上游提交在 fork Git 对象中不存在，不能证明为本仓库祖先。保留来源哈希，不伪造本仓库来源提交。

生产 CNY 完整构建此前通过全部 prebuild、编译、类型、页面生成和 sitemap；之后新增了支付收据元数据隔离、MCP 历史模板恢复和中文报价标签，需再次构建。最新 TypeScript、exposure 检查通过；ESLint 0 错误、12 警告。支付 HTTP 实际 handler 新回归通过（超时、reload、并发重复、late paid 查询、账号隔离）；协议签名/结算独立验证通过。新增 Qwen 8 场景独立冻结，与当前输出逐字段比对；不改历史 577 行。中文文章重复 slug 映射已修复。MCP v1–v5 保留原始文档，v5 既有 SHA-256 验证通过，新品牌只由 v6 提供。

重点支付/账务/分享 32/32；新增 CNY 实际数据库包购买、31 精确历史升级、普通迁移原子回滚及 concurrent 索引验证此前通过。完整 Studio、浏览器、数据库 integration、财务 exhaustive 仍需运行，未验证部分不能宣称通过。当前依赖为隔离工作树映射的既有安装，未完成全新 frozen 安装或 Docker 实际构建。

目标 MaxVideoAI 尚未前移。可以将当前候选保存为独立集成 merge commit，以供必须从已提交 Git 快照运行的 Studio 测试；该提交不代表目标分支合并、推送、上线或验证完成。原定制工作树保持不变。
