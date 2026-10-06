import type { Metadata } from 'next';
import Link from 'next/link';
import { resolveLocale } from '@/lib/i18n/server';
import type { AppLocale } from '@/i18n/locales';
import { localizePathFromEnglish } from '@/lib/i18n/paths';
import { ObfuscatedEmailLink } from '@/components/marketing/ObfuscatedEmailLink';
import { buildSeoMetadata } from '@/lib/seo/metadata';

const METADATA_COPY: Record<AppLocale, { title: string; description: string; imageAlt: string }> = {
  en: {
    title: 'Acceptable Use Policy',
    description: 'Rules that govern how Keyvo may be used, including restrictions on abusive or illegal content.',
    imageAlt: 'Acceptable Use Policy',
  },
  fr: {
    title: 'Politique d’utilisation acceptable',
    description: 'Règles encadrant l’usage de Keyvo, y compris les restrictions liées aux contenus abusifs ou illicites.',
    imageAlt: 'Politique d’utilisation acceptable',
  },
  es: {
    title: 'Política de uso aceptable',
    description: 'Reglas que rigen el uso de Keyvo, incluidas las restricciones sobre contenido abusivo o ilegal.',
    imageAlt: 'Política de uso aceptable',
  },
  zh: {
    title: '可接受使用政策',
    description: '规范 Keyvo 使用的规则，包括对滥用或非法内容的限制。',
    imageAlt: '可接受使用政策',
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await resolveLocale()) as AppLocale;
  const metadata = METADATA_COPY[locale] ?? METADATA_COPY.en;
  return buildSeoMetadata({
    locale,
    title: metadata.title,
    description: metadata.description,
    hreflangGroup: 'legalAcceptableUse',
    englishPath: '/legal/acceptable-use',
    availableLocales: ['en', 'fr', 'es', 'zh'] as AppLocale[],
    ogType: 'article',
    imageAlt: metadata.imageAlt,
  });
}

const HEADER_COPY: Record<AppLocale, { title: string; effective: string; companyLine: string; contactLabel: string }> = {
  en: {
    title: 'Acceptable Use Policy',
    effective: 'Effective date: 28 October 2025',
    companyLine: 'Service: Keyvo',
    contactLabel: 'Contact:',
  },
  fr: {
    title: "Politique d’utilisation acceptable",
    effective: "Date d’entrée en vigueur : 28 octobre 2025",
    companyLine: 'Service : Keyvo',
    contactLabel: 'Contact :',
  },
  es: {
    title: 'Política de uso aceptable',
    effective: 'Fecha de entrada en vigor: 28 de octubre de 2025',
    companyLine: 'Servicio: Keyvo',
    contactLabel: 'Contacto:',
  },
  zh: {
    title: '可接受使用政策',
    effective: '生效日期：2025年10月28日',
    companyLine: '服务：Keyvo',
    contactLabel: '联系方式：',
  },
};

type AupBodyProps = { locale: AppLocale; takedownHref: string };

function AupArticle({ locale, takedownHref }: AupBodyProps) {
  switch (locale) {
    case 'zh':
      return <AupArticleZh takedownHref={takedownHref} />;
    case 'fr':
      return <AupArticleFr takedownHref={takedownHref} />;
    case 'es':
      return <AupArticleEs takedownHref={takedownHref} />;
    default:
      return <AupArticleEn takedownHref={takedownHref} />;
  }
}

