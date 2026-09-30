import { getMcpEditorialCopy } from '@/components/marketing/mcp/mcp-editorial-copy';
import { localePathnames, type AppLocale } from '@/i18n/locales';
import {
  MAXVIDEOAI_CODEX_MARKETPLACE_ADD_COMMAND,
  MAXVIDEOAI_CODEX_PLUGIN_ADD_COMMAND,
} from '@/config/maxvideoai-plugin-release';
import { localizedSlugs } from '@/lib/i18nSlugs';
import { getMcpPublicIntegrationIds, type McpIntegrationId } from '@/lib/mcp-integration-registry';
import { MCP_PRODUCTION_RESOURCE_URL } from '@/server/mcp/config';
import type { McpClientActionCopy, McpPageCopy } from './mcp-page-types';

function localizedPath(locale: AppLocale, ...segments: string[]): string {
  const prefix = localePathnames[locale];
  return `/${[prefix, ...segments].filter(Boolean).join('/')}`;
}

export function buildMcpClientActions(
  locale: AppLocale,
  labels: { claude: string; chatgpt: string; codex: string; openclaw: string; n8n: string; supporting: string },
  publicIntegrationIds: readonly McpIntegrationId[] = getMcpPublicIntegrationIds(),
): McpClientActionCopy[] {
  const integrations = localizedSlugs[locale].integrations;
  const instruction = (client: McpClientActionCopy['client']) => {
    if (client === 'codex') {
      if (locale === 'fr') {
        return `Installe le plugin VideoAI pour moi avec ces commandes, puis guide-moi pour connecter mon compte :\n${MAXVIDEOAI_CODEX_MARKETPLACE_ADD_COMMAND}\n${MAXVIDEOAI_CODEX_PLUGIN_ADD_COMMAND}`;
      }
      if (locale === 'es') {
        return `Instala el plugin VideoAI por mí con estos comandos y guíame para conectar mi cuenta:\n${MAXVIDEOAI_CODEX_MARKETPLACE_ADD_COMMAND}\n${MAXVIDEOAI_CODEX_PLUGIN_ADD_COMMAND}`;
      }
      if (locale === 'zh') {
        return `请帮我运行以下命令安装 VideoAI 插件，并指引我连接我的账号：\n${MAXVIDEOAI_CODEX_MARKETPLACE_ADD_COMMAND}\n${MAXVIDEOAI_CODEX_PLUGIN_ADD_COMMAND}`;
      }
      return `Install the VideoAI plugin for me with these commands, then guide me through connecting my account:\n${MAXVIDEOAI_CODEX_MARKETPLACE_ADD_COMMAND}\n${MAXVIDEOAI_CODEX_PLUGIN_ADD_COMMAND}`;
    }
    if (client === 'n8n') {
      if (locale === 'fr') return `Construisez manuellement le workflow déterministe dans n8n auto-hébergé à partir du guide VideoAI, créez l’identifiant OAuth2 pour ${MCP_PRODUCTION_RESOURCE_URL}, puis associez-le à chaque nœud MCP Client.`;
      if (locale === 'es') return `Construye manualmente el flujo determinista en n8n self-hosted siguiendo la guía de VideoAI, crea la credencial OAuth2 para ${MCP_PRODUCTION_RESOURCE_URL} y asígnala a cada nodo MCP Client.`;
      if (locale === 'zh') return `请根据 VideoAI 配置指南在自托管 n8n 中手动构建确定性工作流，为 ${MCP_PRODUCTION_RESOURCE_URL} 创建 OAuth2 凭据，并将其分配给各个 MCP Client 节点。`;
      return `Build the deterministic workflow manually in self-hosted n8n from the VideoAI setup guide, create the OAuth2 credential for ${MCP_PRODUCTION_RESOURCE_URL}, then assign it to every MCP Client node.`;
    }
    const clientLabel = client === 'claude'
      ? 'Claude'
      : client === 'chatgpt'
        ? 'ChatGPT'
        : client === 'openclaw'
          ? 'OpenClaw'
          : 'n8n';
    if (locale === 'fr') return `Connecte VideoAI dans ${clientLabel} avec ce serveur MCP et guide-moi jusqu’à la connexion : ${MCP_PRODUCTION_RESOURCE_URL}`;
    if (locale === 'es') return `Conecta VideoAI en ${clientLabel} con este servidor MCP y guíame hasta completar la conexión: ${MCP_PRODUCTION_RESOURCE_URL}`;
    if (locale === 'zh') return `请在 ${clientLabel} 中使用此 MCP 服务器连接 VideoAI，并指引我完成账号连接：${MCP_PRODUCTION_RESOURCE_URL}`;
    return `Connect VideoAI in ${clientLabel} with this MCP server and guide me through the connection: ${MCP_PRODUCTION_RESOURCE_URL}`;
  };
  const publicIntegrationSet = new Set(publicIntegrationIds);
  const actions: McpClientActionCopy[] = [
    {
      client: 'claude',
      href: localizedPath(locale, integrations, 'claude'),
      label: labels.claude,
      supportingLabel: labels.supporting,
      installInstruction: instruction('claude'),
      copyInstallInstruction: true,
    },
    {
      client: 'chatgpt',
      href: localizedPath(locale, integrations, 'chatgpt'),
      label: labels.chatgpt,
      supportingLabel: labels.supporting,
      installInstruction: instruction('chatgpt'),
      copyInstallInstruction: true,
    },
    {
      client: 'codex',
      href: localizedPath(locale, integrations, 'codex'),
      label: labels.codex,
      supportingLabel: labels.supporting,
      installInstruction: instruction('codex'),
      copyInstallInstruction: true,
    },
    {
      client: 'openclaw',
      href: localizedPath(locale, integrations, 'openclaw'),
      label: labels.openclaw,
      supportingLabel: labels.supporting,
      installInstruction: instruction('openclaw'),
      copyInstallInstruction: true,
    },
    {
      client: 'n8n',
      href: localizedPath(locale, integrations, 'n8n'),
      label: labels.n8n,
      supportingLabel: labels.supporting,
      installInstruction: instruction('n8n'),
      copyInstallInstruction: false,
    },
  ];
  return actions.filter((action) => publicIntegrationSet.has(action.client));
}

