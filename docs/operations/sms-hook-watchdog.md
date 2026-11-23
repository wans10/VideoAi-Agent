# 短信钩子看门狗（SMS hook watchdog）

## 它解决什么问题
Keyvo 的短信验证码由 `keyvo-sms-hook` 容器发送。它和登录服务 `supabase-auth` **共用同一个网络空间**（compose 里是
`network_mode: "service:auth"`），登录服务通过 `http://localhost:8787/send-sms` 调用它。GoTrue 只允许钩子地址使用
`localhost`、`127.0.0.1`、`::1`（2026-11-23 实测：把地址改成容器名会让登录服务无法启动），所以不能把钩子挪到独立网络。

副作用：只要 `supabase-auth` 被单独重启或重建，钩子还留在旧的网络空间里，登录服务访问 `localhost:8787` 被拒绝，
所有短信登录、注册、找回密码都会报"短信服务暂时不可用"，**而两个容器自己的健康检查仍显示正常**（2026-11-19 至 11-22 的 3 天故障就是这样发生的）。
修复只需要重启钩子容器，让它重新接入新的网络空间。看门狗就是自动做这件事，并用钉钉通知。

## 它做什么、不做什么
每分钟一次（systemd 定时器）：
1. 在 `supabase-auth` **容器里面**探测 `http://127.0.0.1:8787/healthz`，也就是登录服务调用钩子的真实路径。
2. 探测失败，且连续两次失败，才会执行 `docker restart keyvo-sms-hook`，等 12 秒后再探测一次。
3. 钉钉通知：恢复成功发一条"已自动恢复"；恢复失败发一条告警，之后每小时提醒一次；故障解除后发"已恢复正常"。

安全规则（都有单元测试）：
- 只会执行两类命令：`docker inspect` / `docker exec supabase-auth wget …`（只读探测）和 `docker restart keyvo-sms-hook`。
  **绝不重启、停止、重建登录服务，不读写 compose 文件，不读取任何密钥。**
- 登录服务正在启动、不健康、或启动不足 90 秒时，什么都不做（那不是钩子的问题）。
- 30 分钟内最多自动重启 3 次，之后只告警，不再重启，避免重启循环。
- 消息里没有手机号和密钥。

## 安装（阿里云中转机，需要 Node 22，已经装好）
需要的配置：`/etc/keyvo-ops.env` 里已经有钉钉的 `DINGTALK_WEBHOOK_URL`、`DINGTALK_SECRET`、`OPS_HOST_LABEL`（和监控脚本共用）。

```bash
cp sms-hook-watchdog.mjs /opt/keyvo-ops/
cp keyvo-sms-hook-watchdog.service keyvo-sms-hook-watchdog.timer /etc/systemd/system/
# 先演练：只探测并打印决定，不重启、不发消息、不写状态
KEYVO_OPS_ENV=/etc/keyvo-ops.env node /opt/keyvo-ops/sms-hook-watchdog.mjs --dry-run
# 发一条钉钉测试消息
KEYVO_OPS_ENV=/etc/keyvo-ops.env node /opt/keyvo-ops/sms-hook-watchdog.mjs --test
systemctl daemon-reload
systemctl enable --now keyvo-sms-hook-watchdog.timer
systemctl list-timers | grep sms-hook
```

## 上线后的验证（建议在访问量低的时段做，一次约 2 分钟短信不可用）
1. 观察一两分钟：`journalctl -u keyvo-sms-hook-watchdog -n 5` 应该显示 `probe=ok -> ok`。
2. 人为制造故障：`docker stop keyvo-sms-hook`。1 到 3 分钟内看门狗应该检测到、重启钩子，钉钉收到"已自动恢复"。
3. 再用手机点一次"获取验证码"确认能收到。
这个演练只动钩子容器，不会影响登录服务和密码登录。

## 回滚
```bash
systemctl disable --now keyvo-sms-hook-watchdog.timer
rm /etc/systemd/system/keyvo-sms-hook-watchdog.{service,timer} /opt/keyvo-ops/sms-hook-watchdog.mjs
systemctl daemon-reload
```
状态文件：`/var/lib/keyvo-ops/sms-hook-watchdog.json`（可删）。

## 仍然需要知道的事
- 看门狗最长约 2 到 3 分钟发现并修复（两次连续失败再重启），期间短信不可用。登录服务重启后 90 秒宽限期内也不会动作。
- 它不能修复阿里云短信本身的故障（欠费、签名、模板、限额）；那类问题要看钩子日志 `docker logs keyvo-sms-hook`。
- 服务器重启后，如果登录服务和钩子的启动顺序不对，看门狗会在几分钟内自动纠正。
