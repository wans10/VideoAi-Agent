# Supabase 邮件（找回密码 / 邮箱验证）：服务器端配置说明（Keyvo）

> 状态：**尚未执行**。本目录是给 owner 和运维人员照着做的材料，仓库里没有任何密钥。
> 文档里的 `<...>`、`SMTP_PASS` 等都是**占位符**。SMTP 密码只能由 owner 自己写进服务器的 `.env`，**不要**发在聊天、工单、截图或仓库里。
> 前提：生产认证服务是自建 Supabase（GoTrue v2.196.0，编排目录 `/opt/1panel/docker/compose/supabase`），站点 `https://supabase.keyvo.cn`，应用 `https://app.keyvo.cn`。目前没有配置 SMTP，且 `GOTRUE_MAILER_AUTOCONFIRM=true`，所以不会发出任何邮件。

## 目标与范围

- 让**已有邮箱的老用户**能通过邮件重置密码。
- 以后（**不在本次范围**）可以让用户把邮箱作为「已验证的可选绑定」。
- **注册仍然只能用手机号**。邮箱注册和邮箱验证码登录继续被 OpenResty 拦截，本文不会放开它们。
- 不改动短信 hook（`sms-hook`）和手机号流程。

## 目录文件

| 文件 | 作用 |
| --- | --- |
| `templates/*.html` | 6 个中文模板：`reset-password`（重置密码）、`confirm-signup`（邮箱验证）、`email-change`（更换邮箱）、`magic-link`（登录链接）、`invite`（邀请）、`reauthentication`（安全验证码） |
| `templates/*.txt` | 对应的纯文本参考版（GoTrue 只发送 HTML，`.txt` 仅供参考和预览；HTML 里已有可复制的文字链接作为兜底） |
| `build-templates.mjs` | 模板生成脚本（改文案只改这里，再运行；`--check` 检查是否同步） |
| `preview.mjs` | 用示例值渲染到 `/tmp/keyvo-email-preview`，浏览器打开检查（切换系统深色模式可看深色样式） |

预览：

```bash
node docs/deployment/supabase-email/preview.mjs   # 输出 /tmp/keyvo-email-preview/*.html
```

## 模板变量（GoTrue v2.196 支持的全部）

`{{ .ConfirmationURL }}`、`{{ .Token }}`（6 位验证码）、`{{ .TokenHash }}`、`{{ .SiteURL }}`、`{{ .Email }}`、`{{ .NewEmail }}`、`{{ .RedirectTo }}`、`{{ .SendingTo }}`、`{{ .Data }}`。不要使用已废弃的 `{{ .ActionLink }}`。`tests/keyvo-email-templates.test.ts` 会校验模板只用这些变量。

| 模板 | 用到的变量 | 链接 |
| --- | --- | --- |
| 重置密码 | `.TokenHash`、`.RedirectTo` | `https://app.keyvo.cn/auth/reset-password?token_hash=…&redirect_to=…` |
| 邮箱验证、邀请、登录链接、更换邮箱 | `.ConfirmationURL`（更换邮箱另用 `.Email`、`.NewEmail`） | GoTrue 验证地址 `https://supabase.keyvo.cn/auth/v1/verify?token=…&type=…&redirect_to=…` |
| 安全验证码 | `.Token` | 无链接 |

### 为什么重置密码链接直接指向应用

应用的重置页（`frontend/app/auth/reset-password`，逻辑在 `frontend/lib/password-recovery.ts`）接受 `?token_hash=`（调用 `verifyOtp({ token_hash, type: 'recovery' })`）、`?code=`（PKCE）或带 `type=recovery` 的地址栏令牌。上游已验证的方案就是邮件直接链接到应用的重置页并带 `TokenHash`，用户在页面上点「继续」才消耗令牌，所以邮件安全扫描器的 GET 请求不会让链接失效，也不需要发起请求的那个浏览器里的 PKCE 校验值（用户常在手机上点邮件，和申请重置的电脑不是同一个浏览器）。`redirect_to` 保留，页面只从中取语言和安全的跳转目标（`recoveryEmailDestination` 只接受 `https://app.keyvo.cn/auth/callback`）。

