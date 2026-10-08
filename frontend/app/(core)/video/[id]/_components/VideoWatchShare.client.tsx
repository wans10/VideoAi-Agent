'use client';

import { useState } from 'react';
import { Check, Copy, ExternalLink } from 'lucide-react';
import { copyTextToClipboard } from '@/lib/clipboard';
import { DOMESTIC_SHARE_PLATFORMS } from '@/components/library/domestic-share-platforms';
import styles from '@/components/examples/example-reader-styles';

export function VideoWatchShare({ watchUrl, locale = 'en' }: { watchUrl: string; locale?: string }) {
  const copy = locale.startsWith('zh') ? {
    share: '分享', link: '复制链接', copied: '链接已复制', url: '视频链接', on: '打开创作者中心：', email: '通过邮件分享',
    error: '无法自动复制，请选择并复制下方链接。',
  } : locale.startsWith('fr') ? {
    share: 'Partager', link: 'Copier le lien', copied: 'Lien copié', url: 'Lien de la vidéo', on: 'Partager sur', email: 'Partager par e-mail',
    error: 'Impossible de copier automatiquement. Sélectionnez et copiez le lien ci-dessous.',
  } : locale.startsWith('es') ? {
    share: 'Compartir', link: 'Copiar enlace', copied: 'Enlace copiado', url: 'Enlace del vídeo', on: 'Compartir en', email: 'Compartir por e-mail',
    error: 'No se pudo copiar automáticamente. Selecciona y copia el enlace de abajo.',
  } : {
    share: 'Share', link: 'Copy link', copied: 'Link copied', url: 'Video link', on: 'Share on', email: 'Share by e-mail',
    error: 'Unable to copy automatically. Select and copy the link below.',
  };
  const [feedback, setFeedback] = useState<{ url: string; copied: boolean } | null>(null);
  const status = feedback?.url === watchUrl ? feedback.copied ? 'copied' : 'error' : 'idle';

  const copyLink = async (button: HTMLButtonElement) => {
    const copied = await copyTextToClipboard(watchUrl);
    // The shared clipboard helper may briefly focus its fallback textarea.
    if (button.isConnected) button.focus({ preventScroll: true });
    setFeedback({ url: watchUrl, copied });
  };

  return <section className={styles.share} aria-label={copy.share}>
    <div className={styles.shareRow}>
      <span>{copy.share}</span>
      <button type="button" onClick={event => void copyLink(event.currentTarget)} data-copied={status === 'copied' || undefined}
        data-analytics-event="cta_click" data-analytics-cta-name="video_share_link" data-analytics-cta-location="watch_page">
        {status === 'copied' ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />}
        {status === 'copied' ? copy.copied : copy.link}
      </button>
    </div>
    <div className={styles.shareActions}>{DOMESTIC_SHARE_PLATFORMS.map(platform => <a key={platform.id}
      href={platform.url} target="_blank" rel="noopener noreferrer" aria-label={`打开${platform.label}创作者中心`}
      data-analytics-event="cta_click" data-analytics-cta-name={`video_share_${platform.id}`} data-analytics-cta-location="watch_page">
      <ExternalLink size={15} aria-hidden />{platform.label}
    </a>)}</div>
    <p className={styles.shareFeedback}>可复制链接发送到微信或 QQ。发布到短视频平台需准备素材，并在创作者中心手动上传。</p>
    <p role="status" aria-live="polite" className={status === 'error' ? styles.shareFeedback : 'sr-only'}>
      {status === 'copied' ? copy.copied : status === 'error' ? copy.error : ''}
    </p>
    {status === 'error' && <input className={styles.shareFallback} aria-label={copy.url} value={watchUrl} readOnly onFocus={event => event.currentTarget.select()} />}
  </section>;
}
