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

function buildChineseGuides(client: McpClientId): IntegrationHostGuide[] {
  if (client === 'claude') {
    return [
      {
        hostId: 'claudeDesktop',
        title: '将 VideoAI 连接到 Claude',
        intro: '将 VideoAI 添加为自定义远程连接器，然后在浏览器中完成账户授权。',
        installInstruction: getIntegrationInstallInstruction('zh', 'claudeDesktop'),
        steps: [
          { title: '打开连接器设置', body: '在 Claude 中，使用远程 MCP 服务器添加自定义连接器。' },
          { title: '添加 VideoAI', body: '粘贴下方的服务器地址。切勿粘贴 API 密钥或账户密码。' },
          { title: '批准连接', body: '登录或注册 VideoAI 账户，确认授权，然后返回 Claude。' },
        ],
        commands: [],
        setupValues: [{ label: 'VideoAI 服务器地址', value: MCP_PRODUCTION_RESOURCE_URL }],
        limitation: '您的积分、私有参考素材和已完成视频均与网站上使用的同一个 VideoAI 账户保持关联。',
      },
      {
        hostId: 'claudeCode',
        title: '在 Claude Code 中使用相同的连接器',
        intro: '注册远程服务器，然后从 Claude Code 的 MCP 面板中完成身份验证。',
        installInstruction: getIntegrationInstallInstruction('zh', 'claudeCode'),
        steps: [
          { title: '添加服务器', body: '在项目或用户作用域下运行一次下方命令。' },
          { title: '打开 MCP 面板', body: '打开 /mcp 并选择 VideoAI，在浏览器中启动授权。' },
          { title: '从目录发现开始', body: '在准备付费生成前，可先查询账户状态或当前视频模型目录。' },
        ],
        commandLabel: 'Claude Code 命令',
        commands: [`claude mcp add --transport http maxvideoai ${MCP_PRODUCTION_RESOURCE_URL}`, 'claude mcp get maxvideoai'],
        setupValues: [],
        authTrigger: '添加服务器后，在 Claude Code 中打开 /mcp 进行身份验证。',
        limitation: 'Claude Code 使用相同的 VideoAI 账户、当前模型目录、确切报价和消费前确认边界。',
      },
    ];
  }

  if (client === 'chatgpt') {
    return [
      {
        hostId: 'chatgptWeb',
        title: '通过开发者 MCP 连接 VideoAI',
        intro: '在 ChatGPT 开发者模式中直接连接 VideoAI MCP，首次使用时完成 OAuth 授权。根据当前商业政策，VideoAI 暂未提交至 OpenAI 目录。',
        installInstruction: getIntegrationInstallInstruction('zh', 'chatgptWeb'),
        steps: [
          { title: '启用开发者模式', body: '确认您的 ChatGPT 计划和工作区权限支持所需的 MCP 权限，然后启用开发者模式。' },
          { title: '添加直连 MCP 连接', body: '添加名为 VideoAI 的连接，并填入下方 MCP 地址。切勿在端点中附带令牌、密码或 API 密钥。' },
          { title: '开启新会话', body: '在工具菜单中启用 VideoAI，首次使用时根据提示完成 OAuth 授权。' },
        ],
        commands: [],
        setupValues: [{ label: '开发者模式 MCP 端点', value: MCP_PRODUCTION_RESOURCE_URL }],
        authTrigger: '当新会话首次使用 VideoAI 时将触发 OAuth 授权流程。请登录或创建您希望绑定的 VideoAI 账户。',
        limitation: '符合条件的 Business 和 Enterprise/Edu 工作区可使用完整 MCP 功能，Pro 计划目前仅限读取和查询。开发者模式直连 MCP 独立可用，不受 OpenAI 目录收录策略的影响。',
      },
    ];
  }

  return [
    {
      hostId: 'codexCli',
      title: '在 Codex 中安装 VideoAI 插件',
      intro: '添加经过标记的 VideoAI 市场，安装插件，然后从新的 Codex 对话中授权您的账户。',
      installInstruction: getIntegrationInstallInstruction('zh', 'codexCli'),
      steps: [
        { title: '添加市场', body: `在已审核的 ${MAXVIDEOAI_PUBLIC_PLUGIN_VERSION} 发布版本标签下注册公开 VideoAI 仓库。` },
        { title: '安装插件', body: '安装一次 VideoAI 插件，获取 plan 和 generate 技能以及生产环境 MCP 连接。' },
        { title: '开启新任务', body: '打开新的 Codex 会话，使用 $maxvideoai:plan 或 $maxvideoai:generate，并在提示时完成 OAuth 授权。' },
      ],
      commandLabel: 'Codex 插件命令',
      commands: [
        MAXVIDEOAI_CODEX_MARKETPLACE_ADD_COMMAND,
        MAXVIDEOAI_CODEX_PLUGIN_ADD_COMMAND,
      ],
      setupValues: [],
      authTrigger: '当新会话首次使用 VideoAI 时将启动 OAuth。请登录或创建您希望绑定的账户。',
      limitation: '带标签的 GitHub 软件包包含规划和生成两项技能以及生产环境 MCP 连接。实际生成始终需要确切报价和您的明确确认。',
    },
  ];
}

