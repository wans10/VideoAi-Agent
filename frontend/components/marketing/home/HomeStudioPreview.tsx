import Image from 'next/image';
import type { AppLocale } from '@/i18n/locales';
import { BrandLockup } from '@/components/brand/BrandLockup';
import { CREATIVE_FILMS } from '@/components/marketing/creative-films';

const COPY = {
  zh: { label: '创作流程示意 · 作品为公开示例', title: '你的下一幕', steps: ['选择模型', '描述画面', '生成与调整'], input: '用一句话描述场景，让创意在这里开始。', output: '作品预览', video: '视频', image: '图像', audio: '音频' },
  en: { label: 'Illustrated workflow · public example', title: 'Your next scene', steps: ['Choose a model', 'Describe your scene', 'Generate and refine'], input: 'Describe a scene. Your next idea starts here.', output: 'Output preview', video: 'Video', image: 'Image', audio: 'Audio' },
  fr: { label: 'Schéma du workflow · exemple public', title: 'Votre prochaine scène', steps: ['Choisir un modèle', 'Décrire la scène', 'Générer et affiner'], input: 'Décrivez une scène. Votre idée commence ici.', output: 'Aperçu', video: 'Vidéo', image: 'Image', audio: 'Audio' },
  es: { label: 'Flujo ilustrativo · ejemplo público', title: 'Tu próxima escena', steps: ['Elige un modelo', 'Describe la escena', 'Genera y ajusta'], input: 'Describe una escena. Tu idea empieza aquí.', output: 'Vista previa', video: 'Video', image: 'Imagen', audio: 'Audio' },
};

/** An explicitly illustrative, noninteractive workflow; never presents a fabricated live job. */
export function HomeStudioPreview({ locale }: { locale: AppLocale }) {
  const copy = COPY[locale];
  const film = CREATIVE_FILMS[3];
  return (
    <figure className="videoai-studio-preview">
      <div className="videoai-studio-preview-bar"><BrandLockup /><span>{copy.title}</span></div>
      <div className="videoai-studio-preview-tabs" aria-hidden="true"><b>{copy.video}</b><span>{copy.image}</span><span>{copy.audio}</span></div>
      <div className="videoai-studio-preview-body">
        <ol>{copy.steps.map((step, index) => <li key={step}><span>{String(index + 1).padStart(2, '0')}</span><strong>{step}</strong>{index === 0 ? <small>{film.model}</small> : index === 1 ? <p>{copy.input}</p> : null}</li>)}</ol>
        <div className="videoai-studio-preview-output"><Image src={film.poster} alt={copy.output} fill sizes="(max-width: 767px) 80vw, 360px" loading="lazy" /><span>{copy.output} / 01</span></div>
      </div>
      <figcaption>{copy.label}</figcaption>
    </figure>
  );
}
