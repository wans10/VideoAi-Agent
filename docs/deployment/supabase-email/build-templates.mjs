// Generates the Keyvo zh GoTrue email templates (templates/*.html and the .txt plain-text reference copies).
//   node docs/deployment/supabase-email/build-templates.mjs           write files
//   node docs/deployment/supabase-email/build-templates.mjs --check   fail if committed files drifted
// GoTrue sends the HTML body only. The visible fallback link in each HTML body covers clients that hide buttons.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const BRAND = 'Keyvo';
export const SITE = 'https://app.keyvo.cn';
export const SUPPORT_EMAIL = 'contact@llmhub.com.cn';
// Optional logo. Leave empty for a text wordmark. If you set it, it must be a public https URL you control.
export const LOGO_URL = '';

// Recovery links straight to the app with the one-time TokenHash (see README: the app's reset page verifies it).
const RECOVERY_LINK = `${SITE}/auth/reset-password?token_hash={{ .TokenHash }}&redirect_to={{ .RedirectTo | urlquery }}`;
const VERIFY_LINK = '{{ .ConfirmationURL }}';

export const kinds = {
  recovery: { file: 'reset-password', env: 'RECOVERY', subject: 'Keyvo — 重置密码', title: '重置密码',
    intro: '我们收到了重置 Keyvo 账户密码的请求。点击下方按钮设置新密码。', button: '设置新密码', link: RECOVERY_LINK,
    note: '在您保存新密码之前，原密码保持不变。此链接仅限本人使用，且只能使用一次，有效期较短，请尽快完成。' },
  confirmation: { file: 'confirm-signup', env: 'CONFIRMATION', subject: 'Keyvo — 验证您的邮箱', title: '验证您的邮箱',
    intro: '欢迎使用 Keyvo。请点击下方按钮验证邮箱 {{ .Email }}。', button: '验证邮箱', link: VERIFY_LINK,
    note: '此链接仅限本人使用，且只能使用一次。' },
  email_change: { file: 'email-change', env: 'EMAIL_CHANGE', subject: 'Keyvo — 确认更换邮箱', title: '确认更换邮箱',
    intro: '您正在将 Keyvo 账户的邮箱从 {{ .Email }} 更换为 {{ .NewEmail }}。点击下方按钮确认此更改。', button: '确认更换邮箱', link: VERIFY_LINK,
    note: '如果这不是您本人的操作，请不要点击链接，并尽快修改账户密码。' },
  magic_link: { file: 'magic-link', env: 'MAGIC_LINK', subject: 'Keyvo — 您的登录链接', title: '登录 Keyvo',
    intro: '点击下方按钮即可登录您的 Keyvo 账户。', button: '登录 Keyvo', link: VERIFY_LINK,
    note: '此链接仅限本人使用，且只能使用一次，请勿转发给他人。' },
  invite: { file: 'invite', env: 'INVITE', subject: 'Keyvo — 邀请您加入', title: '邀请您加入 Keyvo',
    intro: '您已被邀请加入 Keyvo。点击下方按钮接受邀请并设置账户。', button: '接受邀请', link: VERIFY_LINK,
    note: '此链接仅限本人使用，且只能使用一次。' },
  reauthentication: { file: 'reauthentication', env: 'REAUTHENTICATION', subject: 'Keyvo — 安全验证码', title: '安全验证码',
    intro: '您正在进行需要再次确认身份的操作。请输入下方验证码：', code: '{{ .Token }}',
    note: '验证码短时间内有效，请勿告诉任何人，Keyvo 工作人员也不会向您索要。' },
};
const ignore = '如果这不是您本人的操作，请忽略此邮件，您的账户不会有任何变化。';
const esc = (s) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');

