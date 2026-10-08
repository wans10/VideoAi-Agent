import { defaultExperienceLocale } from '@/i18n/locales';
import { isAppExperiencePath } from '@/lib/app-experience-path';
export type CookieBannerLocale = 'en' | 'fr' | 'es' | 'zh';

export type CookieBannerCopy = {
  title: string;
  body: string;
  actions: {
    acceptAll: string;
    rejectAll: string;
    manageChoices: string;
    hideChoices: string;
    savePreferences: string;
    saving: string;
  };
  preferences: {
    title: string;
    analytics: { title: string; body: string };
    ads: { title: string; body: string };
  };
  errors: {
    loadVersion: string;
    save: string;
  };
};

export const COOKIE_BANNER_COPY: Record<CookieBannerLocale, CookieBannerCopy> = {
  en: {
    title: 'Cookies & Privacy',
    body:
      "We use essential cookies to run the site. With your consent, we'll enable analytics to improve the product and advertising tags for campaign measurement. You can change your choices anytime.",
    actions: {
      acceptAll: 'Accept all',
      rejectAll: 'Reject all',
      manageChoices: 'Manage choices',
      hideChoices: 'Hide choices',
      savePreferences: 'Save preferences',
      saving: 'Saving…',
    },
    preferences: {
      title: 'Preferences',
      analytics: {
        title: 'Analytics cookies',
        body: 'Help us measure usage and improve features.',
      },
      ads: {
        title: 'Advertising cookies',
        body: 'Measure campaigns and improve relevance.',
      },
    },
    errors: {
      loadVersion: 'Failed to load cookie policy version',
      save: 'Unable to store your preferences.',
    },
  },
  fr: {
    title: 'Cookies et confidentialité',
    body:
      'Nous utilisons des cookies essentiels pour faire fonctionner le site. Avec votre accord, nous activerons les analytics pour améliorer le produit et les balises publicitaires pour mesurer les campagnes. Vous pouvez modifier vos choix à tout moment.',
    actions: {
      acceptAll: 'Tout accepter',
      rejectAll: 'Tout refuser',
      manageChoices: 'Gérer mes choix',
      hideChoices: 'Masquer les choix',
      savePreferences: 'Enregistrer les préférences',
      saving: 'Enregistrement…',
    },
    preferences: {
      title: 'Préférences',
      analytics: {
        title: 'Cookies analytiques',
        body: 'Aidez-nous à mesurer l’usage et à améliorer les fonctionnalités.',
      },
      ads: {
        title: 'Cookies publicitaires',
        body: 'Mesurez les campagnes et améliorez leur pertinence.',
      },
    },
    errors: {
      loadVersion: 'Impossible de charger la version de la politique cookies',
      save: 'Impossible d’enregistrer vos préférences.',
    },
  },
  es: {
    title: 'Cookies y privacidad',
    body:
      'Usamos cookies esenciales para que el sitio funcione. Con tu consentimiento, activaremos analytics para mejorar el producto y etiquetas publicitarias para medir campañas. Puedes cambiar tus elecciones en cualquier momento.',
    actions: {
      acceptAll: 'Aceptar todo',
      rejectAll: 'Rechazar todo',
      manageChoices: 'Gestionar elecciones',
      hideChoices: 'Ocultar elecciones',
      savePreferences: 'Guardar preferencias',
      saving: 'Guardando…',
    },
    preferences: {
      title: 'Preferencias',
      analytics: {
        title: 'Cookies analíticas',
        body: 'Ayúdanos a medir el uso y mejorar las funciones.',
      },
      ads: {
        title: 'Cookies publicitarias',
        body: 'Mide campañas y mejora la relevancia.',
      },
    },
    errors: {
      loadVersion: 'No se pudo cargar la versión de la política de cookies',
      save: 'No se pudieron guardar tus preferencias.',
    },
  },
  zh: {
    title: 'Cookie 与隐私',
    body:
      '我们使用必要的 Cookie 来保证网站运行。在获得您的同意后，我们将启用分析以改进产品，并使用广告标签进行营销效果衡量。您可以随时更改您的选择。',
    actions: {
      acceptAll: '全部接受',
      rejectAll: '全部拒绝',
      manageChoices: '管理偏好',
      hideChoices: '收起选项',
      savePreferences: '保存偏好',
      saving: '保存中…',
    },
    preferences: {
      title: '偏好设置',
      analytics: {
        title: '分析 Cookie',
        body: '帮助我们统计使用情况并优化产品功能。',
      },
      ads: {
        title: '广告 Cookie',
        body: '衡量营销活动效果并提升相关性。',
      },
    },
    errors: {
      loadVersion: '加载 Cookie 政策版本失败',
      save: '无法保存您的偏好设置。',
    },
  },
};

export function resolveCookieBannerLocale(pathname: string | null): CookieBannerLocale {
  if (typeof document !== 'undefined') {
    const cookies = document.cookie ? document.cookie.split(';') : [];
    for (const entry of cookies) {
      const [rawKey, ...rest] = entry.trim().split('=');
      const key = rawKey.trim();
      if (key !== 'NEXT_LOCALE' && key !== 'mv-locale') continue;
      const value = decodeURIComponent(rest.join('=')).trim();
      if (value === 'fr' || value === 'es' || value === 'en' || value === 'zh') {
        return value;
      }
    }
  }
  if (pathname?.startsWith('/fr')) return 'fr';
  if (pathname?.startsWith('/es')) return 'es';
  if (pathname?.startsWith('/zh')) return 'zh';
  return isAppExperiencePath(pathname) || pathname === '/login' ? defaultExperienceLocale : 'en';
}
