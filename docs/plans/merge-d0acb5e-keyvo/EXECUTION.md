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

隔离候选已创建真实双父 merge commit `6bd4c69665d8b419cecf33d2820385dd2107a5d3`。它完整包含目标 `d0acb5e` 和定制 `9ed63ad` 的 Git 历史，114 个冲突已解决；目标 MaxVideoAI 仍为 `d0acb5e`。候选提交不代表目标已合并或已发布。

| 检查 | 实际结果 |
|---|---|
| CNY 生产完整构建 | 通过 prebuild、编译、类型、1012 页面生成及 Keyvo sitemap；`/private/tmp/keyvo-build-candidate.log` |
| TypeScript / exposure / ESLint | 通过；ESLint 0 错误、12 警告；最新 followup 类型检查也通过 |
| 完整 fast（最终工具环境） | 7049 项，7046 通过、2 失败、1 跳过；见 `final-fast-failures.json` |
| 完整数据库/媒体 integration 首轮 | 最终重跑 720 项，697 通过、19 失败、4 跳过；13 个 PG17 前置阻塞，6 个 CLI ffprobe 缺失。临时 PATH 复验 mux 已通过，其余 5 个 fixture 需要 PNG/WAV 完整 ffprobe 支持，裁剪版拒绝 PNG |
| 首页与 MCP trial focused | 37/37；首页进一步收紧为仅允许读取现行价格策略后 19/19 |
| 支付、账务、分享 focused | 32/32；CNY 数据库积分包、迁移及 HTTP 支付恢复候选验证 9/9 |
| 浏览器实际运行 | 安装的原生 Chrome：示例布局、Sora tabs 2/2；editorial reader 4/4 |
| Studio lane / 全浏览器 lane | 未通过 PostgreSQL 17 前置要求（本地只有可执行 PG16）；默认 Playwright Chromium1217 未安装。未放宽版本断言 |
| 完整财务 cutover | 两项 exhaustive 已启动；报价矩阵与回滚仍执行中，不能宣称通过 |

最终 fast 两项失败：① 历史 GitHub 素材的来源提交对象在 fork 中不存在，不能证明是 HEAD 祖先；保留真实来源哈希，没有伪造证据。② 当前可用原生 ffprobe 6.1.1 为裁剪版，支持 MP4 视频但没有 WAV demuxer，音频时长实测失败。原依赖 `ffprobe-static` 的 darwin/arm64 文件实际是 x86_64；不能据此认定生产 Linux 媒体工具已验收。原生 ffprobe 替换仅用于本次测试进程，不修改业务、依赖文件或断言；它让此前 5 个视频事实失败通过。原生 FFmpeg 编码可运行。

Qwen 两个模型新增 t2i/i2i × 1k/2k 共 8 个独立 selector。实际枚举 20130 普通场景、14675 普通单元、324 workflow 单元，合计 **14999 单元、26826 检查点**，见 `final-tariff-inventory.json`。历史577行价格fixture不改，新Qwen8行独立冻结；人民币转换仅发生一次。完整 cutover 测试同步更新旧计数并锁定 Qwen selector 身份，继续验证所有报价、原子拒绝和历史回滚。

支付 HTTP 实际 handler 回归覆盖超时、reload、并发重复、late paid 查询和账号隔离；协议签名/结算独立通过。中文文章重复 slug 已修复。MCP v1–v5 保留原始文档和既有 v5 SHA-256；新品牌只由 v6 提供。没有恢复已退役 Canvas 或未经实现的公共 export worker。

当前依赖为隔离工作树映射的既有安装，未完成全新 frozen 安装、Docker 实际构建、PG17 Studio 端到端及跨浏览器验收。GitHub 官方 PG17 包下载再次 DNS timeout。上述限制不是测试成功，必须在具备工具的干净 CI 环境补齐。

Docker 基础 bootstrap 已使用与普通 runner 相同的 session advisory lock。真实 PostgreSQL 验证它等待已有迁移锁期间没有创建基础表，释放后才完成 bootstrap；与普通迁移原子回滚、31精确历史升级、concurrent索引重放一起 3/3 通过。两阶段之间会释放锁，但每个阶段不会并发写入。

本次没有生产迁移、数据删除、push 或部署。只有必要质量检查全部通过，才将候选纳入 MaxVideoAI；原定制工作树保持原分支和提交。
