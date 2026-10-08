import type { AppLocale } from '@/i18n/locales';
import type { PrepLinksSection } from '../_components/ModelPrepLinksSection';

const gptImagePrepLinks = {
  en: [{ href: '/tools/character-builder', label: 'Build a reusable character reference' }, { href: '/tools/angle', label: 'Change the viewpoint before the edit' }, { href: '/app/image?engine=gpt-image-2', label: 'Open GPT Image 2' }],
  fr: [{ href: '/tools/character-builder', label: 'Créer une référence personnage réutilisable' }, { href: '/tools/angle', label: "Changer le point de vue avant l'edit" }, { href: '/app/image?engine=gpt-image-2', label: 'Ouvrir GPT Image 2' }],
  es: [{ href: '/tools/character-builder', label: 'Crear una referencia de personaje reutilizable' }, { href: '/tools/angle', label: 'Cambiar el punto de vista antes del edit' }, { href: '/app/image?engine=gpt-image-2', label: 'Abrir GPT Image 2' }],
  zh: [{ href: '/tools/character-builder', label: '创建可复用的角色参考' }, { href: '/tools/angle', label: '在编辑前调整视角' }, { href: '/app/image?engine=gpt-image-2', label: '打开 GPT Image 2' }],
};

export function buildGptImagePrepLinksSection(locale: AppLocale): PrepLinksSection {
  if (locale === 'fr') {
    return {
      eyebrow: 'Avant de générer',
      title: 'Préparez la source avant le rendu GPT Image 2',
      body: 'Si le rendu a besoin d’un produit, d’un texte ou d’un masque fiable, préparez la source avant de lancer GPT Image 2.',
      links: gptImagePrepLinks.fr,
    };
  }
  if (locale === 'es') {
    return {
      eyebrow: 'Antes de generar',
      title: 'Prepara la fuente antes del render GPT Image 2',
      body: 'Si el render necesita producto, texto o máscara confiable, prepara la fuente antes de lanzar GPT Image 2.',
      links: gptImagePrepLinks.es,
    };
  }
  if (locale === 'zh') {
    return {
      eyebrow: '生成前准备',
      title: '在进行 GPT Image 2 渲染前准备好源素材',
      body: '如果渲染需要可靠的产品主体、精确的文字或遮罩，请在启动 GPT Image 2 前完成准备。',
      links: gptImagePrepLinks.zh,
    };
  }
  return {
    eyebrow: 'Before you generate',
    title: 'Prepare the source before the GPT Image 2 render',
    body: 'If the render needs a reliable product source, exact text or a mask, prepare that input before launching GPT Image 2.',
    links: gptImagePrepLinks.en,
  };
}
