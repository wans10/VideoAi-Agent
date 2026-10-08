'use client';

import { useState, type ReactNode, type Ref } from 'react';
import { Download, Share2, Link2, Check, ExternalLink, Play, Film } from 'lucide-react';
import { LibraryImageThumbnail } from './LibraryImageThumbnail.client';
import { MediaDialog } from './MediaDialog.client';
import { recentMediaCopy, recentMediaFilename } from './recent-media-copy';
import { mediaActionCopy, meaningfulMediaLabel } from './media-action-copy';
import { buildAppDownloadUrl, suggestDownloadFilename } from '@/lib/download';
import { copyTextToClipboard } from '@/lib/clipboard';
import type { AssetBrowserAsset } from './AssetLibraryBrowser';
import { SeedanceDraftFinalAction } from './SeedanceDraftFinalAction.client';
import { VideoSharePanel } from './VideoSharePanel.client';

/** One original, one reader, and the same selected output for every action. */
export function MediaActionPanel({ asset, locale, onClose, children, title, boundaryRef, navigation, details }: {
  asset: AssetBrowserAsset; locale: string; onClose: () => void; children?: ReactNode; title?: string;
  boundaryRef?: Ref<HTMLDivElement>; navigation?: ReactNode; details?: ReactNode;
}) {
  const copy = mediaActionCopy(locale);
  return <MediaDialog title={title ?? copy.title} closeLabel={copy.close} onClose={onClose} boundaryRef={boundaryRef} navigation={navigation}>
    <MediaContent key={`${asset.id}:${asset.url}`} asset={asset} locale={locale} details={details}>{children}</MediaContent>
  </MediaDialog>;
}

function MediaContent({ asset, locale, children, details }: { asset: AssetBrowserAsset; locale: string; children?: ReactNode; details?: ReactNode }) {
  const copy = mediaActionCopy(locale);
  const [playing, setPlaying] = useState(false);
  const [playbackError, setPlaybackError] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  const zh = locale.startsWith('zh'), fr = locale.startsWith('fr'), es = locale.startsWith('es');
  const labels = zh ? ['分享', '复制素材链接', '链接已复制', '打开原始素材', '详情', '无法复制链接。', '原始链接可能会过期。'] : fr ? ['Partager', 'Copier le lien du média', 'Lien copié', 'Ouvrir l’original', 'Détails', 'Impossible de copier le lien.', 'Le lien original peut expirer.'] : es ? ['Compartir', 'Copiar enlace del medio', 'Enlace copiado', 'Abrir original', 'Detalles', 'No se pudo copiar el enlace.', 'El enlace original puede caducar.'] : ['Share', 'Copy media link', 'Link copied', 'Open original', 'Details', 'Unable to copy link.', 'The original link may expire.'];
  const name = recentMediaFilename(asset.url, asset.kind);
  const label = meaningfulMediaLabel(asset.url, recentMediaCopy(locale)[asset.kind]);
  const share = async () => {
    if (asset.kind === 'video' || asset.kind === 'image') { setSharing(value => !value); return; }
    if (typeof navigator.share !== 'function') { setSharing(value => !value); return; }
    try { await navigator.share({ title: label, url: asset.url }); }
    catch (failure) { if (!(failure instanceof Error && failure.name === 'AbortError')) setSharing(true); }
  };
  return <div className="app-media-detail-layout">
    <div className="app-media-view">
      <div className={`app-media-panel-cover is-${asset.kind}`}>
        {asset.kind === 'video' ? playing ? <video key={asset.url} src={asset.url} poster={asset.thumbUrl || undefined} controls playsInline autoPlay preload="none" onError={() => setPlaybackError(true)} /> : <button type="button" className="app-media-play" aria-label={zh ? '播放视频' : fr ? 'Lire la vidéo' : es ? 'Reproducir vídeo' : 'Play video'} onClick={() => { setPlaybackError(false); setPlaying(true); }}>
          {asset.thumbUrl ? <LibraryImageThumbnail asset={{ url: asset.thumbUrl }} alt={label} /> : <Film size={64} aria-hidden />}
          <span><Play size={24} fill="currentColor" aria-hidden /></span>
        </button>
          : asset.kind === 'audio' ? <audio key={asset.url} src={asset.url} controls preload="none" />
          : <LibraryImageThumbnail asset={{ ...asset, thumbUrl: null }} alt={label} />}
      </div>
      {playbackError ? <p role="alert">{zh ? '无法播放。' : fr ? 'Lecture indisponible.' : es ? 'Reproducción no disponible.' : 'Playback unavailable.'} <button type="button" onClick={() => { setPlaybackError(false); setPlaying(false); }}>{zh ? '重试' : fr ? 'Réessayer' : es ? 'Reintentar' : 'Retry'}</button></p> : null}
      <p className="app-media-panel-filename">{[label, asset.width && asset.height ? `${asset.width} × ${asset.height}` : null, asset.durationSec ? `${asset.durationSec}s` : null].filter(Boolean).join(' · ')}</p>
      <div className="app-media-panel-transport">
        <a href={buildAppDownloadUrl(asset.url, suggestDownloadFilename(asset.url, name))}><Download size={16} aria-hidden />{copy.download}</a>
        <button type="button" aria-expanded={sharing} onClick={() => void share()} data-analytics-event={sharing ? undefined : 'cta_click'} data-analytics-cta-name="video_share_open" data-analytics-cta-location="result_modal"><Share2 size={16} aria-hidden />{labels[0]}</button>
        <a href={asset.url} target="_blank" rel="noreferrer" aria-label={labels[3]} title={labels[3]}><ExternalLink size={16} aria-hidden /></a>
      </div>
      {sharing && (asset.kind === 'video' || asset.kind === 'image') ? <VideoSharePanel asset={asset} locale={locale} /> : sharing ? <div className="app-media-share">
        <button type="button" onClick={async () => { const ok = await copyTextToClipboard(asset.url); setCopied(ok); setError(!ok); }}>{copied ? <Check size={16} aria-hidden /> : <Link2 size={16} aria-hidden />}{copied ? labels[2] : labels[1]}</button>
        <small>{labels[6]}</small>
        {error ? <p role="alert">{labels[5]}</p> : null}
      </div> : null}
    </div>
    {children || details ? <aside className="app-media-panel-actions">
      {children}
      {asset.kind === 'video' && asset.jobId ? <SeedanceDraftFinalAction jobId={asset.jobId} locale={locale} /> : null}
      {details ? <details className="app-media-details"><summary>{labels[4]}</summary><div>{details}</div></details> : null}
    </aside> : asset.kind === 'video' && asset.jobId ? <SeedanceDraftFinalAction jobId={asset.jobId} locale={locale} asAside /> : null}
  </div>;
}
