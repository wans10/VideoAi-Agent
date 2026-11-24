'use client';
import { useEffect } from 'react';
import useSWR from 'swr';
import { HardDrive } from 'lucide-react';
import { ownedAuthFetch } from '@/lib/owned-auth-fetch';
import { useLibraryCacheRevision } from '@/hooks/useLibraryCacheRevision';
import { CompactLibraryPopup } from './CompactLibraryPopup.client';
import { libraryTrashCopy } from './library-trash-copy';
type Usage = {
  recordedBytes: number; measuredFiles: number; totalFiles: number; limitBytes: null; enforcement: false;
  pendingDeletionFiles?: number; pendingDeletionBytes?: number; failedDeletionFiles?: number; trashedFiles?: number; trashedBytes?: number;
  sharedDeletionFiles?: number; sharedDeletionBytes?: number;
};
export function LibraryStorageUsage({ userId, locale }: { userId: string; locale: string }) {
  const revision = useLibraryCacheRevision(userId), trashCopy = libraryTrashCopy(locale);
  const { data, error, mutate } = useSWR(['library-storage', userId, revision], async ([, owner]) => {
    const response = await ownedAuthFetch('/api/media-library/storage', owner);
    const body = await response.json();
    if (!response.ok || !body.ok) throw new Error('STORAGE_UNAVAILABLE');
    return body.usage as Usage;
  }, {
    keepPreviousData: false,
    revalidateOnFocus: true,
    shouldRetryOnError: false,
  });
  const cleanupPending = (data?.pendingDeletionFiles ?? 0) > 0;
  useEffect(() => {
    if (!cleanupPending) return;
    let active = true, inFlight = false;
    const timer = window.setInterval(() => {
      if (!active || inFlight || document.visibilityState === 'hidden' || navigator.onLine === false) return;
      inFlight = true;
      void mutate().catch(() => { /* SWR exposes the failed read and its Retry action. */ }).finally(() => { inFlight = false; });
    }, 12_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [cleanupPending, userId, revision, mutate]);
  const fr = locale.startsWith('fr'), es = locale.startsWith('es'), zh = locale.startsWith('zh');
  const title = zh ? '存储' : fr ? 'Stockage' : es ? 'Almacenamiento' : 'Storage';
  const amount = data ? new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(data.recordedBytes / 1_000_000_000) : null;
  return <div className="library-storage-usage">
    <HardDrive size={14} aria-hidden />
    <CompactLibraryPopup label={`${title} · ${error ? (zh ? '暂不可用' : fr ? 'Indisponible' : es ? 'No disponible' : 'Unavailable') : amount === null ? '…' : `${amount} ${zh ? 'GB' : fr ? 'Go' : 'GB'}`}`}>
      <div className="library-storage-details">
        <strong>{title}</strong>
        {error ? <p role="alert">{zh ? '暂无法读取用量。' : fr ? 'Mesure indisponible.' : es ? 'Medición no disponible.' : 'Usage unavailable.'} <button type="button" onClick={() => void mutate()}>{zh ? '重试' : fr ? 'Réessayer' : es ? 'Reintentar' : 'Retry'}</button></p> : data ? <>
          <p>{zh ? `已统计 ${data.measuredFiles.toLocaleString(locale)} / ${data.totalFiles.toLocaleString(locale)} 个文件。` : fr ? `${data.measuredFiles.toLocaleString(locale)} fichiers mesurés sur ${data.totalFiles.toLocaleString(locale)}.` : es ? `${data.measuredFiles.toLocaleString(locale)} de ${data.totalFiles.toLocaleString(locale)} archivos medidos.` : `${data.measuredFiles.toLocaleString(locale)} of ${data.totalFiles.toLocaleString(locale)} files measured.`}</p>
          <p>{zh ? '按已记录大小估算原始文件，包含回收站与待清理文件；未统计的文件、缩略图和预览不计入。' : fr ? 'Estimation des originaux dont la taille est connue, corbeille et nettoyage en attente inclus. Les fichiers non mesurés, vignettes et aperçus ne sont pas comptés.' : es ? 'Estimación de originales con tamaño conocido, incluida la papelera y la limpieza pendiente. No incluye archivos sin medir, miniaturas ni vistas previas.' : 'Estimate of originals with a recorded size, including Trash and pending cleanup. Unmeasured files, thumbnails and previews are not included.'}</p>
          {data.trashedFiles ? <p>{trashCopy.trashFiles(data.trashedFiles)}</p> : null}
          {data.pendingDeletionFiles ? <p>{trashCopy.pendingFiles(data.pendingDeletionFiles)}. {trashCopy.retained}</p> : null}
          {data.failedDeletionFiles ? <p role="status">{trashCopy.failedFiles(data.failedDeletionFiles)}</p> : null}
          {data.sharedDeletionFiles ? <p>{trashCopy.sharedFiles(data.sharedDeletionFiles)}. {trashCopy.sharedRetained}</p> : null}
        </> : <p role="status">{zh ? '正在计算…' : fr ? 'Calcul en cours…' : es ? 'Calculando…' : 'Calculating…'}</p>}
        <p>{zh ? '目前未设置存储配额。' : fr ? 'Aucun quota de stockage appliqué pour le moment.' : es ? 'Todavía no se aplica ninguna cuota de almacenamiento.' : 'No storage quota is currently enforced.'}</p>
      </div>
    </CompactLibraryPopup>
    {data?.pendingDeletionFiles ? <span role="status">{trashCopy.pendingFiles(data.pendingDeletionFiles)}</span> : null}
    {data?.sharedDeletionFiles ? <span role="status">{trashCopy.sharedFiles(data.sharedDeletionFiles)}</span> : null}
    <span className="library-storage-note-long">{zh ? '预估 · 暂无上限' : fr ? 'Estimation · limite inactive' : es ? 'Estimación · límite inactivo' : 'Estimate · limit inactive'}</span>
    <span className="library-storage-note-short" aria-label={zh ? '预估' : fr ? 'Estimation' : es ? 'Estimación' : 'Estimate'}>{zh ? '预估' : 'est.'}</span>
  </div>;
}
