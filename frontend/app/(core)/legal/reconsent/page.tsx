import type { Metadata } from 'next';
import { ReconsentPrompt } from '@/components/legal/ReconsentPrompt';
import { ObfuscatedEmailLink } from '@/components/marketing/ObfuscatedEmailLink';
import { resolveLocale } from '@/lib/i18n/server';
import type { AppLocale } from '@/i18n/locales';
import { buildSeoMetadata } from '@/lib/seo/metadata';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await resolveLocale()) as AppLocale;
  return buildSeoMetadata({
    locale,
    title: locale === 'zh' ? '法律更新确认' : 'Legal re-consent',
    description: locale === 'zh' ? '查看并确认更新后的 Keyvo 法律文件。' : 'Review and accept the updated Keyvo legal documents.',
    hreflangGroup: 'legalReconsent',
    englishPath: '/legal/reconsent',
    availableLocales: ['en', 'fr', 'es', 'zh'] as AppLocale[],
    ogType: 'article',
    imageAlt: locale === 'zh' ? '法律更新确认' : 'Legal re-consent',
  });
}

export default async function LegalReconsentPage() {
  const locale = (await resolveLocale()) as AppLocale;
  const zh = locale === 'zh';
  return (
    <div className="stack-gap-lg">
      <header className="stack-gap-sm">
        <h1 className="text-xl font-semibold text-text-primary">{zh ? '查看更新' : 'Review updates'}</h1>
        <p className="text-sm text-text-secondary">
          {zh
            ? '登录后，最新的法律文件会显示在下方，请确认是否接受。未登录请先登录。'
            : 'If you are signed in, the latest legal documents will appear below for acceptance. Otherwise, sign in to continue.'}
        </p>
      </header>
      <div className="rounded-card border border-border bg-bg-secondary/40 p-6">
        <ReconsentPrompt />
        <p className="text-sm text-text-muted">
          {zh ? '需要帮助？请联系' : 'Need help? Contact'}{' '}
          <ObfuscatedEmailLink
            user="contact"
            domain="llmhub.com.cn"
            label="contact@llmhub.com.cn"
            placeholder="contact [at] llmhub.com.cn"
          />
          .
        </p>
      </div>
    </div>
  );
}
