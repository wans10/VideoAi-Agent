'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Download, ExternalLink, Link2, Share2 } from 'lucide-react';
import type { AssetBrowserAsset } from './AssetLibraryBrowser';
import { buildAppDownloadUrl, suggestDownloadFilename } from '@/lib/download';
import { copyTextToClipboard } from '@/lib/clipboard';
import { DOMESTIC_SHARE_PLATFORMS, type DomesticShareTarget } from './domestic-share-platforms';
import { videoShareCopy } from './video-share-copy';

export function VideoSharePanel({ asset, locale, fixedShareUrl }: { asset: AssetBrowserAsset; locale: string; fixedShareUrl?: string }) {
  const copy = videoShareCopy(locale);
  const isImage = asset.kind === 'image';
  const mediaLabel = isImage ? '图片' : '视频';
  const panelRef = useRef<HTMLElement>(null);
  const [signature, setSignature] = useState(`使用 VideoAI 创作的${mediaLabel}`);
  const [shareUrl, setShareUrl] = useState<string | null>(fixedShareUrl ?? null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(!fixedShareUrl && !isImage);
  const [error, setError] = useState<string | null>(null);
  const [activeVideoTarget, setActiveVideoTarget] = useState<DomesticShareTarget | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preparingFile, setPreparingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [revoking, setRevoking] = useState(false);
  const filename = suggestDownloadFilename(asset.url, isImage ? 'videoai-image.png' : 'videoai-video.mp4');
  const downloadHref = !isImage && asset.source === 'public-example' && asset.jobId
    ? `/api/video-shares/public-download?${new URLSearchParams({ jobId: asset.jobId })}`
    : buildAppDownloadUrl(asset.url, filename);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => panelRef.current?.scrollIntoView?.({ block: 'nearest' }));
    return () => window.cancelAnimationFrame(frame);
  }, [activeVideoTarget, fileError]);

  useEffect(() => {
    if (fixedShareUrl || isImage) return;
    const controller = new AbortController();
    void fetch('/api/video-shares', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
      body: JSON.stringify({ assetId: asset.id, sourceOutputId: asset.sourceOutputId, jobId: asset.jobId, url: asset.url, source: asset.source }),
    }).then(async response => {
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.ok || typeof body.url !== 'string' || (body.token !== null && typeof body.token !== 'string')) {
        throw new Error(response.status === 422 ? 'unavailable' : 'failed');
      }
      setShareUrl(body.url);
      setToken(body.token);
    }).catch(failure => {
      if (controller.signal.aborted) return;
      setError(failure instanceof Error && failure.message === 'unavailable' ? copy.linkUnavailable : copy.shareFailed);
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [asset.id, asset.sourceOutputId, asset.jobId, asset.url, asset.source, copy.linkUnavailable, copy.shareFailed, fixedShareUrl, isImage]);

  useEffect(() => {
    setFile(null);
    setFileError(null);
    setPreparingFile(false);
    if (!activeVideoTarget) return;
    if (typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function') {
      setFileError(copy.fileUnavailable);
      return;
    }
    const controller = new AbortController();
    setPreparingFile(true);
    void fetch(downloadHref, { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error('download');
      const blob = await response.blob();
      const prepared = new File([blob], filename, { type: blob.type || asset.mime || (isImage ? 'image/png' : 'video/mp4') });
      if (!navigator.canShare({ files: [prepared] })) throw new Error('unsupported');
      setFile(prepared);
    }).catch(() => { if (!controller.signal.aborted) setFileError(copy.fileUnavailable); })
      .finally(() => { if (!controller.signal.aborted) setPreparingFile(false); });
    return () => controller.abort();
  }, [activeVideoTarget, copy.fileUnavailable, downloadHref, filename, asset.mime, isImage]);

  const copyLink = async () => {
    if (!shareUrl) return;
    const ok = await copyTextToClipboard(shareUrl);
    setFeedback(ok ? copy.copied : copy.shareFailed);
  };
  const copyCaption = async () => {
    const ok = await copyTextToClipboard(signature);
    setFeedback(ok ? copy.signatureCopied : copy.shareFailed);
  };
  const shareFile = async () => {
    if (!file) return;
    try {
      await navigator.share({ files: [file], ...(signature.trim() ? { text: signature.trim() } : {}) });
    } catch (failure) {
      if (!(failure instanceof Error && failure.name === 'AbortError')) setFileError(copy.fileUnavailable);
    }
  };
  const revoke = async () => {
    if (!token) return;
    setRevoking(true);
    try {
      const response = await fetch('/api/video-shares', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) });
      if (!response.ok) throw new Error('revoke');
      setToken(null);
      setShareUrl(null);
      setError(copy.linkRevoked);
    } catch { setFeedback(copy.shareFailed); }
    finally { setRevoking(false); }
  };

  const selectedPlatform = DOMESTIC_SHARE_PLATFORMS.find(platform => platform.id === activeVideoTarget);
  const chooseVideoTarget = (target: DomesticShareTarget) => {
    setActiveVideoTarget(current => current === target ? null : target);
    setFeedback(null);
  };

  return <section ref={panelRef} className="app-media-share app-video-share" aria-label={`分享${mediaLabel}`}>
    <div className="app-video-share-destinations">
      {!isImage ? <button type="button" onClick={() => void copyLink()} disabled={!shareUrl} aria-label={copy.copied === feedback ? copy.copied : copy.link} data-analytics-event="cta_click" data-analytics-cta-name="video_share_link" data-analytics-cta-location="share_panel"><Link2 size={21} aria-hidden /><span>{copy.link}</span></button> : null}
      {DOMESTIC_SHARE_PLATFORMS.map(platform => <button key={platform.id} type="button" aria-pressed={activeVideoTarget === platform.id} onClick={() => chooseVideoTarget(platform.id)} data-analytics-event="cta_click" data-analytics-cta-name={`video_share_${platform.id}`} data-analytics-cta-location="share_panel"><Share2 size={21} aria-hidden /><span>{platform.label}</span></button>)}
    </div>
    {selectedPlatform ? <>
      <p className="app-video-share-note">先下载{mediaLabel}、复制文案，再到{selectedPlatform.label}选择相应发布方式并上传。发布前请检查内容。</p>
      <div className="app-video-share-file-actions">
        <a href={downloadHref} data-analytics-event="cta_click" data-analytics-cta-name="media_share_download" data-analytics-cta-location="share_panel"><Download size={17} aria-hidden />下载原始{mediaLabel}</a>
        <a href={selectedPlatform.url} target="_blank" rel="noopener noreferrer" data-analytics-event="cta_click" data-analytics-cta-name={`media_publish_${selectedPlatform.id}`} data-analytics-cta-location="share_panel"><ExternalLink size={17} aria-hidden />打开{selectedPlatform.label}创作者中心</a>
        {file || preparingFile ? <button type="button" disabled={!file || preparingFile} onClick={() => void shareFile()}><Share2 size={17} aria-hidden />{preparingFile ? '正在准备文件…' : '通过手机应用分享文件'}</button> : null}
      </div>
      <p className="app-video-share-note">手机系统分享菜单仅显示设备支持的应用；选择目标应用后，仍需在该应用内确认发布。不会自动上传。</p>
      {fileError ? <p className="app-video-share-note" role="status">当前浏览器无法直接分享文件，请下载后手动上传。</p> : null}
    </> : <p className="app-video-share-note">选择发布平台，准备文件和文案。</p>}
    <label className="app-video-share-signature"><span>分享文案（可编辑）</span><input value={signature} onChange={event => setSignature(event.target.value)} maxLength={240} /></label>
    <button className="app-video-share-copy-signature" type="button" onClick={() => void copyCaption()}>{feedback === copy.signatureCopied || feedback === copy.hashtagCopied ? <Check size={14} aria-hidden /> : null}复制文案</button>
    <div className="app-video-share-footnote">
      <small>{isImage ? '分享原始图片文件，不创建公开素材链接。' : loading ? copy.preparing : error ?? (asset.source === 'public-example' ? copy.exampleNotice : copy.publicNotice)}</small>
      {token ? <button type="button" onClick={() => void revoke()} disabled={revoking}>{revoking ? copy.revoking : copy.revoke}</button> : null}
    </div>
    {feedback ? <p role="status" className="app-video-share-feedback">{feedback}</p> : null}
  </section>;
}
