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
        title: '将 MaxVideoAI 连接至 Claude',
        intro: '将 MaxVideoAI 添加为自定义远程连接器，然后在浏览器中完成账户授权。',
        installInstruction: getIntegrationInstallInstruction('zh', 'claudeDesktop'),
        steps: [
          { title: '打开连接器设置', body: '在 Claude 中，使用远程 MCP 服务器添加自定义连接器。' },
          { title: '添加 MaxVideoAI', body: '粘贴下方的服务器地址。切勿在此粘贴 API 密钥或账户密码。' },
          { title: '批准连接', body: '登录或注册 MaxVideoAI 账户，确认授权，然后返回 Claude。' },
        ],
        commands: [],
        setupValues: [{ label: 'MaxVideoAI 服务器地址', value: MCP_PRODUCTION_RESOURCE_URL }],
        limitation: '您的点数额度、私有参考素材和已生成的视频均与您在网站上使用的同一个 MaxVideoAI 账户绑定。',
      },
      {
        hostId: 'claudeCode',
        title: '在 Claude Code 中使用相同的连接器',
        intro: '注册远程服务器，然后从 Claude Code 的 MCP 面板进行身份认证。',
        installInstruction: getIntegrationInstallInstruction('zh', 'claudeCode'),
        steps: [
          { title: '添加服务器', body: '在您偏好的项目或用户作用域下执行下方命令一次。' },
          { title: '打开 MCP 面板', body: '输入 /mcp 并选择 MaxVideoAI，在浏览器中启动授权。' },
          { title: '从模型发现开始', body: '在准备付费生成前，可先查询账户状态或当前可用的视频模型。' },
        ],
        commandLabel: 'Claude Code 命令',
        commands: [`claude mcp add --transport http maxvideoai ${MCP_PRODUCTION_RESOURCE_URL}`, 'claude mcp get maxvideoai'],
        setupValues: [],
        authTrigger: '添加服务器后，在 Claude Code 中打开 /mcp 进行认证。',
        limitation: 'Claude Code 共享同一个 MaxVideoAI 账户、实时模型目录、准确报价单及扣费确认边界。',
      },
    ];
  }

  if (client === 'chatgpt') {
    return [
      {
        hostId: 'chatgptWeb',
        title: '通过开发者 MCP 连接 MaxVideoAI',
        intro: '在 ChatGPT 开发者模式中直连 MaxVideoAI MCP，首次使用时完成 OAuth 授权。根据目前的商业政策，MaxVideoAI 暂未提交至 OpenAI 官方目录。',
        installInstruction: getIntegrationInstallInstruction('zh', 'chatgptWeb'),
        steps: [
          { title: '开启开发者模式', body: '确认您的 ChatGPT 订阅计划和工作区角色支持所需的 MCP 权限，然后启用开发者模式。' },
          { title: '添加直连 MCP 连接', body: '添加名为 MaxVideoAI 的连接并填入下方 MCP 地址。切勿在端点中填入令牌、密码或 API 密钥。' },
          { title: '开启新会话', body: '在工具菜单中启用 MaxVideoAI，首次调用时按照提示完成 OAuth 授权。' },
        ],
        commands: [],
        setupValues: [{ label: '开发者模式 MCP 端点', value: MCP_PRODUCTION_RESOURCE_URL }],
        authTrigger: '新 ChatGPT 会话首次使用 MaxVideoAI 时启动 OAuth。请登录或注册您要连接的 MaxVideoAI 账户。',
        limitation: '符合条件的 Business 和 Enterprise/Edu 工作区可使用完整的 MCP 功能，Pro 订阅仍仅限读取与查询。直连开发者模式 MCP 的可用性不受暂未收录至 OpenAI 官方目录这一决定的影响。',
      },
    ];
  }

  return [
    {
      hostId: 'codexCli',
      title: '在 Codex 中安装 MaxVideoAI 插件',
      intro: '添加指定的 MaxVideoAI 插件市场，安装插件，然后在新 Codex 会话中为您的账户授权。',
      installInstruction: getIntegrationInstallInstruction('zh', 'codexCli'),
      steps: [
        { title: '添加插件市场', body: `注册 MaxVideoAI 公共仓库（版本标签：${MAXVIDEOAI_PUBLIC_PLUGIN_VERSION}）。` },
        { title: '安装插件', body: '安装 MaxVideoAI 一次即可获得 plan 与 generate 技能以及生产级 MCP 连接。' },
        { title: '开启新任务', body: '开启新的 Codex 对话，使用 $maxvideoai:plan 或 $maxvideoai:generate，并按提示完成 OAuth。' },
      ],
      commandLabel: 'Codex 插件命令',
      commands: [
        MAXVIDEOAI_CODEX_MARKETPLACE_ADD_COMMAND,
        MAXVIDEOAI_CODEX_PLUGIN_ADD_COMMAND,
      ],
      setupValues: [],
      authTrigger: '新会话首次使用 MaxVideoAI 时将启动 OAuth。登录或注册要连接的账户。',
      limitation: '发布的 GitHub 软件包同时包含 plan 与 generate 技能及生产 MCP 连接。每次生成仍需明确的最终报价单和您的确认。',
    },
  ];
}

