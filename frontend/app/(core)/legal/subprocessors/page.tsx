import type { Metadata } from 'next';
import { ObfuscatedEmailLink } from '@/components/marketing/ObfuscatedEmailLink';
import { resolveLocale } from '@/lib/i18n/server';
import type { AppLocale } from '@/i18n/locales';
import { buildSeoMetadata } from '@/lib/seo/metadata';

type Subprocessor = {
  provider: string;
  service: string;
  location: string;
  data: string;
  notes?: string;
};

const METADATA_COPY: Record<AppLocale, { title: string; description: string; imageAlt: string }> = {
  en: {
    title: 'Sub-processors',
    description: 'Third-party providers used by Keyvo to deliver the Service.',
    imageAlt: 'Sub-processors list',
  },
  fr: {
    title: 'Sous-traitants ultérieurs',
    description: 'Prestataires tiers utilisés par Keyvo pour fournir le Service.',
    imageAlt: 'Liste des sous-traitants ultérieurs',
  },
  es: {
    title: 'Subencargados del tratamiento',
    description: 'Proveedores externos utilizados por Keyvo para prestar el Servicio.',
    imageAlt: 'Lista de subencargados del tratamiento',
  },
  zh: {
    title: '子处理者',
    description: 'Keyvo 用于提供服务的第三方服务商。',
    imageAlt: '子处理者列表',
  },
};

const PAGE_COPY: Record<
  AppLocale,
  {
    title: string;
    intro: string;
    lastUpdated: string;
    columns: { provider: string; service: string; location: string; data: string };
    contactIntro: string;
  }
> = {
  en: {
    title: 'Sub-processors',
    intro: 'We engage the following third parties to help deliver the Service. We maintain appropriate data-processing agreements and conduct regular reviews.',
    lastUpdated: 'Last updated: 26 October 2025',
    columns: {
      provider: 'Provider',
      service: 'Service',
      location: 'Primary location',
      data: 'Data processed',
    },
    contactIntro: 'Need more information or a signed copy of our Data Processing Agreement? Contact',
  },
  fr: {
    title: 'Sous-traitants ultérieurs',
    intro: 'Nous faisons appel aux prestataires tiers suivants pour fournir le Service. Nous maintenons des accords de traitement des données appropriés et procédons à des revues régulières.',
    lastUpdated: 'Dernière mise à jour : 26 octobre 2025',
    columns: {
      provider: 'Prestataire',
      service: 'Service',
      location: 'Localisation principale',
      data: 'Données traitées',
    },
    contactIntro: 'Besoin de plus d’informations ou d’une copie signée de notre accord de traitement des données ? Contactez',
  },
  es: {
    title: 'Subencargados del tratamiento',
    intro: 'Recurrimos a los siguientes proveedores externos para prestar el Servicio. Mantenemos acuerdos adecuados de tratamiento de datos y realizamos revisiones periódicas.',
    lastUpdated: 'Última actualización: 26 de octubre de 2025',
    columns: {
      provider: 'Proveedor',
      service: 'Servicio',
      location: 'Ubicación principal',
      data: 'Datos tratados',
    },
    contactIntro: '¿Necesitas más información o una copia firmada de nuestro acuerdo de tratamiento de datos? Contacta con',
  },
  zh: {
    title: '数据子处理者',
    intro: '我们聘用以下第三方协助提供服务。我们维持适当的数据处理协议并进行定期审查。',
    lastUpdated: '最后更新：2025年10月26日',
    columns: {
      provider: '提供商',
      service: '服务内容',
      location: '主要处理地',
      data: '处理的数据',
    },
    contactIntro: '需要更多信息或索取已签署的数据处理协议副本？请联系',
  },
};

