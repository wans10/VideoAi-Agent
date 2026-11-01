import type { Metadata } from 'next';
import { TakedownForm, type TakedownFormCopy } from './TakedownForm';
import { resolveLocale } from '@/lib/i18n/server';
import type { AppLocale } from '@/i18n/locales';
import { ObfuscatedEmailLink } from '@/components/marketing/ObfuscatedEmailLink';
import { buildSeoMetadata } from '@/lib/seo/metadata';
import { LegalContactEmail, LegalFact } from '@/components/legal/LegalFact';
import { legalText } from '@/lib/legal-entity';

const METADATA_COPY: Record<AppLocale, { title: string; description: string; imageAlt: string }> = {
  en: {
    title: 'Notice & Takedown',
    description: 'Report abusive or unlawful content generated through Keyvo.',
    imageAlt: 'Notice and takedown policy',
  },
  fr: {
    title: 'Notification & retrait',
    description: 'Signaler un contenu abusif ou illicite généré via Keyvo.',
    imageAlt: 'Politique de notification et retrait',
  },
  es: {
    title: 'Notificación y retirada',
    description: 'Reporta contenido abusivo o ilegal generado a través de Keyvo.',
    imageAlt: 'Política de notificación y retirada',
  },
  zh: {
    title: '通知与下架',
    description: '举报通过 Keyvo 生成的滥用或非法内容。',
    imageAlt: '通知与下架政策',
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await resolveLocale()) as AppLocale;
  const metadata = METADATA_COPY[locale] ?? METADATA_COPY.en;
  return buildSeoMetadata({
    locale,
    title: metadata.title,
    description: metadata.description,
    hreflangGroup: 'legalTakedown',
    englishPath: '/legal/takedown',
    availableLocales: ['en', 'fr', 'es', 'zh'] as AppLocale[],
    ogType: 'article',
    imageAlt: metadata.imageAlt,
  });
}

const HEADER_COPY: Record<AppLocale, { title: string; effective: string; companyLine: string; contactLabel: string }> = {
  en: {
    title: 'Notice & Takedown',
    effective: 'Effective date: 28 October 2025',
    companyLine: 'Service: Keyvo',
    contactLabel: 'Contact:',
  },
  fr: {
    title: 'Notification & retrait',
    effective: "Date d’entrée en vigueur : 28 octobre 2025",
    companyLine: 'Service : Keyvo',
    contactLabel: 'Contact :',
  },
  es: {
    title: 'Notificación y retirada',
    effective: 'Fecha de entrada en vigor: 28 de octubre de 2025',
    companyLine: 'Servicio: Keyvo',
    contactLabel: 'Contacto:',
  },
  zh: {
    title: '通知与下架',
    effective: `生效日期：${legalText('effectiveDate')}`,
    companyLine: '服务：Keyvo',
    contactLabel: '联系方式：',
  },
};