export function buildChineseIntegrationCopy(client: McpClientId): IntegrationPageCopy {
  if (client === 'openclaw') return buildOpenClawIntegrationCopy('zh');
  if (client === 'n8n') return buildN8nIntegrationCopy('zh');
  const base = buildEnglishIntegrationCopy(client);
  const clientLabel = getIntegrationLabel(client);
  const term = client === 'chatgpt'
    ? 'MaxVideoAI 应用'
    : client === 'claude'
      ? 'MaxVideoAI 连接器'
      : 'MaxVideoAI 插件';
  const setupDescription = client === 'chatgpt'
    ? '在开发者模式下通过直连 MCP 将 MaxVideoAI 连接至 ChatGPT；首次使用完成 OAuth，对比模型、核对准确价格并取回生成结果。'
    : client === 'claude'
      ? '在 Claude 中配置远程连接器，构思提示词与参考素材、对比 AI 视频模型、查看准确报价并确认 MaxVideoAI 生成。'
      : '安装 Codex 插件，构思提示词与参考素材、对比当前 AI 视频模型、查看准确报价并确认 MaxVideoAI 生成。';
  const setupIntro = client === 'chatgpt'
    ? 'ChatGPT 和 Codex 共享同一个 MaxVideoAI MCP 连接。在 ChatGPT 开发者模式中直连，开启新对话并在首次使用时完成 OAuth。根据目前的商业策略，MaxVideoAI 暂未提交至 OpenAI 官方目录；但这不影响直接 MCP 的连接与使用。'
    : client === 'claude'
      ? '此 Claude 指南涵盖远程连接器配置及完整的创作衔接流程：完善创意构思、对比当前模型与预算、校验参考素材，在一切就绪后确认具体的 MaxVideoAI 报价。'
      : '此 Codex 指南涵盖插件安装及完整的创作衔接流程：完善创意构思、对比当前模型与预算、校验参考素材，在一切就绪后确认具体的 MaxVideoAI 报价。';
  return {
    ...base,
    meta: {
      title: `${term} 连接 ${clientLabel} | MaxVideoAI`,
      description: setupDescription,
    },
    hero: {
      ...base.hero,
      eyebrow: client === 'chatgpt' ? 'MAXVIDEOAI 应用' : client === 'claude' ? 'MAXVIDEOAI 连接器' : 'MAXVIDEOAI 插件',
      title: `在 ${clientLabel} 中使用 MaxVideoAI 创作 AI 视频`,
      intro: setupIntro,
      unavailable: '构思提示词与参考素材、对比最新模型、规划项目预算，体验规范的 MaxVideoAI 制作流程。',
      liveStatus: client === 'chatgpt'
        ? '在 ChatGPT 开发者模式下免费直连 MaxVideoAI，无需额外订阅。首次使用时通过 OAuth 登录或创建账户；仅在明确确认生成时使用按需计费点数。未在 OpenAI 官方目录上架。'
        : 'MaxVideoAI 免费连接，无需额外订阅。登录或创建账户；咨询建议与项目预算估算均免费，仅在明确确认生成时扣除按需计费点数。',
      accountStatus: '需要 MaxVideoAI 账户（可免费创建）。连接无需额外订阅；仅在确认生成时使用按需计费点数。',
      setupLabel: client === 'chatgpt' ? '在 ChatGPT 中连接 MaxVideoAI' : `在 ${clientLabel} 中配置 MaxVideoAI`,
      backLabel: '查看完整的 AI 助手工作流',
      backHref: localizedIntegrationPath('zh', 'mcp'),
    },
    compatibility: {
      checkpointLabel: client === 'chatgpt' ? '流程记录日期' : '兼容性验证日期',
      machineStatusLabel: '主机凭据状态',
      statuses: {
        claudeDesktop: 'Claude Desktop 1.37937.1 在受控环境已完成 OAuth、模型发现、预算核算、精确报价、媒体处理、任务恢复、上传流转和充值跳转验证。',
        claudeCode: '共享连接器配置已就绪，但尚未记录 Claude Code 的直接生产环境测试。',
        chatgptWeb: 'ChatGPT 开发者模式可直连 MaxVideoAI MCP 并在首次使用时启动 OAuth。此路径独立于当前未提交至 OpenAI 目录的决定。',
        codexCli: 'Codex CLI 0.150.0-alpha.8 已在生产环境完成安装、OAuth、账户、目录、推荐、预算、精确报价、付费生成、恢复及内嵌播放器协议测试。',
      },
    },
    setup: {
      ...base.setup,
      eyebrow: '连接您的账户',
      title: `在 ${clientLabel} 中配置 MaxVideoAI`,
      intro: '在配置过程中登录或创建您的 MaxVideoAI 账户。单次安全的 OAuth 连接即可将 AI 助手与您的点数额度、私有媒体素材及 MaxVideoAI 素材库中的生成记录关联。',
      installAction: getIntegrationInstallAction('zh', clientLabel),
      hostGuides: buildChineseGuides(client),
      oauthTitle: '连接时的运行机制',
      oauthBody: '浏览器将打开 MaxVideoAI 登录和授权页面。确认后即可识别连接的账户；AI 助手绝不会获取您的密码、支付详情或直接数据库访问权限。',
      oauthSteps: ['登录或创建您想使用的 MaxVideoAI 账户', '确认邮箱，然后核对并批准连接', `返回 ${clientLabel} 并查询账户状态`],
    },
    workflow: {
      ...base.workflow,
      eyebrow: '从构思到成品',
      title: `在 ${clientLabel} 中构思，由 MaxVideoAI 渲染生成`,
      intro: '将创意沟通保留在您的 AI 助手内。MaxVideoAI 负责提供最新的产品参数与受控的付费执行边界。',
      previewSteps: [
        { title: '完善创意简报', body: `${clientLabel} 仅就缺失的决策提问，编写分镜计划并准备提示词。` },
        { title: '对比真实方案', body: 'MaxVideoAI 返回当前模型能力与项目预算预估，方便您权衡画质、预算或组合搭配。' },
        { title: '查看精确报价', body: '在发生任何扣费前，模型、参数、参考素材与价格将一并经过校验。' },
        { title: '批准、跟踪与恢复', body: '仅在获得明确确认后启动生成；渲染完成的媒体保存在关联的 MaxVideoAI 素材库中。' },
      ],
      liveSteps: [
        { title: '完善创意简报', body: `${clientLabel} 询问缺失的创意、画面格式、画质与预算选项。` },
        { title: '对比当前模型', body: 'MaxVideoAI 提供最匹配的推荐方案以及具备明确权衡的备选模型。' },
        { title: '查看精确报价', body: '在确认前核对提示词、参数、参考素材、价格及账户余额影响。' },
        { title: '生成并跟踪任务', body: '单次确认，安全获取任务状态，并在 MaxVideoAI 素材库中查看最终结果。' },
      ],
    },
    references: {
      title: '在模型支持的情况下使用图像、视频或音频参考素材',
      planningBody: `${clientLabel} 可协助构思或优化参考素材方案，并为每个镜头挑选合适的资源。`,
      liveBody: '从您的 MaxVideoAI 素材库中选择现有的私有图像、视频或音频资源，或启动安全上传流程。支持的类型和限制取自所选模型的实时数据。',
      gatedBody: '在对话中规划参考素材，并将私有上传、生成任务与成品媒体统一保存在您的 MaxVideoAI 账户中。',
    },
    troubleshooting: {
      eyebrow: '常见问题与帮助',
      title: `${clientLabel} 连接帮助`,
      intro: 'AI 助手可以说明下一步安全操作，无需臆测您的余额、任务状态或账户信息。',
      items: [
        { question: '助手提示我重新登录', answer: '请在浏览器中完成 OAuth 认证，然后返回对话。切勿在聊天框中粘贴 MaxVideoAI 密码或 API 凭据。' },
        { question: '账户余额不足', answer: '索取安全的充值链接。支付在 MaxVideoAI 官方页面完成；充值后核对余额并在确认前重新生成报价单。' },
        { question: '找不到已生成的视频', answer: '可以让助手列出近期的生成任务，或直接打开 MaxVideoAI 素材库。切勿重复提交相同的付费生成任务。' },
      ],
    },
    disconnect: {
      title: `断开 ${clientLabel} 连接`,
      body: '在 AI 助手中移除连接，并在 MaxVideoAI 账户设置中撤销已保存的授权。两步操作可确保旧客户端无法保留访问权限。',
      steps: [`从 ${clientLabel} 中移除 MaxVideoAI`, '打开 MaxVideoAI 账户连接设置并撤销授权', '如需重新连接，稍后通过浏览器重新授权即可'],
    },
    support: { label: '联系 MaxVideoAI 技术支持', href: '/zh/contact' },
  };
}
