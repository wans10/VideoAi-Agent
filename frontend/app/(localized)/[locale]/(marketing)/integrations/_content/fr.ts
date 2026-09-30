import {
  MAXVIDEOAI_CODEX_MARKETPLACE_ADD_COMMAND,
  MAXVIDEOAI_CODEX_PLUGIN_ADD_COMMAND,
  MAXVIDEOAI_PUBLIC_PLUGIN_VERSION,
} from '@/config/maxvideoai-plugin-release';
import { MCP_PRODUCTION_RESOURCE_URL } from '@/server/mcp/config';
import type { McpClientId } from '../../mcp/_lib/mcp-page-types';
import { buildEnglishIntegrationCopy } from './en';
import {
  getIntegrationInstallAction,
  getIntegrationInstallInstruction,
  getIntegrationLabel,
  localizedIntegrationPath,
} from './shared';
import { buildN8nIntegrationCopy } from './n8n';
import { buildOpenClawIntegrationCopy } from './openclaw';
import type { IntegrationHostGuide, IntegrationPageCopy } from './types';

function buildFrenchGuides(client: McpClientId): IntegrationHostGuide[] {
  if (client === 'claude') {
    return [
      {
        hostId: 'claudeDesktop',
        title: 'Connecter VideoAI à Claude',
        intro: 'Ajoutez VideoAI comme connecteur distant personnalisé, puis autorisez votre compte dans le navigateur.',
        installInstruction: getIntegrationInstallInstruction('fr', 'claudeDesktop'),
        steps: [
          { title: 'Ouvrir les réglages', body: 'Dans Claude, ajoutez un connecteur personnalisé utilisant un serveur MCP distant.' },
          { title: 'Ajouter VideoAI', body: 'Collez l’adresse ci-dessous. Ne collez jamais une clé API ou votre mot de passe.' },
          { title: 'Approuver la connexion', body: 'Connectez-vous ou créez votre compte VideoAI, approuvez l’accès, puis revenez dans Claude.' },
        ],
        commands: [],
        setupValues: [{ label: 'Serveur VideoAI', value: MCP_PRODUCTION_RESOURCE_URL }],
        limitation: 'Crédits, références privées et vidéos terminées restent liés au même compte VideoAI que sur le site.',
      },
      {
        hostId: 'claudeCode',
        title: 'Utiliser le même connecteur dans Claude Code',
        intro: 'Enregistrez le serveur distant puis authentifiez-vous depuis le panneau MCP de Claude Code.',
        installInstruction: getIntegrationInstallInstruction('fr', 'claudeCode'),
        steps: [
          { title: 'Ajouter le serveur', body: 'Exécutez une fois la commande ci-dessous avec la portée projet ou utilisateur.' },
          { title: 'Ouvrir le panneau MCP', body: 'Ouvrez /mcp et sélectionnez VideoAI pour lancer l’autorisation dans le navigateur.' },
          { title: 'Commencer par le catalogue', body: 'Demandez l’état du compte ou les modèles vidéo actuels avant de préparer une génération.' },
        ],
        commandLabel: 'Commandes Claude Code',
        commands: [`claude mcp add --transport http maxvideoai ${MCP_PRODUCTION_RESOURCE_URL}`, 'claude mcp get maxvideoai'],
        setupValues: [],
        authTrigger: 'Après l’ajout du serveur, ouvrez /mcp dans Claude Code pour vous authentifier.',
        limitation: 'Claude Code retrouve le même compte, le catalogue actuel, les devis exacts et la validation avant dépense.',
      },
    ];
  }

  if (client === 'chatgpt') {
    return [
      {
        hostId: 'chatgptWeb',
        title: 'Connecter VideoAI par le MCP développeur',
        intro: 'Connectez directement le MCP VideoAI en mode développeur ChatGPT, puis terminez OAuth à la première utilisation. VideoAI n’est délibérément pas soumis au répertoire OpenAI selon la politique commerciale actuelle.',
        installInstruction: getIntegrationInstallInstruction('fr', 'chatgptWeb'),
        steps: [
          { title: 'Activer le mode développeur', body: 'Vérifiez que votre offre ChatGPT et votre rôle dans l’espace autorisent les permissions MCP nécessaires, puis activez le mode développeur.' },
          { title: 'Ajouter la connexion MCP directe', body: 'Ajoutez une connexion VideoAI avec l’adresse MCP ci-dessous. Ne collez jamais de jeton, mot de passe ou clé API dans l’adresse.' },
          { title: 'Démarrer une nouvelle discussion', body: 'Activez VideoAI dans le menu des outils puis terminez OAuth lors de la première utilisation.' },
        ],
        commands: [],
        setupValues: [{ label: 'Adresse MCP du mode développeur', value: MCP_PRODUCTION_RESOURCE_URL }],
        authTrigger: 'OAuth démarre lorsque la nouvelle discussion ChatGPT utilise VideoAI pour la première fois. Connectez-vous ou créez le compte VideoAI à relier.',
        limitation: 'Les espaces Business et Enterprise/Edu éligibles peuvent utiliser le MCP complet, tandis que Pro reste limité à la lecture et à la consultation. Le MCP direct en mode développeur reste disponible indépendamment de la décision actuelle de ne pas soumettre VideoAI au répertoire OpenAI.',
      },
    ];
  }

  return [
    {
      hostId: 'codexCli',
      title: 'Installer le plugin VideoAI dans Codex',
      intro: 'Ajoutez la marketplace VideoAI taguée, installez le plugin puis autorisez votre compte depuis une nouvelle conversation Codex.',
      installInstruction: getIntegrationInstallInstruction('fr', 'codexCli'),
      steps: [
        { title: 'Ajouter la marketplace', body: `Enregistrez le dépôt public VideoAI sur le tag de version ${MAXVIDEOAI_PUBLIC_PLUGIN_VERSION} contrôlé.` },
        { title: 'Installer le plugin', body: 'Installez VideoAI une fois pour recevoir les skills plan et generate ainsi que la connexion MCP de production.' },
        { title: 'Démarrer une nouvelle tâche', body: 'Ouvrez une nouvelle conversation Codex, utilisez $maxvideoai:plan ou $maxvideoai:generate, puis terminez OAuth à la demande.' },
      ],
      commandLabel: 'Commandes du plugin Codex',
      commands: [
        MAXVIDEOAI_CODEX_MARKETPLACE_ADD_COMMAND,
        MAXVIDEOAI_CODEX_PLUGIN_ADD_COMMAND,
      ],
      setupValues: [],
      authTrigger: 'OAuth démarre lorsque la nouvelle conversation utilise VideoAI pour la première fois. Connectez-vous ou créez le compte à relier.',
      limitation: 'Le package GitHub tagué inclut les skills plan et generate et la connexion MCP de production. Toute génération attend toujours un devis exact et votre accord explicite.',
    },
  ];
}
export function buildFrenchIntegrationCopy(client: McpClientId): IntegrationPageCopy {
  if (client === 'openclaw') return buildOpenClawIntegrationCopy('fr');
  if (client === 'n8n') return buildN8nIntegrationCopy('fr');
  const base = buildEnglishIntegrationCopy(client);
  const clientLabel = getIntegrationLabel(client);
  const term = client === 'chatgpt'
    ? 'App VideoAI'
    : client === 'claude'
      ? 'Connecteur VideoAI'
      : 'Plugin VideoAI';
  const setupDescription = client === 'chatgpt'
    ? 'Connectez VideoAI à ChatGPT par MCP direct en mode développeur ; OAuth démarre au premier usage pour comparer, valider un devis et récupérer le résultat.'
    : client === 'claude'
      ? 'Configurez le connecteur distant dans Claude pour préparer prompts et références, comparer les modèles vidéo IA, vérifier le devis et approuver la génération.'
      : 'Installez le plugin Codex pour préparer prompts et références, comparer les modèles vidéo IA, vérifier le devis exact et approuver la génération.';
  const setupIntro = client === 'chatgpt'
    ? 'ChatGPT et Codex utilisent la même connexion MCP VideoAI. Connectez-la directement en mode développeur ChatGPT, démarrez une nouvelle discussion puis terminez OAuth à la première utilisation. VideoAI n’est pas soumis au répertoire OpenAI selon la politique commerciale actuelle ; cette décision distincte ne désactive pas le MCP direct.'
    : client === 'claude'
      ? 'Cette page Claude réunit la configuration du connecteur distant et le passage à la production : développez le brief, comparez modèles et budgets actuels, validez les références puis approuvez un devis VideoAI exact lorsque la demande est prête.'
      : 'Cette page Codex réunit l’installation du plugin et le passage à la production : développez le brief, comparez modèles et budgets actuels, validez les références puis approuvez un devis VideoAI exact lorsque la demande est prête.';
  return {
    ...base,
    meta: {
      title: `${term} pour ${clientLabel} | VideoAI`,
      description: setupDescription,
    },
    hero: {
      ...base.hero,
      eyebrow: client === 'chatgpt' ? 'APP MAXVIDEOAI' : client === 'claude' ? 'CONNECTEUR MAXVIDEOAI' : 'PLUGIN MAXVIDEOAI',
      title: `Créez vos vidéos IA avec VideoAI dans ${clientLabel}`,
      intro: setupIntro,
      unavailable: 'Préparez prompts et références, comparez les modèles, budgétez le projet et découvrez le parcours de production VideoAI.',
      liveStatus: client === 'chatgpt'
        ? 'VideoAI se connecte directement et gratuitement en mode développeur ChatGPT, sans abonnement supplémentaire. Connectez-vous ou créez un compte par OAuth à la première utilisation ; seuls les rendus approuvés utilisent vos crédits VideoAI. Aucune fiche du répertoire OpenAI n’est revendiquée.'
        : 'La connexion VideoAI est gratuite, sans abonnement supplémentaire. Connectez-vous ou créez un compte ; seuls les rendus approuvés utilisent vos crédits VideoAI à la consommation.',
      accountStatus: 'Un compte VideoAI est requis et sa création est gratuite. La connexion n’ajoute aucun abonnement ; seuls les rendus approuvés utilisent vos crédits VideoAI.',
      setupLabel: client === 'chatgpt' ? 'Connecter VideoAI dans ChatGPT' : `Configurer VideoAI dans ${clientLabel}`,
      backLabel: 'Voir le parcours complet dans votre assistant IA',
      backHref: localizedIntegrationPath('fr', 'mcp'),
    },
    compatibility: {
      checkpointLabel: client === 'chatgpt' ? 'Parcours documenté le' : 'Compatibilité vérifiée le',
      machineStatusLabel: 'État de preuve hôte',
      statuses: {
        claudeDesktop: 'Claude Desktop 1.37937.1 a validé sur le staging contrôlé OAuth, catalogue, budgets, devis exact, médias, récupération, envoi et recharge.',
        claudeCode: 'La configuration du connecteur partagé est prête, mais aucun contrôle direct de Claude Code en production n’a encore été enregistré.',
        chatgptWeb: 'Le mode développeur ChatGPT peut connecter directement le MCP VideoAI et lancer OAuth au premier usage. Ce parcours reste distinct de la décision actuelle de ne pas soumettre VideoAI au répertoire OpenAI.',
        codexCli: 'Codex CLI 0.150.0-alpha.8 a validé en production installation, OAuth, compte, catalogue, recommandations, budgets, devis exact, génération payante, récupération et contrat du lecteur intégré.',
      },
    },
    setup: {
      ...base.setup,
      eyebrow: 'CONNECTEZ VOTRE COMPTE',
      title: `Configurer VideoAI dans ${clientLabel}`,
      intro: 'Connectez-vous ou créez votre compte VideoAI pendant la configuration. OAuth relie ensuite l’assistant à vos crédits, vos médias privés et vos générations dans la bibliothèque VideoAI.',
      installAction: getIntegrationInstallAction('fr', clientLabel),
      hostGuides: buildFrenchGuides(client),
      oauthTitle: 'Ce qui se passe lors de la connexion',
      oauthBody: 'Le navigateur ouvre la connexion et le consentement VideoAI. L’assistant ne reçoit jamais votre mot de passe, vos données de paiement ni un accès direct à la base.',
      oauthSteps: ['Connectez-vous ou créez le compte VideoAI voulu', 'Confirmez votre e-mail, puis vérifiez et approuvez la connexion', `Revenez dans ${clientLabel} et demandez l’état du compte`],
    },
    workflow: {
      ...base.workflow,
      eyebrow: 'DE L’IDÉE AU RÉSULTAT',
      title: `Créez avec ${clientLabel}, générez avec VideoAI`,
      intro: 'Gardez la discussion créative dans l’assistant. VideoAI apporte les informations à jour et contrôle l’exécution payante.',
      previewSteps: [
        { title: 'Développer le brief', body: `${clientLabel} précise les décisions manquantes, le plan et les prompts.` },
        { title: 'Comparer de vraies options', body: 'VideoAI fournit capacités et budgets actuels : qualité, économie ou mix raisonné.' },
        { title: 'Vérifier le devis exact', body: 'Modèle, réglages, références et prix sont validés ensemble avant toute dépense.' },
        { title: 'Approuver et suivre', body: 'La génération attend votre accord clair ; le résultat reste dans la bibliothèque VideoAI du compte.' },
      ],
      liveSteps: [
        { title: 'Développer le brief', body: `${clientLabel} précise les choix créatifs, le format, la qualité et le budget.` },
        { title: 'Comparer les modèles actuels', body: 'VideoAI propose le meilleur choix et des alternatives crédibles avec leurs compromis.' },
        { title: 'Vérifier le devis exact', body: 'Contrôlez prompt, réglages, références, prix et effet sur le solde.' },
        { title: 'Générer et suivre', body: 'Approuvez une fois, récupérez le statut et retrouvez le résultat dans la bibliothèque VideoAI.' },
      ],
    },
    references: {
      title: 'Utiliser des références image, vidéo ou audio selon le modèle',
      planningBody: `${clientLabel} peut créer ou améliorer les idées de références et choisir le bon média pour chaque plan.`,
      liveBody: 'Sélectionnez un média privé existant dans la bibliothèque VideoAI ou ouvrez un envoi sécurisé. Les types et limites viennent des informations actuelles du modèle choisi.',
      gatedBody: 'Préparez les références dans la conversation puis centralisez envois privés, génération et résultats dans votre compte VideoAI.',
    },
    troubleshooting: {
      eyebrow: 'AIDE',
      title: `Aide à la connexion ${clientLabel}`,
      intro: 'L’assistant peut expliquer la prochaine étape sûre sans inventer le solde, l’état du job ni une adresse de compte.',
      items: [
        { question: 'L’assistant me demande de me reconnecter', answer: 'Terminez OAuth dans le navigateur puis revenez dans la discussion. Ne collez jamais votre mot de passe ou une clé API dans le chat.' },
        { question: 'Mon solde est insuffisant', answer: 'Demandez un lien de recharge sécurisé. Le paiement reste sur VideoAI ; rechargez, vérifiez le solde puis préparez un nouveau devis.' },
        { question: 'Je ne trouve pas un résultat terminé', answer: 'Demandez les générations récentes ou ouvrez la bibliothèque VideoAI. Ne relancez pas un job payant en double.' },
      ],
    },
    disconnect: {
      title: `Déconnecter ${clientLabel}`,
      body: 'Supprimez la connexion dans l’assistant et révoquez l’autorisation dans les réglages VideoAI.',
      steps: [`Supprimer VideoAI de ${clientLabel}`, 'Ouvrir les connexions du compte VideoAI et révoquer l’accès', 'Se reconnecter plus tard avec une nouvelle approbation si nécessaire'],
    },
    support: { label: 'Contacter le support VideoAI', href: '/fr/contact' },
  };
}
