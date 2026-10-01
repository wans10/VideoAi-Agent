import Link from 'next/link';
import { ObfuscatedEmailLink } from '@/components/marketing/ObfuscatedEmailLink';

const SECTIONS = [
  { title: '1. 概述', paragraphs: ['VideoAI 提供数字化 AI 视频生成服务、钱包额度及相关软件访问权限。我们不销售或配送实体商品，因此不提供实体商品退货或换货流程。'] },
  { title: '2. 生成失败或技术缺陷', paragraphs: ['如果生成任务因 VideoAI 一侧的技术问题失败，我们可能自动将相关费用退回用户钱包，或在适当情况下退回原支付方式。', '生成失败或存在技术缺陷可能包括：'], items: ['因平台或提供商错误而无法完成的任务；', '生成任务从未开始或从未完成，但已扣除额度；', '已确认的技术故障导致无法交付所请求的数字化输出。'], after: ['除非适用法律另有要求，通常不会因对 AI 生成结果、提示词选择、上传素材或预期创作差异的主观不满意而退款。'] },
  { title: '3. 已成功交付的数字化生成', paragraphs: ['额度一旦使用且生成结果已成功交付，相关购买通常无法退回或退款，因为服务已履行且数字资源已消耗。', '这不影响用户居住国家可能适用的任何强制性消费者权利。'] },
  { title: '4. 钱包额度与未使用余额', paragraphs: ['用户可申请对未使用的钱包额度进行退款审核。审核受支付处理机构限制、反欺诈检查、促销额度排除规则及适用法律约束。', '促销、奖励或免费额度不具有现金价值，且不可退款。'] },
  { title: '5. 欧盟、欧洲经济区及英国消费者的撤回权', paragraphs: ['如果你是欧盟、欧洲经济区或英国的消费者，远程购买可能享有法定撤回权。', '但是，如果数字内容或数字服务在你事先明确同意，并确认服务开始履行后可能丧失撤回权的情况下立即开始提供，该权利可能不适用于已使用的额度或已开始、已交付的生成任务。', '本政策不限制任何适用于你的强制性消费者保护权利。'] },
  { title: '6. 换货', paragraphs: ['VideoAI 提供数字服务而非实体商品，因此不提供换货。'] },
  { title: '7. 如何申请退款审核', paragraphs: ['请通过下方联系邮箱申请退款审核，并提供：'], items: ['与你的 VideoAI 账号关联的邮箱地址；', '交易编号或收据（如有）；', '生成任务编号（如适用）；', '对问题的简短说明。'], after: ['我们可能要求提供额外信息，以核实问题。'] },
  { title: '8. 退款处理时间', paragraphs: ['获批的钱包额度退款通常会在确认任务失败后尽快到账。', '获批的支付退款通过我们的支付提供商处理。款项出现在银行卡、银行账户或其他支付方式中的时间取决于支付提供商和银行。'] },
  { title: '9. 联系方式', paragraphs: ['如对退款或退换政策有疑问，请联系：'] },
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
            <p className="text-sm text-text-secondary">最后更新：2026 年 6 月 2 日</p>
          </header>
          <article className="stack-gap-lg text-base leading-relaxed text-text-secondary">
            {SECTIONS.map((section) => (
              <section key={section.title} className="stack-gap-sm">
                <h3 className="text-lg font-semibold text-text-primary">{section.title}</h3>
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                {section.items ? <ul className="ml-5 list-disc space-y-2">{section.items.map((item) => <li key={item}>{item}</li>)}</ul> : null}
                {section.after?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                {section.title.startsWith('7.') || section.title.startsWith('9.') ? (
                  <ObfuscatedEmailLink user="contact" domain="llmhub.com.cn" label="contact@llmhub.com.cn" placeholder="contact [at] llmhub.com.cn" className="font-medium" />
                ) : null}
              </section>
            ))}
          </article>
        </section>
      </div>
    </main>
  );
}
