# 手机号验证码登录：服务器端部署说明（Keyvo）

> 状态：**尚未执行**。本目录里的文件是给运维人员照着做的材料，网站代码已经准备好，但默认关闭。
> 文档里所有 `ALI_AK`、`ALI_SK`、`ALI_SIGN`、`ALI_TPL`、`HOOK_SECRET` 都是**占位符**，请勿把真实密钥写进本仓库、聊天记录或截图。

## 它是怎么工作的

1. **老用户（已设置密码）**：在 Keyvo 登录页输入 11 位手机号和密码，网站调用 `supabase.auth.signInWithPassword({ phone: "+86…", password })`。**不发送短信**。
2. **新用户注册**：输入手机号，勾选服务条款和年龄确认，点「获取验证码」。GoTrue 生成 6 位验证码，然后调用我们自己的小服务 `sms-hook`。`sms-hook` 校验签名（防止别人冒充 GoTrue），检查频率限制，再调用阿里云短信接口发送验证码（模板参数 `code`）。
3. 用户输入验证码，GoTrue 校验通过后创建账户并建立会话。网站随后**必须**让用户设置登录密码（`supabase.auth.updateUser({ password })`），设置完成前不会跳转进入应用。
4. **忘记密码 / 尚未设置密码的账户**：在密码登录页点「忘记密码？用短信验证码登录」，走第 2、3 步（验证码登录），然后设置新密码。
5. 已有邮箱的老账户仍可在登录页点「已有邮箱账户？使用邮箱和密码登录」，使用邮箱和密码登录，也可以走邮箱重置密码。

**服务器端不需要为密码登录做任何改动**：密码登录走 `POST /auth/v1/token?grant_type=password`，设置密码走 `PUT /auth/v1/user`。这两个接口**不得**被 OpenResty 或其他网关拦截（只拦截邮箱注册 `/auth/v1/signup` 和邮箱验证码 `/auth/v1/otp`，手机验证码 `/auth/v1/otp` 必须放行）。

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

# 3b. 设置密码（用第 3 步返回的 access_token；密码至少 6 位）
curl -sS -X PUT "https://<Supabase 域名>/auth/v1/user" \
  -H "apikey: <SUPABASE_ANON_KEY>" -H "Authorization: Bearer <第 3 步的 access_token>" \
  -H "Content-Type: application/json" -d '{"password":"<测试密码>"}'

# 3c. 用手机号和密码登录（不发送短信；成功返回 access_token）
curl -sS -X POST "https://<Supabase 域名>/auth/v1/token?grant_type=password" \
  -H "apikey: <SUPABASE_ANON_KEY>" -H "Content-Type: application/json" \
  -d '{"phone":"+86<你的手机号>","password":"<测试密码>"}'