function AupArticleZh({ takedownHref }: { takedownHref: string }) {
  return (
    <article className="space-y-4 text-base leading-relaxed text-text-secondary">
      <p>本可接受使用政策（“AUP”）说明您可以如何使用 Keyvo 平台，适用于通过服务提交、生成或分发的所有提示词、上传素材和输出内容。如违反本政策，我们可能暂停或终止您的账户，并移除违规内容。</p>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-text-primary">禁止提交或分发以下内容</h2>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>任何违法内容，包括儿童性虐待材料或极端主义宣传。</li>
          <li>未经同意的私密影像、对未成年人的性化或剥削性描绘，以及旨在损害个人名誉或隐私的深度伪造内容。</li>
          <li>仇恨言论、骚扰、跟踪、泄露个人信息，或鼓励针对个人或群体的自残、自杀或暴力行为。</li>
          <li>侵犯知识产权或肖像等人格权益的内容，包括未经许可的标识和受版权保护的媒体。</li>
          <li>恶意软件、网络钓鱼内容，或试图未经授权访问系统或数据的内容。</li>
          <li>协助欺诈、诈骗、间谍软件、非法监控或其他犯罪活动的内容。</li>
        </ul>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-text-primary">尊重隐私与同意</h2>
        <p>不得冒充真实人物、滥用个人数据或未经许可发布私人信息。如果输出内容涉及他人，请在分享前取得其明确同意。</p>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-text-primary">平台保护措施</h2>
        <p>为保护服务、遵守法律或调查滥用行为，我们可能暂停提示词、任务或账户。在法律要求或存在迫近危害时，我们可能向执法机关提供相关信息。</p>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-text-primary">举报滥用</h2>
        <p>如果您认为通过 Keyvo 生成的内容违反本政策或侵犯您的权益，请通过 <Link href={takedownHref} className="text-link underline">通知与下架表单</Link> 或发送邮件至 <ObfuscatedEmailLink user="contact" domain="llmhub.com.cn" label="contact@llmhub.com.cn" placeholder="contact [at] llmhub.com.cn" /> 通知我们。我们会审查每份举报并及时采取行动。</p>
      </section>
    </article>
  );
}

export default async function AcceptableUsePage() {
  const locale = await resolveLocale();
  const header = HEADER_COPY[locale] ?? HEADER_COPY.en;
  const takedownHref = localizePathFromEnglish(locale, '/legal/takedown');
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

      <AupArticle locale={locale} takedownHref={takedownHref} />
    </div>
  );
}

function AupArticleEn({ takedownHref }: { takedownHref: string }) {
  return (
    <article className="space-y-4 text-base leading-relaxed text-text-secondary">
      <p>
        This Acceptable Use Policy (“AUP”) explains how you may use the Keyvo platform. It applies to all prompts, uploads, and outputs you generate or distribute through the Service. If you
        violate this AUP we may suspend or terminate your account and remove offending content.
      </p>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-text-primary">Never submit or distribute:</h2>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>Illegal content of any kind, including child sexual abuse material or extremist propaganda.</li>
          <li>Non-consensual intimate imagery, sexualised or exploitative depictions of minors, or deepfakes intended to harm a person’s reputation or privacy.</li>
          <li>Hate speech, harassment, stalking, doxxing, or encouragement of self-harm, suicide, or violence against individuals or groups.</li>
          <li>Content that infringes intellectual property or publicity rights, including unlicensed logos and copyrighted media.</li>
          <li>Malware, phishing content, or attempts to gain unauthorised access to systems or data.</li>
          <li>Content that facilitates fraud, scams, spyware, unlawful surveillance, or other criminal activity.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-text-primary">Respect privacy and consent</h2>
        <p>Do not impersonate real people, misuse personal data, or publish private information without permission. If your output depicts someone else, obtain their explicit consent before sharing it.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-text-primary">Platform safeguards</h2>
        <p>We may suspend prompts, jobs, or accounts to protect the service, comply with law, or investigate abuse. We may share relevant information with law enforcement when compelled or if harm is imminent.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-text-primary">Report abuse</h2>
        <p>
          If you believe content generated through Keyvo breaches this policy or your rights, notify us via the{' '}
          <Link href={takedownHref} className="text-brand underline hover:text-brandHover">
            Notice &amp; Takedown form
          </Link>{' '}
          or email{' '}
          <ObfuscatedEmailLink
            user="contact"
            domain="llmhub.com.cn"
            label="contact@llmhub.com.cn"
            placeholder="contact [at] llmhub.com.cn"
          />
          . We review reports promptly and take appropriate action.
        </p>
      </section>
    </article>
  );
}