const EN: McpPageCopy = {
  meta: {
    title: 'VideoAI for Claude, ChatGPT & Codex | AI Video',
    description: 'Create AI video with VideoAI in Claude, ChatGPT or Codex: prompts, references, current model advice, project budgets, exact price and generation after approval.',
  },
  breadcrumb: { home: 'Home', current: 'AI video plugin' },
  hero: {
    eyebrows: {
      trial: 'INTRODUCTORY CREDIT WHEN ELIGIBLE',
      budget: 'THE RIGHT MODEL FOR EACH SHOT',
      price: 'PRICE BEFORE YOU GENERATE',
    },
    title: 'Create AI videos from your assistant or automations.',
    intro: 'Start in Claude, ChatGPT or Codex, or connect an agent and automation workflow. VideoAI develops prompts and references, compares current models, prices the complete project and generates only after you approve the exact price.',
    previewIntro: 'Start in your assistant, agent or automation workflow. Develop prompts and references, compare current models, budget the complete project and review the VideoAI production path.',
    trialDisclosure: 'Eligible verified accounts can try one introductory Seedance 2 Mini generation, separate from the regular VideoAI credit balance.',
    actions: buildMcpClientActions('en', {
      claude: 'Claude connector',
      chatgpt: 'ChatGPT app',
      codex: 'Codex plugin',
      openclaw: 'OpenClaw',
      n8n: 'n8n',
      supporting: 'Free · VideoAI account required',
    }),
    connectActions: {
      instructionLabel: 'FAST SETUP',
      instructionBody: 'Paste one short setup request into Claude, ChatGPT or OpenClaw, or let Codex install its plugin. For n8n, open the guide and build the deterministic workflow manually.',
      copyInstruction: 'Copy for',
      instructionCopied: 'Copied — paste it into your assistant.',
      endpointLabel: 'Manual MCP setup',
      copyEndpoint: 'Copy server address',
      copied: 'Server address copied. Continue with the setup guide for your assistant.',
      copyError: 'Unable to copy. Select the server address and copy it manually.',
    },
  },
  workflow: {
    eyebrow: 'HOW IT WORKS',
    title: 'From project to finished video in three steps',
    intro: 'Keep the creative direction, model decision, exact quote and completed media in one clear workflow.',
    ariaLabel: 'AI video production workflow',
    steps: ['Develop the brief and references', 'Compare models and project budgets', 'Approve the exact price and generate'],
  },
  ecosystem: {
    eyebrow: 'CHOOSE YOUR PLATFORM',
    title: 'Work where your project already lives',
    intro: 'Claude, ChatGPT, Codex, OpenClaw and the tested self-hosted n8n workflow are available now. More development and enterprise clients are being prepared.',
    primaryLabel: 'Available now',
    secondaryLabel: 'More MCP workflows',
    overview: [
      { client: 'cursor', status: 'In preparation', availability: 'preparing' },
      { client: 'githubCopilot', status: 'In preparation', availability: 'preparing' },
      { client: 'geminiCli', status: 'In preparation', availability: 'preparing' },
      { client: 'microsoftCopilot', status: 'In preparation', availability: 'preparing' },
    ],
  },
  budget: {
    eyebrow: 'Conversation-led budgeting',
    title: 'Ask for a budget for the whole film—not a preset tier',
    intro: 'Tell the assistant whether quality, budget, speed, audio or reference fidelity matters most. It can price one to four concrete proposals, including a quality-first route and credible lower-cost alternatives, with creative attempts shown separately.',
    exampleLabel: 'Example conversation',
    examplePrompt: '“Budget a 60-second film. Quality comes first, but show me credible ways to reduce the total.”',
    qualityLabel: 'Quality-first proposal',
    qualityBody: 'Use the strongest currently executable model for each shot—often Seedance 2.5 when its live capabilities fit—then total every shot with its settings and references.',
    valueLabel: 'Lower-cost alternatives',
    valueBody: 'Keep the same creative brief and compare only validated options, such as Happy Horse, H3 or LTX when they fit. Explain the quality, motion, audio and reference trade-offs shot by shot.',
    attemptsNote: 'The proposal separates the planned renders from an optional creative-retry allowance. A technical failure is tracked and refunded; a creative retry is a new choice.',
    priceReferencesLabel: 'Live per-shot price references',
    priceReferencesBody: 'These are current examples—not packages or a recommendation. Your assistant builds the real project budget from the selected shots.',
    slotLabels: {
      included_trial: 'Eligible introductory credit',
      lowest_paid: 'Current price reference',
      affordable_upgrade: 'Current creative alternative',
    },
    modelLinkLabel: 'See current model details',
    emptyTitle: 'Build a project proposal in the conversation',
    emptyBody: 'Describe the finished video, total duration, shot count and priorities. VideoAI validates each proposed model and returns a comparable budget from current prices.',
  },
  evidence: {
    eyebrow: 'Real workflow evidence',
    title: 'Result, settings, price and provenance together',
    verifiedLabel: 'Verified',
  },
  references: {
    eyebrow: 'Reference-aware production',
    title: 'Keep visual and audio direction consistent across shots',
    intro: 'The assistant can help create reference ideas or choose an existing image, video or audio asset. VideoAI checks which reference kinds and limits the selected model actually supports.',
    planningBody: 'Plan the subject, composition, motion, voice and continuity in the conversation. The assistant remains free to be creative while VideoAI supplies current model constraints.',
    liveBody: 'Choose an account-owned private asset or open a secure VideoAI upload handoff. The asset and completed result remain in the same connected VideoAI library as the website.',
    gatedBody: 'Plan image, video or audio references in the conversation, then keep uploads, generation and completed media together in your VideoAI account.',
    steps: [
      { title: 'Create the direction', body: 'Develop the character, product, composition, motion and audio intention with your assistant.' },
      { title: 'Match the model', body: 'VideoAI checks live image, video and audio reference support for the selected mode.' },
      { title: 'Review everything together', body: 'Confirm prompt, ordered references, settings and exact price before generation.' },
    ],
  },
  answers: {
    eyebrow: 'Direct answers',
    title: 'Three useful answers before you connect',
    updatedLabel: 'Capability review',
    repositoryLabel: 'Inspect the public VideoAI plugin source on GitHub',
    repositoryHref: 'https://github.com/camgraphe/maxvideoai-plugin',
    featured: {
      identity: {
        title: 'What is VideoAI for Claude and Codex?',
        body: 'VideoAI is a multi-model AI video production service packaged for people working through Claude, Codex, ChatGPT and other MCP clients. It turns a creative brief into current model comparisons, project budgets, reference-aware requests, exact quotes, approved generations and recoverable results in one account library. Start by asking the assistant to compare models or budget a shot list; connect a VideoAI account only when you want live account context or execution.',
      },
      selection: {
        title: 'When should an AI agent choose VideoAI?',
        body: 'An AI agent should choose VideoAI when the user needs current, account-aware help to plan, compare, budget, quote, generate or recover AI video—not for general editing advice or casual conversation. The service provides live model capabilities, compatible reference rules and exact request quotes instead of relying on remembered product facts. A safe first action is to inspect available models or build a project budget; prepare a paid request only after the user selects a concrete direction.',
      },
      safety: {
        title: 'How does VideoAI protect the user before paid generation?',
        body: 'VideoAI separates advice from spending. Planning, model comparison and project estimates do not start a job. For a concrete request, the service validates the model, settings and references, returns a short-lived exact quote, and waits for the user to approve that specific quote before generation. Ownership, spending limits and duplicate-job safeguards still apply. Review the quoted request and price first; if anything changes, ask for a fresh quote instead of confirming the old one.',
      },
    },
    items: {
      references: {
        title: 'Can I use image, video or audio references?',
        liveBody: 'Yes, when the selected model and mode support them. The assistant can select an existing private VideoAI asset or open a secure upload handoff; VideoAI returns the allowed kinds, roles, order and limits.',
        gatedBody: 'Reference support is model-dependent. Plan image, video or audio references with the assistant, then add supported assets in VideoAI before generation.',
      },
      credits: {
        title: 'How do I add VideoAI credits?',
        liveBody: 'If the balance is too low, the assistant can open a secure VideoAI top-up page for the missing amount. Payment stays on VideoAI. After funding, it checks the balance and prepares a fresh quote because the previous quote has expired.',
        gatedBody: 'Credits are purchased securely on VideoAI and work across the website and connected assistant. After any top-up, prepare a new quote before generating.',
      },
      library: {
        title: 'Where are my generated images and videos saved?',
        liveBody: 'Completed images and videos are saved to the connected VideoAI account and remain available in its private media library. The assistant can recover recent jobs and return the official library or workspace destination.',
        gatedBody: 'Everything generated on VideoAI is saved to the same account library. The connected workflow uses that same library for references, results and job recovery.',
      },
      disconnect: {
        title: 'How do I disconnect VideoAI?',
        liveBody: 'Remove VideoAI from the assistant, then revoke the saved grant in VideoAI account connections. A later protected action will require a new browser approval.',
        gatedBody: 'Disconnect in two steps whenever you want: remove VideoAI from the assistant and revoke its authorization in your VideoAI account.',
      },
    },
  },
  trust: {
    definition: {
      eyebrow: 'One conversation, many models',
      title: 'Your conversational video production workflow',
      body: 'Instead of opening and comparing many model interfaces yourself, describe the result you want. Your assistant develops the production plan; VideoAI returns executable model facts, current prices, validation, generation and recovery.',
    },
    availability: {
      title: 'How it is priced',
      liveBody: 'The plugin, model advice and project estimates are free. Generation uses your existing pay-as-you-go VideoAI credits, with no separate plugin subscription.',
      gatedBody: 'Model advice and project estimates are free. Generation uses pay-as-you-go VideoAI credits, with no separate plugin subscription.',
    },
    compatibility: {
      title: 'Tested connection paths',
      body: 'The core server is shared across assistants. Compatibility is recorded per host so one successful test is never used to imply every surface behaves identically.',
      checkpointLabel: 'Hosted capability review',
      sourceLabel: 'Compatibility evidence',
      statuses: {
        claudeDesktop: 'Claude Desktop 1.37937.1 completed the controlled OAuth, catalog, budget, exact-quote, private-media, recovery, upload-handoff and top-up-handoff checks.',
        claudeCode: 'The shared connector configuration is ready, but a direct Claude Code production check has not yet been recorded.',
        chatgptWeb: 'ChatGPT developer mode can connect the direct VideoAI MCP and start OAuth on first use. No OpenAI directory listing is claimed.',
        codexCli: 'Codex CLI 0.150.0-alpha.8 completed production installation, OAuth, account, catalog, recommendation, budgeting, exact-quote, paid-generation, recovery and inline-player contract checks.',
      },
    },
    confirmation: {
      title: 'Your approval is the spending boundary',
      liveBody: 'VideoAI first validates the complete request and returns a short-lived exact quote. Only your clear approval starts the generation; the accepted job and result remain recoverable from the connected account.',
      gatedBody: 'Review the complete request and exact price in VideoAI, then submit it yourself. The same separate-confirmation pattern is built into the connected workflow.',
      steps: ['Compare the best fit and alternatives', 'Review exact settings, references and price', 'Approve once, then follow the result in VideoAI'],
    },
    controls: {
      title: 'Private media and spending stay account-owned',
      body: 'OAuth connects one VideoAI account without giving the assistant your password, payment details or direct database access.',
      items: [
        'Private prompts and reference URLs stay out of acquisition analytics.',
        'Every paid job needs a separate confirmation; optional account spending limits add another safeguard.',
        'Remove the client and revoke its VideoAI grant whenever you want to disconnect.',
      ],
    },
    capabilities: {
      title: 'From decision to finished media',
      body: 'The VideoAI integration combines creative guidance with a live product connection. Its remote MCP server keeps model facts, prices, account state and generation current.',
      items: [
        'Recommend the best executable model for each shot and explain credible alternatives.',
        'Budget complete films with one model or a reasoned shot-by-shot mix.',
        'Validate prompts, parameters, image, video and audio references before submission.',
        'Show the exact price, require approval, track the job and recover completed or refunded outcomes.',
      ],
    },
    setup: {
      title: 'Choose Claude, ChatGPT or Codex for the way you work',
      body: 'All three connect to the same VideoAI account, live catalog and approval boundary. Each has a dedicated setup guide for its own connector, app or plugin workflow.',
    },
    faq: {
      title: 'Questions before you connect',
      items: [
        { question: 'Does the assistant always choose the model?', answer: 'No. It asks only for missing priorities, proposes concrete options and lets you keep a preferred compatible model. VideoAI supplies facts; you keep the decision.' },
        { question: 'Will Seedance 2.5 always be recommended?', answer: 'It can lead a quality-first proposal when its current capabilities fit the brief. The assistant should also show credible lower-cost alternatives when budget matters, based on live prices rather than a fixed ranking.' },
        { question: 'What happens if a generation fails?', answer: 'The assistant recovers the existing job instead of creating a duplicate. Definitive technical failures expose their refund or recredit state; a creative retry is a new quote and needs new approval.' },
      ],
    },
    support: { label: 'Contact VideoAI support', href: '/contact' },
  },
};

