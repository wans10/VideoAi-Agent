# 手机号验证码登录：服务器端部署说明（Keyvo）

> 状态：**尚未执行**。本目录里的文件是给运维人员照着做的材料，网站代码已经准备好，但默认关闭。
> 文档里所有 `ALI_AK`、`ALI_SK`、`ALI_SIGN`、`ALI_TPL`、`HOOK_SECRET` 都是**占位符**，请勿把真实密钥写进本仓库、聊天记录或截图。

## 它是怎么工作的

1. 用户在 Keyvo 登录页选择「手机验证码」，输入 11 位手机号，点「获取验证码」。
2. 网站调用 Supabase Auth（GoTrue）。GoTrue 生成 6 位验证码，然后调用我们自己的小服务 `sms-hook`。
3. `sms-hook` 校验签名（防止别人冒充 GoTrue），检查频率限制，再调用阿里云短信接口发送验证码（模板参数 `code`）。
4. 用户输入验证码，GoTrue 校验通过后登录；新手机号会自动创建账户。

## 本目录的文件

| 文件 | 作用 |
| --- | --- |
| `hook.js` | sms-hook 程序本体（只读取环境变量，不写死任何密钥） |
| `package.json`、`package-lock.json` | 依赖及其精确版本 |
| `Dockerfile` | 构建 sms-hook 镜像（node:22-alpine，使用 npmmirror 国内镜像） |
| `docker-compose.sms-hook.yml` | 要加到 Supabase 编排里的 `sms-hook` 服务 |
| `gotrue-env.example` | 要加到 Supabase Auth（`auth` 服务）里的环境变量 |

## 准备工作（一次性）

1. **阿里云短信**：签名和模板已审核通过。记下：签名名称（填到 `ALI_SIGN`）、模板 CODE，形如 `SMS_000000000`（填到 `ALI_TPL`）。模板内容里的变量必须是 `${code}`。
2. **专用 RAM 用户**：阿里云控制台 → 访问控制 RAM → 用户 → 创建用户，只勾选「OpenAPI 调用访问」。授权时只给短信发送权限（系统策略 `AliyunDysmsFullAccess`，或者更严格的自定义策略只允许 `dysms:SendSms`）。为它创建 AccessKey，得到 `ALI_AK` 和 `ALI_SK`。**不要使用主账号的 AccessKey。**
3. **生成 Hook 密钥**：在服务器终端执行：

   ```bash
   echo "v1,whsec_$(openssl rand -base64 32)"
   ```

   输出的整行（以 `v1,whsec_` 开头）就是 `HOOK_SECRET`。GoTrue 和 sms-hook 必须使用**完全相同**的这一行。

## 在 1Panel 上部署

1. 打开 1Panel → **容器 → 编排**，找到运行 Supabase 的编排（里面有 `auth` 服务，容器名通常是 `supabase-auth`）。记下它所在的目录。
2. 1Panel → **文件**，进入该目录，新建文件夹 `sms-hook`，把本目录的 `hook.js`、`package.json`、`package-lock.json`、`Dockerfile` 上传进去。
3. 在同一目录的 `.env` 文件末尾加上（把尖括号里的内容换成真实值，**只写在服务器上**）：

   ```env
   ALI_AK=<阿里云 AccessKey ID>
   ALI_SK=<阿里云 AccessKey Secret>
   ALI_SIGN=<短信签名名称>
   ALI_TPL=<短信模板 CODE>
   SMS_HOOK_SECRET=<上一步生成的 v1,whsec_... 整行>
   ```

4. 回到 **容器 → 编排 → 编辑**：
   - 把 `docker-compose.sms-hook.yml` 中 `services:` 下面的 `sms-hook:` 整段，粘贴到编排文件的 `services:` 下面（注意缩进对齐）。如果 GoTrue 服务名不叫 `auth`，把 `network_mode: "service:auth"` 和 `depends_on` 里的 `auth` 换成实际名字。
   - 把 `gotrue-env.example` 里的各行，加到 `auth` 服务的 `environment:` 下面。
5. 保存后点「重建/启动」（相当于 `docker compose up -d --build`）。确认 `keyvo-sms-hook` 容器状态为「健康」，`supabase-auth` 正常运行。
6. 若 `supabase-auth` 日志出现 `Unsupported phone provider` 一类错误，把 `gotrue-env.example` 末尾注释掉的 4 行 `GOTRUE_SMS_PROVIDER...` 取消注释后再重启（旧版 GoTrue 的要求，这些值不会被使用）。