模板里把应用域名**写死为 `https://app.keyvo.cn`**，没有使用 `{{ .SiteURL }}`：因为这套 Supabase 的站点地址是 `supabase.keyvo.cn`，用它拼会指到认证服务而不是应用。如果 `SITE_URL` 也设成 `https://app.keyvo.cn`（推荐，见下文），两者效果相同。

## 一、owner 在阿里云控制台要做的事（无需技术背景）

1. 登录阿里云控制台，搜索并打开 **邮件推送（Direct Mail）**，按提示开通（有免费额度，超出按量计费）。
2. **添加发信域名**：左侧「发信域名」→「新建域名」。**推荐用子域名 `mail.keyvo.cn`**（而不是根域名 `keyvo.cn`），这样不影响现有的企业邮箱/其他邮件，发送信誉也和主域名隔离。
3. **验证域名**：新建后阿里云会给出需要添加的 DNS 记录，到 **云解析 DNS**（keyvo.cn 的域名解析所在处）逐条「添加记录」，记录类型、主机记录、记录值**原样粘贴阿里云页面给出的内容**：
   - **TXT（所有权验证）**：主机记录形如 `aliyundm.mail`。
   - **TXT（SPF）**：主机记录 `mail`，值形如 `v=spf1 include:spf1.dm.aliyun.com -all`。
   - **TXT（DKIM）**：主机记录形如 `aliyun-cn-hangzhou._domainkey.mail`，值是一长串公钥。
   - **MX**：主机记录 `mail`，值形如 `mxdomain.qiye.aliyun.com`，优先级 10（阿里云页面里是「MX 记录」，用于接收退信，建议配置）。
   - **CNAME（可选，跟踪/退订）**：阿里云页面如果给出，就一并添加。
   - 添加后回到邮件推送点「验证」，等几分钟到半小时。四项都显示「通过」即可。**注意：如果同名主机记录已存在，不要覆盖，先告诉我。**
4. **创建发信地址**：「发信地址」→「新建发信地址」，地址填 `no-reply@mail.keyvo.cn`，账号类型选「**触发邮件**」（用于系统通知、重置密码），回复邮箱可填 `contact@llmhub.com.cn`。
5. **设置 SMTP 密码**：在该发信地址的操作里点「设置 SMTP 密码」，设置一个强密码（只自己保管）。
6. **发送额度**：邮件推送默认有日发送量限制；保持默认即可，并在「发送量预警/限制」里设置每天上限（建议先 200 封/天，稳定后再放开）。
7. 发件人名称之后在服务器配置里统一写成 `Keyvo`。

**请发回给我（只发这些）：** SMTP 服务器地址和端口（例如 `smtpdm.aliyun.com`，端口 `465` SSL 或 `80`/`25`；服务器上 465 被封时可用 80）、SMTP 用户名（就是发信地址 `no-reply@mail.keyvo.cn`）、发信地址、域名验证是否全部「通过」。**SMTP 密码不要发给我**，由 owner 自己登录服务器写入 `.env`（见下）。

## 二、服务器改动（运维执行，**以下全部尚未执行**）

### 1. 备份（先做）

```bash
cd /opt/1panel/docker/compose/supabase
cp .env .env.bak.$(date +%Y%m%d%H%M)
cp docker-compose.yml docker-compose.yml.bak.$(date +%Y%m%d%H%M)
```

### 2. 让 GoTrue 读到模板（GoTrue 只能通过 HTTP(S) 取模板）

