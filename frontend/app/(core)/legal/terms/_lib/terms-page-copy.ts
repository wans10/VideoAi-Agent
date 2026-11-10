import type { AppLocale } from '@/i18n/locales';

export const METADATA_COPY: Record<AppLocale, { title: string; description: string; imageAlt: string }> = {
  en: {
    title: 'Terms of Service',
    description: 'Keyvo Terms of Service governing access to the platform and AI-assisted video generation tools.',
    imageAlt: 'Terms of Service document.',
  },
  fr: {
    title: "Conditions d’utilisation",
    description:
      'Conditions d’utilisation de Keyvo encadrant l’accès à la plateforme et aux outils de génération vidéo assistée par IA.',
    imageAlt: "Document des Conditions d’utilisation.",
  },
  es: {
    title: 'Términos del servicio',
    description:
      'Términos del servicio de Keyvo que regulan el acceso a la plataforma y a las herramientas de generación de vídeo asistida por IA.',
    imageAlt: 'Documento de Términos del servicio.',
  },
  zh: {
    title: '服务条款',
    description: 'Keyvo 服务条款，规范对平台及 AI 辅助视频生成工具的访问与使用。',
    imageAlt: '服务条款文档。',
  },
};

export const HEADER_COPY: Record<AppLocale, { title: string; versionLabel: string; effectiveLabel: string; companyLine: string; mentionsLabel: string; contactLabel: string }> = {
  en: {
    title: 'Terms of Service',
    versionLabel: 'Version',
    effectiveLabel: 'Effective date',
    companyLine: 'Company: Keyvo (sole proprietorship in formation) · Governing law: France (Paris courts)',
    mentionsLabel: 'Legal notice',
    contactLabel: 'Contact:',
  },
  fr: {
    title: "Conditions d’utilisation",
    versionLabel: 'Version',
    effectiveLabel: "Date d’entrée en vigueur",
    companyLine: "Société : Keyvo (entreprise individuelle en cours de constitution) · Droit applicable : France (tribunaux de Paris)",
    mentionsLabel: 'Mentions légales',
    contactLabel: 'Contact :',
  },
  es: {
    title: 'Términos del servicio',
    versionLabel: 'Versión',
    effectiveLabel: 'Fecha de entrada en vigor',
    companyLine: 'Empresa: Keyvo (empresa individual en constitución) · Ley aplicable: Francia (tribunales de París)',
    mentionsLabel: 'Aviso legal',
    contactLabel: 'Contacto:',
  },
  zh: {
    title: '服务条款',
    versionLabel: '版本',
    effectiveLabel: '生效日期',
    companyLine: '运营者信息见本页“运营者信息”一节',
    mentionsLabel: '运营者信息',
    contactLabel: '联系方式：',
  },
};
