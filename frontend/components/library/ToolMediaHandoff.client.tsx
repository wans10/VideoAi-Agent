'use client';

import { useState } from 'react';
import { useMediaHandoff } from './useMediaHandoff';
import { MediaActionPanel } from './MediaActionPanel.client';
import type { MediaToolDestination } from '@/lib/media-handoff';
import type { AssetBrowserAsset } from './AssetLibraryBrowser';

/** Destination confirmation protects any source/draft already open in the tool. */
export function ToolMediaHandoff({ userId, destination, locale, onSelect, disabled = false }: {
  userId?: string | null; destination: MediaToolDestination; locale: string;
  onSelect: (asset: AssetBrowserAsset) => void | Promise<void>; disabled?: boolean;
}) {
  const handoff = useMediaHandoff(userId, destination);
  const [pending, setPending] = useState(false), [error, setError] = useState(false);
  const fr = locale.startsWith('fr'), es = locale.startsWith('es'), zh = locale.startsWith('zh');
  if (!handoff.asset) return null;
  return <MediaActionPanel asset={handoff.asset} locale={locale} onClose={handoff.close} title={fr ? 'Source de l’outil' : es ? 'Fuente de la herramienta' : zh ? '工具源素材' : 'Tool source'}>
    <button type="button" disabled={pending || disabled} onClick={async () => {
      if (!handoff.asset || pending || disabled) return;
      setPending(true); setError(false);
      try { await onSelect(handoff.asset); handoff.close(); } catch { setError(true); } finally { setPending(false); }
    }}>{pending ? '…' : fr ? 'Utiliser cette source' : es ? 'Usar esta fuente' : zh ? '使用此源素材' : 'Use this source'}</button>
    {error ? <p role="alert">{fr ? 'Source indisponible. Réessayez.' : es ? 'Fuente no disponible. Inténtalo de nuevo.' : zh ? '源素材不可用，请重试。' : 'Source unavailable. Try again.'}</p> : null}
  </MediaActionPanel>;
}