GoTrue v2.196 的 `GOTRUE_MAILER_TEMPLATES_*` **只接受 URL**：以 `http` 开头则直接下载；不以 `http` 开头则被当作相对路径并拼上 `SITE_URL`（见 `internal/mailer/templatemailer/template.go`，`fetch` 超时 10 秒、大小上限 `GOTRUE_MAILER_TEMPLATE_MAX_SIZE` 默认 1 MB）。**不支持把文件挂载进容器后直接用文件路径**（本地 CLI 的 `content_path` 是 CLI 自己托管的，自建环境不适用）。模板默认缓存，**修改模板后需重启 `supabase-auth`**（`GOTRUE_MAILER_TEMPLATE_RELOADING_ENABLED=true` 可调试用，生产不要开）。

三种方式，**推荐 A**：

- **A（推荐）：用 supabase.keyvo.cn 的 OpenResty 站点提供一个只读静态目录。** 把 `templates/*.html` 上传到服务器 `/opt/1panel/docker/compose/supabase/email-templates/`，在 1Panel 的 `supabase.keyvo.cn` 站点配置里加（这是精确匹配的小片段，不影响 `/auth/v1/` 的其他规则，也不要放在拦截规则之内）：

  ```nginx
  location ^~ /email-templates/ {
      alias /opt/1panel/docker/compose/supabase/email-templates/;   # 若 OpenResty 在容器里，需把该目录挂载进去
      default_type text/html;
      add_header Cache-Control "no-store";
      allow all;
  }
  ```

  模板里没有任何密钥，公开可读没有风险。GoTrue 与 OpenResty 同机时，也可以让 `GOTRUE_MAILER_TEMPLATES_*` 用容器内能访问到的地址，例如 `http://<openresty 容器名>/email-templates/reset-password.html`，避免出公网。
- **B：由应用网站提供。** 把 `*.html` 放到 `frontend/public/email-templates/` 随网站发布，地址 `https://app.keyvo.cn/email-templates/reset-password.html`。优点是随 Git 发布；缺点是网站每次发版都影响邮件模板，且网站故障时 GoTrue 取不到模板会**发信失败**（GoTrue 取不到模板会报错而不是用默认模板）。本次**没有**把模板放进 `frontend/public`。
- **C：一个小 nginx 容器**（`nginx:alpine` 挂载 `email-templates/` 到 `/usr/share/nginx/html/email-templates/`，只在 Docker 内部网络暴露）。最隔离，但多一个容器要维护。

### 3. `.env` 追加（只写在服务器上；`<...>` 换成真实值）

```env
SMTP_HOST=smtpdm.aliyun.com
SMTP_PORT=465
SMTP_USER=no-reply@mail.keyvo.cn
SMTP_PASS=<由 owner 自己填写的 SMTP 密码>
SMTP_ADMIN_EMAIL=no-reply@mail.keyvo.cn
SMTP_SENDER_NAME=Keyvo
```

`SMTP_*` 变量在 Supabase 官方 compose 里已存在且为空，直接填值即可，不要新增重复行。

### 4. `docker-compose.yml` 中 `auth` 服务的 `environment:` 确认/增加

大多数 `GOTRUE_SMTP_*` 在官方编排里已经映射到 `.env`，只需确认；缺的补上：