const SUBPROCESSORS: Record<AppLocale, Subprocessor[]> = {
  en: [
    {
      provider: 'Stripe Payments Europe, Ltd.',
      service: 'Payment processing, fraud screening',
      location: 'EU (Ireland) / Global',
      data: 'Billing metadata, partial card details (tokenised), wallet transactions',
    },
    {
      provider: 'Neon (Neon, Inc.)',
      service: 'Primary application database',
      location: 'EU (Frankfurt)',
      data: 'Workspace data, receipts, consent ledger, job metadata',
    },
    {
      provider: 'Supabase',
      service: 'Authentication and user session management',
      location: 'EU (Paris)',
      data: 'Account credentials, email, auth logs',
    },
    {
      provider: 'Vercel Inc.',
      service: 'Hosting, CDN, serverless platform',
      location: 'Global (USA/EU edges)',
      data: 'Application content, logs, IP addresses (edge routing)',
    },
    {
      provider: 'Amazon Web Services (AWS S3)',
      service: 'Object storage for uploads and exports',
      location: 'EU (Paris) / EU (Frankfurt)',
      data: 'User-uploaded assets, DSAR exports, generated media',
    },
    {
      provider: 'Fal.ai',
      service: 'AI video inference APIs',
      location: 'USA / EU regions',
      data: 'Prompts, reference assets, inference outputs, job identifiers',
    },
    {
      provider: 'Resend, Inc.',
      service: 'Transactional email delivery',
      location: 'USA / EU',
      data: 'Email addresses, template variables, delivery metadata',
    },
  ],
  fr: [
    {
      provider: 'Stripe Payments Europe, Ltd.',
      service: 'Traitement des paiements, détection de fraude',
      location: 'UE (Irlande) / Monde',
      data: 'Métadonnées de facturation, détails partiels de carte (tokenisés), transactions de portefeuille',
    },
    {
      provider: 'Neon (Neon, Inc.)',
      service: 'Base de données principale de l’application',
      location: 'UE (Francfort)',
      data: 'Données d’espace de travail, reçus, registre des consentements, métadonnées des jobs',
    },
    {
      provider: 'Supabase',
      service: 'Authentification et gestion des sessions utilisateur',
      location: 'UE (Paris)',
      data: 'Identifiants de compte, e-mail, journaux d’authentification',
    },
    {
      provider: 'Vercel Inc.',
      service: 'Hébergement, CDN, plateforme serverless',
      location: 'Monde (points de présence USA/UE)',
      data: 'Contenu de l’application, journaux, adresses IP (routage edge)',
    },
    {
      provider: 'Amazon Web Services (AWS S3)',
      service: 'Stockage objet pour les imports et exports',
      location: 'UE (Paris) / UE (Francfort)',
      data: 'Fichiers importés par les utilisateurs, exports DSAR, médias générés',
    },
    {
      provider: 'Fal.ai',
      service: 'API d’inférence vidéo IA',
      location: 'USA / régions UE',
      data: 'Prompts, assets de référence, sorties d’inférence, identifiants de jobs',
    },
    {
      provider: 'Resend, Inc.',
      service: 'Envoi d’e-mails transactionnels',
      location: 'USA / UE',
      data: 'Adresses e-mail, variables de template, métadonnées de délivrabilité',
    },
  ],
  es: [
    {
      provider: 'Stripe Payments Europe, Ltd.',
      service: 'Procesamiento de pagos, prevención de fraude',
      location: 'UE (Irlanda) / Global',
      data: 'Metadatos de facturación, datos parciales de tarjeta (tokenizados), transacciones de wallet',
    },
    {
      provider: 'Neon (Neon, Inc.)',
      service: 'Base de datos principal de la aplicación',
      location: 'UE (Fráncfort)',
      data: 'Datos del espacio de trabajo, recibos, registro de consentimientos, metadatos de trabajos',
    },
    {
      provider: 'Supabase',
      service: 'Autenticación y gestión de sesiones de usuario',
      location: 'UE (París)',
      data: 'Credenciales de cuenta, correo electrónico, logs de autenticación',
    },
    {
      provider: 'Vercel Inc.',
      service: 'Hosting, CDN y plataforma serverless',
      location: 'Global (nodos USA/UE)',
      data: 'Contenido de la aplicación, logs, direcciones IP (enrutamiento edge)',
    },
    {
      provider: 'Amazon Web Services (AWS S3)',
      service: 'Almacenamiento de objetos para cargas y exportaciones',
      location: 'UE (París) / UE (Fráncfort)',
      data: 'Archivos cargados por usuarios, exportaciones DSAR, medios generados',
    },
    {
      provider: 'Fal.ai',
      service: 'APIs de inferencia de video con IA',
      location: 'EE. UU. / regiones de la UE',
      data: 'Prompts, assets de referencia, resultados de inferencia, identificadores de trabajos',
    },
    {
      provider: 'Resend, Inc.',
      service: 'Envío de correos transaccionales',
      location: 'EE. UU. / UE',
      data: 'Direcciones de correo, variables de plantilla, metadatos de entrega',
    },
  ],
  zh: [
    {
      provider: 'Stripe Payments Europe, Ltd.',
      service: '支付处理、反欺诈审查',
      location: '欧盟（爱尔兰）/ 全球',
      data: '账单元数据、部分卡信息（Token化）、钱包交易记录',
    },
    {
      provider: 'Neon (Neon, Inc.)',
      service: '主应用数据库',
      location: '欧盟（法兰克福）',
      data: '工作区数据、收据、同意日志、任务元数据',
    },
    {
      provider: 'Supabase',
      service: '身份验证与用户会话管理',
      location: '欧盟（巴黎）',
      data: '账户凭证、邮箱、身份验证日志',
    },
    {
      provider: 'Vercel Inc.',
      service: '托管、CDN、Serverless 平台',
      location: '全球（美国/欧盟边缘节点）',
      data: '应用程序内容、日志、IP 地址（边缘路由）',
    },
    {
      provider: 'Amazon Web Services (AWS S3)',
      service: '上传与导出对象存储',
      location: '欧盟（巴黎）/ 欧盟（法兰克福）',
      data: '用户上传的素材、DSAR 导出、生成的媒体',
    },
    {
      provider: 'Fal.ai',
      service: 'AI 视频推理 API',
      location: '美国 / 欧盟地区',
      data: '提示词、参考素材、推理输出、任务标识符',
    },
    {
      provider: 'Resend, Inc.',
      service: '事务性邮件发送',
      location: '美国 / 欧盟',
      data: '邮箱地址、模板变量、投递元数据',
    },
  ],
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await resolveLocale()) as AppLocale;
  const metadata = METADATA_COPY[locale] ?? METADATA_COPY.en;
  return buildSeoMetadata({
    locale,
    title: metadata.title,
    description: metadata.description,
    hreflangGroup: 'legalSubprocessors',
    englishPath: '/legal/subprocessors',
    availableLocales: ['en', 'fr', 'es', 'zh'] as AppLocale[],
    ogType: 'article',
    imageAlt: metadata.imageAlt,
  });
}

