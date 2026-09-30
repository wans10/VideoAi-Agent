import { localizeCapabilityDetail } from '@/lib/marketing/spec-capability-copy';
import type { AppLocale } from '@/i18n/locales';
import { SPEC_STATUS_LABELS } from './model-page-specs-constants';

export function isPending(value: string) {
  return value.trim().toLowerCase() === 'data pending';
}

export function isUnsupported(value: string) {
  const normalized = value.trim().toLowerCase();
  return normalized === 'not supported' || normalized === 'unsupported';
}

export function isSupported(value: string) {
  return value.trim().toLowerCase() === 'supported';
}

export function resolveSpecStatusLabels(locale: AppLocale) {
  return SPEC_STATUS_LABELS[locale] ?? SPEC_STATUS_LABELS.en;
}

export function localizeSpecStatus(value: string, locale: AppLocale): string {
  const labels = resolveSpecStatusLabels(locale);
  const normalized = value.trim();
  const lower = normalized.toLowerCase();
  const capability = localizeCapabilityDetail(normalized, locale);
  if (capability !== null) return capability;
  if (isSupported(normalized)) return labels.supported;
  if (isUnsupported(normalized)) return labels.notSupported;
  if (isPending(normalized)) return labels.pending;
  if (lower.startsWith('supported (') && normalized.endsWith(')')) {
    const detail = normalized.slice(normalized.indexOf('(') + 1, -1);
    return `${labels.supported} (${localizeSpecStatus(detail, locale)})`;
  }
  if (lower.startsWith('not supported (') && normalized.endsWith(')')) {
    const detail = normalized.slice(normalized.indexOf('(') + 1, -1);
    return `${labels.notSupported} (${localizeSpecStatus(detail, locale)})`;
  }
  if (lower === 'prompt-based only') {
    return locale === 'fr' ? 'Via prompt uniquement' : locale === 'es' ? 'Solo mediante prompt' : locale === 'zh' ? '仅限提示词' : normalized;
  }
  if (lower === 'single start image') {
    return locale === 'fr' ? 'une seule image de départ' : locale === 'es' ? 'una sola imagen inicial' : locale === 'zh' ? '仅支持单张首帧图片' : normalized;
  }
  if (lower === 'not exposed in current maxvideoai route') {
    return locale === 'fr'
      ? 'Non disponible dans VideoAI actuellement'
      : locale === 'es'
        ? 'No disponible actualmente en VideoAI'
        : locale === 'zh'
          ? '当前 VideoAI 路线暂未开放'
          : normalized;
  }
  if (lower === 'multi reference stills') {
    return locale === 'fr'
      ? 'plusieurs images de référence'
      : locale === 'es'
        ? 'varias imágenes de referencia'
        : locale === 'zh'
          ? '多参考静态图'
          : normalized;
  }
  if (lower === 'source clip for extend / retake') {
    return locale === 'fr'
      ? 'clip source pour extension / retake'
      : locale === 'es'
        ? 'clip fuente para extensión / retake'
        : locale === 'zh'
          ? '用于扩展/重拍的源素材片段'
          : normalized;
  }
  if (lower === 'source clip for modify / reframe') {
    return locale === 'fr'
      ? 'clip source à modifier ou recadrer'
      : locale === 'es'
        ? 'clip de origen para modificar o reencuadrar'
        : locale === 'zh'
          ? '用于修改/重新构图的源素材片段'
          : normalized;
  }
  if (lower === 'start + end image in i2v') {
    return locale === 'fr'
      ? 'image de départ + image de fin en image → vidéo'
      : locale === 'es'
        ? 'imagen inicial + imagen final en imagen → video'
        : locale === 'zh'
          ? '图生视频首帧+尾帧'
          : normalized;
  }
  if (lower === '1 start image + optional end image in i2v') {
    return locale === 'fr'
      ? '1 image de départ + image de fin optionnelle en image → vidéo'
      : locale === 'es'
        ? '1 imagen inicial + imagen final opcional en imagen → video'
        : locale === 'zh'
          ? '图生视频 1 张首图+可选尾图'
          : normalized;
  }
  if (lower === 'ref2v: up to 9 image references; i2v: 1 start image') {
    return locale === 'fr'
      ? 'Ref2V : jusqu’à 9 images de référence ; I2V : 1 image de départ'
      : locale === 'es'
        ? 'Ref2V: hasta 9 imágenes de referencia; I2V: 1 imagen inicial'
        : locale === 'zh'
          ? '参考生视频：最多 9 张参考图；图生视频：1 张首图'
          : normalized;
  }
  if (lower === 'ref2v: up to 3 video references') {
    return locale === 'fr'
      ? 'Ref2V : jusqu’à 3 vidéos de référence'
      : locale === 'es'
        ? 'Ref2V: hasta 3 videos de referencia'
        : locale === 'zh'
          ? '参考生视频：最多 3 个参考视频'
          : normalized;
  }
  if (lower === 'i2v start + optional end frame') {
    return locale === 'fr'
      ? 'image de départ I2V + image finale optionnelle'
      : locale === 'es'
        ? 'imagen inicial I2V + frame final opcional'
        : locale === 'zh'
          ? '图生视频首帧+可选尾帧'
          : normalized;
  }
  if (lower === 'best effort with short dialogue') {
    return locale === 'fr'
      ? 'synchronisation approximative avec dialogue court'
      : locale === 'es'
        ? 'sincronización aproximada con diálogo corto'
        : locale === 'zh'
          ? '简短对白尽力匹配'
          : normalized;
  }
  if (lower === 'reframe workflow') {
    return locale === 'fr' ? 'recadrage' : locale === 'es' ? 'reencuadre' : locale === 'zh' ? '重新构图工作流' : normalized;
  }
  if (lower === 'modify / reframe workflows') {
    return locale === 'fr'
      ? 'modification et recadrage'
      : locale === 'es'
        ? 'modificación y reencuadre'
        : locale === 'zh'
          ? '修改/重新构图工作流'
          : normalized;
  }
  if (lower === 'extend / retake workflows') {
    return locale === 'fr'
      ? 'extension et reprise'
      : locale === 'es'
        ? 'extensión y nueva toma'
        : locale === 'zh'
          ? '扩展/重拍工作流'
          : normalized;
  }
  if (lower === 'no (maxvideoai)') {
    return locale === 'fr' ? 'Non (VideoAI)' : locale === 'es' ? 'No (VideoAI)' : locale === 'zh' ? '否 (VideoAI)' : normalized;
  }
  if (locale !== 'en') {
    const month = normalized.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{4})$/);
    if (month) {
      const index = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(month[1]);
      return new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(Number(month[2]), index, 1)));
    }
  }
  return value;
}
