import Link from 'next/link';
import { LegalContactEmail, LegalFact } from '@/components/legal/LegalFact';
import { localizePathFromEnglish } from '@/lib/i18n/paths';
import { ICP_FILING_NUMBER, ICP_FILING_URL } from '@/lib/product-brand';

/** 运营者信息（中文）。只显示运营者提供的事实，见 config/legal-entity.json。 */
export function MentionsZh() {
  const privacyHref = localizePathFromEnglish('zh', '/legal/privacy');
  const termsHref = localizePathFromEnglish('zh', '/legal/terms');
  const linkClass = 'text-brand underline hover:text-brandHover';
  return (
    <div className="stack-gap-lg">
      <header className="stack-gap-sm">
        <h1 className="text-xl font-semibold text-text-primary">运营者信息</h1>
        <p className="text-sm text-text-secondary">以下是本网站的运营者与备案公示信息。</p>
      </header>

      <article className="stack-gap-lg text-base leading-relaxed text-text-secondary">
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-text-primary">网站运营者</h2>
          <p>
            <strong>运营者：</strong> <LegalFact k="operatorName" />（<LegalFact k="operatorType" />）
          </p>
          <p>
            <strong>统一社会信用代码：</strong> <LegalFact k="creditCode" />
          </p>
          <p>
            <strong>注册地址：</strong> <LegalFact k="registeredAddress" />
          </p>
          <p>
            <strong>个人信息保护联系人：</strong> <LegalFact k="personalInfoContact" />
          </p>
          <p>
            <strong>联系邮箱：</strong> <LegalContactEmail />
          </p>
          <p>
            <strong>网站备案号：</strong>{' '}
            <a href={ICP_FILING_URL} target="_blank" rel="noopener noreferrer" className={linkClass}>
              {ICP_FILING_NUMBER}
            </a>
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-text-primary">知识产权</h2>
          <p>
            <LegalFact k="siteUrl" /> 上的软件、界面、文字和图形等内容受法律保护，未经许可，不得复制、传播或用于其他商业目的。生成内容的权利归属见
            <Link href={termsHref} className={linkClass}>《用户服务协议》</Link>。
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-text-primary">个人信息</h2>
          <p>
            我们按照<Link href={privacyHref} className={linkClass}>《隐私政策》</Link>处理个人信息。如需行使查阅、复制、更正、删除、撤回同意等权利，请联系
            <LegalContactEmail />。
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-text-primary">商标声明</h2>
          <p>页面中提到的第三方模型名称和商标，归其各自权利人所有。</p>
        </section>
      </article>
    </div>
  );
}
