import { HomeAssistantStrip } from './HomeAssistantStrip';
import { HomeStudioPreview } from './HomeStudioPreview';
import { Link } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/locales';

const COPY = {
  en: {
    eyebrow: 'Create in VideoAI', title: 'From your first idea to your next video.',
    body: 'Start with an image you create here, bring your own references, or describe a scene. Choose a model and shape the result in one workspace.',
    cta: 'Create a video', image: 'Create an image', character: 'Build a character', angle: 'Explore camera angles',
    modes: [['Video', 'Turn an idea, an image or an existing clip into your next scene.'], ['Images', 'Create the starting image, explore a look or prepare references for your video.'], ['Audio', 'Create audio for your project, alongside your images and videos.']],
  },
  fr: {
    eyebrow: 'Créer dans VideoAI', title: 'De votre idée à votre prochaine vidéo.',
    body: 'Créez une première image ici, importez vos références ou décrivez simplement une scène. Choisissez un modèle, puis composez votre vidéo dans le même espace.',
    cta: 'Créer une vidéo', image: 'Créer une image', character: 'Créer un personnage', angle: 'Explorer les angles de vue',
    modes: [['Vidéo', 'Transformez une idée, une image ou un clip existant en une nouvelle scène.'], ['Image', 'Créez votre image de départ, cherchez un style ou préparez les références de votre vidéo.'], ['Audio', 'Créez aussi l’audio de votre projet, au même endroit que vos images et vos vidéos.']],
  },
  es: {
    eyebrow: 'Crea en VideoAI', title: 'De tu idea a tu próximo video.',
    body: 'Crea tu primera imagen aquí, sube tus referencias o describe una escena. Elige un modelo y dale forma a tu video en un solo lugar.',
    cta: 'Crear un video', image: 'Crear una imagen', character: 'Crear un personaje', angle: 'Explorar ángulos de cámara',
    modes: [['Video', 'Convierte una idea, una imagen o un clip en tu próxima escena.'], ['Imágenes', 'Crea tu imagen inicial, explora un estilo o prepara las referencias de tu video.'], ['Audio', 'Crea también el audio de tu proyecto, en el mismo lugar que tus imágenes y videos.']],
  },
  zh: {
    eyebrow: '在 VideoAI 中创作', title: '从初步构想到成片视频。',
    body: '直接在此生成起始图片、上传你自己的参考素材，或直接输入场景描述。在一个工作区内选择模型并精细调整生成结果。',
    cta: '开始制作视频', image: '生成图像', character: '制作角色', angle: '多角度机位运镜',
    modes: [['视频', '将创意、参考图或现有视频转换为全新的镜头场景。'], ['图像', '生成起始帧图片、探索风格调性或为视频准备参考素材。'], ['音频', '与图片和视频同步，为你的视频项目生成配乐与音效。']],
  },
} satisfies Record<AppLocale, unknown>;

export function HomeCreationSection({ locale, assistantHref }: { locale: AppLocale; assistantHref?: string }) {
  const copy = COPY[locale];
  return (
    <section id="create" className="home-create-chapter section border-b border-hairline bg-surface">
      <div className="container-page">
        <div className="editorial-split">
          <div>
            <p className="editorial-eyebrow">{copy.eyebrow}</p>
            <h2 className="editorial-heading">{copy.title}</h2>
            <p className="editorial-body">{copy.body}</p>
            <Link href="/app" prefetch={false} className="editorial-action" data-analytics-event="cta_click" data-analytics-cta-name="home_create_video" data-analytics-cta-location="home_creation">{copy.cta}<span aria-hidden>↗</span></Link>
            <div className="editorial-links">
              <Link href="/app/image" prefetch={false}>{copy.image}</Link>
              <Link href={{ pathname: '/tools/character-builder' }} prefetch={false}>{copy.character}</Link>
              <Link href={{ pathname: '/tools/angle' }} prefetch={false}>{copy.angle}</Link>
            </div>
          </div>
          <HomeStudioPreview locale={locale} />
        </div>
        <div className="creation-modes">
          {copy.modes.map(([title, body], index) => <Link key={title} href={['/app', '/app/image', '/app/audio'][index]} prefetch={false}><strong>{title} <span aria-hidden>↗</span></strong><span>{body}</span></Link>)}
        </div>
        {assistantHref ? <HomeAssistantStrip locale={locale} href={assistantHref}/> : null}
      </div>
    </section>
  );
}
