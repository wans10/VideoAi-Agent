'use client';

import { BrandLockup } from './BrandLockup';
import { useI18n } from '@/lib/i18n/I18nProvider';

const COPY = {
  zh: { title: '下一幕，\n从你的想法开始。', body: '视频、图像、声音，在一个工作室里连成作品。为每一次认真创作，留出空间。', caption: 'AI 影像工作室' },
  en: { title: 'Your next scene starts with an idea.', body: 'Bring video, images and sound together in one creative studio. Make room for the work you want to create.', caption: 'CREATIVE STUDIO' },
  fr: { title: 'Votre prochaine scène commence par une idée.', body: 'Réunissez vidéo, image et son dans un même studio. Faites place à votre prochaine création.', caption: 'STUDIO CRÉATIF' },
  es: { title: 'Tu próxima escena empieza con una idea.', body: 'Une video, imagen y sonido en un solo estudio. Dale espacio a tu próxima creación.', caption: 'ESTUDIO CREATIVO' },
};

export function AuthBrandStory() {
  const { locale } = useI18n();
  const copy = COPY[locale] ?? COPY.zh;
  return <aside className="videoai-auth-story">
    <BrandLockup caption={copy.caption} />
    <div><div className="videoai-auth-frame" aria-hidden="true"><span>SCENE / 001</span></div><h2>{copy.title}</h2><p>{copy.body}</p></div>
    <small>KEYVO / CREATIVE STUDIO</small>
  </aside>;
}