const FORM_COPY: Record<AppLocale, TakedownFormCopy> = {
  en: {
    emailLabel: 'Contact email',
    urlLabel: 'URL of the content',
    urlPlaceholder: 'https://app.keyvo.cn/video/...',
    reasonLabel: 'Reason',
    reasons: {
      copyright: 'Copyright / IP infringement',
      privacy: 'Privacy / Personal data',
      defamation: 'Defamation',
      trademark: 'Trademark violation',
      other: 'Other unlawful content',
    },
    detailsLabel: 'Details',
    detailsPlaceholder: 'Describe the issue and why it breaches your rights or the law.',
    detailsHint: 'Provide enough information for us to locate and assess the content.',
    attachmentLabel: 'Supporting file (optional, max 2 MB)',
    attachmentError: 'Attachments must be smaller than 2 MB.',
    errors: { submit: 'Unable to submit report.' },
    success: 'Thank you. We have received your report and will follow up shortly.',
    submitLabel: 'Submit report',
    submittingLabel: 'Sending…',
  },
  fr: {
    emailLabel: 'E-mail de contact',
    urlLabel: 'URL du contenu',
    urlPlaceholder: 'https://app.keyvo.cn/video/...',
    reasonLabel: 'Motif',
    reasons: {
      copyright: 'Atteinte aux droits d’auteur / IP',
      privacy: 'Vie privée / Données personnelles',
      defamation: 'Diffamation',
      trademark: 'Violation de marque',
      other: 'Autre contenu illégal',
    },
    detailsLabel: 'Détails',
    detailsPlaceholder: 'Décrivez le problème et pourquoi il viole vos droits ou la loi.',
    detailsHint: 'Précisez suffisamment d’informations pour localiser et évaluer le contenu.',
    attachmentLabel: 'Pièce jointe (optionnelle, 2 Mo max)',
    attachmentError: 'Les pièces jointes doivent faire moins de 2 Mo.',
    errors: { submit: 'Impossible d’envoyer le signalement.' },
    success: 'Merci. Nous avons bien reçu votre signalement et vous répondrons rapidement.',
    submitLabel: 'Envoyer le signalement',
    submittingLabel: 'Envoi…',
  },
  es: {
    emailLabel: 'Correo de contacto',
    urlLabel: 'URL del contenido',
    urlPlaceholder: 'https://app.keyvo.cn/video/...',
    reasonLabel: 'Motivo',
    reasons: {
      copyright: 'Infracción de copyright / PI',
      privacy: 'Privacidad / Datos personales',
      defamation: 'Difamación',
      trademark: 'Violación de marca',
      other: 'Otro contenido ilegal',
    },
    detailsLabel: 'Detalles',
    detailsPlaceholder: 'Describe el problema y por qué infringe tus derechos o la ley.',
    detailsHint: 'Incluye suficiente información para localizar y evaluar el contenido.',
    attachmentLabel: 'Archivo de soporte (opcional, máx. 2 MB)',
    attachmentError: 'El archivo adjunto debe ser menor a 2 MB.',
    errors: { submit: 'No se pudo enviar el reporte.' },
    success: 'Gracias. Hemos recibido tu reporte y te contactaremos en breve.',
    submitLabel: 'Enviar reporte',
    submittingLabel: 'Enviando…',
  },
  zh: {
    emailLabel: '联系邮箱',
    urlLabel: '内容 URL',
    urlPlaceholder: 'https://app.keyvo.cn/video/...',
    reasonLabel: '原因',
    reasons: {
      copyright: '版权 / 知识产权侵权',
      privacy: '隐私 / 个人数据',
      defamation: '诽谤中伤',
      trademark: '商标侵权',
      other: '其他非法内容',
    },
    detailsLabel: '详细说明',
    detailsPlaceholder: '请说明问题以及该内容为何侵犯了您的权利或违反了法律。',
    detailsHint: '请提供足够的信息以便我们定位和评估该内容。',
    attachmentLabel: '证明材料（可选，最大 2 MB）',
    attachmentError: '附件大小不能超过 2 MB。',
    errors: { submit: '无法提交举报。' },
    success: '感谢您。我们已收到您的举报，并将尽快跟进处理。',
    submitLabel: '提交举报',
    submittingLabel: '提交中…',
  },
};

