import type { Metadata } from 'next';
import Link from 'next/link';
import { ObfuscatedEmailLink } from '@/components/marketing/ObfuscatedEmailLink';
import { resolveLocale } from '@/lib/i18n/server';
import type { AppLocale } from '@/i18n/locales';
import { localizePathFromEnglish } from '@/lib/i18n/paths';
import { buildSeoMetadata } from '@/lib/seo/metadata';

type MentionsCopy = {
  meta: {
    title: string;
    description: string;
    imageAlt: string;
  };
  heading: string;
  intro: string;
  publisher: {
    title: string;
    companyLabel: string;
    companyValue: string;
    addressLabel: string;
    addressValue: string;
    directorLabel: string;
    directorValue: string;
    contactLabel: string;
    registrationLabel: string;
    registrationValue: string;
    vatLabel: string;
    vatValue: string;
  };
  hosting: {
    title: string;
    providerLabel: string;
    providerValue: string;
    websiteLabel: string;
  };
  intellectualProperty: {
    title: string;
    body: string;
  };
  personalData: {
    title: string;
    prefix: string;
    privacyLinkLabel: string;
    middle: string;
    suffix: string;
  };
  credits: {
    title: string;
    body: string;
  };
};

const COPY: Record<AppLocale, MentionsCopy> = {
  en: {
    meta: {
      title: 'Legal Notice',
      description: 'Mandatory legal notice information for VideoAI.',
      imageAlt: 'Legal notice',
    },
    heading: 'Legal Notice',
    intro: 'In accordance with Article 6 of French Law No. 2004-575 of June 21, 2004 on confidence in the digital economy.',
    publisher: {
      title: 'Website publisher',
      companyLabel: 'Company name:',
      companyValue: 'MaxVideoAI (sole proprietorship currently being registered)',
      addressLabel: 'Address:',
      addressValue: "324 Rue De La Mare D'ovillers, 60730 Novillers, France",
      directorLabel: 'Publishing director:',
      directorValue: 'Adrien Millot',
      contactLabel: 'Contact:',
      registrationLabel: 'SIREN:',
      registrationValue: 'pending assignment',
      vatLabel: 'EU VAT number:',
      vatValue: 'pending assignment',
    },
    hosting: {
      title: 'Hosting',
      providerLabel: 'Hosting provider:',
      providerValue: 'Vercel Inc., 444 De Haro Street, Suite 200, San Francisco, CA 94107, United States',
      websiteLabel: 'Website:',
    },
    intellectualProperty: {
      title: 'Intellectual property',
      body:
        'All content (text, visuals, interface, and features) available on videoai.omninodetech.com is protected by copyright and, where applicable, industrial property rights. Any unauthorized reproduction or representation is prohibited.',
    },
    personalData: {
      title: 'Personal data',
      prefix: 'VideoAI collects and processes personal data in accordance with the',
      privacyLinkLabel: 'Privacy Policy',
      middle: '. To exercise your GDPR rights (access, correction, deletion, objection, portability), contact',
      suffix: '.',
    },
    credits: {
      title: 'Credits',
      body:
        'Illustrations and assets generated with VideoAI and its inference partners. Mentioned trademarks remain the property of their respective owners.',
    },
  },
  fr: {
    meta: {
      title: 'Mentions légales',
      description: 'Informations légales obligatoires pour VideoAI.',
      imageAlt: 'Mentions légales',
    },
    heading: 'Mentions légales',
    intro: 'Conformément à l’article 6 de la loi n°2004-575 du 21 juin 2004 pour la confiance dans l’économie numérique.',
    publisher: {
      title: 'Éditeur du site',
      companyLabel: 'Dénomination :',
      companyValue: 'MaxVideoAI (entreprise individuelle en cours d’immatriculation)',
      addressLabel: 'Adresse :',
      addressValue: "324 Rue De La Mare D'ovillers, 60730 Novillers, France",
      directorLabel: 'Responsable de la publication :',
      directorValue: 'Adrien Millot',
      contactLabel: 'Contact :',
      registrationLabel: 'SIREN :',
      registrationValue: 'en cours d’attribution',
      vatLabel: 'TVA intracommunautaire :',
      vatValue: 'en cours d’attribution',
    },
    hosting: {
      title: 'Hébergement',
      providerLabel: 'Hébergeur :',
      providerValue: 'Vercel Inc., 444 De Haro Street, Suite 200, San Francisco, CA 94107, États-Unis',
      websiteLabel: 'Site web :',
    },
    intellectualProperty: {
      title: 'Propriété intellectuelle',
      body:
        'L’ensemble des contenus (textes, visuels, interface, fonctionnalités) présentés sur videoai.omninodetech.com est protégé par le droit d’auteur et, le cas échéant, par des droits de propriété industrielle. Toute reproduction ou représentation non autorisée est interdite.',
    },
    personalData: {
      title: 'Données personnelles',
      prefix: 'VideoAI collecte et traite des données personnelles conformément à la',
      privacyLinkLabel: 'Politique de confidentialité',
      middle: '. Pour exercer vos droits RGPD (accès, rectification, suppression, opposition, portabilité), contactez',
      suffix: '.',
    },
    credits: {
      title: 'Crédits',
      body:
        'Illustrations et contenus générés via VideoAI et ses partenaires d’inférence. Les marques citées restent la propriété de leurs titulaires respectifs.',
    },
  },
  es: {
    meta: {
      title: 'Aviso legal',
      description: 'Información legal obligatoria de VideoAI.',
      imageAlt: 'Aviso legal',
    },
    heading: 'Aviso legal',
    intro:
      'De conformidad con el artículo 6 de la Ley francesa n.º 2004-575 de 21 de junio de 2004 para la confianza en la economía digital.',
    publisher: {
      title: 'Editor del sitio',
      companyLabel: 'Denominación:',
      companyValue: 'MaxVideoAI (empresa individual en proceso de registro)',
      addressLabel: 'Dirección:',
      addressValue: "324 Rue De La Mare D'ovillers, 60730 Novillers, France",
      directorLabel: 'Responsable de la publicación:',
      directorValue: 'Adrien Millot',
      contactLabel: 'Contacto:',
      registrationLabel: 'SIREN:',
      registrationValue: 'pendiente de asignación',
      vatLabel: 'IVA intracomunitario:',
      vatValue: 'pendiente de asignación',
    },
    hosting: {
      title: 'Alojamiento',
      providerLabel: 'Proveedor de alojamiento:',
      providerValue: 'Vercel Inc., 444 De Haro Street, Suite 200, San Francisco, CA 94107, Estados Unidos',
      websiteLabel: 'Sitio web:',
    },
    intellectualProperty: {
      title: 'Propiedad intelectual',
      body:
        'Todos los contenidos (textos, elementos visuales, interfaz y funcionalidades) publicados en videoai.omninodetech.com están protegidos por derechos de autor y, cuando corresponda, por derechos de propiedad industrial. Queda prohibida cualquier reproducción o representación no autorizada.',
    },
    personalData: {
      title: 'Datos personales',
      prefix: 'VideoAI recopila y trata datos personales conforme a la',
      privacyLinkLabel: 'Política de privacidad',
      middle:
        '. Para ejercer tus derechos RGPD (acceso, rectificación, supresión, oposición y portabilidad), contacta con',
      suffix: '.',
    },
    credits: {
      title: 'Créditos',
      body:
        'Ilustraciones y contenidos generados con VideoAI y sus socios de inferencia. Las marcas citadas siguen siendo propiedad de sus respectivos titulares.',
    },
  },
  zh: {
    meta: {
      title: '法律声明',
      description: 'VideoAI 法定法律声明信息。',
      imageAlt: '法律声明',
    },
    heading: '法律声明',
    intro: '根据法国 2004 年 6 月 21 日关于数字经济信心的第 2004-575 号法律第 6 条。',
    publisher: {
      title: '网站发布者',
      companyLabel: '公司名称：',
      companyValue: 'MaxVideoAI（设立中的个人独资企业）',
      addressLabel: '地址：',
      addressValue: "324 Rue De La Mare D'ovillers, 60730 Novillers, France",
      directorLabel: '出版负责人：',
      directorValue: 'Adrien Millot',
      contactLabel: '联系方式：',
      registrationLabel: 'SIREN：',
      registrationValue: '等待分配',
      vatLabel: '欧盟增值税号：',
      vatValue: '等待分配',
    },
    hosting: {
      title: '托管服务',
      providerLabel: '托管服务商：',
      providerValue: 'Vercel Inc., 444 De Haro Street, Suite 200, San Francisco, CA 94107, United States',
      websiteLabel: '官方网站：',
    },
    intellectualProperty: {
      title: '知识产权',
      body:
        'videoai.omninodetech.com 上提供的所有内容（文本、视觉图像、界面和功能）均受版权保护，并适当时受工业产权法保护。未经许可，严禁任何形式的复制或传播。',
    },
    personalData: {
      title: '个人数据',
      prefix: 'VideoAI 根据',
      privacyLinkLabel: '隐私政策',
      middle: ' 收集和处理个人数据。如需行使 GDPR 权利（访问、更正、删除、反对、数据迁移），请联系',
      suffix: '。',
    },
    credits: {
      title: '版权归属',
      body:
        '插图和素材均使用 VideoAI 及其推理合作伙伴生成。所提及的商标仍为其各自所有者的财产。',
    },
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await resolveLocale()) as AppLocale;
  const copy = COPY[locale] ?? COPY.en;
  return buildSeoMetadata({
    locale,
    title: copy.meta.title,
    description: copy.meta.description,
    hreflangGroup: 'legalMentions',
    englishPath: '/legal/mentions',
    availableLocales: ['en', 'fr', 'es', 'zh'] as AppLocale[],
    ogType: 'article',
    imageAlt: copy.meta.imageAlt,
  });
}

