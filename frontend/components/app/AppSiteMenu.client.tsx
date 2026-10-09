'use client';

import mcpPublication from '@/config/mcp-publication.json';

import { BrandLockup } from '@/components/brand/BrandLockup';
import Link from 'next/link';
import { useEffect, useImperativeHandle, useRef, type MouseEvent, type MutableRefObject, type ReactNode } from 'react';
import { AppLanguageToggle } from '@/components/AppLanguageToggle';
import { MARKETING_TOP_NAV_LINKS } from '@/config/navigation';
import { getPathname } from '@/i18n/navigation';
import { publishedLocales } from '@/i18n/locales';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { AppAppearanceControl } from './AppAppearanceControl.client';
import { AppGlyph } from './AppGlyph';
import { AppAssistantConnections } from './AppAssistantConnections';
import { AppMcpShortcuts } from './AppMcpShortcuts.client';
import { appNavLabel, canShowStudioNavigation, getAppMenuItems } from './app-navigation';

type AppSiteMenuCommonProps = {
  email: string | null;
  authResolved: boolean;
  isAdmin: boolean;
  signinHref: string;
  signupHref: string;
  onSignOut: () => void;
};

type Props = AppSiteMenuCommonProps & {
  children: ReactNode;
};

type AppSiteMenuButtonProps = AppSiteMenuCommonProps & {
  controllerRef?: MutableRefObject<AppSiteMenuController | null>;
  onAppNavigate?: (href: string) => void | Promise<void>;
  studioVisible?: boolean;
};

type AppSiteMenuController = {
  open: (trigger: HTMLElement) => void;
};

