import mcpPublication from '@/config/mcp-publication.json';
import { FEATURES } from '@/content/feature-flags';
import type { AppGlyphName } from './AppGlyph';

type NavItemDefinition = {
  id: string;
  label: string;
  icon: string;
  href: string;
  badge?: string | null;
  badgeKey?: string | null;
};

export const NAV_ITEMS: readonly NavItemDefinition[] = [
  { id: 'generate', label: 'Generate Video', badge: null, icon: 'generate', href: '/app' },
  { id: 'generate-image', label: 'Generate Image', badge: null, icon: 'generate-image', href: '/app/image' },
  { id: 'generate-audio', label: 'Generate Audio', badge: null, icon: 'generate-audio', href: '/app/audio' },
  ...(FEATURES.workflows.toolsSection
    ? [{ id: 'tools', label: 'Tools', badge: null, icon: 'tools', href: '/app/tools' }]
    : []),
  ...(FEATURES.studio.maxVideoAiEditor ? [{ id: 'studio', label: 'Studio', badge: 'Beta', icon: 'generate', href: '/app/studio/projects' }] : []),
  { id: 'library', label: 'Media', badge: null, icon: 'library', href: '/app/library' },
  { id: 'jobs', label: 'Activity', badge: null, icon: 'jobs', href: '/jobs' },
  { id: 'billing', label: 'Billing', badge: null, icon: 'billing', href: '/billing' },
  { id: 'settings', label: 'Settings', badge: null, icon: 'settings', href: '/settings' }
];

export type AppPrimary = 'create' | 'studio' | 'media' | 'tools' | 'activity' | 'account';
export type AppActivity = 'video' | 'image' | 'audio';
export type AppNavItem = { id: string; label: string; href: string; glyph: AppGlyphName; badge?: string };

export const APP_ACTIVITIES: readonly AppNavItem[] = [
  { id: 'video', label: 'Video', href: '/app', glyph: 'video' },
  { id: 'image', label: 'Image', href: '/app/image', glyph: 'image' },
  { id: 'audio', label: 'Audio', href: '/app/audio', glyph: 'audio' },
];
const PRIMARY_ITEMS: readonly (AppNavItem & { id: AppPrimary })[] = [
  { id: 'create', label: 'Create', href: '/app', glyph: 'create' },
  { id: 'media', label: 'Media', href: '/app/library', glyph: 'library' },
  { id: 'tools', label: 'Tools', href: '/app/tools', glyph: 'tools' },
  ...(FEATURES.studio.maxVideoAiEditor
    ? [{ id: 'studio' as const, label: 'Studio', href: '/app/studio/projects', glyph: 'studio' as const, badge: 'Beta' }]
    : []),
  { id: 'activity', label: 'Activity', href: '/jobs', glyph: 'prompt' },
  { id: 'account', label: 'Account', href: '/settings', glyph: 'settings' },
];
const TOOL_ITEMS: readonly AppNavItem[] = [
  { id: 'character-builder', label: 'Character Builder', href: '/app/tools/character-builder', glyph: 'reference' },
  { id: 'storyboard', label: 'Storyboard', href: '/app/tools/storyboard', glyph: 'image' },
  { id: 'angle', label: 'Angle / Perspective', href: '/app/tools/angle', glyph: 'image' },
  { id: 'upscale', label: 'Upscale', href: '/app/tools/upscale', glyph: 'image' },
  { id: 'background-removal', label: 'Background Remover', href: '/app/tools/background-removal', glyph: 'video' },
  { id: 'restore-video', label: 'Restore Video', href: '/app/tools/restore-video', glyph: 'video' },
  { id: 'denoise', label: 'Denoise Video', href: '/app/tools/denoise', glyph: 'video' },
  { id: 'fix-blur', label: 'Fix Motion Blur', href: '/app/tools/fix-blur', glyph: 'video' },
  { id: 'smooth-motion', label: 'Smooth Motion', href: '/app/tools/smooth-motion', glyph: 'video' },
];
export function canShowStudioNavigation(): boolean {
  return FEATURES.studio.maxVideoAiEditor;
}
export function getAppNavigation(
  toolsEnabled: boolean = FEATURES.workflows.toolsSection,
  studioVisible: boolean = canShowStudioNavigation(),
) {
  return PRIMARY_ITEMS.filter((item) => (
    (toolsEnabled || item.id !== 'tools') && (studioVisible || item.id !== 'studio')
  ));
}
export function getAppMenuItems(
  toolsEnabled: boolean = FEATURES.workflows.toolsSection,
  studioVisible: boolean = canShowStudioNavigation(),
): readonly AppNavItem[] {
  return [
    ...APP_ACTIVITIES,
    { id: 'library', label: 'Media', href: '/app/library', glyph: 'library' },
    ...(toolsEnabled ? PRIMARY_ITEMS.filter((item) => item.id === 'tools') : []),
    ...(studioVisible && FEATURES.studio.maxVideoAiEditor
      ? PRIMARY_ITEMS.filter((item) => item.id === 'studio')
      : []),
    ...(toolsEnabled ? TOOL_ITEMS : []),
    { id: 'jobs', label: 'Activity', href: '/jobs', glyph: 'prompt' },
    { id: 'billing', label: 'Billing', href: '/billing', glyph: 'wallet' },
    { id: 'settings', label: 'Settings', href: '/settings', glyph: 'settings' },
    ...(mcpPublication.publicMarketing ? [{ id: 'connections', label: 'Connections', href: '/account/connections', glyph: 'connect' } satisfies AppNavItem] : []),
  ];
}
export function getAppNavigationSelection(
  pathname: string | null | undefined,
  toolsEnabled: boolean = FEATURES.workflows.toolsSection,
  studioVisible: boolean = canShowStudioNavigation(),
): { primary: AppPrimary | null; activity: AppActivity | null } {
  const path = pathname?.replace(/\/+$/, '') || '/';
  const matches = (href: string) => path === href || path.startsWith(`${href}/`);
  if (matches('/app/studio')) return { primary: studioVisible ? 'studio' : null, activity: null };
  if (matches('/app/library')) return { primary: 'media', activity: null };
  if (matches('/app/tools')) return { primary: toolsEnabled ? 'tools' : null, activity: null };
  if (matches('/jobs')) return { primary: 'activity', activity: null };
  if (['/settings', '/account/connections', '/billing'].some(matches)) return { primary: 'account', activity: null };
  const activity = path === '/app' ? 'video' : matches('/app/image') ? 'image' : matches('/app/audio') ? 'audio' : null;
  return { primary: activity ? 'create' : null, activity };
}

