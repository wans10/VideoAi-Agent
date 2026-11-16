# Keyvo 监控与告警 / Monitoring and alerting

适用对象：非技术负责人（第 1、2、3 节）与运维人员（第 4 节起）。告警发送到钉钉群自定义机器人。
Audience: the owner (sections 1-3) and the operator (section 4 onward). Alerts go to a DingTalk group robot.

监控由两部分组成，**互相独立**：

1. **应用内健康接口** `GET /api/cron/ops-health`（只读，需要 `CRON_SECRET`）：从应用数据库统计生成、支付、钱包、服务商报错等信号。代码：`frontend/src/server/ops-health.ts`、`frontend/app/api/cron/ops-health/route.ts`。
2. **外部监控脚本** `scripts/ops/ops-monitor.mjs`：跑在**阿里云中转机（47.97.179.171）**上，每 5 分钟检查网站是否可访问、证书是否将到期，并调用上面的健康接口，把结果发到钉钉。放在另一台机器上，是为了应用服务器整体宕机时仍能发现。

## 1. 监控什么、为什么

| 检查 | 异常的判定 | 为什么 |
| --- | --- | --- |
| 首页 `https://app.keyvo.cn/zh` | 非 200、超时或 > 5 秒 | 站点打不开 |
| 登录页 `/login` | 同上 | 用户无法登录 |
| `/api/me/currency`（不带登录） | 不是 401 的 JSON | 应用后端是否存活（网关错误页会被识别） |
| `https://supabase.keyvo.cn/auth/v1/health` | 非 200 | 登录/账号服务（需要 `SUPABASE_ANON_KEY`） |
| TLS 证书：`app.keyvo.cn`、`supabase.keyvo.cn`、`keyvo.cn` | 剩余 < 14 天（< 3 天为严重） | 证书过期会让所有用户无法访问 |
| 短信 Hook（可选，设置 `SMS_HOOK_HEALTH_URL`） | 非 200 | 手机验证码发不出 |
| 应用健康接口本身 | 调用失败 | 无法判断业务指标 |

**防抖**：网络类检查连续 **2 次**（约 10 分钟）失败才报警；证书和应用内告警按各自规则（证书立即报警）。

### 应用内业务信号（阈值可用环境变量覆盖，括号内为变量名后缀 `OPS_HEALTH_…`）

| 信号 | 默认阈值 | 级别 |
| --- | --- | --- |
| 某渠道近 15 分钟失败率 ≥ 70%、失败 ≥ 8 次（样本 ≥ 5） | `FAILURE_RATE_CRITICAL`、`FAILURE_COUNT_15M_CRITICAL`、`FAILURE_MIN_SAMPLES` | 严重 |
| 某渠道近 60 分钟失败率 ≥ 40%（样本 ≥ 5） | `FAILURE_RATE_WARN` | 警告 |
| 任务处于排队/处理中超过 45 分钟：≥ 3 个 / ≥ 10 个 | `STUCK_MINUTES`、`STUCK_COUNT_WARN`、`STUCK_COUNT_CRITICAL` | 警告 / 严重 |
| 失败任务超过 10 分钟仍未退款（≥ 1 个） | `UNREFUNDED_MINUTES`、`UNREFUNDED_WARN` | 严重 |
| 服务商账号类错误（密钥无效、欠费/余额不足、无权限；近 60 分钟 ≥ 1 次），含按报错关键词（Arrearage、AccountOverdue、insufficient_quota 等）的补充检测 | `PROVIDER_ACCOUNT_ERROR_CRITICAL` | 严重 |
| 服务商限流/并发超限近 60 分钟 ≥ 10 次 | `PROVIDER_RATE_LIMIT_WARN` | 警告 |
| 已支付订单 5 分钟后仍没有充值入账记录（≥ 1 笔，24 小时内） | `PAID_WITHOUT_RECEIPT_CRITICAL` | 严重 |
| 近 60 分钟充值订单失败 ≥ 1 笔 | `FAILED_ORDERS_WARN` | 警告 |
| 充值订单超过 30 分钟未支付/未回调 ≥ 8 笔（24 小时内） | `PENDING_ORDER_MINUTES`、`PENDING_ORDER_WARN` | 警告 |
| 近 60 分钟退款 ≥ 20 笔 | `REFUND_COUNT_60M_WARN` | 警告 |
| 近期活跃账户钱包余额为负（≥ 1 个） | `NEGATIVE_BALANCE_WARN` | 严重 |
| Milo 助手近 60 分钟失败 ≥ 5 次 | `ASSISTANT_FAILURE_WARN` | 警告 |
| 某项查询失败 | — | 警告 |