```yaml
      GOTRUE_SITE_URL: https://app.keyvo.cn            # 推荐：见下方说明
      GOTRUE_URI_ALLOW_LIST: "https://app.keyvo.cn/**" # 即 ADDITIONAL_REDIRECT_URLS，必须包含重置页和 /auth/callback
      GOTRUE_SMTP_HOST: ${SMTP_HOST}
      GOTRUE_SMTP_PORT: ${SMTP_PORT}
      GOTRUE_SMTP_USER: ${SMTP_USER}
      GOTRUE_SMTP_PASS: ${SMTP_PASS}
      GOTRUE_SMTP_ADMIN_EMAIL: ${SMTP_ADMIN_EMAIL}
      GOTRUE_SMTP_SENDER_NAME: ${SMTP_SENDER_NAME}
      GOTRUE_MAILER_URLPATHS_INVITE: /auth/v1/verify
      GOTRUE_MAILER_URLPATHS_CONFIRMATION: /auth/v1/verify
      GOTRUE_MAILER_URLPATHS_RECOVERY: /auth/v1/verify
      GOTRUE_MAILER_URLPATHS_EMAIL_CHANGE: /auth/v1/verify
      GOTRUE_MAILER_SUBJECTS_RECOVERY: "Keyvo — 重置密码"
      GOTRUE_MAILER_SUBJECTS_CONFIRMATION: "Keyvo — 验证您的邮箱"
      GOTRUE_MAILER_SUBJECTS_EMAIL_CHANGE: "Keyvo — 确认更换邮箱"
      GOTRUE_MAILER_SUBJECTS_MAGIC_LINK: "Keyvo — 您的登录链接"
      GOTRUE_MAILER_SUBJECTS_INVITE: "Keyvo — 邀请您加入"
      GOTRUE_MAILER_SUBJECTS_REAUTHENTICATION: "Keyvo — 安全验证码"
      GOTRUE_MAILER_TEMPLATES_RECOVERY: https://supabase.keyvo.cn/email-templates/reset-password.html
      GOTRUE_MAILER_TEMPLATES_CONFIRMATION: https://supabase.keyvo.cn/email-templates/confirm-signup.html
      GOTRUE_MAILER_TEMPLATES_EMAIL_CHANGE: https://supabase.keyvo.cn/email-templates/email-change.html
      GOTRUE_MAILER_TEMPLATES_MAGIC_LINK: https://supabase.keyvo.cn/email-templates/magic-link.html
      GOTRUE_MAILER_TEMPLATES_INVITE: https://supabase.keyvo.cn/email-templates/invite.html
      GOTRUE_MAILER_TEMPLATES_REAUTHENTICATION: https://supabase.keyvo.cn/email-templates/reauthentication.html
      GOTRUE_RATE_LIMIT_EMAIL_SENT: "30"               # 每小时全站最多发多少封，见「防滥用」
```

要点：

- **`GOTRUE_MAILER_URLPATHS_*`** 是 GoTrue 在 `{{ .ConfirmationURL }}` 里使用的路径，相对 `API_EXTERNAL_URL`（`https://supabase.keyvo.cn`）；经反向代理时必须带 `/auth/v1` 前缀，否则链接 404。重置密码模板不依赖它（直接用 `TokenHash`）。
- **`SITE_URL`**：当前是 `https://supabase.keyvo.cn`。**推荐改为 `https://app.keyvo.cn`**：`redirect_to` 不在白名单时 GoTrue 会回退到 `SITE_URL`，改后兜底落在应用而不是认证服务；如果你保留 `supabase.keyvo.cn`，也能工作（模板里写死了应用域名），但回退行为会落到认证域。**改 `SITE_URL` 前请确认没有别的客户端依赖它**（OAuth 回调使用 `API_EXTERNAL_URL`，不受影响）。
- **`GOTRUE_URI_ALLOW_LIST`（即 `ADDITIONAL_REDIRECT_URLS`）必须包含 `https://app.keyvo.cn/**`**，否则 `redirect_to=https://app.keyvo.cn/auth/callback?...` 会被忽略，用户语言和继续目标丢失。
- 变量名以所用编排为准：官方编排里这些写作 `ADDITIONAL_REDIRECT_URLS`、`SITE_URL`，映射到 `GOTRUE_URI_ALLOW_LIST`、`GOTRUE_SITE_URL`。

### 5. 先不要关闭自动确认

**第一步只加 SMTP 和模板，保持 `GOTRUE_MAILER_AUTOCONFIRM=true`**（`.env` 里的 `ENABLE_EMAIL_AUTOCONFIRM`），重启并通过下面的测试后，才把它改为 `false`（见「关闭自动确认的影响」）。

```bash
cd /opt/1panel/docker/compose/supabase
docker compose config >/dev/null && echo OK      # 先检查语法
docker compose up -d auth
docker compose logs --tail 50 auth                # 无 "template" / "smtp" 错误
```

### 6. 测试

