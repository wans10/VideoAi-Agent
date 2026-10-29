import { KEYVO_COMPARE_HIDDEN } from '@/config/keyvo-model-visibility';
import { Link } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/locales';
import { CreativeFilm } from '@/components/marketing/CreativeFilm.client';
import { HOME_USE_CASE_FILMS } from './home-use-case-films';
import type { HomeExampleCard, ProviderItem, SectionCopy, ShotTypeCard } from './home-redesign-types';

const COPY = {
  en: { eyebrow: "Screening room / Shot studies", title: "Watch with a production question in mind.", body: "Study how light shapes a character, how the camera approaches a subject and whether the motion fits the intention. Open a shot to inspect its generation conditions.", all: "Open the shot archive", guides: "Explore production methods", play: 'Watch the video', loading: 'Loading…', error: 'Try again', cta: "Study this approach", labels: ['Cinematic realism', 'Image-to-video', 'Fast drafts', 'Product ads'], titles: ['Give your scene a cinematic feel.', 'Bring a still image to life.', 'Try an idea. See where it goes.', 'Put your product in the spotlight.'], descriptions: ['Explore light, camera movement and atmosphere.', 'From a starting frame to a scene in motion.', 'Explore a visual direction before refining the details.', 'Create a product story, from close-up to final shot.'] },
  fr: { eyebrow: "Projection / Études de plans", title: "Regardez avec une question de mise en scène.", body: "Observez la lumière, la place du sujet et le mouvement. Ouvrez un plan pour consulter ses conditions de génération avant de préparer vos essais.", all: "Ouvrir les archives", guides: "Explorer les méthodes", play: 'Voir la vidéo', loading: 'Chargement…', error: 'Réessayer', cta: "Étudier cette approche", labels: ['Rendu cinématographique', 'Animer une image', 'Premiers essais', 'Publicité produit'], titles: ['Donnez à votre scène une allure de cinéma.', 'Donnez vie à une image.', 'Essayez une idée. Voyez ce qu’elle donne.', 'Mettez votre produit en scène.'], descriptions: ['Explorez la lumière, les mouvements de caméra et les ambiances.', 'Une image de départ devient une scène en mouvement.', 'Explorez une piste visuelle avant d’affiner les détails.', 'Du gros plan au plan final, racontez votre produit.'] },
  es: { eyebrow: "Proyección / Estudios de planos", title: "Mira con una pregunta de realización.", body: "Observa la luz, la posición del sujeto y el movimiento. Abre un plano para consultar sus condiciones antes de preparar tus pruebas.", all: "Abrir el archivo", guides: "Explorar métodos de producción", play: 'Ver el video', loading: 'Cargando…', error: 'Reintentar', cta: "Estudiar este enfoque", labels: ['Realismo cinematográfico', 'De imagen a video', 'Primeras pruebas', 'Anuncios de productos'], titles: ['Dale un estilo de cine a tu escena.', 'Dale vida a una imagen.', 'Prueba una idea. Descubre qué sale.', 'Pon tu producto en escena.'], descriptions: ['Explora la luz, los movimientos de cámara y la atmósfera.', 'Una imagen inicial se convierte en una escena en movimiento.', 'Explora una dirección visual antes de pulir los detalles.', 'Cuenta la historia de tu producto, del detalle a la toma final.'] },
  zh: { eyebrow: "放映室 / 镜头研究", title: "带着一个制作问题，看一组镜头。", body: "观察光线怎样塑造人物，镜头如何靠近主体，运动是否符合预期。打开样片，查阅生成条件，再决定自己的试拍方式。", all: "打开样片档案", guides: "查阅制作方法", play: '观看视频', loading: '加载中…', error: '重试', cta: "研究这一类镜头", labels: ["光影与气氛", "参考图试拍", "视觉方向测试", "商业影像"], titles: ["先让环境讲述情绪。", "检查静态构图如何进入运动。", "在细化之前，验证方向。", "用一个镜头建立产品印象。"], descriptions: ["观察光线、空间层次与镜头运动的配合。", "从同一张参考图出发，判断画面的延续方式。", "用短片段评估节奏和表现，再决定下一轮试拍。", "关注材质、主体轮廓与景别变化。"] },
};

export function HomeCreativeWorlds({ locale, cards }: {
  locale: AppLocale; cards: ShotTypeCard[]; examples: HomeExampleCard[]; providers: ProviderItem[];
  examplesCopy: SectionCopy & { featuredModelCta: string };
}) {
  const c = COPY[locale] ?? COPY.en;
  return <section id="creations" className="creative-worlds home-use-case-gallery section"><div className="container-page">
    <header className="chapter-heading"><div><p className="editorial-eyebrow">{c.eyebrow}</p><h2>{c.title}</h2></div><div><p>{c.body}</p><Link href="/examples" className="text-link">{c.all}<span aria-hidden>↗</span></Link></div></header>
    <div id="choose" className="creative-worlds-grid">{HOME_USE_CASE_FILMS.map((film, i) => {
      const card = cards.find(item => item.slug === film.slug);
      return <figure key={film.slug}>
        <CreativeFilm {...film} title={c.titles[i]} playLabel={c.play} loadingLabel={c.loading} errorLabel={c.error}/>
        <figcaption><span><small>{c.labels[i]}</small><strong>{c.titles[i]}</strong></span><Link href={{ pathname: '/models/[slug]', params: { slug: film.modelSlug } }}>{film.model}<span aria-hidden> ↗</span></Link></figcaption>
        <p className="use-case-description">{c.descriptions[i]}</p>
        {!KEYVO_COMPARE_HIDDEN && card ? <Link href={card.href} className="use-case-link" data-analytics-event="shot_type_card_click" data-analytics-cta-name={card.slug} data-analytics-cta-location="shot_type_card" data-analytics-target-family="best-for">{c.cta}<span className="sr-only"> — {c.labels[i]}</span><span aria-hidden> ↗</span></Link> : null}
      </figure>;
    })}</div>
  </div></section>;
}
