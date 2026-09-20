import type { AppLocale } from '@/i18n/locales';
import type { PrepLinksSection } from '../_components/ModelPrepLinksSection';

const NANO_BANANA_MODEL_SLUGS = new Set(['nano-banana', 'nano-banana-pro', 'nano-banana-2', 'gpt-image-2']);
const VIDEO_PREP_MODEL_SLUGS = new Set(['veo-3-1', 'kling-3-pro', 'happy-horse-1-1', 'happy-horse-1-0', 'sora-2-pro', 'ltx-2-3-pro', 'ltx-2-3-fast']);
const gptImagePrepLinks = {
  en: [{ href: '/tools/character-builder', label: 'Build a reusable character reference' }, { href: '/tools/angle', label: 'Change the viewpoint before the edit' }, { href: '/app/image?engine=gpt-image-2', label: 'Open GPT Image 2' }],
  fr: [{ href: '/tools/character-builder', label: 'Créer une référence personnage réutilisable' }, { href: '/tools/angle', label: "Changer le point de vue avant l'edit" }, { href: '/app/image?engine=gpt-image-2', label: 'Ouvrir GPT Image 2' }],
  es: [{ href: '/tools/character-builder', label: 'Crear una referencia de personaje reutilizable' }, { href: '/tools/angle', label: 'Cambiar el punto de vista antes del edit' }, { href: '/app/image?engine=gpt-image-2', label: 'Abrir GPT Image 2' }],
  zh: [{ href: '/tools/character-builder', label: '创建可复用的角色参考' }, { href: '/tools/angle', label: '在编辑前调整视角' }, { href: '/app/image?engine=gpt-image-2', label: '打开 GPT Image 2' }],
};

export function buildModelPrepLinksSection(modelSlug: string, locale: AppLocale): PrepLinksSection | null {
  if (modelSlug === 'gpt-image-2') {
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

  const isNanoBananaFamily = NANO_BANANA_MODEL_SLUGS.has(modelSlug);
  const isVideoPrepModel = VIDEO_PREP_MODEL_SLUGS.has(modelSlug);

  if (!isNanoBananaFamily && !isVideoPrepModel) {
    return null;
  }

  if (locale === 'fr') {
    return isNanoBananaFamily
      ? {
          eyebrow: 'Avant de générer',
          title: 'Préparez la référence avant l’edit',
          body: 'Si l’image a d’abord besoin d’une référence personnage réutilisable ou d’un meilleur angle, réglez ça avant Nano Banana.',
          links: [
            { href: '/tools/character-builder', label: 'Créer une référence personnage réutilisable' },
            { href: '/tools/angle', label: "Changer le point de vue avant l'edit" },
            { href: '/app/image', label: 'Ouvrir Image' },
          ],
        }
      : {
          eyebrow: 'Avant de générer',
          title: 'Préparez le frame avant la vidéo',
          body: 'Verrouillez le personnage, corrigez l’angle ou construisez l’image source avant de dépenser des crédits en motion.',
          links: [
            { href: '/tools/character-builder', label: 'Conserver le même personnage' },
            { href: '/tools/angle', label: 'Changer l’angle de caméra avant la vidéo' },
            { href: '/app/image', label: "Construire l'image source dans Image" },
          ],
        };
  }

  if (locale === 'es') {
    return isNanoBananaFamily
      ? {
          eyebrow: 'Antes de generar',
          title: 'Prepara la referencia antes del edit',
          body: 'Si la imagen primero necesita una referencia de personaje reutilizable o un mejor ángulo, resuélvelo antes de Nano Banana.',
          links: [
            { href: '/tools/character-builder', label: 'Crear una referencia de personaje reutilizable' },
            { href: '/tools/angle', label: 'Cambiar el punto de vista antes del edit' },
            { href: '/app/image', label: 'Abrir Image' },
          ],
        }
      : {
          eyebrow: 'Antes de generar',
          title: 'Prepara el frame antes del video',
          body: 'Fija el personaje, corrige el ángulo o construye la imagen base antes de gastar créditos en motion.',
          links: [
            { href: '/tools/character-builder', label: 'Mantener el mismo personaje' },
            { href: '/tools/angle', label: 'Cambiar el ángulo de cámara antes del video' },
            { href: '/app/image', label: 'Construir la imagen base en Image' },
          ],
        };
  }

  if (locale === 'zh') {
    return isNanoBananaFamily
      ? {
          eyebrow: '生成前准备',
          title: '在编辑前建立角色参考',
          body: '如果图像首先需要可复用的角色参考或更好的视角，请在使用 Nano Banana 前调整好。',
          links: [
            { href: '/tools/character-builder', label: '创建可复用的角色参考' },
            { href: '/tools/angle', label: '在编辑前调整视角' },
            { href: '/app/image', label: '打开图像工具' },
          ],
        }
      : {
          eyebrow: '生成前准备',
          title: '在生成视频前准备关键帧',
          body: '在消耗积分生成动态之前，先锁定角色形象、校正镜头角度或构建源图像。',
          links: [
            { href: '/tools/character-builder', label: '保持角色一致性' },
            { href: '/tools/angle', label: '在视频生成前调整相机角度' },
            { href: '/app/image', label: '在图像工具中构建源图像' },
          ],
        };
  }

  return isNanoBananaFamily
    ? {
        eyebrow: 'Before you generate',
        title: 'Build the reference before the edit',
        body: 'If the still needs a reusable character reference or a better viewpoint first, solve that before Nano Banana.',
        links: [
          { href: '/tools/character-builder', label: 'Build a reusable character reference' },
          { href: '/tools/angle', label: 'Change the viewpoint before the edit' },
          { href: '/app/image', label: 'Open Image' },
        ],
      }
    : {
        eyebrow: 'Before you generate',
        title: 'Prepare the frame before video',
        body: 'Lock the character, fix the viewpoint, or build the source still before you spend credits on motion.',
        links: [
          { href: '/tools/character-builder', label: 'Keep the character consistent' },
          { href: '/tools/angle', label: 'Change the camera angle before video' },
          { href: '/app/image', label: 'Build the source still in Image' },
        ],
      };
}