先在服务器上确认模板能被 GoTrue 取到：

```bash
curl -sS -o /dev/null -w "%{http_code}\n" https://supabase.keyvo.cn/email-templates/reset-password.html   # 期望 200
```

发送一封重置邮件到**一个已有的老邮箱账户**（用自己的测试账号；GoTrue 对不存在的邮箱也返回 200，防止枚举）：

```bash
curl -sS -i -X POST "https://supabase.keyvo.cn/auth/v1/recover?redirect_to=https%3A%2F%2Fapp.keyvo.cn%2Fauth%2Fcallback%3Flang%3Dzh%26next%3D%252Fapp" \
  -H "apikey: <SUPABASE_ANON_KEY>" -H "Content-Type: application/json" \
  -d '{"email":"<测试邮箱>"}'
# 期望 HTTP 200 和 {}
docker compose logs --tail 50 auth | grep -i "recover\|mail\|smtp\|error"
```

判断：

- `200` 且收到邮件：打开邮件，链接应以 `https://app.keyvo.cn/auth/reset-password?token_hash=` 开头；点开，页面点继续，设置新密码，然后用邮箱和新密码登录。
- `500` 且日志里有 `Error sending recovery email`、`535`、`dial tcp`、`i/o timeout`：SMTP 配置或网络问题（用户名/密码错、端口 465 被封可改 80）；网站上用户看到的是「暂时无法发送重置邮件」。
- `500` 且日志里有 `template_body_http_error`：GoTrue 取不到模板，检查第 2 步的 URL（容器内能否访问）。
- 收不到但返回 200：检查垃圾邮件、阿里云邮件推送控制台的发送记录和域名验证状态。

### 7. 回滚

```bash
cd /opt/1panel/docker/compose/supabase
cp .env.bak.<时间戳> .env
cp docker-compose.yml.bak.<时间戳> docker-compose.yml
docker compose up -d auth
```

回到「不发邮件」的状态（`SMTP_*` 为空、`MAILER_AUTOCONFIRM=true`）后，网站上的重置按钮显示「暂时无法发送重置邮件」，登录、注册和短信流程不受影响。仅回滚某个模板：把对应 `GOTRUE_MAILER_TEMPLATES_*` 注释掉（用 GoTrue 自带英文默认模板）并重启 `auth`。

## 三、与 supabase.keyvo.cn 的 OpenResty 规则的关系

当前规则**有意拦截** `/auth/v1/signup`（邮箱注册）和邮箱的 `/auth/v1/otp`（邮箱验证码/魔法链接）。保持不变：

| 路径 | 要求 |
| --- | --- |
| `/auth/v1/recover` | **必须放行**（老邮箱用户重置密码） |
| `/auth/v1/verify` | **必须放行**（验证链接和短信验证码，`type=sms` 与邮件的 `type=recovery/email_change` 共用） |
| `/auth/v1/token?grant_type=password` | **必须放行**（老邮箱用户和手机号密码登录） |
| `/auth/v1/user`（PUT） | 必须放行（设置/修改密码） |
| `/auth/v1/signup` | 继续拦截 |
| `/auth/v1/otp`（邮箱） | 继续拦截；手机号的 `/auth/v1/otp` 照旧放行（**不要**改动现有区分邮箱/手机号的规则；上线前用 `{"phone":...}` 和 `{"email":...}` 各测一次） |
| `/email-templates/` | 新增，只读静态文件（方案 A） |

因为不需要放开 `signup` 和邮箱 `otp`，**邮箱注册和魔法链接模板虽然存在，但在 OpenResty 拦截下不会被触发**；注册仍是手机号。

## 四、关闭 `GOTRUE_MAILER_AUTOCONFIRM`（只在 SMTP 测试通过之后）

