export function studioProjectEntryUrl(project: {id: string;persistenceMode?: string}, conversationEnabled = true): string {
  return conversationEnabled && project.persistenceMode === 'connected'
    ? `/app/studio/conversation/${encodeURIComponent(project.id)}`
    : '/app/studio';
}

const ENGLISH_ENTRY_COPY = {
  eyebrow: 'YOUR CREATIVE WORKSPACE',
  title: 'What would you like to create?',
  description: 'Explore an idea, shape a prompt, or create with your media. Start a conversation and take it as far as you need.',
  open: 'Open Studio',
  opening: 'Opening Studio…',
  retry: 'Try again',
  note: 'Review the price before you confirm any generation.',
  projectName: 'Untitled project',
  error: 'Studio could not confirm your project. Try again to recover the same project.',
  unauthorized: 'Please sign in again, then retry opening Studio.',
  unavailable: 'Studio is temporarily unavailable. Please try again.',
};

const ZH_ENTRY_COPY: typeof ENGLISH_ENTRY_COPY = {
  eyebrow: '您的创作空间',
  title: '您想创作什么？',
  description: '探索创意、打磨提示词，或使用您的素材创作。开启对话，并按需推进。',
  open: '打开 Studio',
  opening: '正在打开 Studio…',
  retry: '重试',
  note: '确认任何生成前，请先查看价格。',
  projectName: '未命名项目',
  error: 'Studio 无法确认您的项目。请重试以恢复同一项目。',
  unauthorized: '请重新登录，然后重试打开 Studio。',
  unavailable: 'Studio 暂时不可用，请稍后重试。',
};

export function studioConversationEntryCopy(locale: string): typeof ENGLISH_ENTRY_COPY {
  if (locale === 'zh') return ZH_ENTRY_COPY;
  if (locale !== 'fr') return ENGLISH_ENTRY_COPY;
  return {
    eyebrow: 'VOTRE ESPACE CRÉATIF',
    title: 'Qu’avez-vous envie de créer ?',
    description: 'Explorez une idée, affinez un prompt ou créez avec vos médias. Lancez une conversation et avancez à votre rythme.',
    open: 'Ouvrir Studio',
    opening: 'Ouverture de Studio…',
    retry: 'Réessayer',
    note: 'Vérifiez le prix avant de confirmer chaque génération.',
    projectName: 'Projet sans titre',
    error: 'Studio n’a pas pu confirmer votre projet. Réessayez pour retrouver le même projet.',
    unauthorized: 'Reconnectez-vous, puis réessayez d’ouvrir Studio.',
    unavailable: 'Studio est temporairement indisponible. Veuillez réessayer.',
  };
}