const LOCAL_LABELS: Record<string, [string, string, string]> = {
  create: ['Créer', 'Crear', '创作'], media: ['Médias', 'Medios', '媒体库'], tools: ['Outils', 'Herramientas', '工具'], activity: ['Activité', 'Actividad', '生成历史'], account: ['Compte', 'Cuenta', '账户'],
  studio: ['Studio', 'Studio', '工作台'],
  video: ['Vidéo', 'Vídeo', '视频'], image: ['Image', 'Imagen', '图像'], audio: ['Audio', 'Audio', '音频'], library: ['Médias', 'Medios', '媒体库'], jobs: ['Activité', 'Actividad', '生成历史'], billing: ['Facturation', 'Facturación', '充值账单'], settings: ['Paramètres', 'Ajustes', '设置'], connections: ['Connexions', 'Conexiones', 'AI 助手连接'],
  'character-builder': ['Créateur de personnages', 'Creador de personajes', '角色构建器'], storyboard: ['Storyboard', 'Guion gráfico', '分镜脚本'], angle: ['Angle / Perspective', 'Ángulo / Perspectiva', '视角变换'], upscale: ['Améliorer la résolution', 'Mejorar resolución', '超分辨率增强'], 'background-removal': ['Supprimer le fond', 'Eliminar fondo', '背景移除'],
  'restore-video': ['Restaurer une vidéo', 'Restaurar vídeo', '视频修复'], denoise: ['Débruiter une vidéo', 'Reducir ruido', '视频降噪'], 'fix-blur': ['Corriger le flou', 'Corregir desenfoque', '修复动态模糊'], 'smooth-motion': ['Fluidifier une vidéo', 'Suavizar movimiento', '动态平滑'],
};
export function appNavLabel(item: Pick<AppNavItem, 'id' | 'label'>, locale: string): string {
  return (locale === 'fr' ? LOCAL_LABELS[item.id]?.[0] : locale === 'es' ? LOCAL_LABELS[item.id]?.[1] : locale === 'zh' ? LOCAL_LABELS[item.id]?.[2] : undefined) ?? item.label;
}