export default async function MentionsLegalesPage() {
  const locale = (await resolveLocale()) as AppLocale;
  const copy = COPY[locale] ?? COPY.en;
  const privacyHref = localizePathFromEnglish(locale, '/legal/privacy');

  return (
    <div className="stack-gap-lg">
      <header className="stack-gap-sm">
        <h1 className="text-xl font-semibold text-text-primary">{copy.heading}</h1>
        <p className="text-sm text-text-secondary">{copy.intro}</p>
      </header>

      <article className="stack-gap-lg text-base leading-relaxed text-text-secondary">
        <section className="space-y-2">
          <h3 className="text-lg font-semibold text-text-primary">{copy.publisher.title}</h3>
          <p>
            <strong>{copy.publisher.companyLabel}</strong> {copy.publisher.companyValue}
          </p>
          <p>
            <strong>{copy.publisher.addressLabel}</strong> {copy.publisher.addressValue}
          </p>
          <p>
            <strong>{copy.publisher.directorLabel}</strong> {copy.publisher.directorValue}
          </p>
          <p>
            <strong>{copy.publisher.contactLabel}</strong>{' '}
            <ObfuscatedEmailLink
              user="contact"
              domain="llmhub.com.cn"
              label="contact@llmhub.com.cn"
              placeholder="contact [at] llmhub.com.cn"
            />{' '}
            ·{' '}
            <ObfuscatedEmailLink
              user="contact"
              domain="llmhub.com.cn"
              label="contact@llmhub.com.cn"
              placeholder="contact [at] llmhub.com.cn"
            />
          </p>
          <p>
            <strong>{copy.publisher.registrationLabel}</strong> {copy.publisher.registrationValue} ·{' '}
            <strong>{copy.publisher.vatLabel}</strong> {copy.publisher.vatValue}
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-lg font-semibold text-text-primary">{copy.hosting.title}</h3>
          <p>
            <strong>{copy.hosting.providerLabel}</strong> {copy.hosting.providerValue}
          </p>
          <p>
            <strong>{copy.hosting.websiteLabel}</strong>{' '}
            <a href="https://vercel.com" className="text-brand underline hover:text-brandHover">
              Vercel hosting website
            </a>
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-lg font-semibold text-text-primary">{copy.intellectualProperty.title}</h3>
          <p>{copy.intellectualProperty.body}</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-lg font-semibold text-text-primary">{copy.personalData.title}</h3>
          <p>
            {copy.personalData.prefix}{' '}
            <Link href={privacyHref} className="text-brand underline hover:text-brandHover">
              {copy.personalData.privacyLinkLabel}
            </Link>
            {copy.personalData.middle}{' '}
            <ObfuscatedEmailLink
              user="contact"
              domain="llmhub.com.cn"
              label="contact@llmhub.com.cn"
              placeholder="contact [at] llmhub.com.cn"
            />
            {copy.personalData.suffix}
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-lg font-semibold text-text-primary">{copy.credits.title}</h3>
          <p>{copy.credits.body}</p>
        </section>
      </article>
    </div>
  );
}