export function buildChineseIntegrationCopy(client: McpClientId): IntegrationPageCopy {
  if (client === 'openclaw') return buildOpenClawIntegrationCopy('zh');
  if (client === 'n8n') return buildN8nIntegrationCopy('zh');
  const base = buildEnglishIntegrationCopy(client);
  const clientLabel = getIntegrationLabel(client);
  const term = client === 'chatgpt'
    ? 'VideoAI App'
    : client === 'claude'
      ? 'VideoAI 连接器'
      : 'VideoAI 插件';
  const setupDescription = client === 'chatgpt'
    ? '通过开发者模式直连 MCP 将 VideoAI 连接至 ChatGPT；首次使用完成 OAuth，对比模型，审核确切价格并查看生成结果。'
    : client === 'claude'
      ? '在 Claude 中配置远程连接器以规划提示词和参考素材，对比 AI 视频模型，审核确切报价，并通过 VideoAI 确认生成。'
      : '安装 Codex 插件以规划提示词和参考素材，对比当前主流 AI 视频模型，审核确切报价，并通过 VideoAI 确认生成。';
  const setupIntro = client === 'chatgpt'
    ? 'ChatGPT 和 Codex 使用相同的 VideoAI MCP 连接。在 ChatGPT 开发者模式中直连端点，开启新会话并在首次使用时完成 OAuth 授权。当前根据商业政策暂未提交至 OpenAI 目录，这不影响直连 MCP 的正常使用。'
    : client === 'claude'
      ? '本页面涵盖远程连接器配置及完整的创作交付流程：构思创意简报，对比当前模型与预算，校验参考素材，在需求准备就绪时确认 VideoAI 的确切报价。'
      : '本页面涵盖插件安装及完整的创作交付流程：构思创意简报，对比当前模型与预算，校验参考素材，在需求准备就绪时确认 VideoAI 的确切报价。';

  return {
    ...base,
    meta: {
      title: `${clientLabel} 的 ${term} | VideoAI`,
      description: setupDescription,
    },
    hero: {
      ...base.hero,
      eyebrow: client === 'chatgpt' ? 'MAXVIDEOAI APP' : client === 'claude' ? 'MAXVIDEOAI 连接器' : 'MAXVIDEOAI 插件',
      title: `在 ${clientLabel} 中使用 VideoAI 创建 AI 视频`,
      intro: setupIntro,
      unavailable: '规划提示词与参考素材，对比当前模型，评估项目预算，体验确切透明的 VideoAI 生产工作流。',
      liveStatus: client === 'chatgpt'
        ? '在 ChatGPT 开发者模式中直连 VideoAI 完全免费，无需额外订阅。首次使用时通过 OAuth 登录或创建账户；仅在确认生成时扣除按量付费积分。'
        : '连接 VideoAI 完全免费，无需额外订阅。登录或创建账户即可使用；咨询与项目预估均免费，仅在确认生成时扣除按量付费积分。',
      accountStatus: '需要 VideoAI 账户（可免费创建）。连接无需额外订阅；仅在批准生成时扣除按量付费积分。',
      setupLabel: client === 'chatgpt' ? '在 ChatGPT 中连接 VideoAI' : `在 ${clientLabel} 中配置 VideoAI`,
      backLabel: '查看完整的 AI 助手工作流',
      backHref: localizedIntegrationPath('zh', 'mcp'),
    },
    compatibility: {
      checkpointLabel: client === 'chatgpt' ? '流程已验证' : '兼容性已核实',
      machineStatusLabel: '宿主环境状态',
      statuses: {
        claudeDesktop: 'Claude Desktop 1.37937.1 在受控测试环境下已完成 OAuth、模型发现、预算预估、确切报价、素材管理、任务恢复与充值跳转全流程验证。',
        claudeCode: '共享连接器配置已就绪，直接在 Claude Code 生产环境下的完整验证记录正在归档中。',
        chatgptWeb: 'ChatGPT 开发者模式可直连 VideoAI MCP 并在首次使用时触发 OAuth。此流程独立于 OpenAI 目录政策。',
        codexCli: 'Codex CLI 0.150.0-alpha.8 已在生产环境下通过插件安装、OAuth、账户、目录、推荐、预算、确切报价、付费生成与内联播放契约检查。',
      },
    },
    setup: {
      ...base.setup,
      eyebrow: '连接您的账户',
      title: `在 ${clientLabel} 中配置 VideoAI`,
      intro: '在配置过程中登录或创建您的 VideoAI 账户。安全可靠的 OAuth 授权会将助手直接连通至您的按量付费积分、私有媒体库以及完成的视频作品。',
      installAction: getIntegrationInstallAction('zh', clientLabel),
      hostGuides: buildChineseGuides(client),
      oauthTitle: '连接时会发生什么',
      oauthBody: '浏览器将打开 VideoAI 登录与授权页面。授权仅用于识别关联账户；助手绝不会获取您的密码、支付信息或数据库直接访问权限。',
      oauthSteps: ['登录或创建您要绑定的 VideoAI 账户', '验证邮箱并审核确认连接权限', `返回 ${clientLabel} 查询您的账户状态`],
    },
    workflow: {
      ...base.workflow,
      eyebrow: '从灵感到成品',
      title: `在 ${clientLabel} 中构思，由 VideoAI 负责生成`,
      intro: '将创意对话保留在您的专属助手内，VideoAI 提供实时模型支持与安全透明的计费执行。',
      previewSteps: [
        { title: '制定创意简报', body: `${clientLabel} 仅就关键决策向您提问，梳理分镜规划并准备提示词。` },
        { title: '对比真实选项', body: 'VideoAI 返回最新模型能力与项目预算预估，方便您在画质、成本或组合策略间做出抉择。' },
        { title: '确认确切报价', body: '在产生任何费用前，模型、参数、参考素材与价格均会经过统一校验。' },
        { title: '确认并追踪生成', body: '仅在您明确批准后才启动生成；完成的作品将自动保存在关联的 VideoAI 媒体库中。' },
      ],
      liveSteps: [
        { title: '完善创意简报', body: `${clientLabel} 引导您明确创意细节、画面比例、画质要求与预算偏好。` },
        { title: '对比当前模型', body: 'VideoAI 提供最佳适配推荐及可靠的替代方案，并给出明确的权衡分析。' },
        { title: '审核确切报价', body: '在确认前仔细检查提示词、设置、参考素材、最终费用及账户变动。' },
        { title: '生成并追踪任务', body: '一次确认即可安全追踪任务状态，并在 VideoAI 媒体库中直接下载成果。' },
      ],
    },
    references: {
      title: '在模型支持的情况下使用图像、视频或音频作为参考素材',
      planningBody: `${clientLabel} 能够协助构思和完善参考素材创意，为每个镜头挑选最合适的素材资产。`,
      liveBody: '从您的 VideoAI 媒体库中选择已有私有素材，或通过安全链接上传。支持的素材类型与上限由所选模型的实时规格决定。',
      gatedBody: '在对话中规划素材构想，私有上传、视频生成与完成结果全部统一归档于您的 VideoAI 账户。',
    },
    troubleshooting: {
      eyebrow: '常见疑问与排错',
      title: `${clientLabel} 连接帮助`,
      intro: '助手将为您提供下一步的安全操作指引，而不会凭空猜测您的账户余额或任务状态。',
      items: [
        { question: '助手提示我需要重新登录', answer: '在浏览器中完成 OAuth 授权流程，然后返回对话界面。切勿直接在聊天窗口中粘贴密码或 API 密钥。' },
        { question: '账户余额不足怎么办？', answer: '让助手提供安全的充值链接。支付环节均在 VideoAI 官方平台完成；充值成功后重新获取最新报价即可确认生成。' },
        { question: '找不到已完成的生成结果？', answer: '可要求助手列出最近生成的任务，或直接打开 VideoAI 媒体库查看，请勿重复发起相同的付费任务。' },
      ],
    },
    disconnect: {
      title: `断开与 ${clientLabel} 的连接`,
      body: '在助手端移除连接，并在 VideoAI 账户设置中撤销授权凭证。两步结合可彻底防止旧客户端残留访问权限。',
      steps: [`在 ${clientLabel} 中移除 VideoAI`, '打开 VideoAI 账户连接设置并撤销授权', '日后如需使用，可随时通过浏览器重新授权连接'],
    },
    support: { label: '联系 VideoAI 技术支持', href: '/zh/contact' },
  };
}