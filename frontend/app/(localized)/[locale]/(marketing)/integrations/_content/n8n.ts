import type { AppLocale } from '@/i18n/locales';
import { MCP_PRODUCTION_RESOURCE_URL } from '@/server/mcp/config';
import { buildIntegrationCopy, getIntegrationInstallInstruction } from './shared';
import type { IntegrationPageCopy, IntegrationText } from './types';

function guides(locale: AppLocale, text: {
  deterministicTitle: string;
  deterministicIntro: string;
  select: string;
  credential: string;
  approval: string;
  limitation: string;
}) {
  return [
    {
      hostId: 'n8nMcpClient' as const,
      title: text.deterministicTitle,
      intro: text.deterministicIntro,
      installInstruction: getIntegrationInstallInstruction(locale, 'n8nMcpClient'),
      steps: [
        { title: text.credential, body: text.select },
        { title: text.approval, body: text.limitation },
      ],
      commands: [],
      setupValues: [{ label: locale === 'zh' ? 'MCP 端点' : locale === 'fr' ? 'Adresse MCP' : locale === 'es' ? 'Dirección MCP' : 'MCP endpoint', value: MCP_PRODUCTION_RESOURCE_URL }],
      limitation: text.limitation,
    },
  ];
}

function english(): IntegrationText {
  return {
    metaTitle: 'Automate AI Video with n8n and MaxVideoAI',
    metaDescription: 'Run approval-safe AI video workflows with MaxVideoAI and the deterministic MCP Client in tested self-hosted n8n deployments.',
    eyebrow: 'N8N AI VIDEO AUTOMATION',
    heroTitle: 'Design repeatable AI video workflows in n8n with MaxVideoAI',
    heroIntro: 'The supported path uses deterministic MCP Client nodes in tested self-hosted n8n 2.38.7. One private workflow, ID 19591, is Pending / Under review; the other two are not submitted while the portal blocks another submission. This is not a public listing.',
    unavailable: 'The self-hosted deterministic MCP Client path is available with explicit approval before confirmation. n8n Cloud and AI Agent invocation through MCP Client Tool are not part of the supported scope.',
    setupLabel: 'Connect self-hosted n8n',
    backLabel: 'See all supported workflows',
    checkpointLabel: 'Self-hosted checkpoint',
    machineStatusLabel: 'Host evidence state',
    statuses: {
      n8nMcpClient: 'Tested with limits on self-hosted n8n 2.38.7: clean import, project-scoped OAuth, deterministic planning, exact approval, one confirmation, recovery and revocation passed.',
      n8nMcpClientTool: 'Not run: MCP Client Tool 1.4 imported with five selected planning tools and no preparation or confirmation tool. Agent invocation was not exercised because no Chat Model credential was configured.',
    },
    setupEyebrow: 'CHOOSE THE EXECUTION SHAPE',
    setupTitle: 'Use deterministic MCP Client steps for the supported workflow',
    setupIntro: 'The tested MCP Client path connects through an n8n-owned OAuth credential. The separate AI Agent MCP Client Tool configuration remains not run, and no credential is embedded in exported templates.',
    guides: guides('en', {
      deterministicTitle: 'MCP Client for deterministic workflow steps',
      deterministicIntro: 'Choose one MaxVideoAI tool per node when the workflow order and inputs should remain explicit.',
      select: 'Create an OAuth2 credential for the MaxVideoAI endpoint, then select the exact tool and JSON input in the node.',
      credential: 'Connect the OAuth credential',
      approval: 'Keep approval outside preparation',
      limitation: 'A prepared quote does not authorize spend. Match the approval event to its quoteId, confirm that quote once, and recover the accepted job instead of confirming again. Replays of the same quote are idempotent on MaxVideoAI.',
    }),
    oauthTitle: 'Credential ownership follows the supported n8n deployment',
    oauthBody: 'n8n stores the OAuth credential; exported workflows contain no MaxVideoAI token. The self-hosted checkpoint covered project scope, browser consent, revocation and observed access loss. Cloud, refresh and reconnect remain separate checks.',
    oauthSteps: ['Create the OAuth2 credential for the remote MCP endpoint', 'Complete MaxVideoAI browser consent with the intended account', 'Test refresh, revocation and reconnect on the exact n8n deployment'],
    workflowEyebrow: 'APPROVAL-SAFE AUTOMATION',
    workflowTitle: 'Separate planning, exact quotation, approval and recovery',
    workflowIntro: 'Deterministic nodes make the spending boundary inspectable. Agent tools can help choose and plan, but they do not receive an automatic paid-confirmation path.',
    workflowSteps: [
      { title: 'Discover and budget', body: 'Read current capabilities and calculate a bounded project budget without a charge.' },
      { title: 'Prepare the exact request', body: 'Validate the chosen prompt and settings and store the fresh quote.' },
      { title: 'Pause for human approval', body: 'Show the exact quote and wait for an explicit approval event before confirmation.' },
      { title: 'Confirm once and recover', body: 'Confirm only the exact approved quoteId, then poll or resume the accepted job without resubmitting after a timeout.' },
    ],
    referencesTitle: 'Private-reference automation remains unverified',
    referencesPlanning: 'None of the three reviewed JSON workflows calls list_media or create_reference_upload_link. Private-reference automation in n8n is unverified and is not part of the published workflow claim.',
    referencesGated: 'Do not add signed media, credentials or private bytes to an exported template. A separate recorded test is required before claiming a private-reference workflow.',
    helpEyebrow: 'WORKFLOW SAFETY',
    helpTitle: 'Avoid duplicate spend and hidden credentials',
    helpIntro: 'The tested self-hosted deterministic scope is published on MaxVideoAI. Only private workflow 19591 is Pending / Under review; the other two exact candidates are not submitted, and no public n8n library listing is claimed.',
    helpItems: [
      { question: 'Which n8n node should I use?', answer: 'Use MCP Client for the supported deterministic steps. MCP Client Tool for an AI Agent remains not run and unsupported.' },
      { question: 'Does this work on n8n Cloud?', answer: 'No n8n Cloud support is claimed. The tested scope is self-hosted n8n 2.38.7.' },
      { question: 'Can the workflow confirm automatically?', answer: 'No. The candidate templates require a POST approval that matches the fresh quoteId. MaxVideoAI keeps confirmation idempotent for that quote.' },
      { question: 'What happens when polling times out?', answer: 'Resume status for the accepted job. Do not route timeout recovery back into confirmation or create a replacement.' },
    ],
    disconnectTitle: 'Disconnect n8n from MaxVideoAI',
    disconnectBody: 'Delete or disable the n8n OAuth credential and revoke its grant in MaxVideoAI account connections. Templates remain credential-free and cannot reconnect themselves.',
    disconnectSteps: ['Disable the workflows that use the credential', 'Delete the n8n credential and revoke the MaxVideoAI grant', 'Confirm protected nodes fail before creating a new credential'],
    supportLabel: 'Contact MaxVideoAI support',
  };
}

