'use client';
import { AudioWaveform, ChevronDown, Clapperboard, Images, UsersRound } from 'lucide-react';
export function LibraryMediaNavigation({ locale, value, onChange, charactersEnabled }: {
  locale: string; value: string; onChange: (value: 'all' | 'image' | 'video' | 'audio' | 'characters') => void; charactersEnabled: boolean;
}) {
  const fr = locale.startsWith('fr'), es = locale.startsWith('es'), zh = locale.startsWith('zh');
  const choices = [
      ['all', zh ? '全部' : fr ? 'Tout' : es ? 'Todos' : 'All', null],
      ['image', zh ? '图片' : es ? 'Imágenes' : 'Images', Images],
      ['video', zh ? '视频' : fr ? 'Vidéos' : 'Videos', Clapperboard],
      ['audio', zh ? '音频' : 'Audio', AudioWaveform],
      ...(charactersEnabled ? [['characters', zh ? '角色' : fr ? 'Personnages' : es ? 'Personajes' : 'Characters', UsersRound] as const] : []),
    ] as const;
  return <div className="library-media-navigation" role="group" aria-label={zh ? '素材库' : fr ? 'Bibliothèque' : es ? 'Biblioteca' : 'Library'}>
    <div className="library-media-tabs">
      {choices.map(([key, label, Icon]) => <button key={key} type="button" aria-pressed={value === key} onClick={() => onChange(key)}>{Icon ? <Icon size={16} aria-hidden /> : null}{label}</button>)}
    </div>
    <div className="library-media-select">
      <select aria-label={zh ? '媒体类型' : fr ? 'Type de média' : es ? 'Tipo de medio' : 'Media type'} value={value} onChange={event => onChange(event.target.value as typeof choices[number][0])}>
        {choices.map(([key, label]) => <option key={key} value={key}>{key === 'all' ? (zh ? '全部媒体' : fr ? 'Tous les médias' : es ? 'Todos los medios' : 'All media') : label}</option>)}
      </select>
      <ChevronDown size={16} aria-hidden />
    </div>
  </div>;
}