function AupArticleFr({ takedownHref }: { takedownHref: string }) {
  return (
    <article className="space-y-4 text-base leading-relaxed text-text-secondary">
      <p>
        Cette Politique d’utilisation acceptable (« AUP ») précise comment vous pouvez utiliser la plateforme Keyvo. Elle s’applique à tous les prompts, fichiers importés et sorties générées ou
        partagées via le Service. En cas de violation, nous pouvons suspendre ou fermer votre compte et supprimer le contenu en cause.
      </p>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-text-primary">Ne soumettez ou ne diffusez jamais :</h2>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>Tout contenu illégal, y compris les abus sexuels sur mineurs ou la propagande extrémiste.</li>
          <li>Des images intimes non consenties, des représentations sexualisées/exploitantes de mineurs ou des deepfakes visant à nuire à la réputation ou à la vie privée d’une personne.</li>
          <li>Discours haineux, harcèlement, traque, doxxing ou incitation à l’automutilation, au suicide ou à la violence.</li>
          <li>Contenu qui porte atteinte aux droits d’auteur, aux marques ou au droit à l’image (logos sans licence, médias protégés, etc.).</li>
          <li>Malwares, tentatives de phishing ou accès non autorisé à des systèmes ou données.</li>
          <li>Contenu facilitant fraude, escroquerie, spyware, surveillance illégale ou toute activité criminelle.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-text-primary">Respect de la vie privée et du consentement</h2>
        <p>
          N’usurpez pas l’identité d’une personne réelle, n’exploitez pas de données personnelles et ne publiez pas d’informations privées sans autorisation. Si votre rendu représente quelqu’un, obtenez son consentement explicite avant de le partager.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-text-primary">Mesures de protection</h2>
        <p>
          Nous pouvons suspendre des prompts, jobs ou comptes pour protéger le Service, respecter la loi ou enquêter sur un abus. Nous pouvons coopérer avec les autorités en cas d’injonction ou de risque grave.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-text-primary">Signaler un abus</h2>
        <p>
          Si vous estimez qu’un contenu généré via Keyvo viole cette politique ou vos droits, signalez-le via le{' '}
          <Link href={takedownHref} className="text-brand underline hover:text-brandHover">
            formulaire Notification &amp; retrait
          </Link>{' '}
          ou écrivez à{' '}
          <ObfuscatedEmailLink
            user="contact"
            domain="llmhub.com.cn"
            label="contact@llmhub.com.cn"
            placeholder="contact [at] llmhub.com.cn"
          />
          . Nous examinons chaque signalement et agissons rapidement.
        </p>
      </section>
    </article>
  );
}

function AupArticleEs({ takedownHref }: { takedownHref: string }) {
  return (
    <article className="space-y-4 text-base leading-relaxed text-text-secondary">
      <p>
        Esta Política de Uso Aceptable («PUA») explica cómo puedes utilizar la plataforma Keyvo. Aplica a todos los prompts, cargas y salidas que generes o compartas mediante el Servicio. Si infringes
        esta política podremos suspender o cancelar tu cuenta y eliminar el contenido infractor.
      </p>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-text-primary">Nunca envíes ni distribuyas:</h2>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>Contenido ilegal de cualquier tipo, incluido material de abuso infantil o propaganda extremista.</li>
          <li>Imágenes íntimas sin consentimiento, representaciones sexualizadas/explotadoras de menores o deepfakes diseñados para dañar la reputación o privacidad de alguien.</li>
          <li>Discurso de odio, acoso, stalking, doxxing o incitación a la autolesión, al suicidio o a la violencia.</li>
          <li>Material que infrinja derechos de autor, marcas o derecho de imagen (logos sin licencia, obras protegidas, etc.).</li>
          <li>Malware, phishing o intentos de acceder sin permiso a sistemas o datos.</li>
          <li>Contenido que facilite fraudes, estafas, spyware, vigilancia ilegal u otras actividades delictivas.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-text-primary">Respeta la privacidad y el consentimiento</h2>
        <p>
          No suplantes a personas reales ni uses datos personales o información privada sin autorización. Si tu salida retrata a alguien, consigue su consentimiento explícito antes de publicarla.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-text-primary">Protecciones de la plataforma</h2>
        <p>
          Podemos suspender prompts, trabajos o cuentas para proteger el servicio, cumplir la ley o investigar abusos. Compartiremos información relevante con las autoridades si nos obligan o si existe un riesgo grave.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-text-primary">Reporta abusos</h2>
        <p>
          Si crees que un contenido generado con Keyvo vulnera esta política o tus derechos, notifícanos mediante el{' '}
          <Link href={takedownHref} className="text-brand underline hover:text-brandHover">
            formulario de Notificación y retirada
          </Link>{' '}
          o escribe a{' '}
          <ObfuscatedEmailLink
            user="contact"
            domain="llmhub.com.cn"
            label="contact@llmhub.com.cn"
            placeholder="contact [at] llmhub.com.cn"
          />
          . Revisamos cada informe y actuamos con rapidez.
        </p>
      </section>
    </article>
  );
}