function french(): IntegrationText {
  const copy = english();
  return {
    ...copy,
    metaTitle: 'Automatiser la vidéo IA avec n8n et MaxVideoAI',
    metaDescription: 'Exécutez des workflows vidéo IA sûrs avec MaxVideoAI et MCP Client déterministe sur les déploiements n8n auto-hébergés testés.',
    eyebrow: 'AUTOMATISATION VIDÉO IA N8N',
    heroTitle: 'Concevez des workflows vidéo IA répétables dans n8n avec MaxVideoAI',
    heroIntro: 'Le parcours compatible utilise les nœuds MCP Client déterministes sur n8n auto-hébergé 2.38.7. Un workflow privé, ID 19591, est Pending / En révision ; les deux autres ne sont pas soumis tant que le portail bloque une nouvelle soumission. Il ne s’agit pas d’une publication publique.',
    unavailable: 'Le parcours MCP Client déterministe auto-hébergé est disponible avec accord explicite avant confirmation. n8n Cloud et l’appel par agent via MCP Client Tool restent hors du périmètre compatible.',
    setupLabel: 'Connecter n8n auto-hébergé',
    backLabel: 'Voir tous les workflows compatibles',
    checkpointLabel: 'Contrôle auto-hébergé',
    machineStatusLabel: 'État de preuve de l’hôte',
    statuses: {
      n8nMcpClient: 'Testé avec limites sur n8n auto-hébergé 2.38.7 : import propre, OAuth de projet, planification, accord exact, confirmation unique, reprise et révocation ont réussi.',
      n8nMcpClientTool: 'Non testé : MCP Client Tool 1.4 a été importé avec cinq outils de planification choisis, sans préparation ni confirmation. Aucun modèle de chat n’étant configuré, l’appel par agent reste non vérifié.',
    },
    setupEyebrow: 'CHOISIR LE MODE D’EXÉCUTION',
    setupTitle: 'Utilisez MCP Client déterministe pour le workflow compatible',
    setupIntro: 'Le parcours MCP Client testé utilise un identifiant OAuth détenu par n8n. La configuration MCP Client Tool pour agent IA reste non testée et aucun identifiant n’est intégré aux modèles exportés.',
    guides: guides('fr', {
      deterministicTitle: 'MCP Client pour des étapes déterministes',
      deterministicIntro: 'Choisissez un outil MaxVideoAI par nœud lorsque l’ordre et les entrées doivent rester explicites.',
      select: 'Créez l’identifiant OAuth2 pour le point MCP, puis choisissez l’outil et son entrée JSON exacte.',
      credential: 'Connecter l’identifiant OAuth',
      approval: 'Séparer préparation et accord',
      limitation: 'Préparer un devis n’autorise aucune dépense. Faites correspondre l’accord au quoteId, confirmez ce devis une fois puis reprenez le job accepté. Le même quoteId reste idempotent côté MaxVideoAI.',
    }),
    oauthTitle: 'La propriété de l’identifiant suit le déploiement n8n',
    oauthBody: 'n8n stocke OAuth ; les exports ne contiennent aucun jeton MaxVideoAI. Le contrôle auto-hébergé couvre la portée projet, le consentement, la révocation et la perte d’accès. Cloud, renouvellement et reconnexion restent à tester.',
    oauthSteps: ['Créer l’identifiant OAuth2 du point MCP distant', 'Valider le consentement MaxVideoAI avec le bon compte', 'Tester renouvellement, révocation et reconnexion sur le déploiement exact'],
    workflowEyebrow: 'AUTOMATISATION AVEC APPROBATION',
    workflowTitle: 'Séparez planification, devis exact, accord et reprise',
    workflowIntro: 'Les nœuds déterministes rendent la dépense inspectable. Les outils agent aident à choisir sans recevoir de confirmation payante automatique.',
    workflowSteps: [
      { title: 'Découvrir et budgéter', body: 'Consultez les capacités actuelles et calculez un budget borné sans débit.' },
      { title: 'Préparer la demande exacte', body: 'Validez le prompt et les réglages puis stockez le devis récent.' },
      { title: 'Attendre l’accord humain', body: 'Présentez le devis exact et attendez un événement d’approbation explicite.' },
      { title: 'Confirmer une fois et reprendre', body: 'Confirmez uniquement le quoteId approuvé, puis reprenez le job accepté sans le soumettre à nouveau.' },
    ],
    referencesTitle: 'L’automatisation des références privées reste non vérifiée',
    referencesPlanning: 'Aucun des trois workflows JSON contrôlés n’appelle list_media ni create_reference_upload_link. L’automatisation des références privées dans n8n reste non vérifiée et ne fait pas partie du périmètre publié.',
    referencesGated: 'N’ajoutez ni média signé, ni identifiant, ni octets privés à un modèle exporté. Un test séparé et consigné est requis avant toute revendication sur les références privées.',
    helpEyebrow: 'SÉCURITÉ DU WORKFLOW',
    helpTitle: 'Évitez les dépenses doubles et les identifiants cachés',
    helpIntro: 'Le périmètre déterministe auto-hébergé testé est publié sur MaxVideoAI. Seul le workflow privé 19591 est Pending / En révision ; les deux autres candidats exacts ne sont pas soumis et aucune publication dans la bibliothèque n8n n’est revendiquée.',
    helpItems: [
      { question: 'Quel nœud n8n utiliser ?', answer: 'MCP Client pour les étapes déterministes compatibles. MCP Client Tool pour agent IA reste non testé et non compatible.' },
      { question: 'Cela fonctionne-t-il sur n8n Cloud ?', answer: 'Aucune compatibilité n8n Cloud n’est revendiquée. Le périmètre testé est n8n auto-hébergé 2.38.7.' },
      { question: 'Le workflow peut-il confirmer automatiquement ?', answer: 'Non. Il exige un POST d’accord correspondant au quoteId récent. MaxVideoAI rend la confirmation de ce devis idempotente.' },
      { question: 'Que faire après un délai de polling ?', answer: 'Reprenez le statut du job accepté ; ne revenez pas à la confirmation et ne créez pas de remplacement.' },
    ],
    disconnectTitle: 'Déconnecter n8n de MaxVideoAI',
    disconnectBody: 'Désactivez ou supprimez l’identifiant OAuth n8n puis révoquez-le dans MaxVideoAI. Les modèles sans identifiant ne peuvent pas se reconnecter seuls.',
    disconnectSteps: ['Désactiver les workflows concernés', 'Supprimer l’identifiant n8n et révoquer MaxVideoAI', 'Vérifier l’échec des nœuds protégés avant une nouvelle connexion'],
    supportLabel: 'Contacter le support MaxVideoAI',
  };
}

