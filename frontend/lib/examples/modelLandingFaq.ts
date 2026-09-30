import type { AppLocale } from '@/i18n/locales';
import type { ExampleFaqItem } from '@/lib/examples/modelLandingTypes';

const HUB_FAQ_BY_LOCALE: Record<AppLocale, { title: string; items: ExampleFaqItem[] }> = {
  en: {
    title: 'Examples FAQ',
    items: [
      {
        question: "Can I reuse these examples in VideoAI?",
        answer: "Yes. Open an example and reuse its available prompt and settings as a starting point in your workspace. Add your own required images or video: private source files are not copied. Review the settings before generating.",
      },
      {
        question: "Can I start from text, an image or a video?",
        answer: "The gallery includes text-to-video, image-to-video and selected video-to-video examples. Check the model and mode shown on the result: each accepts different inputs.",
      },
      {
        question: "Will my video cost the same as the example?",
        answer: "Open the example to see its recorded render cost and settings. That is the cost of an earlier generation. Your model, duration, resolution and other options determine the current quote, which you can review before generating.",
      },
      {
        question: "Will reusing a prompt give me the same video?",
        answer: "No. A generation can vary even with the same prompt and settings. Use the example as a starting point, supply any required references and review your own result.",
      },
      {
        question: "Where can I compare model specs and limits?",
        answer: "Open the model pages for supported inputs, duration, resolution and pricing. The comparisons help you weigh capabilities and examples against your creative goal.",
      },
      {
        question: "How do I choose a model for my shot?",
        answer: "Watch examples made with that model and check the whole clip: movement, subject continuity, framing and any audio. Compare the available settings and current price, then try a short version of your scene.",
      },
    ],
  },
  fr: {
    title: 'Questions sur les exemples',
    items: [
      {
        question: "Puis-je reprendre ces exemples dans VideoAI ?",
        answer: "Oui. Ouvrez un exemple et reprenez le prompt et les réglages disponibles comme point de départ dans le studio. Ajoutez vos propres images ou vidéos si nécessaire : les fichiers sources privés ne sont pas copiés. Vérifiez les réglages avant de générer.",
      },
      {
        question: "Puis-je partir d’un texte, d’une image ou d’une vidéo ?",
        answer: "La galerie présente des exemples texte-vers-vidéo, image-vers-vidéo et certains exemples vidéo-vers-vidéo. Vérifiez le modèle et le mode indiqués sur le résultat : les sources acceptées varient.",
      },
      {
        question: "Ma vidéo coûtera-t-elle le même prix que l’exemple ?",
        answer: "Ouvrez l’exemple pour consulter son coût enregistré et ses réglages. Ce montant correspond à une génération passée. Le modèle, la durée, la résolution et les autres options déterminent le devis actuel, visible avant de générer.",
      },
      {
        question: "Reprendre un prompt donne-t-il la même vidéo ?",
        answer: "Non. Une génération peut varier même avec le même prompt et les mêmes réglages. Utilisez l’exemple comme point de départ, ajoutez les références nécessaires et examinez votre propre résultat.",
      },
      {
        question: "Où comparer les caractéristiques et limites des modèles ?",
        answer: "Les pages modèles détaillent les sources acceptées, les durées, les résolutions et les tarifs. Les comparatifs vous aident à choisir selon les fonctions disponibles, les exemples et votre projet.",
      },
      {
        question: "Comment choisir le bon modèle pour mon plan ?",
        answer: "Regardez des exemples réalisés avec ce modèle et vérifiez tout le clip : mouvement, continuité du sujet, cadrage et éventuel audio. Comparez les réglages disponibles et le prix actuel, puis essayez une version courte de votre scène.",
      },
    ],
  },
  es: {
    title: 'Preguntas sobre los ejemplos',
    items: [
      {
        question: "¿Puedo reutilizar estos ejemplos en VideoAI?",
        answer: "Sí. Abre un ejemplo y usa su prompt y los ajustes disponibles como punto de partida en el estudio. Agrega tus propias imágenes o videos cuando sea necesario: los archivos fuente privados no se copian. Revisa los ajustes antes de generar.",
      },
      {
        question: "¿Puedo empezar con texto, una imagen o un video?",
        answer: "La galería incluye ejemplos de texto a video, imagen a video y algunos de video a video. Revisa el modelo y el modo indicados en el resultado: las fuentes admitidas varían.",
      },
      {
        question: "¿Mi video costará lo mismo que el ejemplo?",
        answer: "Abre el ejemplo para ver su costo registrado y sus ajustes. Ese monto corresponde a una generación anterior. El modelo, la duración, la resolución y las demás opciones determinan la cotización actual, que puedes revisar antes de generar.",
      },
      {
        question: "¿Reutilizar un prompt produce el mismo video?",
        answer: "No. Una generación puede variar incluso con el mismo prompt y los mismos ajustes. Usa el ejemplo como punto de partida, agrega las referencias necesarias y revisa tu propio resultado.",
      },
      {
        question: "¿Dónde comparo las características y los límites de los modelos?",
        answer: "Las fichas de modelos detallan las fuentes admitidas, las duraciones, las resoluciones y los precios. Las comparativas te ayudan a elegir según las funciones, los ejemplos y lo que necesitas crear.",
      },
      {
        question: "¿Cómo elijo el modelo para mi toma?",
        answer: "Mira ejemplos hechos con ese modelo y revisa todo el video: movimiento, continuidad del sujeto, encuadre y audio, si lo tiene. Compara los ajustes disponibles y el precio actual, y prueba una versión corta de tu escena.",
      },
    ],
  },
  zh: {
    title: '案例常见问题',
    items: [
      {
        question: '我可以在 VideoAI 中复用这些案例吗？',
        answer: '可以。打开任意案例，即可将其提示词和参数设置作为工作区的起点。如有需要，请上传您自己的图像或视频：私有源文件不会被复制。生成前请确认各项设置。',
      },
      {
        question: '我可以从文本、图像或视频开始创作吗？',
        answer: '案例库包含文生视频、图生视频以及部分精选视频转视频案例。请查看结果上标注的模型和模式：不同模式支持的输入源有所不同。',
      },
      {
        question: '我的视频花费会与案例完全相同吗？',
        answer: '打开案例即可查看其历史渲染费用和参数。该费用基于先前的生成记录。实际报价取决于您选择的模型、时长、分辨率等配置，生成前可随时查看实时明细。',
      },
      {
        question: '复用相同的提示词会得到一模一样的视频吗？',
        answer: '不会。即使使用相同的提示词和参数，生成结果也会有所不同。建议将案例作为灵感起点，提供您自己的参考素材并检验最终效果。',
      },
      {
        question: '在哪里可以对比各模型的规格与限制？',
        answer: '访问各模型详情页可查看支持的输入源、最大时长、分辨率及定价明细。模型对比页有助于结合创作需求权衡各项能力与案例。',
      },
      {
        question: '如何为我的镜头挑选合适的模型？',
        answer: '观看该模型生成的完整片段：观察动态运动、主体一致性、构图及音频表现。对比可用参数设置与实时价格，然后尝试生成一个短镜头进行测试。',
      },
    ],
  },
};

export function getHubExamplesFaq(locale: AppLocale): { title: string; items: ExampleFaqItem[] } {
  return HUB_FAQ_BY_LOCALE[locale] ?? HUB_FAQ_BY_LOCALE.en;
}