export function renderHtml(kind) {
  const k = kinds[kind];
  const logo = LOGO_URL ? `<img src="${LOGO_URL}" alt="" width="36" height="36" style="display:block;border:0;border-radius:8px"></td><td style="padding-left:10px;">` : '';
  const action = k.code
    ? `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td class="kv-code" style="padding:14px 24px;background:#f1f3f7;border-radius:8px;font-family:Menlo,Consolas,monospace;font-size:28px;letter-spacing:6px;font-weight:700;color:#17212e">${k.code}</td></tr></table>`
    : `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td bgcolor="#111827" style="border-radius:8px;text-align:center"><a class="kv-btn" href="${k.link.replaceAll('&', '&amp;')}" style="display:inline-block;padding:15px 26px;border-radius:8px;background:#111827;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;line-height:1.4">${k.button}</a></td></tr></table>
<p class="kv-muted" style="margin:20px 0 0;font-size:13px;line-height:1.6;color:#526071">如果按钮无法点击，请复制下面的链接到浏览器打开：<br><a class="kv-link" href="${k.link.replaceAll('&', '&amp;')}" style="color:#2563eb;word-break:break-all">${k.link.replaceAll('&', '&amp;')}</a></p>`;
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"><title>${BRAND} — ${k.title}</title>
<style>
@media (prefers-color-scheme: dark){
.kv-body,.kv-outer{background:#0b0f17 !important}
.kv-card{background:#151b26 !important;border-color:#2a3342 !important}
.kv-text,.kv-h{color:#eef1f6 !important}
.kv-muted{color:#a3afc0 !important}
.kv-link{color:#8ab4ff !important}
.kv-code{background:#232c3b !important;color:#eef1f6 !important}
.kv-btn{background:#eef1f6 !important;color:#111827 !important}
}
</style></head>
<body class="kv-body" style="margin:0;padding:0;background:#f4f5f7;color:#17212e;font-family:-apple-system,'PingFang SC','Microsoft YaHei',Arial,sans-serif">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${k.title} · ${BRAND}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="kv-outer" style="background:#f4f5f7"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" class="kv-card" style="width:100%;max-width:560px;background:#ffffff;border:1px solid #e2e5ea;border-radius:16px">
<tr><td style="padding:28px 28px 20px;border-bottom:1px solid #e2e5ea" class="kv-card"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td>${logo}<span class="kv-h" style="font-size:22px;font-weight:700;color:#17212e">${BRAND}</span></td></tr></table></td></tr>
<tr><td class="kv-text" style="padding:28px;color:#17212e"><h1 class="kv-h" style="margin:0 0 18px;font-size:24px;line-height:1.35;font-weight:700;color:#17212e">${k.title}</h1>
<p style="margin:0 0 24px;font-size:16px;line-height:1.7">${k.intro}</p>
${action}
<p class="kv-muted" style="margin:24px 0 0;font-size:14px;line-height:1.7;color:#526071">${k.note}</p>
<p class="kv-muted" style="margin:12px 0 0;font-size:14px;line-height:1.7;color:#526071">${ignore}</p></td></tr>
<tr><td class="kv-muted" style="padding:18px 28px;border-top:1px solid #e2e5ea;font-size:13px;line-height:1.7;color:#526071">需要帮助？请联系 <a class="kv-link" href="mailto:${SUPPORT_EMAIL}" style="color:#2563eb">${SUPPORT_EMAIL}</a><br>${BRAND} · <a class="kv-link" href="${SITE}" style="color:#2563eb;text-decoration:none">${SITE.replace('https://', '')}</a><br>这是系统自动发送的邮件，请勿直接回复。</td></tr>
</table></td></tr></table></body></html>
`;
}

export function renderText(kind) {
  const k = kinds[kind];
  return `${BRAND}\n\n${k.title}\n\n${k.intro}\n\n${k.code ?? k.link}\n\n${k.note}\n\n${ignore}\n\n需要帮助？请联系 ${SUPPORT_EMAIL}\n`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const [kind, k] of Object.entries(kinds)) {
    for (const [ext, content] of [['html', renderHtml(kind)], ['txt', renderText(kind)]]) {
      const path = new URL(`./templates/${k.file}.${ext}`, import.meta.url);
      if (process.argv.includes('--check')) {
        if (readFileSync(path, 'utf8') !== content) throw new Error(`Regenerate ${k.file}.${ext}`);
      } else writeFileSync(path, content);
    }
  }
}