function spanish(): IntegrationText {
  const copy = english();
  return {
    ...copy,
    metaTitle: 'Automatiza vídeo IA con n8n y MaxVideoAI',
    metaDescription: 'Ejecuta flujos seguros de vídeo IA con MaxVideoAI y MCP Client determinista en despliegues n8n self-hosted probados.',
    eyebrow: 'AUTOMATIZACIÓN DE VÍDEO IA N8N',
    heroTitle: 'Diseña flujos repetibles de vídeo IA en n8n con MaxVideoAI',
    heroIntro: 'La ruta compatible usa nodos MCP Client deterministas en n8n self-hosted 2.38.7. Un flujo privado, ID 19591, está Pending / En revisión; los otros dos siguen sin enviar mientras el portal bloquea otra presentación. No es una publicación pública.',
    unavailable: 'La ruta MCP Client determinista self-hosted está disponible con aprobación explícita antes de confirmar. n8n Cloud y la invocación de agentes mediante MCP Client Tool quedan fuera del alcance compatible.',
    setupLabel: 'Conectar n8n self-hosted',
    backLabel: 'Ver todos los flujos compatibles',
    checkpointLabel: 'Prueba self-hosted',
    machineStatusLabel: 'Estado de evidencia del host',
    statuses: {
      n8nMcpClient: 'Probado con límites en n8n self-hosted 2.38.7: importación limpia, OAuth de proyecto, planificación, aprobación exacta, confirmación única, recuperación y revocación funcionaron.',
      n8nMcpClientTool: 'No probado: MCP Client Tool 1.4 se importó con cinco herramientas de planificación seleccionadas, sin preparar ni confirmar. La invocación del agente sigue sin verificar porque no había credencial de Chat Model.',
    },
    setupEyebrow: 'ELEGIR LA FORMA DE EJECUCIÓN',
    setupTitle: 'Usa MCP Client determinista para el flujo compatible',
    setupIntro: 'La ruta MCP Client probada utiliza una credencial OAuth propiedad de n8n. La configuración MCP Client Tool para agentes sigue sin probar y las plantillas exportadas no incluyen credenciales.',
    guides: guides('es', {
      deterministicTitle: 'MCP Client para pasos deterministas',
      deterministicIntro: 'Elige una herramienta MaxVideoAI por nodo cuando el orden y las entradas deban ser explícitos.',
      select: 'Crea la credencial OAuth2 para el endpoint MCP y selecciona la herramienta y su entrada JSON exacta.',
      credential: 'Conectar la credencial OAuth',
      approval: 'Separar preparación y aprobación',
      limitation: 'Preparar una cotización no autoriza gasto. Vincula la aprobación a su quoteId, confirma esa cotización una vez y recupera el job aceptado. El mismo quoteId es idempotente en MaxVideoAI.',
    }),
    oauthTitle: 'La credencial pertenece al despliegue n8n compatible',
    oauthBody: 'n8n guarda OAuth; los flujos exportados no incluyen tokens. La prueba self-hosted cubrió alcance de proyecto, consentimiento, revocación y pérdida de acceso. Cloud, renovación y reconexión siguen pendientes.',
    oauthSteps: ['Crear la credencial OAuth2 del endpoint MCP', 'Completar el consentimiento con la cuenta correcta', 'Probar renovación, revocación y reconexión en el despliegue exacto'],
    workflowEyebrow: 'AUTOMATIZACIÓN CON APROBACIÓN',
    workflowTitle: 'Separa planificación, precio exacto, aprobación y recuperación',
    workflowIntro: 'Los nodos deterministas hacen visible el límite de gasto. Las herramientas del agente ayudan a elegir sin confirmación de pago automática.',
    workflowSteps: [
      { title: 'Descubrir y presupuestar', body: 'Consulta capacidades actuales y calcula un presupuesto acotado sin cargo.' },
      { title: 'Preparar la solicitud exacta', body: 'Valida el prompt y los ajustes y guarda la cotización reciente.' },
      { title: 'Esperar aprobación humana', body: 'Muestra el precio exacto y espera un evento de aprobación explícito.' },
      { title: 'Confirmar una vez y recuperar', body: 'Confirma solo el quoteId aprobado y recupera el job aceptado sin reenviar tras un timeout.' },
    ],
    referencesTitle: 'La automatización de referencias privadas sigue sin verificar',
    referencesPlanning: 'Ninguno de los tres flujos JSON revisados llama a list_media ni create_reference_upload_link. La automatización de referencias privadas en n8n sigue sin verificar y no forma parte del alcance publicado.',
    referencesGated: 'No añadas medios firmados, credenciales ni bytes privados a una plantilla exportada. Hace falta una prueba separada y registrada antes de afirmar compatibilidad con referencias privadas.',
    helpEyebrow: 'SEGURIDAD DEL FLUJO',
    helpTitle: 'Evita gasto duplicado y credenciales ocultas',
    helpIntro: 'El alcance determinista self-hosted probado está publicado en MaxVideoAI. Solo el flujo privado 19591 está Pending / En revisión; los otros dos candidatos exactos siguen sin enviar y no se afirma una publicación en la biblioteca de n8n.',
    helpItems: [
      { question: '¿Qué nodo n8n debo usar?', answer: 'MCP Client para los pasos deterministas compatibles. MCP Client Tool para agentes sigue sin probar y sin soporte.' },
      { question: '¿Funciona en n8n Cloud?', answer: 'No se afirma soporte para n8n Cloud. El alcance probado es n8n self-hosted 2.38.7.' },
      { question: '¿Puede confirmar automáticamente?', answer: 'No. Exige un POST de aprobación que coincida con el quoteId reciente. MaxVideoAI mantiene idempotente la confirmación de esa cotización.' },
      { question: '¿Qué ocurre tras un timeout?', answer: 'Recupera el estado del job aceptado; no vuelvas a confirmar ni crees un reemplazo.' },
    ],
    disconnectTitle: 'Desconectar n8n de MaxVideoAI',
    disconnectBody: 'Desactiva o elimina la credencial OAuth de n8n y revócala en MaxVideoAI. Las plantillas sin credenciales no pueden reconectarse solas.',
    disconnectSteps: ['Desactivar los flujos que usan la credencial', 'Eliminar la credencial n8n y revocar MaxVideoAI', 'Confirmar el fallo de nodos protegidos antes de crear otra credencial'],
    supportLabel: 'Contactar con soporte de MaxVideoAI',
  };
}