export default async function SubprocessorsPage() {
  const locale = (await resolveLocale()) as AppLocale;
  const copy = PAGE_COPY[locale] ?? PAGE_COPY.en;
  const rows = SUBPROCESSORS[locale] ?? SUBPROCESSORS.en;

  return (
    <div className="stack-gap-lg">
      <header className="stack-gap-sm">
        <h1 className="text-xl font-semibold text-text-primary">{copy.title}</h1>
        <p className="text-sm text-text-secondary">{copy.intro}</p>
        <p className="text-sm text-text-secondary">{copy.lastUpdated}</p>
      </header>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-bg-secondary text-left text-xs font-semibold uppercase tracking-wide text-text-secondary">
            <tr>
              <th scope="col" className="px-4 py-3">{copy.columns.provider}</th>
              <th scope="col" className="px-4 py-3">{copy.columns.service}</th>
              <th scope="col" className="px-4 py-3">{copy.columns.location}</th>
              <th scope="col" className="px-4 py-3">{copy.columns.data}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-surface">
            {rows.map((entry) => (
              <tr key={entry.provider}>
                <td className="px-4 py-4 font-medium text-text-primary">{entry.provider}</td>
                <td className="px-4 py-4 text-text-secondary">{entry.service}</td>
                <td className="px-4 py-4 text-text-secondary">{entry.location}</td>
                <td className="px-4 py-4 text-text-secondary">
                  {entry.data}
                  {entry.notes ? <span className="block text-xs text-text-muted">{entry.notes}</span> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-text-secondary">
        {copy.contactIntro}{' '}
        <ObfuscatedEmailLink
          user="contact"
          domain="llmhub.com.cn"
          label="contact@llmhub.com.cn"
          placeholder="contact [at] llmhub.com.cn"
        />
        .
      </p>
    </div>
  );
}
