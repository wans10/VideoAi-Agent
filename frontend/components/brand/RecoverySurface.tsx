'use client';

import { useEffect, useState } from 'react';
import type { AppLocale } from '@/i18n/locales';
import { isAppLocale } from '@/i18n/locales';

const COPY = {
  zh: ['暂时无法打开这一页', '请稍后重试，或返回首页继续浏览。', '重新加载', '返回首页'],
  en: ['This page is temporarily unavailable', 'Please try again or return to the homepage.', 'Try again', 'Back to home'],
  fr: ['Cette page est momentanément indisponible', 'Réessayez ou revenez à l’accueil.', 'Réessayer', 'Accueil'],
  es: ['Esta página no está disponible por ahora', 'Inténtalo de nuevo o vuelve al inicio.', 'Reintentar', 'Inicio'],
};

/** Self-contained styles and locale fallback also work when the root provider fails. */
export function RecoverySurface({ reset }: { reset: () => void }) {
  const [locale, setLocale] = useState<AppLocale>('zh');
  useEffect(() => {
    const lang = document.documentElement.lang;
    if (isAppLocale(lang)) setLocale(lang);
  }, []);
  const copy = COPY[locale];
  return <main style={{ boxSizing: 'border-box', minHeight: '80vh', maxWidth: 760, margin: '0 auto', padding: '80px 24px', fontFamily: 'system-ui, "PingFang SC", "Microsoft YaHei", sans-serif', color: '#20211f' }}>
    <p style={{ color: '#b83c2b', fontSize: 22, fontWeight: 700, borderBottom: '1px solid #deded5', paddingBottom: 24 }}>VideoAI</p>
    <h1 style={{ fontSize: 'clamp(28px, 4vw, 42px)', lineHeight: 1.3, marginTop: 48 }}>{copy[0]}</h1>
    <p style={{ fontSize: 16, lineHeight: 1.8, color: '#575a52', margin: '20px 0 32px' }}>{copy[1]}</p>
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 24 }}>
      <button onClick={reset} type="button" style={{ minHeight: 48, padding: '12px 24px', border: 0, borderRadius: 8, background: '#b83c2b', color: 'white', fontSize: 16, cursor: 'pointer' }}>{copy[2]}</button>
      <a href={locale === 'en' ? '/' : `/${locale}`} style={{ color: '#9c3022', padding: '12px 0', textUnderlineOffset: 4 }}>{copy[3]}</a>
    </div>
  </main>;
}