function chinese(): IntegrationText {
  const copy = english();
  return {
    ...copy,
    metaTitle: '通过 n8n 与 MaxVideoAI 实现 AI 视频自动化',
    metaDescription: '在测试验证过的自托管 n8n 部署中，通过 MaxVideoAI 和确定性 MCP Client 节点运行安全授权的 AI 视频工作流。',
    eyebrow: 'N8N AI 视频自动化',
    heroTitle: '使用 MaxVideoAI 在 n8n 中设计可复现的 AI 视频工作流',
    heroIntro: '受支持的路径是在已测试的自托管 n8n 2.38.7 中使用确定性 MCP Client 节点。私有工作流（ID 19591）处于“待处理/审核中”；在平台限制新提交期间，另外两个候选流暂未提交。这并非公共官方模板。',
    unavailable: '自托管的确定性 MCP Client 路径支持在确认前进行显式授权。n8n Cloud 以及通过 MCP Client Tool 调用的 AI Agent 不在支持范围内。',
    setupLabel: '连接自托管 n8n',
    backLabel: '查看所有支持的工作流',
    checkpointLabel: '自托管检查点',
    machineStatusLabel: '主机凭据状态',
    statuses: {
      n8nMcpClient: '已在自托管 n8n 2.38.7 上受限测试：通过纯净导入、项目级 OAuth、确定性规划、精确授权、单次确认、恢复与撤销验证。',
      n8nMcpClientTool: '未执行：MCP Client Tool 1.4 导入了 5 个选定的规划工具，没有准备或确认工具。由于未配置 Chat Model 凭据，未执行 Agent 调用。',
    },
    setupEyebrow: '选择执行形态',
    setupTitle: '在支持的工作流中使用确定性 MCP Client 步骤',
    setupIntro: '经过测试的 MCP Client 路径通过 n8n 管理的 OAuth 凭据进行连接。独立的 AI Agent MCP Client Tool 配置暂未运行，且导出的模板中不包含任何凭据。',
    guides: guides('zh', {
      deterministicTitle: '用于确定性工作流步骤的 MCP Client',
      deterministicIntro: '当工作流执行顺序和输入参数需要严格可控时，每个节点选择一个 MaxVideoAI 工具。',
      select: '为 MaxVideoAI 端点创建 OAuth2 凭据，然后在节点中选择具体的工具和 JSON 输入。',
      credential: '连接 OAuth 凭据',
      approval: '将授权审核与准备流程分离',
      limitation: '准备好的报价不会自动触发扣费。将批准事件与对应的 quoteId 匹配，仅确认该报价一次，并通过任务 ID 获取已接受的任务，避免重复确认。在 MaxVideoAI 上，相同报价的重复确认是幂等的。',
    }),
    oauthTitle: '凭据管理遵循受支持的 n8n 部署方式',
    oauthBody: 'n8n 负责存储 OAuth 凭据；导出的工作流不包含 MaxVideoAI 令牌。自托管检查点涵盖了项目范围、浏览器同意、权限撤销和访问失效验证。Cloud、刷新和重新连接属于单独的核查项。',
    oauthSteps: ['为远程 MCP 端点创建 OAuth2 凭据', '使用目标账户在浏览器中完成 MaxVideoAI 授权同意', '在特定的 n8n 部署环境中测试令牌刷新、权限撤销与重连'],
    workflowEyebrow: '安全授权的自动化',
    workflowTitle: '分离规划、准确报价、授权审核与结果恢复',
    workflowIntro: '确定性节点让资金扣费边界清晰可见。AI Agent 工具可以辅助挑选和规划，但不会获得自动付费确认权限。',
    workflowSteps: [
      { title: '模型发现与预算', body: '读取当前模型能力并计算限定的项目预算，不产生任何扣费。' },
      { title: '准备具体请求', body: '校验所选的提示词和参数设置，并保存生成的最新报价单。' },
      { title: '等待人工审批', body: '展示准确的报价单，在最终确认前等待明确的人工审批事件。' },
      { title: '确认一次并取回结果', body: '仅确认唯一获得批准的 quoteId，轮询或恢复已接受任务的状态，超时后切勿重新提交。' },
    ],
    referencesTitle: '私有参考素材自动化仍未经验证',
    referencesPlanning: '三个审查过的 JSON 工作流均未调用 list_media 或 create_reference_upload_link。n8n 中的私有素材自动化仍未验证，不属于已发布范围。',
    referencesGated: '切勿在导出的模板中添加带签名的素材链接、私有凭据或二进制数据。在声明支持私有素材前，必须具备单独记录的测试验证。',
    helpEyebrow: '工作流安全',
    helpTitle: '防止重复扣费与凭据泄露',
    helpIntro: '经过测试的自托管确定性范围已在 MaxVideoAI 发布。仅私有工作流 19591 处于审核中，其余版本暂未提交至公共目录。',
    helpItems: [
      { question: '我应该使用哪个 n8n 节点？', answer: '使用 MCP Client 节点执行受支持的确定性步骤。用于 Agent 的 MCP Client Tool 暂未经测试且不支持。' },
      { question: '它支持 n8n Cloud 吗？', answer: '不支持 n8n Cloud。目前测试并支持的范围是自托管 n8n 2.38.7。' },
      { question: '可以自动确认扣费吗？', answer: '不可以。候选模板必须包含匹配最新 quoteId 的授权步骤。MaxVideoAI 确保同一报价单的确认具有幂等性。' },
      { question: '轮询发生超时后该怎么处理？', answer: '恢复已接受任务的状态。不要将超时恢复引导回重复确认，也不要创建替代任务。' },
    ],
    disconnectTitle: '断开 n8n 与 MaxVideoAI 的连接',
    disconnectBody: '在 n8n 中停用或删除 OAuth 凭据，并在 MaxVideoAI 账户连接中撤销授权。模板不包含凭据且无法自行重新连接。',
    disconnectSteps: ['停用使用该凭据的工作流', '删除 n8n 中的凭据并撤销 MaxVideoAI 授权', '在创建新凭据前确认受保护节点已无法访问'],
    supportLabel: '联系 MaxVideoAI 技术支持',
  };
}

export function buildN8nIntegrationCopy(locale: AppLocale): IntegrationPageCopy {
  return buildIntegrationCopy({
    client: 'n8n',
    locale,
    text: locale === 'fr' ? french() : locale === 'es' ? spanish() : locale === 'zh' ? chinese() : english(),
  });
}
