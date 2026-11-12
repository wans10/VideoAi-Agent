import type { AppLocale } from '@/i18n/locales';

export const METADATA_COPY = {
  "en": {
    "title": "Service providers",
    "description": "Services that process data to operate Keyvo.",
    "imageAlt": "Keyvo service providers"
  },
  "fr": {
    "title": "Prestataires",
    "description": "Services qui traitent des données pour le fonctionnement de Keyvo.",
    "imageAlt": "Prestataires Keyvo"
  },
  "es": {
    "title": "Proveedores",
    "description": "Servicios que tratan datos para el funcionamiento de Keyvo.",
    "imageAlt": "Proveedores de Keyvo"
  },
  "zh": {
    "title": "子处理方清单",
    "description": "Keyvo 为提供服务而委托的第三方服务商。",
    "imageAlt": "Keyvo 子处理方清单"
  }
} satisfies Record<AppLocale, { title: string; description: string; imageAlt: string }>;

export const PAGE_COPY = {
  "en": {
    "title": "Service providers",
    "intro": "The services below receive data needed for the features you use. AI providers depend on the selected model and route, including any fallback; they do not all receive every request.",
    "lastUpdated": "Information updated: 19 October 2026",
    "columns": {
      "provider": "Provider",
      "service": "Purpose",
      "data": "Data concerned"
    },
    "locationNote": "Processing may take place outside the EEA, including in the United States for our AWS S3 storage. For information about transfers and applicable safeguards, contact"
  },
  "fr": {
    "title": "Prestataires",
    "intro": "Les services ci-dessous reçoivent les données nécessaires aux fonctionnalités utilisées. Les fournisseurs IA dépendent du modèle et du parcours, y compris un éventuel secours ; tous ne reçoivent pas chaque demande.",
    "lastUpdated": "Informations mises à jour : 19 octobre 2026",
    "columns": {
      "provider": "Prestataire",
      "service": "Finalité",
      "data": "Données concernées"
    },
    "locationNote": "Des traitements peuvent avoir lieu hors de l’EEE, notamment aux États-Unis pour notre stockage AWS S3. Pour connaître les transferts et garanties applicables, contactez"
  },
  "es": {
    "title": "Proveedores",
    "intro": "Los servicios siguientes reciben los datos necesarios para las funciones utilizadas. Los proveedores de IA dependen del modelo y de la ruta, incluido un posible servicio de respaldo; no todos reciben cada solicitud.",
    "lastUpdated": "Información actualizada: 19 de octubre de 2026",
    "columns": {
      "provider": "Proveedor",
      "service": "Finalidad",
      "data": "Datos tratados"
    },
    "locationNote": "Puede haber tratamientos fuera del EEE, incluido Estados Unidos para nuestro almacenamiento AWS S3. Para conocer las transferencias y garantías aplicables, contacta con"
  },
  "zh": {
    "title": "子处理方清单",
    "intro": "为提供服务，我们委托下列第三方处理部分个人信息。AI 服务商取决于所选模型和路由（含备用路由），并非每次请求都会发送给所有服务商。",
    "lastUpdated": "信息更新时间：2026 年 10 月 19 日",
    "columns": {
      "provider": "第三方",
      "service": "作用",
      "data": "涉及的信息"
    },
    "locationNote": "部分处理可能发生在境外。如需了解数据传输及适用的保障措施，请联系"
  }
};