另外接口返回但不报警的信息：按渠道/引擎的失败数、近 60 分钟/24 小时新注册数（仅计数）、退款数。接口**不返回**任何用户标识、提示词、手机号、令牌或报错原文。

说明与限制：
- 支付回调失败没有专门的数据库日志，所以用「已支付无入账」「长时间待支付」间接发现；待支付多属正常放弃，阈值已调高，数量异常才告警。
- 短信 Hook 与注册验证码用量在应用库里没有记录，不在应用健康接口内；用 `SMS_HOOK_HEALTH_URL` 检查存活。
- 数据库不可用时，接口仍返回，并带「某项查询失败」告警；应用整体不可用则由外部网络检查发现。

## 2. 创建钉钉机器人（负责人操作，约 5 分钟）

1. 在钉钉电脑端打开用于接收告警的群（建议只有运维和负责人）。
2. 群设置 → 机器人 → 添加机器人 → **自定义**（通过 Webhook 接入）。
3. 机器人名称随意，例如 `Keyvo 监控`。
4. **安全设置选择「加签」**（推荐）。创建后页面会显示一串以 `SEC` 开头的密钥，复制保存。
   - 若公司策略只能用「自定义关键词」：关键词填 `Keyvo`（所有消息都包含该词），此时 `DINGTALK_SECRET` 留空。
   - 不要选「IP 地址段」：外部监控机的出口 IP 变化时会被拒绝。
5. 完成后复制 **Webhook 地址**（形如 `https://oapi.dingtalk.com/robot/send?access_token=…`）。
6. **请把这两项通过安全渠道（不要发到公开群、工单或代码仓库）发给运维：Webhook 地址、加签密钥（SEC…）。**

两者只存放在中转机的 `/etc/keyvo-ops.env`（权限 600）。未填写时脚本只在日志里打印消息，不会报错。

## 3. 收到消息怎么看

- 【Keyvo 告警】严重/警告：某项刚刚出问题，之后每 60 分钟提醒一次，直到恢复。
- 【Keyvo 告警】已恢复：问题消失，附持续时长。
- 【Keyvo 监控】监控存活：每天 09:00（北京时间）一条，没收到说明监控本身停了，请通知运维。
- 静音：见第 7 节。

## 4. 环境变量（仅名称；值在 `/etc/keyvo-ops.env`，示例 `scripts/ops/keyvo-ops.env.example`）

监控机（阿里云中转机）：`KEYVO_OPS_ENV`（env 文件路径，默认 `/etc/keyvo-ops.env`）、`DINGTALK_WEBHOOK_URL`、`DINGTALK_SECRET`、`SUPABASE_ANON_KEY`、`OPS_CRON_SECRET`（必须等于应用的 `CRON_SECRET`）、`SMS_HOOK_HEALTH_URL`（可选）、`APP_BASE_URL`、`SUPABASE_URL`、`TLS_HOSTS`、`TLS_WARN_DAYS`、`SLOW_MS`、`TIMEOUT_MS`、`FAILURES_BEFORE_ALERT`、`REMIND_MINUTES`、`KEYVO_OPS_STATE`（状态文件，默认 `/var/lib/keyvo-ops/state.json`）、`OPS_HEARTBEAT=1`、`OPS_HEARTBEAT_HOUR`、`OPS_HOST_LABEL`。

应用服务器（AWS 新加坡）：必须设置 `CRON_SECRET`（未设置时健康接口返回 503，不会裸奔）；可选 `OPS_HEALTH_*` 阈值覆盖（见上表）。

## 5. 安装（运维，阿里云中转机，需要 Node 22）

```bash
sudo mkdir -p /opt/keyvo-ops
sudo cp scripts/ops/ops-monitor.mjs /opt/keyvo-ops/
sudo cp scripts/ops/keyvo-ops.env.example /etc/keyvo-ops.env   # 编辑填值
sudo chmod 600 /etc/keyvo-ops.env
node --version   # 必须 >= 22
```

方式 A：systemd 定时器（推荐）

