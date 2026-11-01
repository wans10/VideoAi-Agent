import type { Metadata } from 'next';
import { ObfuscatedEmailLink } from '@/components/marketing/ObfuscatedEmailLink';
import { resolveLocale } from '@/lib/i18n/server';
import type { AppLocale } from '@/i18n/locales';
import { buildSeoMetadata } from '@/lib/seo/metadata';
import { legalText } from '@/lib/legal-entity';

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
    note?: string;
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
    title: '子处理方清单',
    intro: '为提供服务，我们委托下列第三方处理部分个人信息，各自的作用和涉及的信息如下。',
    note: `${legalText('dataStorageStatement')}。`,
    lastUpdated: `最后更新：${legalText('effectiveDate')}`,
    columns: {
      provider: '第三方',
      service: '作用',
      location: '',
      data: '涉及的信息',
    },
    contactIntro: '如需了解更多，请联系',
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
    { provider: '聚合易支付（LLM Hub Pay）', service: '支付与充值', location: '', data: '订单号、金额、币种、支付结果与回调信息' },
    {
      provider: 'LLM Hub 接口（api.llmhub.com.cn）',
      service: '模型接口聚合，转发图像、视频生成请求',
      location: '',
      data: '提示词、参考素材、任务标识、生成结果',
      notes: '该接口会把请求转发给其下游的模型提供方。',
    },
    { provider: '阿里云 Model Studio（百炼）', service: '图像与视频生成', location: '', data: '提示词、参考素材、生成结果' },
    { provider: '火山引擎方舟', service: '图像与视频生成', location: '', data: '提示词、参考素材、生成结果' },
    { provider: 'Supabase', service: '账号认证与会话管理', location: '', data: '邮箱、认证凭证、会话与认证日志' },
    { provider: '对象存储与内容分发服务', service: '保存上传素材与生成结果', location: '', data: '您上传的素材、生成结果' },
    { provider: '数据库服务', service: '保存账号、订单、任务数据', location: '', data: '账号、订单、钱包流水、任务元数据' },
    { provider: '服务器与托管服务', service: '运行应用并记录访问日志', location: '', data: '访问日志（含 IP 地址）、应用运行数据' },
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
        {copy.note ? <p className="text-sm text-text-secondary">{copy.note}</p> : null}
      </header>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-bg-secondary text-left text-xs font-semibold uppercase tracking-wide text-text-secondary">
            <tr>
              <th scope="col" className="px-4 py-3">{copy.columns.provider}</th>
              <th scope="col" className="px-4 py-3">{copy.columns.service}</th>
              {copy.columns.location ? <th scope="col" className="px-4 py-3">{copy.columns.location}</th> : null}
              <th scope="col" className="px-4 py-3">{copy.columns.data}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-surface">
            {rows.map((entry) => (
              <tr key={entry.provider}>
                <td className="px-4 py-4 font-medium text-text-primary">{entry.provider}</td>
                <td className="px-4 py-4 text-text-secondary">{entry.service}</td>
                {copy.columns.location ? <td className="px-4 py-4 text-text-secondary">{entry.location}</td> : null}
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