# 4. 查看日志（手机号已打码，例如 138****5678；不会出现验证码和密钥）
docker logs --tail 50 keyvo-sms-hook
```

## 在网站上打开「手机验证码」入口

服务器测试通过后：GitHub 仓库 → Settings → Secrets and variables → Actions → **Variables**，新建 `NEXT_PUBLIC_PHONE_LOGIN_ENABLED`，值为 `true`。这是**构建时**变量：之后推送一次代码让镜像重新构建，再在 1Panel 里更新网站容器，登录页才会出现「手机验证码」选项。（`.env.production` 里的同名变量对已构建好的镜像不起作用。）

## 更换密钥（建议每 90 天一次，或怀疑泄露时立即更换）

- **阿里云 AccessKey**：RAM 控制台为同一个 RAM 用户再创建一个新 AccessKey → 修改服务器 `.env` 里的 `ALI_AK`、`ALI_SK` → 1Panel 中重启 `keyvo-sms-hook`（`docker compose up -d sms-hook`）→ 按上面「测试」第 2、3 步验证 → 在 RAM 控制台**禁用**旧 AccessKey，观察一天无异常后删除。
- **Hook 密钥**：重新生成一行 `v1,whsec_...` → 修改 `.env` 的 `SMS_HOOK_SECRET` → **同时**重启 `auth` 和 `sms-hook`（约 1 分钟内发码可能失败）→ 测试。

## 密码登录的限制与注意事项

- 密码登录错误（号码未注册或密码错误）页面统一显示同一句提示，不区分两者，避免泄露号码是否已注册。
- GoTrue 对登录和改密码有内置限流，超限时页面显示「尝试过于频繁，请稍后再试」。具体阈值以所用 GoTrue 版本和 `GOTRUE_RATE_LIMIT_*` 设置为准，本次未修改。
- 验证码验证成功后、设置密码之前，浏览器里已经有一个会话。页面刷新会回到「设置密码」步骤；如果用户直接关闭浏览器，之后再打开登录页会被视为已登录并进入应用（没有密码）。网站目前没有服务端的「已设置密码」标记，这一点需要 owner 决定是否补充。
- 忘记密码与新用户注册共用同一条验证码流程：号码未注册时，验证码会创建账户，因此仍需勾选服务条款和年龄确认。

## 频率限制（防止短信轰炸和费用失控）

- sms-hook 内置：同一手机号 60 秒 1 条、每小时 5 条、每天 10 条；全站每小时 300 条（可在编排里调整 `LIMIT_*`）。计数保存在内存中，重启后清零。
- GoTrue：`GOTRUE_SMS_MAX_FREQUENCY=60s`、全站每小时 `GOTRUE_RATE_LIMIT_SMS_SENT=100` 条。
- 阿里云短信控制台还有自己的「发送频率限制」，建议保持开启。
- 按 IP 限制：GoTrue 调用 sms-hook 时不会带上用户的 IP，所以 sms-hook 里的「每 IP 每小时 20 条」通常不生效。需要按 IP 限制时，请在 1Panel 的 OpenResty 网站（Supabase 域名）里对 `/auth/v1/otp` 加 `limit_req`，例如每个 IP 每分钟 1 次、突发 5 次。
- 建议在阿里云设置短信费用预警。

## 回滚（关闭手机号登录）

1. 网站：把 GitHub 变量 `NEXT_PUBLIC_PHONE_LOGIN_ENABLED` 改为 `false`（或删除），重新构建并更新网站容器。关闭后登录页回到原来的邮箱和密码表单，**设置过密码的手机号账户将无法登录**（没有邮箱的账户只能通过手机号登录），直到重新开启该开关。
2. Supabase：在 `auth` 服务里把 `GOTRUE_HOOK_SEND_SMS_ENABLED` 和 `GOTRUE_EXTERNAL_PHONE_ENABLED` 改为 `"false"`，重启 `auth`。
3. 停止并删除 `sms-hook` 服务（编排里删掉这一段，再「重建」）。
4. 已经用手机号注册的账户仍然保留，之后重新开启即可继续登录（包括密码登录）。

## 注册时填写的电子邮箱（联系邮箱）

手机号注册（「注册」页签）还要求填写一个电子邮箱，用于以后发送产品通知（营销邮件需单独勾选同意）。这一步**不影响登录**，也**不做验证**：

- **不验证**：不发送确认邮件，没有验证步骤，只有手机号是经过验证的。
- **不是登录邮箱**：网站**不会**调用 `updateUser({ email })`，也**不会**把邮箱传给 `signInWithOtp` 或 `verifyOtp`。原因：GoTrue 的邮箱注册在网关上被拦截（`/auth/v1/signup`、邮箱 `/otp`），而且登录邮箱变更会触发确认邮件。手机号仍是唯一的登录标识。
- **存放位置**：只存在我们自己的应用数据库 `profiles.contact_email`（与 `contact_email_at`，迁移文件 `neon/migrations/98_profile_contact_email.sql`）。Supabase 数据库不改动。
- **写入接口**：`POST /api/account/contact-email`，只接受已登录用户的会话（不接受请求体里的 userId），邮箱会去掉首尾空格并转为小写，超过 254 字符或格式明显不对会被拒绝。验证码通过后立即调用；失败时不会中断注册，而是在「设置登录密码」步骤要求重新填写并保存，保存成功后才设置密码。
- **营销同意**：「同意接收不定期产品更新邮件」默认不勾选，结果随 `/api/legal/consents` 一起写入（`marketing` 记录，包括不勾选时的 `accepted: false`）。
- **读取位置**：DSAR 导出（`user.contactEmail`）、管理员用户详情（「Identity & Access」，只读）、管理员营销名单（无 Auth 邮箱的手机号用户使用它作为备选），设置页（仅手机号账户，只读，标注「不是登录邮箱」）。

**上线前**：先执行迁移 `98_profile_contact_email.sql`（`pnpm db:migrate:neon`，可重复执行），再部署网站。迁移只新增两列和一个长度检查，已有数据不变。

**需要 owner 处理**：隐私政策必须写明收集电子邮箱的目的（产品通知与营销邮件）、保存位置、保存期限，以及用户如何撤回营销同意和要求删除。这是法务文案，代码不替代它。

## 合规提醒

- 短信验证码只能证明「用户能收到这个号码的短信」，**不是实名认证**。如果业务需要实名（例如生成式 AI 服务的用户真实身份信息认证要求），需要另外接入实名核验服务。
- 用户协议和隐私政策需写明收集手机号的目的和保存期限；登录页已要求用户勾选同意。
