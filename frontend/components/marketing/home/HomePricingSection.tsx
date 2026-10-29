import { Link } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/locales';
import type { SectionCopy } from './home-redesign-types';
import type { HomePriceModel } from './home-price-demo-types';
import { HomePriceDemo } from './HomePriceDemo.client';

const COPY = {
 en:{eyebrow: "Budget / Cost each take",title: "Know what the next camera test costs.",body: "Review the quote for your model, duration and resolution. Set the shot specifications before confirming generation, with no subscription."},
 fr:{eyebrow: "Budget / Chiffrer chaque prise",title: "Connaissez le coût du prochain essai.",body: "Consultez le devis selon le modèle, la durée et la résolution. Choisissez les paramètres avant de confirmer, sans abonnement."},
 es:{eyebrow: "Presupuesto / Coste por toma",title: "Conoce el coste de la próxima prueba.",body: "Consulta el presupuesto por modelo, duración y resolución. Elige las especificaciones antes de confirmar, sin suscripción."},
 zh:{eyebrow: "制作预算 / 按镜头核算",title: "每次试拍，都有清楚的成本。",body: "按模型、时长与分辨率查看单次生成报价。先确定这一镜需要的规格，再确认生成；按需使用，无需订阅。"},
};
export function HomePricingSection({locale,models,copy}:{locale:AppLocale;models:HomePriceModel[];copy:SectionCopy}) {
 const c = COPY[locale] ?? COPY.en;
 return <section id="your-price" className="home-price-lab section"><div className="container-page">
  <header className="chapter-heading"><div><p className="editorial-eyebrow">{c.eyebrow}</p><h2>{c.title}</h2></div><p>{c.body}</p></header>
  <HomePriceDemo locale={locale} models={models}/>
  <nav className="price-demo-related" aria-label={copy.title}><Link href="/models">{copy.modelsLink}</Link><Link href="/examples">{copy.examplesLink}</Link></nav>
 </div></section>;
}