export const SUBPROCESSORS = {
  "en": [
    {
      "provider": "Stripe",
      "service": "Payments and fraud prevention",
      "data": "Billing details, payment identifiers and transactions."
    },
    {
      "provider": "Neon",
      "service": "Application database",
      "data": "Account, project, conversation, quote, job, payment and consent records."
    },
    {
      "provider": "Supabase",
      "service": "Authentication",
      "data": "Email, credentials, sessions and authentication logs."
    },
    {
      "provider": "Vercel",
      "service": "Hosting, delivery and performance",
      "data": "Application content, technical logs, IP addresses and performance metrics."
    },
    {
      "provider": "AWS S3",
      "service": "Media storage",
      "data": "Uploaded references, generated media, previews and exports."
    },
    {
      "provider": "Brevo",
      "service": "Account and service emails",
      "data": "Email addresses, message contents and delivery metadata."
    },
    {
      "provider": "Cloudflare",
      "service": "DNS and anti-abuse checks",
      "data": "Connection data, IP addresses and browser signals for protected forms."
    },
    {
      "provider": "OpenAI",
      "service": "Milo assistance in the generators and Studio; media analysis",
      "data": "Messages, selected models and settings, draft/project context, relevant conversation history and selected references; image frames or audio excerpts for requested analyses."
    },
    {
      "provider": "Fal.ai · BytePlus ModelArk · Alibaba Model Studio · Kling · Luma · Google Vertex AI",
      "service": "Media generation, depending on model and route",
      "data": "Prompts, settings, supplied references, results and request identifiers."
    },
    {
      "provider": "Google Analytics / Ads / Tag Manager",
      "service": "Audience measurement and attribution",
      "data": "Visits, usage/purchase events and browser/session identifiers; non-essential trackers require consent. See the cookie notice."
    },
    {
      "provider": "Microsoft Clarity",
      "service": "Usage analysis on eligible pages, subject to consent",
      "data": "Interactions, session recordings and technical navigation data; see the cookie notice."
    }
  ],
  "fr": [
    {
      "provider": "Stripe",
      "service": "Paiements et prévention de la fraude",
      "data": "Coordonnées de facturation, identifiants de paiement et transactions."
    },
    {
      "provider": "Neon",
      "service": "Base applicative",
      "data": "Données de compte, projets, conversations, devis, tâches, paiements et consentements."
    },
    {
      "provider": "Supabase",
      "service": "Authentification",
      "data": "E-mail, identifiants, sessions et journaux d’authentification."
    },
    {
      "provider": "Vercel",
      "service": "Hébergement, diffusion et performance",
      "data": "Contenu applicatif, journaux techniques, adresses IP et mesures de performance."
    },
    {
      "provider": "AWS S3",
      "service": "Stockage des médias",
      "data": "Références importées, médias générés, aperçus et exports."
    },
    {
      "provider": "Brevo",
      "service": "E-mails de compte et de service",
      "data": "Adresses e-mail, contenu des messages et métadonnées de délivrabilité."
    },
    {
      "provider": "Cloudflare",
      "service": "DNS et contrôles anti-abus",
      "data": "Données de connexion, adresses IP et signaux du navigateur pour les formulaires protégés."
    },
    {
      "provider": "OpenAI",
      "service": "Assistance Milo dans les générateurs et Studio ; analyse de médias",
      "data": "Messages, modèles et réglages choisis, contexte du brouillon ou du projet, historique utile et références sélectionnées ; images extraites ou extraits audio pour les analyses demandées."
    },
    {
      "provider": "Fal.ai · BytePlus ModelArk · Alibaba Model Studio · Kling · Luma · Google Vertex AI",
      "service": "Génération de médias selon le modèle et le parcours",
      "data": "Prompts, réglages, références fournies, résultats et identifiants de demande."
    },
    {
      "provider": "Google Analytics / Ads / Tag Manager",
      "service": "Mesure d’audience et attribution",
      "data": "Navigation, événements d’usage/achat et identifiants de navigateur/session ; traceurs non essentiels soumis au consentement. Voir la notice cookies."
    },
    {
      "provider": "Microsoft Clarity",
      "service": "Analyse d’usage sur les pages éligibles, selon consentement",
      "data": "Interactions, enregistrements de session et données techniques de navigation ; voir la notice cookies."
    }
  ],
  "es": [
    {
      "provider": "Stripe",
      "service": "Pagos y prevención del fraude",
      "data": "Datos de facturación, identificadores de pago y transacciones."
    },
    {
      "provider": "Neon",
      "service": "Base de datos de la aplicación",
      "data": "Datos de cuenta, proyectos, conversaciones, presupuestos, trabajos, pagos y consentimientos."
    },
    {
      "provider": "Supabase",
      "service": "Autenticación",
      "data": "Correo, credenciales, sesiones y registros de autenticación."
    },
    {
      "provider": "Vercel",
      "service": "Alojamiento, distribución y rendimiento",
      "data": "Contenido de la aplicación, registros técnicos, direcciones IP y métricas de rendimiento."
    },
    {
      "provider": "AWS S3",
      "service": "Almacenamiento de medios",
      "data": "Referencias cargadas, medios generados, vistas previas y exportaciones."
    },
    {
      "provider": "Brevo",
      "service": "Correos de cuenta y de servicio",
      "data": "Direcciones de correo, contenido de mensajes y metadatos de entrega."
    },
    {
      "provider": "Cloudflare",
      "service": "DNS y controles contra abusos",
      "data": "Datos de conexión, direcciones IP y señales del navegador para formularios protegidos."
    },
    {
      "provider": "OpenAI",
      "service": "Asistencia de Milo en los generadores y Studio; análisis de medios",
      "data": "Mensajes, modelos y ajustes elegidos, contexto del borrador o del proyecto, historial pertinente y referencias seleccionadas; fotogramas o fragmentos de audio para los análisis solicitados."
    },
    {
      "provider": "Fal.ai · BytePlus ModelArk · Alibaba Model Studio · Kling · Luma · Google Vertex AI",
      "service": "Generación de medios según el modelo y la ruta",
      "data": "Prompts, ajustes, referencias aportadas, resultados e identificadores de solicitud."
    },
    {
      "provider": "Google Analytics / Ads / Tag Manager",
      "service": "Medición de audiencia y atribución",
      "data": "Navegación, eventos de uso/compra e identificadores de navegador/sesión; los rastreadores no esenciales requieren consentimiento. Consulta el aviso de cookies."
    },
    {
      "provider": "Microsoft Clarity",
      "service": "Análisis de uso en páginas habilitadas, según consentimiento",
      "data": "Interacciones, grabaciones de sesión y datos técnicos de navegación; consulta el aviso de cookies."
    }
  ],
  "zh": [
    {
      "provider": "聚合易支付（LLM Hub Pay）",
      "service": "支付与充值",
      "data": "订单号、金额、币种、支付结果与回调信息"
    },
    {
      "provider": "LLM Hub 接口（api.llmhub.com.cn）",
      "service": "模型接口聚合，转发图像、视频生成请求",
      "data": "提示词、参考素材、任务标识、生成结果；该接口会把请求转发给其下游的模型提供方。"
    },
    {
      "provider": "阿里云 Model Studio（百炼）",
      "service": "图像与视频生成",
      "data": "提示词、参考素材、生成结果"
    },
    {
      "provider": "火山引擎方舟",
      "service": "图像与视频生成",
      "data": "提示词、参考素材、生成结果"
    },
    {
      "provider": "Supabase",
      "service": "账号认证与会话管理",
      "data": "邮箱、认证凭证、会话与认证日志"
    },
    {
      "provider": "对象存储与内容分发服务",
      "service": "保存上传素材与生成结果",
      "data": "您上传的素材、生成结果"
    },
    {
      "provider": "数据库服务",
      "service": "保存账号、订单、任务数据",
      "data": "账号、订单、钱包流水、任务元数据"
    },
    {
      "provider": "服务器与托管服务",
      "service": "运行应用并记录访问日志",
      "data": "访问日志（含 IP 地址）、应用运行数据"
    }
  ]
} satisfies Record<AppLocale, Array<{provider: string; service: string; data: string}>>;