function frenchCopy(): McpPageCopy {
  return {
    ...EN,
    meta: {
      title: 'VideoAI pour Claude, ChatGPT et Codex | Vidéo IA',
      description: 'Transformez Claude, ChatGPT ou Codex en producteur vidéo IA : prompts, références, modèles actuels, budgets, prix exact, validation et génération.',
    },
    breadcrumb: { home: 'Accueil', current: 'Plugin vidéo IA' },
    hero: {
      ...EN.hero,
      eyebrows: { trial: 'CRÉDIT DE DÉCOUVERTE SI ÉLIGIBLE', budget: 'LE BON MODÈLE POUR CHAQUE PLAN', price: 'LE PRIX AVANT DE GÉNÉRER' },
      title: 'Créez vos vidéos IA depuis votre assistant ou vos automatisations.',
      intro: 'Commencez dans Claude, ChatGPT ou Codex, ou connectez un agent et un workflow d’automatisation. VideoAI développe prompts et références, compare les modèles actuels, chiffre le projet complet et génère après votre validation du devis exact.',
      previewIntro: 'Commencez dans votre assistant, votre agent ou votre workflow d’automatisation. Développez prompts et références, comparez les modèles actuels, budgétez le projet complet et découvrez le parcours VideoAI.',
      trialDisclosure: 'Les comptes vérifiés et éligibles peuvent essayer une génération Seedance 2 Mini de découverte, distincte du solde habituel de crédits VideoAI.',
      actions: buildMcpClientActions('fr', { claude: 'Connecteur Claude', chatgpt: 'App ChatGPT', codex: 'Plugin Codex', openclaw: 'OpenClaw', n8n: 'n8n', supporting: 'Gratuit · compte VideoAI requis' }),
      connectActions: { instructionLabel: 'INSTALLATION RAPIDE', instructionBody: 'Collez une courte demande dans Claude, ChatGPT ou OpenClaw, ou laissez Codex installer son plugin. Pour n8n, ouvrez le guide et construisez manuellement le workflow déterministe.', copyInstruction: 'Copier pour', instructionCopied: 'Copié — collez-la dans votre assistant.', endpointLabel: 'Configuration MCP manuelle', copyEndpoint: 'Copier l’adresse du serveur', copied: 'Adresse copiée. Continuez avec le guide de votre assistant.', copyError: 'Copie impossible. Sélectionnez puis copiez manuellement l’adresse.' },
    },
    workflow: { eyebrow: 'COMMENT ÇA MARCHE', title: 'Du projet à la vidéo terminée en trois étapes', intro: 'Gardez direction créative, choix du modèle, devis exact et médias terminés dans un parcours clair.', ariaLabel: 'Parcours de production vidéo IA', steps: ['Développer le brief et les références', 'Comparer modèles et budgets du projet', 'Valider le prix exact et générer'] },
    ecosystem: {
      eyebrow: 'CHOISISSEZ VOTRE PLATEFORME',
      title: 'Travaillez là où votre projet existe déjà',
      intro: 'Claude, ChatGPT, Codex, OpenClaw et le workflow n8n auto-hébergé testé sont disponibles. D’autres clients de développement et d’entreprise sont en préparation.',
      primaryLabel: 'Disponibles maintenant',
      secondaryLabel: 'Autres workflows MCP',
      overview: [
        { client: 'cursor', status: 'En préparation', availability: 'preparing' },
        { client: 'githubCopilot', status: 'En préparation', availability: 'preparing' },
        { client: 'geminiCli', status: 'En préparation', availability: 'preparing' },
        { client: 'microsoftCopilot', status: 'En préparation', availability: 'preparing' },
      ],
    },
    budget: {
      ...EN.budget,
      eyebrow: 'Budget construit dans la discussion',
      title: 'Demandez le budget du film complet, pas une formule prédéfinie',
      intro: 'Indiquez si la qualité, le budget, la vitesse, l’audio ou la fidélité des références compte le plus. L’assistant peut chiffrer jusqu’à quatre propositions concrètes, dont une route qualité et des alternatives moins chères crédibles.',
      exampleLabel: 'Exemple de discussion',
      examplePrompt: '« Budgète un film de 60 secondes. La qualité passe en premier, mais montre-moi des moyens crédibles de réduire le total. »',
      qualityLabel: 'Proposition qualité',
      qualityBody: 'Utiliser le meilleur modèle actuellement exécutable pour chaque plan — souvent Seedance 2.5 lorsque ses capacités conviennent — puis totaliser chaque plan avec ses réglages et références.',
      valueLabel: 'Alternatives moins chères',
      valueBody: 'Conserver le même brief et comparer uniquement des options validées, comme Happy Horse, H3 ou LTX lorsqu’elles conviennent. Expliquer plan par plan les compromis de qualité, mouvement, audio et références.',
      attemptsNote: 'La proposition sépare les rendus prévus d’une marge facultative pour les reprises créatives. Un échec technique est suivi et remboursé ; une nouvelle tentative créative reste un nouveau choix.',
      priceReferencesLabel: 'Repères de prix actuels par plan',
      priceReferencesBody: 'Ce sont des exemples actuels, ni des formules ni une recommandation. L’assistant construit le vrai budget du projet à partir des plans retenus.',
      slotLabels: { included_trial: 'Crédit de découverte éligible', lowest_paid: 'Repère de prix actuel', affordable_upgrade: 'Alternative créative actuelle' },
      modelLinkLabel: 'Voir les détails actuels',
      emptyTitle: 'Construisez une proposition dans la discussion',
      emptyBody: 'Décrivez la vidéo finie, la durée, les plans et les priorités. VideoAI valide chaque modèle proposé et calcule un budget comparable avec les prix actuels.',
    },
    references: {
      ...EN.references,
      eyebrow: 'Production avec références',
      title: 'Conserver la direction visuelle et audio entre les plans',
      intro: 'L’assistant peut créer des idées de référence ou choisir un média image, vidéo ou audio existant. VideoAI vérifie les types et limites réellement acceptés par le modèle.',
      planningBody: 'Préparez sujet, composition, mouvement, voix et continuité dans la discussion. L’assistant reste créatif ; VideoAI apporte les contraintes actuelles.',
      liveBody: 'Choisissez un média privé du compte ou ouvrez un envoi VideoAI sécurisé. Références et résultats restent dans la même bibliothèque VideoAI que sur le site.',
      gatedBody: 'Préparez les références image, vidéo ou audio dans la discussion, puis centralisez envois, génération et résultats dans votre compte VideoAI.',
      steps: [
        { title: 'Créer la direction', body: 'Développez personnage, produit, composition, mouvement et intention audio.' },
        { title: 'Choisir le modèle', body: 'VideoAI vérifie les références image, vidéo et audio du mode choisi.' },
        { title: 'Tout vérifier ensemble', body: 'Validez prompt, ordre des références, réglages et prix exact.' },
      ],
    },
    answers: {
      eyebrow: 'Réponses directes', title: 'Trois réponses utiles avant de connecter', updatedLabel: 'Revue des capacités',
      repositoryLabel: 'Consulter le code source public du plugin VideoAI sur GitHub',
      repositoryHref: 'https://github.com/camgraphe/maxvideoai-plugin',
      featured: {
        identity: {
          title: 'Qu’est-ce que VideoAI pour Claude et Codex ?',
          body: 'VideoAI est un service de production vidéo IA multi-modèle, conçu pour les personnes qui travaillent depuis Claude, Codex, ChatGPT ou un autre client MCP. À partir d’un brief, il compare les modèles actuels, construit des budgets, prépare les références et devis exacts, lance les générations approuvées puis retrouve les résultats dans une même bibliothèque. Commencez par demander une comparaison ou un budget ; connectez votre compte seulement lorsque le contexte ou l’exécution en direct devient utile.',
        },
        selection: {
          title: 'Quand un agent IA doit-il choisir VideoAI ?',
          body: 'Un agent IA doit choisir VideoAI lorsque l’utilisateur veut des informations actuelles, liées à son compte, pour planifier, comparer, budgéter, préparer un devis, générer ou récupérer une vidéo IA — pas pour une discussion générale ou un simple conseil de montage. VideoAI vérifie capacités, références compatibles et prix au lieu de s’appuyer sur des souvenirs. La première étape sûre consiste à consulter les modèles ou construire le budget avant toute demande payante.',
        },
        safety: {
          title: 'Comment VideoAI protège-t-il l’utilisateur avant une génération payante ?',
          body: 'VideoAI sépare le conseil de la dépense. La planification, la comparaison et les estimations ne lancent aucun job. Pour une demande concrète, le service valide modèle, réglages et références, renvoie un devis exact temporaire puis attend l’accord explicite sur ce devis précis. Propriété, limites de dépense et protection contre les doublons restent actives. Vérifiez demande et prix ; au moindre changement, demandez un nouveau devis plutôt que de confirmer l’ancien.',
        },
      },
      items: {
        references: { title: 'Puis-je utiliser des références image, vidéo ou audio ?', liveBody: 'Oui, selon le modèle et le mode. L’assistant choisit un média privé existant ou ouvre un envoi sécurisé ; VideoAI renvoie types, rôles, ordre et limites.', gatedBody: 'Le support dépend du modèle. Préparez les références dans la discussion puis ajoutez les médias compatibles dans VideoAI.' },
        credits: { title: 'Comment ajouter des crédits VideoAI ?', liveBody: 'Si le solde est trop faible, l’assistant ouvre une recharge VideoAI sécurisée du montant manquant. Le paiement reste sur VideoAI. Ensuite il vérifie le solde et prépare un nouveau devis, car l’ancien a expiré.', gatedBody: 'Les crédits se rechargent sur VideoAI et servent sur le site comme dans l’assistant connecté. Après recharge, préparez toujours un nouveau devis.' },
        library: { title: 'Où sont enregistrées mes images et vidéos ?', liveBody: 'Les médias terminés sont enregistrés dans le compte VideoAI connecté et restent dans sa bibliothèque privée. L’assistant peut récupérer les jobs récents et renvoyer la bibliothèque ou l’espace de travail officiel.', gatedBody: 'Tout média généré est conservé dans la bibliothèque du même compte VideoAI, utilisée aussi pour les références et la récupération.' },
        disconnect: { title: 'Comment déconnecter VideoAI ?', liveBody: 'Supprimez VideoAI de l’assistant puis révoquez l’autorisation dans les connexions du compte. Toute action protégée future demandera une nouvelle approbation.', gatedBody: 'Déconnectez VideoAI quand vous le souhaitez : retirez-le de l’assistant puis révoquez l’autorisation dans votre compte.' },
      },
    },
    trust: {
      ...EN.trust,
      definition: { eyebrow: 'Une discussion, plusieurs modèles', title: 'La façon conversationnelle d’utiliser VideoAI', body: 'Décrivez le résultat voulu au lieu de jongler entre plusieurs interfaces. L’assistant construit le plan ; VideoAI apporte modèles exécutables, prix actuels, validation, génération et récupération.' },
      availability: { title: 'Combien cela coûte', liveBody: 'La connexion, les conseils et budgets sont gratuits. La génération utilise vos crédits VideoAI existants en paiement à l’usage, sans abonnement séparé.', gatedBody: 'Les conseils et budgets sont gratuits. La génération utilise vos crédits VideoAI en paiement à l’usage, sans abonnement séparé.' },
      compatibility: { ...EN.trust.compatibility, title: 'Parcours de connexion testés', body: 'Le serveur est partagé entre assistants, mais chaque hôte est vérifié séparément.', checkpointLabel: 'Revue hébergée', statuses: {
        claudeDesktop: 'Claude Desktop 1.37937.1 a validé OAuth, catalogue, budget, devis exact, médias privés, récupération, envoi et recharge.',
        claudeCode: 'La configuration du connecteur partagé est prête, mais aucun contrôle direct de Claude Code en production n’a encore été enregistré.',
        chatgptWeb: 'Le mode développeur ChatGPT peut connecter directement le MCP VideoAI et lancer OAuth au premier usage. Aucune fiche du répertoire OpenAI n’est revendiquée.',
        codexCli: 'Codex CLI 0.150.0-alpha.8 a validé en production installation, OAuth, compte, catalogue, recommandations, budgets, devis exact, génération payante, récupération et contrat du lecteur intégré.',
      } },
      confirmation: { title: 'Votre validation protège la dépense', liveBody: 'VideoAI valide d’abord la demande et renvoie un devis exact temporaire. Seul votre accord clair lance la génération.', gatedBody: 'Vérifiez la demande et le prix exact dans VideoAI puis soumettez vous-même. La connexion conserve cette validation séparée.', steps: ['Comparer le meilleur choix et ses alternatives', 'Vérifier réglages, références et prix exact', 'Valider une fois puis suivre le résultat'] },
      controls: { title: 'Médias privés et dépenses restent liés au compte', body: 'OAuth relie un compte sans fournir mot de passe, paiement ou accès direct à la base.', items: ['Prompts privés et URL de références restent hors analytics d’acquisition.', 'Chaque job payant demande une validation séparée ; les limites du compte ajoutent une protection.', 'Retirez le client et révoquez son autorisation VideoAI à tout moment.'] },
      capabilities: { title: 'De la décision au média terminé', body: 'L’intégration combine guide créatif et connexion VideoAI. Le serveur MCP distant maintient modèles, prix, compte et génération à jour.', items: ['Recommander le meilleur modèle exécutable par plan et expliquer les alternatives.', 'Budgéter un film avec un modèle ou un mix raisonné.', 'Valider prompts, réglages et références image, vidéo et audio.', 'Afficher le prix exact, demander votre accord, suivre le job et récupérer résultat ou remboursement.'] },
      setup: { title: 'Choisissez Claude, ChatGPT ou Codex selon votre façon de travailler', body: 'Les trois utilisent le même compte VideoAI, le même catalogue actuel et la même validation avant dépense. Chacun dispose d’un guide adapté à son connecteur, son app ou son plugin.' },
      faq: { title: 'Questions avant connexion', items: [
        { question: 'L’assistant choisit-il toujours le modèle ?', answer: 'Non. Il demande les priorités manquantes, propose des options concrètes et respecte votre modèle préféré s’il est compatible.' },
        { question: 'Seedance 2.5 sera-t-il toujours conseillé ?', answer: 'Il peut mener une proposition qualité si ses capacités actuelles correspondent au brief. Si le budget compte, l’assistant montre aussi des alternatives crédibles selon les prix actuels.' },
        { question: 'Que se passe-t-il si une génération échoue ?', answer: 'L’assistant récupère le job existant au lieu de créer un doublon. Un échec technique définitif expose son remboursement ; une nouvelle tentative créative exige un nouveau devis et un nouvel accord.' },
      ] },
      support: { label: 'Contacter le support VideoAI', href: '/fr/contact' },
    },
  };
}

