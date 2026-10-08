import type { AppLocale } from '@/i18n/locales';
import { getMcpEditorialCopy } from '@/components/marketing/mcp/mcp-editorial-copy';
import type { IntegrationPageCopy } from './types';

export function refineIntegrationCopy(copy: IntegrationPageCopy, locale: AppLocale): IntegrationPageCopy {
  const editorial = getMcpEditorialCopy(locale);
  const client = copy.client as keyof typeof editorial.modes;
  const titles = {
    zh: {claude:'从 Claude 创意简报到 AI 片段。',chatgpt:'在 ChatGPT 中创作 AI 视频。',codex:'为代码项目制作发布视频。',openclaw:'用 OpenClaw 创作 AI 视频。',n8n:'用 n8n 自动化 AI 视频流程。'},
    en: {claude:'Turn your Claude brief into an AI clip.',chatgpt:'Bring AI video into ChatGPT.',codex:'Create a launch clip alongside your code.',openclaw:'AI video. Powered by OpenClaw.',n8n:'Automate AI video with n8n.'},
    fr: {claude:'Du brief dans Claude au clip IA.',chatgpt:'La vidéo IA entre dans ChatGPT.',codex:'Créez un clip de lancement avec Codex.',openclaw:'Vos vidéos IA, avec OpenClaw.',n8n:'Automatisez vos vidéos IA avec n8n.'},
    es: {claude:'Del brief en Claude a un clip con IA.',chatgpt:'Lleva el video con IA a ChatGPT.',codex:'Crea un clip de lanzamiento con Codex.',openclaw:'Crea videos con IA en OpenClaw.',n8n:'Automatiza tus videos con IA en n8n.'},
  };
  const activeTitles = titles[locale] ?? titles.en;
  if (!activeTitles[client] || !['claude','chatgpt','codex','openclaw','n8n'].includes(client)) return copy;
  const intros = {
    zh: {claude:'在 Claude Desktop 中提交产品需求，审核准确报价，再从 MaxVideoAI 获取短片。',chatgpt:'将对话中的项目变成视频。比较模型、选择参数，并在生成前确认准确价格。',codex:'为项目或网站发布制作短视频。使用 MaxVideoAI 插件准备方案，审核准确报价并获取成片。',openclaw:'连接 OpenClaw 与 MaxVideoAI，规划视频、选择模型并在您确认准确报价后生成。',n8n:'串联创意需求、模型选择、准确报价与视频生成。在自托管工作流中保留明确的人工确认步骤。'},
    en: {claude:'For people already working in Claude Desktop. Bring a product brief, review the exact quote, then retrieve your short clip in MaxVideoAI.',chatgpt:'Turn a project in your conversation into a video with MaxVideoAI. Compare models, choose the settings and approve the exact price before generation.',codex:'For makers preparing a project or site launch. Use the MaxVideoAI plugin in Codex to develop one short video, review its exact quote and retrieve the completed clip.',openclaw:'Connect OpenClaw to MaxVideoAI to plan your video, choose the model and generate after you approve the exact quote.',n8n:'Connect your brief to model selection, an exact quote and video generation. Keep human approval as a clear step in your self-hosted workflow.'},
    fr: {claude:'Vous travaillez déjà dans Claude Desktop ? Apportez un brief produit, vérifiez le devis exact, puis retrouvez votre clip court dans MaxVideoAI.',chatgpt:'Transformez le projet de votre conversation en vidéo avec MaxVideoAI. Comparez les modèles, choisissez les réglages et validez le prix exact avant de générer.',codex:'Pour les makers qui préparent le lancement d’un projet ou d’un site. Utilisez le plugin MaxVideoAI dans Codex pour préparer une vidéo courte, vérifier son devis exact et récupérer le clip terminé.',openclaw:'Connectez OpenClaw à MaxVideoAI pour préparer votre vidéo, choisir le modèle et générer après votre accord sur le devis exact.',n8n:'Reliez votre brief au choix du modèle, au devis exact et à la génération vidéo. Gardez l’accord humain comme étape explicite de votre workflow auto-hébergé.'},
    es: {claude:'¿Ya trabajas en Claude Desktop? Trae un brief de producto, revisa el precio exacto y recupera tu clip corto en MaxVideoAI.',chatgpt:'Convierte el proyecto de tu conversación en un video con MaxVideoAI. Compara modelos, elige los ajustes y aprueba el precio exacto antes de generar.',codex:'Para makers que preparan el lanzamiento de un proyecto o sitio. Usa el plugin MaxVideoAI en Codex para preparar un video corto, revisar su precio exacto y recuperar el clip terminado.',openclaw:'Conecta OpenClaw con MaxVideoAI para planear tu video, elegir el modelo y generar después de aprobar el precio exacto.',n8n:'Conecta tu brief con la selección del modelo, el precio exacto y la generación de video. Mantén la aprobación humana como un paso explícito en tu workflow autoalojado.'},
  };
  const activeIntros = intros[locale] ?? intros.en;
  const metaTitles = {
    en:{claude:'Claude AI Video Connector: VideoAI MCP',chatgpt:'ChatGPT AI Video: VideoAI MCP App',codex:'Codex AI Video Plugin: VideoAI MCP',openclaw:'OpenClaw AI Video Skill: VideoAI MCP',n8n:'n8n AI Video Automation: VideoAI MCP'},
    fr:{claude:'Connecteur vidéo IA Claude : VideoAI MCP',chatgpt:'Vidéo IA dans ChatGPT : app MCP VideoAI',codex:'Plugin vidéo IA Codex : VideoAI MCP',openclaw:'Skill vidéo IA OpenClaw : VideoAI MCP',n8n:'Automatisation vidéo IA n8n : VideoAI MCP'},
    es:{claude:'Conector de video con IA para Claude: VideoAI MCP',chatgpt:'Video con IA en ChatGPT: app MCP VideoAI',codex:'Plugin de video con IA para Codex: VideoAI MCP',openclaw:'Skill de video con IA para OpenClaw: VideoAI MCP',n8n:'Automatización de video con IA en n8n: VideoAI MCP'},
    zh:{claude:'Claude AI 视频连接器：VideoAI MCP',chatgpt:'ChatGPT AI 视频：VideoAI MCP App',codex:'Codex AI 视频插件：VideoAI MCP',openclaw:'OpenClaw AI 视频技能：VideoAI MCP',n8n:'n8n AI 视频自动化：VideoAI MCP'},
  };
  const helpIntro = locale === 'zh' ? '连接账户和开始首次创作的常见问题。' : locale === 'fr' ? 'Les réponses utiles pour connecter votre compte et lancer votre première création.' : locale === 'es' ? 'Respuestas para conectar tu cuenta y crear por primera vez.' : 'Answers to help you connect your account and make your first creation.';
  const oauthTitle = locale === 'zh' ? '由您授权自己的账户。' : locale === 'fr' ? 'Vous autorisez votre compte.' : locale === 'es' ? 'Tú autorizas tu cuenta.' : 'You authorize your account.';
  return {...copy,troubleshooting:{...copy.troubleshooting,intro:helpIntro},meta:{title:metaTitles[locale][client],description:activeIntros[client] ?? copy.meta.description},hero:{...copy.hero,eyebrow:`${editorial.modes[client]} · MaxVideoAI`,title:titles[locale][client],intro:activeIntros[client] ?? copy.hero.intro,setupLabel:client==='claude'?({en:'Connect Claude Desktop',fr:'Connecter Claude Desktop',es:'Conectar Claude Desktop',zh:'连接 Claude Desktop'})[locale]:client==='n8n'&&locale==='es'?'Conectar n8n autoalojado':copy.hero.setupLabel,liveStatus:editorial.limits[client]},setup:{...copy.setup,oauthTitle,title:editorial.setupTitle,intro:editorial.setupIntro}};
}
