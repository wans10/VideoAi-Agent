import mcpPublication from '@/config/mcp-publication.json';
import { isKeyvoMcpUiHidden, isKeyvoNotificationsTabHidden } from '@/config/keyvo-disabled-features';
export type SettingsTab = 'account' | 'connections' | 'privacy' | 'notifications';
export type SettingsContentTab = Exclude<SettingsTab, 'connections'>;

export const SETTINGS_TAB_ITEMS: ReadonlyArray<{
  id: SettingsTab;
  href: string;
}> = [
  { id: 'account', href: '/settings' },
  ...(mcpPublication.transport && !isKeyvoMcpUiHidden() ? [{ id: 'connections' as const, href: '/account/connections' }] : []),
  { id: 'privacy', href: '/settings?tab=privacy' },
  ...(isKeyvoNotificationsTabHidden() ? [] : [{ id: 'notifications' as const, href: '/settings?tab=notifications' }]),
];

export function resolveSettingsContentTab(value: string | null | undefined): SettingsContentTab {
  if (value === 'privacy') return value;
  if (value === 'notifications' && !isKeyvoNotificationsTabHidden()) return value;
  return 'account';
}

export function isSettingsPath(pathname: string | null | undefined): boolean {
  const normalizedPath = pathname?.replace(/\/+$/, '') || '/';
  return (
    normalizedPath === '/settings' ||
    normalizedPath.startsWith('/settings/') ||
    normalizedPath === '/account/connections'
  );
}