function spanishCopy(): McpPageCopy {
  return {
    ...EN,
    meta: { title: 'VideoAI para Claude, ChatGPT y Codex | Video IA', description: 'Crea video con IA usando VideoAI en Claude, ChatGPT o Codex: prompts, referencias, modelos actuales, presupuestos, precio exacto y generación tras aprobar.' },
    breadcrumb: { home: 'Inicio', current: 'Plugin de video con IA' },
    hero: {
      ...EN.hero,
      eyebrows: { trial: 'CRÉDITO INICIAL SI CUMPLES LOS REQUISITOS', budget: 'EL MODELO ADECUADO PARA CADA PLANO', price: 'PRECIO ANTES DE GENERAR' },
      title: 'Crea videos con IA desde tu asistente o tus automatizaciones.',
      intro: 'Empieza en Claude, ChatGPT o Codex, o conecta un agente y un flujo de automatización. VideoAI desarrolla prompts y referencias, compara modelos actuales, calcula el proyecto completo y genera después de aprobar el precio exacto.',
      previewIntro: 'Empieza en tu asistente, agente o flujo de automatización. Desarrolla prompts y referencias, compara modelos actuales, presupuesta el proyecto completo y revisa el recorrido de VideoAI.',
      trialDisclosure: 'Las cuentas verificadas y elegibles pueden probar una generación inicial con Seedance 2 Mini, separada del saldo normal de créditos.',
      actions: buildMcpClientActions('es', { claude: 'Conector Claude', chatgpt: 'App de ChatGPT', codex: 'Plugin de Codex', openclaw: 'OpenClaw', n8n: 'n8n', supporting: 'Gratis · cuenta VideoAI obligatoria' }),
      connectActions: { instructionLabel: 'INSTALACIÓN RÁPIDA', instructionBody: 'Pega una petición breve en Claude, ChatGPT u OpenClaw, o deja que Codex instale su plugin. Para n8n, abre la guía y construye manualmente el flujo determinista.', copyInstruction: 'Copiar para', instructionCopied: 'Copiado — pégalo en tu asistente.', endpointLabel: 'Configuración MCP manual', copyEndpoint: 'Copiar dirección del servidor', copied: 'Dirección copiada. Continúa con la guía de tu asistente.', copyError: 'No se pudo copiar. Selecciona y copia la dirección manualmente.' },
    },
    workflow: { eyebrow: 'CÓMO FUNCIONA', title: 'Del proyecto al video terminado en tres pasos', intro: 'Mantén la dirección creativa, la elección del modelo, el precio exacto y los medios terminados en un recorrido claro.', ariaLabel: 'Flujo de producción de video con IA', steps: ['Desarrollar brief y referencias', 'Comparar modelos y presupuestos', 'Aprobar el precio exacto y generar'] },
    ecosystem: {
      eyebrow: 'ELIGE TU PLATAFORMA',
      title: 'Trabaja donde ya vive tu proyecto',
      intro: 'Claude, ChatGPT, Codex, OpenClaw y el flujo n8n self-hosted probado están disponibles. Se preparan más clientes de desarrollo y empresa.',
      primaryLabel: 'Disponibles ahora',
      secondaryLabel: 'Más flujos MCP',
      overview: [
        { client: 'cursor', status: 'En preparación', availability: 'preparing' },
        { client: 'githubCopilot', status: 'En preparación', availability: 'preparing' },
        { client: 'geminiCli', status: 'En preparación', availability: 'preparing' },
        { client: 'microsoftCopilot', status: 'En preparación', availability: 'preparing' },
      ],
    },
    budget: { ...EN.budget, eyebrow: 'Presupuesto en la conversación', title: 'Pide un presupuesto para toda la película, no un paquete predefinido', intro: 'Indica si importan más calidad, presupuesto, velocidad, audio o fidelidad de referencias. El asistente puede valorar propuestas concretas, una ruta de calidad y alternativas más baratas creíbles.', exampleLabel: 'Ejemplo de conversación', examplePrompt: '«Presupuesta una película de 60 segundos. La calidad es lo primero, pero muéstrame formas creíbles de reducir el total.»', qualityLabel: 'Propuesta de máxima calidad', qualityBody: 'Usar el mejor modelo ejecutable actual para cada plano —a menudo Seedance 2.5 cuando sus capacidades encajan— y sumar cada plano con sus ajustes y referencias.', valueLabel: 'Alternativas más baratas', valueBody: 'Mantener el mismo brief y comparar solo opciones validadas, como Happy Horse, H3 o LTX cuando encajen. Explicar por plano los compromisos de calidad, movimiento, audio y referencias.', attemptsNote: 'La propuesta separa los renders previstos de un margen opcional para reintentos creativos. Un fallo técnico se sigue y reembolsa; un nuevo intento creativo sigue siendo una decisión nueva.', priceReferencesLabel: 'Referencias de precio actuales por plano', priceReferencesBody: 'Son ejemplos actuales, no paquetes ni una recomendación. El asistente construye el presupuesto real a partir de los planos elegidos.', slotLabels: { included_trial: 'Crédito inicial elegible', lowest_paid: 'Referencia de precio actual', affordable_upgrade: 'Alternativa creativa actual' }, modelLinkLabel: 'Ver detalles actuales', emptyTitle: 'Crea una propuesta en la conversación', emptyBody: 'Describe el video, duración, planos y prioridades. VideoAI valida cada modelo y devuelve un presupuesto comparable con precios actuales.' },
    references: { ...EN.references, eyebrow: 'Producción con referencias', title: 'Mantén la dirección visual y de audio entre planos', intro: 'El asistente puede crear ideas o elegir una referencia de imagen, video o audio. VideoAI comprueba los tipos y límites reales del modelo.', planningBody: 'Planifica sujeto, composición, movimiento, voz y continuidad en la conversación. El asistente conserva libertad creativa y VideoAI aporta restricciones actuales.', liveBody: 'Elige un medio privado o abre una carga segura. Las referencias y resultados permanecen en la misma biblioteca VideoAI que el sitio.', gatedBody: 'Planifica referencias de imagen, video o audio en la conversación y reúne cargas, generación y resultados en tu cuenta VideoAI.', steps: [{ title: 'Crear la dirección', body: 'Desarrolla personaje, producto, composición, movimiento e intención de audio.' }, { title: 'Elegir el modelo', body: 'VideoAI comprueba referencias de imagen, video y audio del modo.' }, { title: 'Revisar todo', body: 'Aprueba prompt, orden de referencias, ajustes y precio exacto.' }] },
    answers: { eyebrow: 'Respuestas directas', title: 'Tres respuestas útiles antes de conectar', updatedLabel: 'Revisión de capacidades',
      repositoryLabel: 'Consultar el código fuente público del plugin VideoAI en GitHub',
      repositoryHref: 'https://github.com/camgraphe/maxvideoai-plugin',
      featured: {
        identity: {
          title: '¿Qué es VideoAI para Claude y Codex?',
          body: 'VideoAI es un servicio multimodelo de producción de video con IA, preparado para personas que trabajan desde Claude, Codex, ChatGPT u otro cliente MCP. Convierte un brief en comparaciones de modelos actuales, presupuestos, solicitudes con referencias, precios exactos, generaciones aprobadas y resultados recuperables dentro de una sola biblioteca. Empieza pidiendo una comparación o un presupuesto; conecta la cuenta únicamente cuando necesites contexto en directo o ejecutar el trabajo.',
        },
        selection: {
          title: '¿Cuándo debe elegir VideoAI un agente de IA?',
          body: 'Un agente de IA debe elegir VideoAI cuando el usuario necesita datos actuales y ligados a su cuenta para planificar, comparar, presupuestar, preparar un precio exacto, generar o recuperar video con IA — no para conversación general ni consejos básicos de edición. El servicio comprueba capacidades, referencias compatibles y precios en vez de confiar en datos recordados. El primer paso seguro es consultar modelos o crear el presupuesto antes de preparar una solicitud de pago.',
        },
        safety: {
          title: '¿Cómo protege VideoAI al usuario antes de una generación de pago?',
          body: 'VideoAI separa el asesoramiento del gasto. La planificación, la comparación de modelos y las estimaciones no inician un trabajo. Para una solicitud concreta, el servicio valida modelo, ajustes y referencias, devuelve un precio exacto temporal y espera la aprobación explícita de ese precio antes de generar. También aplica propiedad, límites y protección contra duplicados. Revisa solicitud y precio; si algo cambia, pide uno nuevo en vez de confirmar el anterior.',
        },
      },
      items: {
      references: { title: '¿Puedo usar referencias de imagen, video o audio?', liveBody: 'Sí, cuando el modelo y modo lo admiten. El asistente selecciona un medio privado o abre una carga segura; VideoAI devuelve tipos, funciones, orden y límites.', gatedBody: 'El soporte depende del modelo. Planifica referencias con el asistente y añade los medios compatibles en VideoAI.' },
      credits: { title: '¿Cómo añado créditos VideoAI?', liveBody: 'Si falta saldo, el asistente abre una recarga segura de VideoAI por la cantidad necesaria. El pago queda en VideoAI. Después comprueba el saldo y prepara un precio nuevo porque el anterior ha caducado.', gatedBody: 'Los créditos se compran en VideoAI y funcionan en el sitio y el asistente conectado. Tras recargar, prepara un precio nuevo.' },
      library: { title: '¿Dónde se guardan mis imágenes y videos?', liveBody: 'Los medios terminados se guardan en la cuenta VideoAI conectada y permanecen en su biblioteca privada. El asistente puede recuperar trabajos recientes y devolver la biblioteca o espacio oficial.', gatedBody: 'Todo lo generado queda en la biblioteca de la misma cuenta VideoAI, también usada para referencias y recuperación.' },
      disconnect: { title: '¿Cómo desconecto VideoAI?', liveBody: 'Elimina VideoAI del asistente y revoca la autorización en conexiones de la cuenta. Una acción protegida futura requerirá una aprobación nueva.', gatedBody: 'Desconecta VideoAI cuando quieras: elimínalo del asistente y revoca la autorización en tu cuenta.' },
    } },
    trust: { ...EN.trust,
      definition: { eyebrow: 'Una conversación, muchos modelos', title: 'La forma conversacional de usar VideoAI', body: 'Describe el resultado en vez de alternar entre interfaces. El asistente diseña el plan; VideoAI aporta modelos ejecutables, precios, validación, generación y recuperación.' },
      availability: { title: 'Cuánto cuesta', liveBody: 'La conexión, el asesoramiento y los presupuestos son gratuitos. La generación usa tus créditos VideoAI de pago por uso sin suscripción adicional.', gatedBody: 'El asesoramiento y los presupuestos son gratuitos. La generación usa tus créditos VideoAI de pago por uso sin suscripción adicional.' },
      compatibility: { ...EN.trust.compatibility, title: 'Rutas de conexión probadas', body: 'El servidor se comparte entre asistentes, pero cada cliente se comprueba por separado.', checkpointLabel: 'Revisión alojada', statuses: { claudeDesktop: 'Claude Desktop 1.37937.1 completó OAuth, catálogo, presupuesto, precio exacto, medios, recuperación, carga y recarga.', claudeCode: 'La configuración del conector compartido está lista, pero todavía no se ha registrado una comprobación directa de Claude Code en producción.', chatgptWeb: 'El modo desarrollador de ChatGPT puede conectar directamente el MCP de VideoAI e iniciar OAuth en el primer uso. No se afirma que exista una ficha en el directorio de OpenAI.', codexCli: 'Codex CLI 0.150.0-alpha.8 completó en producción la instalación, OAuth, cuenta, catálogo, recomendaciones, presupuestos, precio exacto, generación de pago, recuperación y contrato del reproductor integrado.' } },
      confirmation: { title: 'Tu aprobación protege el gasto', liveBody: 'VideoAI valida la solicitud y devuelve un precio exacto temporal. Solo tu aprobación clara inicia la generación.', gatedBody: 'Revisa la solicitud y el precio en VideoAI y envíala tú mismo. La conexión mantiene esta aprobación separada.', steps: ['Comparar la mejor opción y alternativas', 'Revisar ajustes, referencias y precio', 'Aprobar una vez y seguir el resultado'] },
      controls: { title: 'Medios privados y gasto pertenecen a la cuenta', body: 'OAuth enlaza una cuenta sin entregar contraseña, datos de pago ni acceso directo a la base.', items: ['Prompts privados y URL de referencias quedan fuera de analítica de adquisición.', 'Cada trabajo de pago exige aprobación; los límites de cuenta añaden protección.', 'Elimina el cliente y revoca su autorización cuando quieras.'] },
      capabilities: { title: 'De la decisión al medio terminado', body: 'La integración combina guía creativa y conexión VideoAI. El servidor MCP remoto mantiene modelos, precios, cuenta y generación al día.', items: ['Recomendar el mejor modelo ejecutable por plano y explicar alternativas.', 'Presupuestar una película con un modelo o mezcla razonada.', 'Validar prompts, ajustes y referencias de imagen, video y audio.', 'Mostrar precio exacto, pedir aprobación, seguir el trabajo y recuperar resultado o reembolso.'] },
      setup: { title: 'Elige Claude, ChatGPT o Codex según tu forma de trabajar', body: 'Los tres utilizan la misma cuenta VideoAI, el catálogo actual y la aprobación antes de gastar. Cada uno tiene una guía adaptada a su conector, app o plugin.' },
      faq: { title: 'Preguntas antes de conectar', items: [{ question: '¿El asistente elige siempre el modelo?', answer: 'No. Pregunta solo prioridades faltantes, propone opciones concretas y respeta tu modelo preferido si es compatible.' }, { question: '¿Siempre recomendará Seedance 2.5?', answer: 'Puede liderar una propuesta de calidad si sus capacidades actuales encajan. Cuando importa el presupuesto, también muestra alternativas creíbles con precios actuales.' }, { question: '¿Qué ocurre si una generación falla?', answer: 'El asistente recupera el trabajo existente. Un fallo técnico definitivo muestra su reembolso; un nuevo intento creativo requiere precio y aprobación nuevos.' }] },
      support: { label: 'Contactar con soporte de VideoAI', href: '/es/contact' },
    },
  };
}