- `MAILER_AUTOCONFIRM` 只影响**邮箱**注册和邮箱变更；手机号由 `GOTRUE_SMS_AUTOCONFIRM` 和短信验证码控制，**不受影响**，手机号用户没有邮箱，不会被要求验证邮箱。
- **已有邮箱用户**：此前在自动确认下创建的账户 `email_confirmed_at` 已有值，关闭后**仍能正常登录**，不会被要求重新验证。重置密码照常。
- 如果某个邮箱账户 `email_confirmed_at` 为空（请先在数据库查：`select count(*) from auth.users where email is not null and email_confirmed_at is null;`），关闭后它**无法用密码登录**，直到邮箱验证。有则先告诉我们再改。
- 之后新增邮箱（以后「绑定邮箱」功能）会收到验证邮件，点验证链接后才算已验证。更换邮箱默认需要新旧邮箱各确认一次（`GOTRUE_MAILER_SECURE_EMAIL_CHANGE_ENABLED` 默认开启，邮件里的文案已按此编写）。
- 由于注册入口仍被拦截，关闭自动确认不会产生新的邮箱账户。

## 五、防滥用

1. **GoTrue**：`GOTRUE_RATE_LIMIT_EMAIL_SENT`（默认每小时 30 封，全站）；同一邮箱发送间隔由 `GOTRUE_SMTP_MAX_FREQUENCY`（默认 1 分钟）限制。超限时网站显示「请求过于频繁」。
2. **邮件推送**：每日发送上限（见第一节）；开启发送量预警。
3. **OpenResty**：对 `/auth/v1/recover` 增加按 IP 限流，与现有 `keyvo_otp` 区类似。**以下片段仅供参考，请勿直接应用**，应按现有 `keyvo_otp` 的写法对齐：

   ```nginx
   # http {} 级别（与 keyvo_otp 同处）
   limit_req_zone $binary_remote_addr zone=keyvo_recover:10m rate=2r/m;

   # supabase.keyvo.cn 的 server {} 内
   location = /auth/v1/recover {
       limit_req zone=keyvo_recover burst=5 nodelay;
       limit_req_status 429;
       # 其余 proxy_pass 等配置与 /auth/ 现有 location 保持一致
   }
   ```

   如果站点位于 CDN/代理之后，`$binary_remote_addr` 必须是真实客户端 IP（检查 `real_ip` 设置），否则所有人共享一个限额。

## 六、验证清单

- [ ] 阿里云：域名 SPF、DKIM、所有权、MX 全部「通过」，发信地址已创建，SMTP 密码已设置。
- [ ] `.env` 备份完成；`SMTP_*` 已填，`SMTP_PASS` 只在服务器上。
- [ ] 模板 URL 返回 200（服务器内和 GoTrue 容器内都能访问）。
- [ ] `docker compose logs auth` 无 `template_body_*`、`smtp` 错误。
- [ ] `POST /auth/v1/recover` 返回 200，收到中文邮件，主题为「Keyvo — 重置密码」，链接指向 `app.keyvo.cn/auth/reset-password?token_hash=`。
- [ ] 点链接 → 继续 → 设置新密码 → 用邮箱和新密码登录成功；旧链接再次打开显示失效。
- [ ] 手机号验证码登录、手机号密码登录**回归正常**；`POST /auth/v1/signup`（邮箱）和邮箱 `otp` 仍被拦截。
- [ ] 用邮件主流邮箱（QQ、163、Gmail）各测一封，确认不进垃圾箱；深色模式显示正常。
- [ ] 数据库里没有 `email_confirmed_at` 为空的邮箱账户后，才把 `MAILER_AUTOCONFIRM` 改为 `false` 并重启，再回归一遍。
- [ ] 阿里云发送记录里能看到测试邮件。

## 关于仓库里的 `scripts/email/auth-templates.mjs`

那是**上游**（MaxVideoAI、en/fr/es、`support@maxvideoai.com`）用于本地 Supabase CLI 的模板生成器，对应 `supabase/templates/` 和 `supabase/config.toml`。Keyvo 的生产 Supabase 是自建的，不使用它；本目录的中文模板才是生产使用的。参见 `docs/engineering/keyvo-upstream-deviations.md`。