## 测试

在服务器终端执行（`<...>` 换成实际值；测试号码请用自己的手机）：

```bash
# 1. sms-hook 是否在运行
docker exec keyvo-sms-hook wget -qO- http://127.0.0.1:8787/healthz

# 2. 通过 Supabase 发送验证码（会真的发一条短信，产生费用）
curl -sS -X POST "https://<Supabase 域名>/auth/v1/otp" \
  -H "apikey: <SUPABASE_ANON_KEY>" -H "Content-Type: application/json" \
  -d '{"phone":"+86<你的手机号>"}'

# 3. 用收到的验证码登录，成功会返回 access_token
curl -sS -X POST "https://<Supabase 域名>/auth/v1/verify" \
  -H "apikey: <SUPABASE_ANON_KEY>" -H "Content-Type: application/json" \
  -d '{"type":"sms","phone":"+86<你的手机号>","token":"<收到的 6 位验证码>"}'

# 4. 查看日志（手机号已打码，例如 138****5678；不会出现验证码和密钥）
docker logs --tail 50 keyvo-sms-hook
```

## 在网站上打开「手机验证码」入口

服务器测试通过后：GitHub 仓库 → Settings → Secrets and variables → Actions → **Variables**，新建 `NEXT_PUBLIC_PHONE_LOGIN_ENABLED`，值为 `true`。这是**构建时**变量：之后推送一次代码让镜像重新构建，再在 1Panel 里更新网站容器，登录页才会出现「手机验证码」选项。（`.env.production` 里的同名变量对已构建好的镜像不起作用。）

## 更换密钥（建议每 90 天一次，或怀疑泄露时立即更换）

- **阿里云 AccessKey**：RAM 控制台为同一个 RAM 用户再创建一个新 AccessKey → 修改服务器 `.env` 里的 `ALI_AK`、`ALI_SK` → 1Panel 中重启 `keyvo-sms-hook`（`docker compose up -d sms-hook`）→ 按上面「测试」第 2、3 步验证 → 在 RAM 控制台**禁用**旧 AccessKey，观察一天无异常后删除。
- **Hook 密钥**：重新生成一行 `v1,whsec_...` → 修改 `.env` 的 `SMS_HOOK_SECRET` → **同时**重启 `auth` 和 `sms-hook`（约 1 分钟内发码可能失败）→ 测试。

## 频率限制（防止短信轰炸和费用失控）

- sms-hook 内置：同一手机号 60 秒 1 条、每小时 5 条、每天 10 条；全站每小时 300 条（可在编排里调整 `LIMIT_*`）。计数保存在内存中，重启后清零。
- GoTrue：`GOTRUE_SMS_MAX_FREQUENCY=60s`、全站每小时 `GOTRUE_RATE_LIMIT_SMS_SENT=100` 条。
- 阿里云短信控制台还有自己的「发送频率限制」，建议保持开启。
- 按 IP 限制：GoTrue 调用 sms-hook 时不会带上用户的 IP，所以 sms-hook 里的「每 IP 每小时 20 条」通常不生效。需要按 IP 限制时，请在 1Panel 的 OpenResty 网站（Supabase 域名）里对 `/auth/v1/otp` 加 `limit_req`，例如每个 IP 每分钟 1 次、突发 5 次。
- 建议在阿里云设置短信费用预警。

## 回滚（关闭手机号登录）

1. 网站：把 GitHub 变量 `NEXT_PUBLIC_PHONE_LOGIN_ENABLED` 改为 `false`（或删除），重新构建并更新网站容器。在新镜像上线前，用户点手机登录会看到「手机号登录暂未开放，请使用邮箱登录」。
2. Supabase：在 `auth` 服务里把 `GOTRUE_HOOK_SEND_SMS_ENABLED` 和 `GOTRUE_EXTERNAL_PHONE_ENABLED` 改为 `"false"`，重启 `auth`。
3. 停止并删除 `sms-hook` 服务（编排里删掉这一段，再「重建」）。
4. 已经用手机号注册的账户仍然保留，之后重新开启即可继续登录。

## 合规提醒

- 短信验证码只能证明「用户能收到这个号码的短信」，**不是实名认证**。如果业务需要实名（例如生成式 AI 服务的用户真实身份信息认证要求），需要另外接入实名核验服务。
- 用户协议和隐私政策需写明收集手机号的目的和保存期限；登录页已要求用户勾选同意。