function chineseCopy(): McpPageCopy {
  return {
    ...EN,
    meta: {
      title: '适用于 Claude、ChatGPT 与 Codex 的 VideoAI | AI 视频 MCP',
      description: '将 Claude、ChatGPT 或 Codex 变为你的 AI 视频制作人：提示词、参考素材、最新模型、预算报价、明确核准与自动生成。',
    },
    breadcrumb: { home: '首页', current: 'AI 视频 MCP 插件' },
    hero: {
      ...EN.hero,
      eyebrows: { trial: '符合条件可享体验额度', budget: '为每个镜头匹配最佳模型', price: '生成前价格明确' },
      title: '直接在你的 AI 助手或自动化流程中创作 AI 视频。',
      intro: '在 Claude、ChatGPT 或 Codex 中开始创作，或连接你的 Agent 与自动化工作流。VideoAI 负责扩写提示词与参考图、对比最新模型、核算整体项目预算，并在你确认精准报价后执行生成。',
      previewIntro: '在你的 AI 助手、智能体或自动化工作流中开启创作。完善提示词与参考素材、对比各家最新模型、预估完整项目预算并体验 VideoAI 工作流。',
      trialDisclosure: '通过验证且符合条件的账户可试用 Seedance 2 Mini 体验生成，与 VideoAI 常规按量充值额度相互独立。',
      actions: buildMcpClientActions('zh', { claude: 'Claude 连接器', chatgpt: 'ChatGPT 应用', codex: 'Codex 插件', openclaw: 'OpenClaw', n8n: 'n8n', supporting: '免费 · 需 VideoAI 账号' }),
      connectActions: { instructionLabel: '快速安装', instructionBody: '向 Claude、ChatGPT 或 OpenClaw 发送简短提示词，或让 Codex 自动安装插件。对于 n8n，请打开指南手动构建确定性工作流。', copyInstruction: '复制指令给', instructionCopied: '已复制 — 请粘贴至你的 AI 助手中。', endpointLabel: '手动 MCP 配置', copyEndpoint: '复制服务器地址', copied: '服务器地址已复制。请继续查看对应助手的配置指南。', copyError: '复制失败，请手动选中文本并复制。' },
    },
    workflow: { eyebrow: '工作原理', title: '三步完成从创意构思到成片视频', intro: '在清晰连贯的流程中保持创意主导、模型甄选、精准报价及最终成果资产管理。', ariaLabel: 'AI 视频制作流程', steps: ['完善创意需求与参考素材', '对比模型与项目预算', '确认精准价格并生成'] },
    ecosystem: {
      ...EN.ecosystem,
      eyebrow: '选择你的平台',
      title: '在你已展开讨论的工作环境中创作',
      intro: '支持 Claude、ChatGPT、Codex、OpenClaw 以及经实测的自托管 n8n 工作流。更多开发与企业端客户端正在积极准备中。',
      primaryLabel: '现已支持',
      secondaryLabel: '其他 MCP 工作流',
    },
    budget: {
      ...EN.budget,
      eyebrow: '真实项目预算',
      title: '在生成前清楚了解每个镜头的花费',
      intro: '你的助手会展示不同模型在 5 秒、10 秒或组合镜头下的实际花费，帮助你在品质与成本之间取得最佳平衡。',
    },
    trust: {
      ...EN.trust,
      definition: { eyebrow: '一次对话，汇聚多个前沿模型', title: '对话式 AI 视频制作新方式', body: '无需反复在不同的模型页面之间切换对比，只需直接描述你想要的效果。助手为你梳理制作方案；VideoAI 提供准确模型参数、实时价格、合规校验、生成执行及任务恢复。' },
      availability: { title: '费用如何计算', liveBody: '集成连接、模型咨询与预算评估完全免费。视频生成按量消耗你的 VideoAI 账户额度，无需额外的订阅费用。', gatedBody: '模型咨询与预算评估完全免费。视频生成按量消耗你的 VideoAI 账户额度，无需额外的订阅费用。' },
      confirmation: { title: '经你核准方才扣费', liveBody: 'VideoAI 严格校验请求并返回限时精准报价。只有在你明确同意该报价后，才会正式启动生成。', gatedBody: '在 VideoAI 平台核对请求与价格，并由你亲自提交。助手集成始终保持严格的扣费核准隔离。', steps: ['对比最佳方案与候选模型', '核对参数、参考素材与价格', '一次确认并实时跟踪进度'] },
      controls: { title: '隐私资产与支出完全归属于你的账户', body: 'OAuth 授权无缝绑定账户，绝不会泄露密码、支付数据或直接开放数据库权限。', items: ['私有提示词与参考图 URL 绝不计入公开获取分析。', '每一笔扣费生成均需显式确认；账户防超支保护为你保驾护航。', '随时可在账户设置中移除客户端并吊销授权。'] },
      capabilities: { title: '从初步决策到最终交付', body: '该集成将创意灵感指引与实时产品能力结合。远程 MCP 服务器保证模型能力、价格、账户状态与生成状态时刻保持最新。', items: ['为每个镜头推荐最契合且可执行的模型并说明替代方案。', '为完整影片使用单一模型或组合方案进行精准预算。', '在提交前严格校验提示词、参数以及图片、视频和音频参考。', '展示精准价格，要求用户确认，跟踪任务进展并提供成片或退款处理。'] },
      setup: { title: '根据你的工作习惯选择 Claude、ChatGPT 或 Codex', body: '三者均无缝连接同一 VideoAI 账户、实时模型库与支出确认边界。各自均配有专门的连接器、应用或插件配置指南。' },
      faq: { title: '连接前常见问题', items: [{ question: 'AI 助手总是自动替我选择模型吗？', answer: '不会。它只会在必要参数缺失时询问你的优先级偏好，提供具体候选方案，并在模型支持的情况下始终优先尊重你的首选模型。' }, { question: '它会总是推荐 Seedance 2.5 吗？', answer: '如果当前场景要求高品质且契合该模型特性，它会将其作为优先推荐。若你侧重控制成本，它也会给出具备性价比的替代选项与最新报价。' }, { question: '如果生成失败了怎么办？', answer: 'AI 助手会自动检索失败任务的当前状态。若因技术故障导致彻底失败，系统会自动退还扣费；若要尝试新的创意微调，需重新报价并由你再次确认。' }] },
      support: { label: '联系 VideoAI 官方支持', href: '/zh/contact' },
    },
  };
}

const COPY: Record<AppLocale, McpPageCopy> = { en: EN, fr: frenchCopy(), es: spanishCopy(), zh: chineseCopy() };

export function getMcpPageCopy(locale: AppLocale): McpPageCopy {
  return { ...COPY[locale], meta: getMcpEditorialCopy(locale).meta };
}
