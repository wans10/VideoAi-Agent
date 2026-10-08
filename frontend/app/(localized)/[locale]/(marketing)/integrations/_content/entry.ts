import type { AppLocale } from '@/i18n/locales';
import type { McpClientId } from '../../mcp/_lib/mcp-page-types';

type EntryCopy = {
  eyebrow: string;
  title: string;
  cost: string;
  scope: string;
  steps: Array<{ title: string; body: string }>;
};

const copy: Record<AppLocale, Record<'claude' | 'codex', EntryCopy>> = {
  zh: {
    claude: {
      eyebrow:'在 Claude Desktop 中制作首个片段',title:'连接、审核、创作。',
      cost:'付费素材使用您的 MaxVideoAI 钱包。在您确认前展示模型、参数和准确报价。自定义连接器需要 Claude Pro / Max，或由 Team / Enterprise 组织启用的权限。无需额外 MaxVideoAI 订阅。',
      scope:'已发布的 Claude Desktop 结果来自注明日期的受控 staging 测试。Claude Code 有独立配置指南，在宿主记录中仍未验证。',
      steps:[{title:'连接并授权',body:'在 Claude Desktop 中添加自定义连接器。登录或创建 MaxVideoAI 账户，审核权限后返回对话。'},
        {title:'提交需求并审核报价',body:'请求一个短片，审核模型、时长、分辨率和当前准确价格。建议或预算不会开始生成。'},
        {title:'确认并获取片段',body:'确认报价后开始付费尝试。完成后在已连接的 MaxVideoAI 素材库中打开并下载片段。'}],
    },
    codex:{
      eyebrow:'为项目准备发布素材',title:'让创意需求伴随开发。',
      cost:'确认准确报价后，从 MaxVideoAI 钱包支付素材生成费用。Codex 有独立的访问要求，无需额外 MaxVideoAI 订阅。',
      scope:'已发布的生产检查覆盖 Codex CLI，不代表所有 Codex 界面或版本具有相同行为。',
      steps:[{title:'安装并授权',body:'使用下方指南添加 MaxVideoAI 插件，在浏览器中授权账户，再返回 Codex。'},
        {title:'准备一个发布短片',body:'描述项目或网站需要的画面。确认前审核支持的模型、参数和当前准确价格。'},
        {title:'确认并获取素材',body:'确认报价后开始付费尝试。成片保存在 MaxVideoAI 素材库，可打开和下载。'}],
    },
  },
  en: {
    claude: {
      eyebrow: 'Your first clip in Claude Desktop', title: 'Connect. Review. Create.',
      cost: 'Paid media uses your MaxVideoAI wallet. The model, settings and exact quote come before your approval. Custom connectors require Claude Pro / Max or access enabled by your Team / Enterprise organization. No additional MaxVideoAI subscription is required.',
      scope: 'The published Claude Desktop result is a dated controlled staging test. Claude Code has a separate setup guide and remains unverified in the host record.',
      steps: [
        { title: 'Connect and authorize', body: 'Add the custom connector in Claude Desktop. Sign in or create a MaxVideoAI account, review access, then return to your conversation.' },
        { title: 'Bring the brief, review the quote', body: 'Ask for one short clip. Review the proposed model, duration, resolution and exact current price. A suggestion or budget does not start generation.' },
        { title: 'Approve and retrieve the clip', body: 'Approve the quote to start the paid attempt. When it completes, open the result and download the clip from your connected MaxVideoAI library.' },
      ],
    },
    codex: {
      eyebrow: 'A launch asset for your project', title: 'Keep the brief beside the build.',
      cost: 'Media generation is paid from your MaxVideoAI wallet after you approve its exact quote. Codex access has its own requirements; no additional MaxVideoAI subscription is required.',
      scope: 'Published production checks cover Codex CLI. They do not establish the same behavior on every Codex surface or version.',
      steps: [
        { title: 'Install and authorize', body: 'Add the MaxVideoAI plugin using the guide below. Authorize your MaxVideoAI account in the browser, then return to Codex.' },
        { title: 'Prepare one launch clip', body: 'Describe the visual you need for your project or site. Review the supported model, settings and exact current price before approving.' },
        { title: 'Approve and retrieve the asset', body: 'Confirm the quote to start the paid attempt. A completed clip is saved in your MaxVideoAI library, where you can open and download it.' },
      ],
    },
  },
  fr: {
    claude: {
      eyebrow: 'Votre premier clip dans Claude Desktop', title: 'Connectez. Vérifiez. Créez.',
      cost: 'Les médias payants utilisent votre portefeuille MaxVideoAI. Le modèle, les réglages et le devis exact précèdent votre accord. Les connecteurs personnalisés nécessitent Claude Pro / Max ou un accès activé par votre organisation Team / Enterprise. Aucun abonnement MaxVideoAI supplémentaire n’est requis.',
      scope: 'Le résultat Claude Desktop publié vient d’un test contrôlé daté sur staging. Claude Code possède un guide distinct et reste non vérifié dans le registre des hôtes.',
      steps: [
        { title: 'Connectez et autorisez', body: 'Ajoutez le connecteur personnalisé dans Claude Desktop. Connectez-vous ou créez un compte MaxVideoAI, vérifiez les accès, puis revenez à votre conversation.' },
        { title: 'Apportez le brief, vérifiez le devis', body: 'Demandez un clip court. Vérifiez le modèle proposé, la durée, la résolution et le prix exact actuel. Une suggestion ou un budget ne lance aucune génération.' },
        { title: 'Validez et récupérez le clip', body: 'Validez le devis pour lancer la tentative payante. Une fois terminée, ouvrez le résultat et téléchargez le clip depuis votre bibliothèque MaxVideoAI connectée.' },
      ],
    },
    codex: {
      eyebrow: 'Un média de lancement pour votre projet', title: 'Le brief accompagne votre projet.',
      cost: 'La génération de médias utilise votre portefeuille MaxVideoAI après validation du devis exact. L’accès à Codex a ses propres conditions ; aucun abonnement MaxVideoAI supplémentaire n’est requis.',
      scope: 'Les contrôles de production publiés portent sur Codex CLI. Ils ne prouvent pas un comportement identique sur toutes les interfaces ou versions de Codex.',
      steps: [
        { title: 'Installez et autorisez', body: 'Ajoutez le plugin MaxVideoAI avec le guide ci-dessous. Autorisez votre compte MaxVideoAI dans le navigateur, puis revenez dans Codex.' },
        { title: 'Préparez un clip de lancement', body: 'Décrivez le visuel nécessaire pour votre projet ou votre site. Vérifiez le modèle compatible, les réglages et le prix exact actuel avant validation.' },
        { title: 'Validez et récupérez le média', body: 'Confirmez le devis pour lancer la tentative payante. Le clip terminé rejoint votre bibliothèque MaxVideoAI, où vous pouvez l’ouvrir et le télécharger.' },
      ],
    },
  },
  es: {
    claude: {
      eyebrow: 'Tu primer clip en Claude Desktop', title: 'Conecta. Revisa. Crea.',
      cost: 'Los medios de pago usan tu monedero MaxVideoAI. Revisa el modelo, los ajustes y el precio exacto antes de aprobar. Los conectores personalizados requieren Claude Pro / Max o acceso habilitado por tu organización Team / Enterprise. No necesitas otra suscripción a MaxVideoAI.',
      scope: 'El resultado publicado de Claude Desktop procede de una prueba controlada y fechada en staging. Claude Code tiene una guía propia y sigue sin verificar en el registro de clientes.',
      steps: [
        { title: 'Conecta y autoriza', body: 'Añade el conector personalizado en Claude Desktop. Inicia sesión o crea una cuenta MaxVideoAI, revisa el acceso y vuelve a tu conversación.' },
        { title: 'Trae el brief y revisa el precio', body: 'Pide un clip corto. Revisa el modelo propuesto, la duración, la resolución y el precio exacto actual. Una sugerencia o un presupuesto no inicia la generación.' },
        { title: 'Aprueba y recupera el clip', body: 'Aprueba el precio para iniciar el intento de pago. Cuando termine, abre el resultado y descarga el clip desde tu biblioteca MaxVideoAI conectada.' },
      ],
    },
    codex: {
      eyebrow: 'Un recurso de lanzamiento para tu proyecto', title: 'El brief acompaña tu proyecto.',
      cost: 'La generación de medios se paga desde tu monedero MaxVideoAI tras aprobar el precio exacto. El acceso a Codex tiene sus propias condiciones; no necesitas otra suscripción a MaxVideoAI.',
      scope: 'Las pruebas de producción publicadas cubren Codex CLI. No demuestran el mismo comportamiento en todas las interfaces o versiones de Codex.',
      steps: [
        { title: 'Instala y autoriza', body: 'Añade el plugin MaxVideoAI con la guía de abajo. Autoriza tu cuenta MaxVideoAI en el navegador y vuelve a Codex.' },
        { title: 'Prepara un clip de lanzamiento', body: 'Describe el recurso visual que necesitas para tu proyecto o sitio. Revisa el modelo compatible, los ajustes y el precio exacto actual antes de aprobar.' },
        { title: 'Aprueba y recupera el recurso', body: 'Confirma el precio para iniciar el intento de pago. El clip terminado se guarda en tu biblioteca MaxVideoAI, donde puedes abrirlo y descargarlo.' },
      ],
    },
  },
};

export function getIntegrationEntryCopy(locale: AppLocale, client: McpClientId): EntryCopy | null {
  return client === 'claude' || client === 'codex' ? copy[locale][client] : null;
}
