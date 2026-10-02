import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/locales';
import { getToolDefinition } from '@/src/lib/toolbox/catalogue';
import { QUICK_TOOL_ART, WORKSHOP_ART } from '@/src/components/tools/toolbox-art';

const COPY = {
  en: { eyebrow: "Camera & art / Visual references", title: "Give the scene a shared visual foundation.", body: "Define the character, decide where the audience stands and prepare the image. Resolve those choices in your references before a camera test.", cta: "Enter the camera & art workshop", note: 'Tool illustrations', names: ['Character Builder', 'Angle', 'AI Upscale', 'Background removal'], labels: ['Keep the same character', 'Change the camera angle', 'Bring out the detail', 'Remove the background'] },
  fr: { eyebrow: "Image & décors / Références", title: "Donnez une base visuelle commune à la scène.", body: "Définissez le personnage, la place du spectateur et le traitement de l’image dans vos références avant les essais.", cta: "Entrer dans l’atelier image", note: 'Illustrations des outils', names: ['Character Builder', 'Angle', 'AI Upscale', 'Détourage'], labels: ['Garder le même personnage', 'Changer l’angle de vue', 'Retrouver les détails', 'Supprimer l’arrière-plan'] },
  es: { eyebrow: "Cámara y arte / Referencias", title: "Da a la escena una base visual compartida.", body: "Define el personaje, la posición del público y el tratamiento de imagen en las referencias antes de las pruebas.", cta: "Entrar en el taller de cámara y arte", note: 'Ilustraciones de las herramientas', names: ['Character Builder', 'Angle', 'AI Upscale', 'Eliminación de fondo'], labels: ['Mantén el mismo personaje', 'Cambia el ángulo de cámara', 'Resalta los detalles', 'Elimina el fondo'] },
  zh: { eyebrow: "摄影与美术 / 参考素材", title: "为同一场戏，建立共同的视觉依据。", body: "人物长什么样，观众从哪里看，画面需要怎样处理。把这些决定落实到参考素材，再进入镜头试拍。", cta: "进入摄影与美术工房", note: '工具功能示意图', names: ["角色设定", "机位勘景", "画质精修", "主体分离"], labels: ["建立角色参考", "研究场景机位", "准备清晰的画面细节", "分离视频主体"] },
};

export function HomeToolsGallery({locale}: {locale:AppLocale}) {
  const copy = COPY[locale] ?? COPY.en;
  const cards = [
    {key:'character', href:'/tools/character-builder', src:WORKSHOP_ART['character-builder']},
    {key:'angle', href:'/tools/angle', src:WORKSHOP_ART.angle},
    {key:'upscale', href:'/tools/upscale', src:QUICK_TOOL_ART['upscale-image']},
  ];
  const smallLabels = {
    en: ['Remove the background', 'Restore a video', 'Reduce noise', 'Fix motion blur', 'Smooth motion', 'Build a storyboard'],
    fr: ['Supprimer l’arrière-plan', 'Restaurer une vidéo', 'Réduire le bruit', 'Corriger le flou', 'Fluidifier le mouvement', 'Créer un storyboard'],
    es: ['Eliminar el fondo', 'Restaurar un video', 'Reducir el ruido', 'Corregir el desenfoque', 'Suavizar el movimiento', 'Crear un storyboard'],
    zh: ['一键抠除背景', '视频智能修复', '视频画质降噪', '修复动态模糊', '动作平滑补帧', '制作故事分镜板'],
  }[locale] ?? ['Remove the background', 'Restore a video', 'Reduce noise', 'Fix motion blur', 'Smooth motion', 'Build a storyboard'];
  const smallCards = [
    {key:'background-removal', href:'/tools/background-removal', src:QUICK_TOOL_ART['background-removal']},
    ...(['restore-video', 'denoise', 'fix-blur', 'smooth-motion'] as const).map(key => ({key, href:getToolDefinition(key)!.href, src:QUICK_TOOL_ART[key]})),
    {key:'storyboard', href:getToolDefinition('storyboard')!.href, src:WORKSHOP_ART.storyboard},
  ];
  return <section id="toolkit" className="home-tools-gallery section">
    <div className="container-page studio-toolkit">
      <header className="chapter-heading"><div><p className="editorial-eyebrow">{copy.eyebrow}</p><h2>{copy.title}</h2></div><div><p>{copy.body}</p><Link href="/tools" className="text-link">{copy.cta}<span aria-hidden>↗</span></Link></div></header>
      <div className="home-tool-visuals">{cards.map((card,index) => <Link key={card.key} href={card.href} className="home-tool-visual" data-analytics-event="tool_card_click" data-analytics-cta-name={card.key} data-analytics-cta-location="toolbox" data-analytics-tool-name={card.key} data-analytics-tool-surface="public">
        <div><Image src={card.src} alt={copy.labels[index]} fill unoptimized sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw" loading="lazy" /></div>
        <span><span><small><b aria-hidden="true">0{index + 1} / </b>{copy.names[index]}</small><h3>{copy.labels[index]}</h3></span><span aria-hidden>↗</span></span>
      </Link>)}</div>
      <div className="home-tool-shortcuts">{smallCards.map((card, index) => <Link key={card.key} href={card.href} prefetch={false} className="home-tool-shortcut" data-analytics-event="tool_card_click" data-analytics-cta-name={card.key} data-analytics-cta-location="toolbox" data-analytics-tool-name={card.key} data-analytics-tool-surface="public">
        <Image src={card.src} alt="" aria-hidden="true" width={64} height={48} sizes="64px" loading="lazy"/>
        <span>{smallLabels[index]}</span><span aria-hidden>↗</span>
      </Link>)}</div>
      <p className="tool-gallery-note">{copy.note}</p>
    </div>
  </section>;
}