```bash
sudo cp scripts/ops/keyvo-ops-monitor.service scripts/ops/keyvo-ops-monitor.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now keyvo-ops-monitor.timer
systemctl list-timers keyvo-ops-monitor.timer
journalctl -u keyvo-ops-monitor -n 30
```

方式 B：cron，见 `scripts/ops/crontab.example`（`/etc/cron.d/keyvo-ops`）。每日心跳：在 env 里设 `OPS_HEARTBEAT=1`（默认北京时间 9 点后的第一次运行发送，每天一次）。

应用服务器上确认 `CRON_SECRET` 已配置后，重新部署容器使其生效。

## 6. 测试

```bash
export KEYVO_OPS_ENV=/etc/keyvo-ops.env
node /opt/keyvo-ops/ops-monitor.mjs --dry-run     # 只打印，不发送、不写状态
node /opt/keyvo-ops/ops-monitor.mjs --test        # 发一条测试消息到钉钉
node /opt/keyvo-ops/ops-monitor.mjs --heartbeat   # 立即发一条“监控存活”
curl -H "x-cron-key: $CRON_SECRET" https://app.keyvo.cn/api/cron/ops-health   # 查看原始信号
```

退出码：`0` 全部正常；`1` 有检查异常（定时器视为正常）；`2` 配置或内部错误；`3` 钉钉发送失败（下次运行会重发）。

模拟故障：把 env 中 `APP_BASE_URL` 临时改成不存在的域名，运行两次（间隔 5 分钟）应收到告警，改回后收到「已恢复」。

## 7. 静音

- 短时（维护窗口）：`sudo systemctl stop keyvo-ops-monitor.timer`，结束后 `start`。恢复后若问题仍在，会重新告警。
- 单个检查：目前通过调整阈值或删除对应 env（例如不设 `SMS_HOOK_HEALTH_URL` 即不检查短信）。
- 业务阈值太敏感：在应用服务器设置对应 `OPS_HEALTH_*` 并重启容器。
- 重置状态（让所有告警重新开始计数）：删除 `KEYVO_OPS_STATE` 指向的文件。

## 8. 处理手册（每类告警怎么办）

- **服务商账号类错误 / 余额提示**（`provider_account_error:*`、`provider_balance_hint:*`）：立刻登录对应服务商控制台（见 `docs/operations/monitoring-manual-checks.md`）充值或更换密钥；确认后再生成一次测试视频。期间失败的任务应已自动退款，可在「失败后未退款」告警是否出现来核对。
- **失败率高 / 渠道连续失败**：看告警里的渠道名；先查该服务商状态页和控制台；Bailian 与官方 API 互为备选（`KLING_ROUTE_ORDER`、`MINIMAX_H3_ROUTE_ORDER`），必要时调整顺序；限流类先等待并降低并发。
- **任务卡住**：服务商侧排队或轮询失败。检查轮询 cron 是否在跑（`/api/cron/*-poll`，Docker 部署由 1Panel 定时任务触发），再看服务商控制台任务状态；卡住超过阈值的任务需按管理后台流程失败并退款。
- **失败后未退款 / 钱包为负**：属资金正确性问题，先在管理后台核对该账户流水再人工补退款，并保留证据；不要重复退款。
- **已支付订单无入账**：用户已付款但余额未增加。到聚合易支付 / LLM Hub Pay 商户后台核对订单，确认回调地址 `https://app.keyvo.cn/api/llmhub-pay/notify` 可从外网访问（OpenResty 日志），然后用管理后台补入账；订单号需与 `llmhub_pay_topup_orders.out_trade_no` 对应。
- **待支付订单过多 / 充值失败**：检查支付渠道是否异常、回调是否被网关拦截。
- **TLS 证书到期**：在阿里云中转机的证书管理（1Panel/OpenResty）续期并重载；`keyvo.cn`、`app.keyvo.cn`、`supabase.keyvo.cn` 各自核对。
- **站点打不开 / 接口异常**：先看 AWS 应用服务器容器是否运行、再看中转机 OpenResty 到 `13.212.96.236` 的连通性；Supabase 异常则看阿里云上的 Supabase 容器。
- **监控本身告警（ops-health 调用失败）**：检查 `OPS_CRON_SECRET` 与应用 `CRON_SECRET` 是否一致、数据库是否可连。

## 9. 不在本系统内的内容

服务商余额/配额无法由本仓库自动读取，见 `docs/operations/monitoring-manual-checks.md`。
