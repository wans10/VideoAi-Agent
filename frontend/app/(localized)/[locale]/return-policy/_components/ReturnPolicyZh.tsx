import Link from 'next/link';
import { IcpFiling } from '@/components/marketing/IcpFiling';
import { ObfuscatedEmailLink } from '@/components/marketing/ObfuscatedEmailLink';
import { legalText } from '@/lib/legal-entity';

const SECTIONS = [
  { title: '1. 概述', paragraphs: ['Keyvo 提供数字化 AI 图像、视频、音频生成服务，采用先充值、按次扣费的钱包方式，以人民币计价。我们不销售或配送实体商品，因此没有实体商品的退货或换货流程。'] },
  { title: '2. 生成失败', paragraphs: ['因 Keyvo 一侧或模型提供方的原因导致生成任务失败的，相关费用会自动退回您的钱包，无需您申请。'] },
  { title: '3. 其他退款事宜', paragraphs: ['如对退款有疑问，请通过下方联系邮箱与我们联系，并提供：'], items: ['与您的 Keyvo 账号关联的邮箱地址；', '订单编号或支付凭证（如有）；', '生成任务编号（如适用）；', '对问题的简要说明。'], after: ['我们可能请您补充信息，以便核实问题。本政策不影响法律法规赋予消费者的强制性权利。'] },
  { title: '4. 联系方式', paragraphs: ['对退款政策有疑问，请联系：'] },
];

export function ReturnPolicyZh() {
  return (
    <main className="videoai-document bg-bg py-10 sm:py-16">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-5 sm:px-8">
        <header className="flex items-baseline justify-between gap-4">
          <h2 className="text-2xl font-semibold text-text-primary">法律条款</h2>
          <Link href="/zh" className="text-sm font-medium text-brand hover:text-brandHover">返回首页</Link>
        </header>
        <section className="stack-gap-xl rounded-card border border-border bg-surface p-6 shadow-card sm:p-10">
          <header className="stack-gap-sm">
            <h1 className="text-xl font-semibold text-text-primary">退款与退换政策</h1>
            <p className="text-sm text-text-secondary">最后更新：{legalText('effectiveDate')}</p>
          </header>
          <article className="stack-gap-lg text-base leading-relaxed text-text-secondary">
            {SECTIONS.map((section) => (
              <section key={section.title} className="stack-gap-sm">
                <h3 className="text-lg font-semibold text-text-primary">{section.title}</h3>
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                {section.items ? <ul className="ml-5 list-disc space-y-2">{section.items.map((item) => <li key={item}>{item}</li>)}</ul> : null}
                {section.after?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                {section.title.startsWith('3.') || section.title.startsWith('4.') ? (
                  <ObfuscatedEmailLink user="contact" domain="llmhub.com.cn" label="contact@llmhub.com.cn" placeholder="contact [at] llmhub.com.cn" className="font-medium" />
                ) : null}
              </section>
            ))}
          </article>
        </section>
        <p className="text-center text-xs text-text-muted"><IcpFiling /></p>
      </div>
    </main>
  );
}