function TakedownArticle({ locale }: { locale: AppLocale }) {
  switch (locale) {
    case 'zh':
      return (
        <article className="space-y-4 text-base leading-relaxed text-text-secondary">
          <p>
            您认为通过 <LegalFact k="productName" /> 生成或展示的内容侵犯了您的著作权、商标权、肖像权、名誉权、隐私和个人信息权益等合法权益，或发现违法违规内容的，可以使用下方表单，或发送邮件至{' '}
            <LegalContactEmail />，向我们投诉举报。
          </p>
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-text-primary">请提供以下材料</h2>
            <ul className="ml-5 list-disc space-y-1.5">
              <li>权利人的姓名或名称、身份证明和联系方式；</li>
              <li>权属证明，或证明您对该内容享有权益的材料；</li>
              <li>被投诉内容所在的网址，以及能定位该内容的描述；</li>
              <li>认为构成侵权或违法的理由和初步证据；</li>
              <li>您对通知内容真实性的声明。通知不实造成他人损失的，您可能需要承担相应的法律责任。</li>
            </ul>
          </section>
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-text-primary">我们如何处理</h2>
            <ol className="space-y-2">
              <li>1. 我们收到后会确认并审核材料，必要时请您补充。</li>
              <li>2. 通知符合要求的，我们会依法及时采取删除、屏蔽、限制账号等必要措施，并把通知转送给发布该内容的用户。</li>
              <li>3. 该用户认为不构成侵权的，可以提交说明和证明材料，我们会转告权利人，并按法律规定继续处理。权利人在法定期限内未采取进一步措施的，我们可以依法恢复相关内容。</li>
              <li>4. 具体程序依照《中华人民共和国民法典》及相关法律法规中关于网络侵权通知与反通知的规定（以现行有效为准）。</li>
            </ol>
          </section>
          <p>
            紧急情况（涉及人身安全或有权机关的要求），请发送邮件至 <LegalContactEmail /> 并在主题中注明“紧急”。您也可以向有关主管部门举报违法违规内容。
          </p>
        </article>
      );
    case 'fr':
      return (
        <article className="space-y-4 text-base leading-relaxed text-text-secondary">
          <p>
            Si un contenu généré via Keyvo porte atteinte à vos droits ou enfreint la loi, utilisez ce formulaire pour demander un examen. Nous accusons réception, enquêtons rapidement et prenons
            les mesures appropriées (suppression ou suspension de compte si nécessaire).
          </p>
          <p>
            Pour les urgences (sécurité personnelle ou demandes officielles), écrivez à{' '}
            <ObfuscatedEmailLink
              user="contact"
              domain="llmhub.com.cn"
              label="contact@llmhub.com.cn"
              placeholder="contact [at] llmhub.com.cn"
            />{' '}
            avec « URGENT » dans l’objet.
          </p>
        </article>
      );
    case 'es':
      return (
        <article className="space-y-4 text-base leading-relaxed text-text-secondary">
          <p>
            Si un contenido generado con Keyvo vulnera tus derechos o la ley, utiliza este formulario para solicitar una revisión. Confirmaremos la recepción, investigaremos con rapidez y actuaremos
            en consecuencia (incluida la retirada del contenido o la suspensión de cuentas cuando proceda).
          </p>
          <p>
            Para casos urgentes (seguridad personal o solicitudes policiales), escribe a{' '}
            <ObfuscatedEmailLink
              user="contact"
              domain="llmhub.com.cn"
              label="contact@llmhub.com.cn"
              placeholder="contact [at] llmhub.com.cn"
            />{' '}
            con “URGENT” en el asunto.
          </p>
        </article>
      );
    default:
      return (
        <article className="space-y-4 text-base leading-relaxed text-text-secondary">
          <p>
            If content generated through Keyvo infringes your rights or violates the law, use this form to request a review. We will acknowledge receipt, investigate promptly, and take appropriate
            action (including removal or account suspension when justified).
          </p>
          <p>
            For urgent reports (personal safety or law-enforcement matters), email{' '}
            <ObfuscatedEmailLink
              user="contact"
              domain="llmhub.com.cn"
              label="contact@llmhub.com.cn"
              placeholder="contact [at] llmhub.com.cn"
            />{' '}
            with “URGENT” in the subject line.
          </p>
        </article>
      );
  }
}

export default async function TakedownPage() {
  const locale = await resolveLocale();
  const header = HEADER_COPY[locale] ?? HEADER_COPY.en;
  const formCopy = FORM_COPY[locale] ?? FORM_COPY.en;

  return (
    <div className="stack-gap-lg">
      <header className="stack-gap-sm">
        <h1 className="text-xl font-semibold text-text-primary">{header.title}</h1>
        <p className="text-sm text-text-secondary">{header.effective}</p>
        <p className="text-sm text-text-secondary">{header.companyLine}</p>
        <p className="text-sm text-text-secondary">
          {header.contactLabel}{' '}
          <ObfuscatedEmailLink
            user="contact"
            domain="llmhub.com.cn"
            label="contact@llmhub.com.cn"
            placeholder="contact [at] llmhub.com.cn"
          />
        </p>
      </header>

      <TakedownArticle locale={locale} />

      <TakedownForm copy={formCopy} />
    </div>
  );
}
