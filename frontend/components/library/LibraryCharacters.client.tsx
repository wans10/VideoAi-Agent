'use client';
import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import useSWRInfinite from 'swr/infinite';
import { ArrowLeft, UserRound } from 'lucide-react';
import { ownedAuthFetch } from '@/lib/owned-auth-fetch';
import type { StudioCharacter, StudioCharacterPage } from '@/types/character-studio';
import type { AssetBrowserAsset } from './AssetLibraryBrowser';
import { LibraryImageThumbnail } from './LibraryImageThumbnail.client';
import { MediaActionPanel } from './MediaActionPanel.client';
import { MediaDestinationActions } from './MediaDestinationActions.client';

const endpoint = '/api/character-studio/characters';
async function read<T>([url, owner]: readonly [string, string]): Promise<T> {
  const response = await ownedAuthFetch(url, owner);
  const body = await response.json();
  if (!response.ok || !body.ok) throw new Error('CHARACTERS_UNAVAILABLE');
  return body;
}
const studioHref = (id?: string) => `/app/tools/character-builder?tab=characters${id ? `&character=${encodeURIComponent(id)}` : ''}`;
export function LibraryCharacters({ userId, locale, navigation }: { userId: string; locale: string; navigation: ReactNode }) {
  const [selected, setSelected] = useState<string | null>(null);
  const fr = locale.startsWith('fr'), es = locale.startsWith('es'), zh = locale.startsWith('zh');
  return <section className="library-characters compact-library">
    <h1 className="sr-only">{zh ? '角色' : fr ? 'Personnages' : es ? 'Personajes' : 'Characters'}</h1>
    <header className="compact-library-header">
      <div className="compact-library-kind-actions">{navigation}</div>
      <Link prefetch={false} className="library-character-studio-link" href={selected ? studioHref(selected) : studioHref()}>{zh ? '打开角色工作室' : fr ? 'Ouvrir Character Studio' : es ? 'Abrir Character Studio' : 'Open Character Studio'}</Link>
    </header>
    <p className="library-character-intro">{zh ? '您保存的角色及其造型，可在创作、Studio 与已连接的助手中复用。' : fr ? 'Vos personnages sauvegardés et leurs looks, réutilisables dans Create, Studio et vos assistants connectés.' : es ? 'Tus personajes guardados y sus looks, reutilizables en Create, Studio y tus asistentes conectados.' : 'Your saved characters and looks, reusable in Create, Studio and your connected assistants.'}</p>
    {selected ? <CharacterDetail key={`${userId}:${selected}`} id={selected} userId={userId} locale={locale} onBack={() => setSelected(null)} /> : <CharacterList key={userId} userId={userId} locale={locale} onOpen={setSelected} />}
  </section>;
}
function Portrait({ image, label }: { image: { imageUrl: string; thumbUrl?: string }; label: string }) {
  return <div className="library-character-portrait"><UserRound aria-hidden size={28} /><LibraryImageThumbnail asset={{ url: image.imageUrl, thumbUrl: image.thumbUrl }} alt={label} posterOnly /></div>;
}
function CharacterList({ userId, locale, onOpen }: { userId: string; locale: string; onOpen: (id: string) => void }) {
  const [input, setInput] = useState(''), [search, setSearch] = useState('');
  useEffect(() => { const timer = setTimeout(() => setSearch(input.trim()), 250); return () => clearTimeout(timer); }, [input]);
  const fr = locale.startsWith('fr'), es = locale.startsWith('es'), zh = locale.startsWith('zh');
  return <>
    <label className="library-character-search"><span className="sr-only">{zh ? '搜索角色' : fr ? 'Rechercher un personnage' : es ? 'Buscar personajes' : 'Search characters'}</span><input type="search" maxLength={80} value={input} onChange={event => setInput(event.target.value)} placeholder={zh ? '搜索角色…' : fr ? 'Rechercher un personnage…' : es ? 'Buscar personajes…' : 'Search characters…'} /></label>
    <CharacterResults key={`${userId}:${search}`} userId={userId} search={search} locale={locale} onOpen={onOpen} />
  </>;
}
function CharacterResults({ userId, search, locale, onOpen }: { userId: string; search: string; locale: string; onOpen: (id: string) => void }) {
  const { data, error, isLoading, isValidating, size, setSize, mutate } = useSWRInfinite<StudioCharacterPage>((index, previous) => {
    if (index && !previous?.nextCursor) return null;
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (index) params.set('before', previous!.nextCursor!);
    return [`${endpoint}?${params}`, userId] as const;
  }, read, { revalidateFirstPage: false });
  const fr = locale.startsWith('fr'), es = locale.startsWith('es'), zh = locale.startsWith('zh');
  const characters = [...new Map((data ?? []).flatMap(page => page.characters).map(character => [character.id, character])).values()];
  return <div className="library-character-content">
    {isLoading ? <p role="status">{zh ? '正在加载角色…' : fr ? 'Chargement des personnages…' : es ? 'Cargando personajes…' : 'Loading characters…'}</p> : null}
    {error ? <ReadError locale={locale} onRetry={() => void mutate()} /> : null}
    {!isLoading && !error && !characters.length ? <p>{search ? (zh ? '没有匹配的角色。' : fr ? 'Aucun personnage correspondant.' : es ? 'No se encontraron personajes.' : 'No matching characters.') : (zh ? '还没有保存的角色。在角色工作室中保存一个形象后，会连同其造型显示在这里。' : fr ? 'Aucun personnage sauvegardé. Dans Character Studio, conservez une identité pour la retrouver ici avec ses looks.' : es ? 'No hay personajes guardados. Guarda una identidad en Character Studio para verla aquí con sus looks.' : 'No saved characters yet. Keep an identity in Character Studio to find it here with its looks.')}</p> : null}
    <div className="library-character-grid">{characters.map(character => <button key={character.id} type="button" className="library-character-card" onClick={() => onOpen(character.id)}>
      <Portrait image={character.identity} label={character.name} /><strong>{character.name}</strong><span>{character.lookCount.toLocaleString(locale)} {zh ? '个造型' : character.lookCount === 1 ? 'look' : 'looks'}</span>
    </button>)}</div>
    {data?.at(-1)?.nextCursor ? <button type="button" disabled={isValidating} onClick={() => void setSize(size + 1)}>{zh ? '加载更多角色' : fr ? 'Voir plus de personnages' : es ? 'Ver más personajes' : 'Load more characters'}</button> : null}
  </div>;
}
function ReadError({ locale, onRetry }: { locale: string; onRetry: () => void }) {
  return <p role="alert">{locale.startsWith('zh') ? '加载失败。' : locale.startsWith('fr') ? 'Chargement impossible.' : locale.startsWith('es') ? 'No se pudo cargar.' : 'Unable to load.'} <button type="button" onClick={onRetry}>{locale.startsWith('zh') ? '重试' : locale.startsWith('fr') ? 'Réessayer' : locale.startsWith('es') ? 'Reintentar' : 'Retry'}</button></p>;
}
function CharacterDetail({ id, userId, locale, onBack }: { id: string; userId: string; locale: string; onBack: () => void }) {
  const { data, error, isLoading, isValidating, size, setSize, mutate } = useSWRInfinite<{ character: StudioCharacter }>((index, previous) => {
    if (index && !previous?.character.nextLookCursor) return null;
    return [`${endpoint}/${encodeURIComponent(id)}${index ? `?beforeLook=${encodeURIComponent(previous!.character.nextLookCursor!)}` : ''}`, userId] as const;
  }, read, { revalidateFirstPage: false });
  const [viewer, setViewer] = useState<AssetBrowserAsset | null>(null);
  const fr = locale.startsWith('fr'), es = locale.startsWith('es'), zh = locale.startsWith('zh');
  const character = data?.[0].character;
  const looks = [...new Map((data ?? []).flatMap(page => page.character.looks).map(look => [look.id, look])).values()];
  const images = character ? [{ id: `identity:${character.id}`, name: character.name, ...character.identity }, ...looks] : [];
  return <div className="library-character-content">
    <div className="library-character-detail-header"><button type="button" onClick={onBack}><ArrowLeft size={16} aria-hidden />{zh ? '角色' : fr ? 'Personnages' : es ? 'Personajes' : 'Characters'}</button>{character ? <h2>{character.name}</h2> : null}</div>
    {isLoading ? <p role="status">{zh ? '正在加载造型…' : fr ? 'Chargement des looks…' : es ? 'Cargando looks…' : 'Loading looks…'}</p> : null}
    {error ? <ReadError locale={locale} onRetry={() => void mutate()} /> : null}
    <div className="library-character-grid">{images.map((image, index) => <button key={image.id} type="button" className="library-character-card" onClick={() => setViewer({ id: image.id, name: image.name, kind: 'image', source: 'character', jobId: image.jobId, url: image.imageUrl, thumbUrl: image.thumbUrl })}>
      <Portrait image={image} label={image.name} /><strong>{index === 0 ? (zh ? '形象' : fr ? 'Identité' : es ? 'Identidad' : 'Identity') : image.name}</strong><span>{index === 0 ? (zh ? '参考图' : fr ? 'Image de référence' : es ? 'Imagen de referencia' : 'Reference image') : (zh ? '造型' : 'Look')}</span>
    </button>)}</div>
    {data?.at(-1)?.character.nextLookCursor ? <button type="button" disabled={isValidating} onClick={() => void setSize(size + 1)}>{zh ? '加载更多造型' : fr ? 'Voir plus de looks' : es ? 'Ver más looks' : 'Load more looks'}</button> : null}
    {viewer ? <MediaActionPanel asset={viewer} locale={locale} onClose={() => setViewer(null)}><MediaDestinationActions asset={viewer} userId={userId} locale={locale} /><Link prefetch={false} href={studioHref(id)} className="library-character-studio-link">{zh ? '在角色工作室中管理角色' : fr ? 'Gérer le personnage dans Character Studio' : es ? 'Gestionar en Character Studio' : 'Manage character in Character Studio'}</Link></MediaActionPanel> : null}
  </div>;
}