export function AppSiteMenuButton({ email, authResolved, isAdmin, signinHref, signupHref, onSignOut, controllerRef, onAppNavigate, studioVisible }: AppSiteMenuButtonProps) {
  const { locale, t } = useI18n();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const copy = locale === 'zh'
    ? { menu: '创作工作室', openMenu: '打开 Keyvo 导航', close: '关闭', site: '探索 Keyvo', app: '我的工作室', preferences: '偏好设置', language: '语言', theme: '外观', signIn: '登录', signUp: '注册', signOut: '退出登录', assistants: '智能助手', account: '账户', newTab: '新窗口' }
    : locale === 'fr'
    ? { menu: 'Menu', openMenu: 'Ouvrir le menu Keyvo', close: 'Fermer', site: 'Explorer Keyvo', app: 'Application', preferences: 'Préférences', language: 'Langue', theme: 'Apparence', signIn: 'Connexion', signUp: 'Créer un compte', signOut: 'Déconnexion', assistants: 'Assistants', account: 'Compte', newTab: 'nouvel onglet' }
    : locale === 'es'
      ? { menu: 'Menú', openMenu: 'Abrir el menú de Keyvo', close: 'Cerrar', site: 'Explorar Keyvo', app: 'Aplicación', preferences: 'Preferencias', language: 'Idioma', theme: 'Apariencia', signIn: 'Entrar', signUp: 'Crear cuenta', signOut: 'Cerrar sesión', assistants: 'Asistentes', account: 'Cuenta', newTab: 'pestaña nueva' }
      : { menu: 'Menu', openMenu: 'Open Keyvo menu', close: 'Close', site: 'Explore Keyvo', app: 'Application', preferences: 'Preferences', language: 'Language', theme: 'Appearance', signIn: 'Sign in', signUp: 'Create account', signOut: 'Sign out', assistants: 'Assistants', account: 'Account', newTab: 'new tab' };
  const open = (trigger: HTMLElement) => {
    openerRef.current = trigger;
    dialogRef.current?.showModal();
    bodyRef.current?.scrollTo({ top: 0 });
  };
  useImperativeHandle(controllerRef, () => ({ open }));
  const close = () => dialogRef.current?.close();
  useEffect(() => {
    const dialog = dialogRef.current;
    const restoreFocus = () => openerRef.current?.focus();
    dialog?.addEventListener('close', restoreFocus);
    return () => dialog?.removeEventListener('close', restoreFocus);
  }, []);
  const handleAppNavigate = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    const opensSeparateContext = event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
    if (!onAppNavigate || opensSeparateContext) {
      close();
      return;
    }
    event.preventDefault();
    close();
    void onAppNavigate(href);
  };
  const topPaths = { models: '/models', examples: '/examples', compare: '/ai-video-engines', tools: '/tools', pricing: '/pricing', blog: '/blog' } as const;
  const publicLinks: { key: string; label: string; href: (typeof topPaths)[keyof typeof topPaths] | '/' | '/integrations/claude' | '/integrations/chatgpt' | '/integrations/codex' }[] = [
    { key: 'home', label: locale === 'fr' ? 'Accueil' : locale === 'es' ? 'Inicio' : locale === 'zh' ? '首页' : 'Home', href: '/' },
    ...MARKETING_TOP_NAV_LINKS.map((item) => ({ ...item, href: topPaths[item.key], label: t(`nav.linkLabels.${item.key}`, item.key) ?? item.key })),
  ];
  return (
    <>
      <button className="app-site-trigger" type="button" aria-label={copy.openMenu} aria-haspopup="dialog" onClick={(event) => open(event.currentTarget)}>
        <BrandLockup caption={copy.menu} /><AppGlyph name="menu" />
      </button>
      <dialog ref={dialogRef} className="app-site-dialog" aria-label="Keyvo" onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
        <div className="app-site-dialog-heading"><h2>Keyvo</h2><button type="button" onClick={close} autoFocus>{copy.close} ×</button></div>
        <section className="app-site-preferences" aria-label={copy.preferences}><h3>{copy.preferences}</h3>
          <div><span>{copy.language}</span><AppLanguageToggle /></div>
          <div><span>{copy.theme}</span><AppAppearanceControl locale={locale} /></div>
        </section>
        <div ref={bodyRef} className="app-site-dialog-body">
          <AppAssistantConnections locale={locale} onNavigate={close} />
          <section aria-label={copy.app}><h3>{copy.app}</h3>
            <nav className="app-complete-menu" aria-label={copy.app}>
              {getAppMenuItems(undefined, studioVisible ?? canShowStudioNavigation()).map((item) => <Link key={item.id} href={item.href} prefetch={false} onClick={(event) => handleAppNavigate(event, item.href)}><AppGlyph name={item.glyph} /><span>{appNavLabel(item, locale)}</span></Link>)}
              {isAdmin ? <Link href="/admin" prefetch={false} onClick={(event) => { if (onAppNavigate) handleAppNavigate(event, '/admin'); else { event.preventDefault(); close(); window.location.assign('/admin'); } }}><AppGlyph name="settings" /><span>{locale === 'zh' ? '运营后台' : 'Admin'}</span></Link> : null}
            </nav>
          </section>
          <section aria-label={copy.site}><h3>{copy.site}</h3>
            <nav className="app-public-menu" aria-label={copy.site}>
              {publicLinks.map((item) => <Link key={item.key} href={getPathname({ locale, href: item.href })} prefetch={false} target="_blank" rel="noopener noreferrer" onClick={close}><span>{item.label}</span><AppGlyph name="external" /><span className="sr-only"> ({copy.newTab})</span></Link>)}
            </nav>
          </section>
          <div className="app-site-auth">
            {email ? <><span>{email}</span><button type="button" onClick={() => { close(); onSignOut(); }}>{copy.signOut}</button></>
              : authResolved ? <><Link href={signinHref} prefetch={false} onClick={close}>{copy.signIn}</Link><Link href={signupHref} prefetch={false} onClick={close}>{copy.signUp}</Link></> : null}
          </div>
        </div>
      </dialog>
    </>
  );
}

export function AppSiteMenu({ children, ...props }: Props) {
  const { locale, t } = useI18n();
  const controllerRef = useRef<AppSiteMenuController | null>(null);
  const copy = locale === 'fr'
    ? { account: 'Compte', signIn: 'Connexion' }
    : locale === 'es'
      ? { account: 'Cuenta', signIn: 'Entrar' }
      : { account: 'Account', signIn: 'Sign in' };
  return (
    <>
      <AppSiteMenuButton {...props} controllerRef={controllerRef} />
      <div className="app-header-actions">
        <AppMcpShortcuts locale={locale} />
        {children}
        <div className="app-header-account">
          {props.email ? <button type="button" onClick={(event) => controllerRef.current?.open(event.currentTarget)} aria-haspopup="dialog"><AppGlyph name="settings" /><span>{copy.account}</span></button>
            : props.authResolved ? <Link href={props.signinHref} prefetch={false}>{copy.signIn}</Link>
              : <span role="status" aria-label={t('workspace.header.loading', 'Loading account')}>…</span>}
        </div>
      </div>
    </>
  );
}
