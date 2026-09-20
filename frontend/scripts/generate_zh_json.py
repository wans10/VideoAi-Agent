import json
import os
import re

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EN_PATH = os.path.join(ROOT_DIR, "messages", "en.json")
ZH_PATH = os.path.join(ROOT_DIR, "messages", "zh.json")

with open(EN_PATH, "r", encoding="utf-8") as f:
    en_data = json.load(f)

# Base translations for exact key paths (dot notation)
EXACT_TRANSLATIONS = {
    # nav
    "nav.signedIn": "已登录",
    "nav.signOut": "退出登录",
    "nav.brand": "MaxVideo AI",
    "nav.login": "登录",
    "nav.cta": "开始生成",
    "nav.primaryNavigation": "主导航",
    "nav.lightTheme": "浅色模式",
    "nav.darkTheme": "深色模式",
    "nav.mobileToggle": "打开菜单",
    "nav.mobileClose": "关闭菜单",
    "nav.menuCreate": "创作",
    "nav.menuExplore": "探索",
    "nav.menuMedia.video": "视频",
    "nav.menuMedia.image": "图像",
    "nav.menuMedia.audio": "音频",
    "nav.badges.new": "新",
    "nav.userMenu.signedIn": "已登录",
    "nav.userMenu.signOut": "退出登录",
    "nav.userMenu.links.dashboard": "控制台",
    "nav.userMenu.links.generate": "生成视频",
    "nav.userMenu.links.generate-image": "生成图像",
    "nav.userMenu.links.generate-audio": "生成音频",
    "nav.userMenu.links.tools": "创作工具",
    "nav.userMenu.links.library": "媒体库",
    "nav.userMenu.links.jobs": "任务历史",
    "nav.userMenu.links.billing": "充值账单",
    "nav.userMenu.links.settings": "设置",
    "nav.userMenu.links.studio": "编辑器",
    "nav.linkLabels.models": "模型",
    "nav.linkLabels.examples": "示例",
    "nav.linkLabels.tools": "工具",
    "nav.linkLabels.image": "生成图像",
    "nav.linkLabels.compare": "模型对比",
    "nav.linkLabels.pricing": "价格",
    "nav.linkLabels.docs": "文档",
    "nav.linkLabels.blog": "博客",
    "nav.linkLabels.connect": "智能助手",
    "nav.dropdown.allModels": "全部模型",
    "nav.dropdown.allExamples": "全部示例",
    "nav.dropdown.allComparisons": "全部对比",
    "nav.dropdown.allTools": "全部工具",
    "nav.dropdown.viewAll": "查看全部",
    "nav.dropdown.guideTitle": "模型推荐",
    "nav.dropdown.useCaseTitle": "按应用场景选择",
    "nav.dropdown.moreExamples": "探索更多示例",
    "nav.dropdown.connectGuides": "连接与创作",
    "nav.dropdown.allAssistants": "探索助手与 MCP",
    "nav.dropdown.moreModels": "激发更多创意灵感",
    "nav.dropdown.resourcesTitle": "指南与资源",
    "nav.dropdown.models.heading": "寻找契合您需求的视频模型。",
    "nav.dropdown.models.intro": "性能参数、真实示例与详细价格，随心挑选最适合您项目的模型。",
    "nav.dropdown.models.sections.resources.items.blog": "博客",
    "nav.dropdown.models.sections.resources.items.get-started": "快速入门",
    "nav.dropdown.examples.heading": "先看效果，再做决定。",
    "nav.dropdown.examples.intro": "真实生成视频、提示词与模型细节。",
    "nav.dropdown.compare.heading": "双模型横评，决策更清晰。",
    "nav.dropdown.compare.intro": "全方位对比评测得分、视频效果、功能特性与生成成本。",
    "nav.dropdown.tools.heading": "打造生动故事的下一个画面。",
    "nav.dropdown.tools.intro": "创建参考角色、微调镜头角度并完善画面细节。",
    "nav.dropdown.tools.items.ai-video-assistant": "Claude、ChatGPT 与 Codex 视频助手",
    "nav.dropdown.tools.items.character-builder": "AI 角色一致性生成",
    "nav.dropdown.tools.items.angle": "调整摄像机视角",
    "nav.dropdown.tools.items.image": "生成图像",
    "nav.dropdown.tools.items.audio": "生成音频",
    "nav.dropdown.tools.items.background-removal": "视频背景去除",
    "nav.dropdown.tools.items.upscale": "AI 画质超分",
    "nav.dropdown.tools.sections.resources.items.blog": "博客",
    "nav.dropdown.tools.sections.resources.items.get-started": "快速入门",
    "nav.dropdown.workflows.items.how": "工作原理",
    "nav.dropdown.workflows.items.capabilities": "功能特性",
    "nav.dropdown.workflows.items.examples": "生成示例",
    "nav.dropdown.workflows.items.faq": "常见问题",
    "nav.dropdown.docs.items.get-started": "快速上手",
    "nav.dropdown.docs.items.brand-safety": "品牌安全",
    "nav.dropdown.blog.items.compare-ai-video-engines": "AI 视频模型对比",
    "nav.dropdown.blog.items.sora-2-sequenced-prompts": "Sora 2 连贯提示词指南",
    "nav.dropdown.blog.items.veo-3-updates": "Veo 3 更新动态",
    "nav.dropdown.connect.heading": "您的智能助手，即是您的专属视频工作室。",
    "nav.dropdown.connect.intro": "选择模型，核对费用，并通过 MCP 无缝生成。",
    "nav.dropdown.connect.descriptions.claude": "添加 MaxVideoAI MCP 连接器。",
    "nav.dropdown.connect.descriptions.chatgpt": "自定义 MCP 应用 · 适用于支持的工作区。",
    "nav.dropdown.connect.descriptions.codex": "添加 MaxVideoAI 插件。",
    "nav.dropdown.connect.descriptions.openclaw": "安装 MaxVideoAI 技能。",
    "nav.dropdown.connect.descriptions.n8n": "自托管 AI 视频自动化工作流。",
    "nav.dropdown.connect.sections.connectGuides.items.mcp-guide": "MCP 工作原理",
    "nav.dropdown.connect.sections.connectGuides.items.mcp-docs": "MCP 服务器文档",

    # footer
    "footer.brandNote": "专业的独立 AI 视频聚合平台 —— 生成前明晰价格，始终紧跟最新模型，一个工作区掌控全部镜头。支持 Seedance、Kling、Veo、LTX、Wan、Pika、Sora 等。商标归各自所有者所有。",
    "footer.languageLabel": "语言",
    "footer.crawlerNote": "MaxVideoAI 允许 AI 爬虫（GPTBot、OAI-SearchBot、Google-Extended 和 CCBot）索引公开模型页面和文档，用于学术研究与教育展示。",
    "footer.sections.engines.title": "AI 视频模型",
    "footer.sections.comparisons.title": "模型对比",
    "footer.sections.useCases.title": "应用场景",
    "footer.sections.useCases.items.bestFor": "按场景精选模型",
    "footer.sections.useCases.items.cinematic-realism": "电影级真实感",
    "footer.sections.useCases.items.image-to-video": "图生视频",
    "footer.sections.useCases.items.fast-drafts": "快速分镜草稿",
    "footer.sections.useCases.items.ads": "商品与广告制作",
    "footer.sections.examples.title": "真实示例",
    "footer.sections.examples.items.all": "全部示例",
    "footer.sections.product.title": "产品功能",
    "footer.sections.product.items.angle": "调整摄像机视角",
    "footer.sections.product.items.characterBuilder": "角色生成器",
    "footer.sections.product.items.pricing": "价格方案",
    "footer.sections.product.items.paygVideo": "按需付费 AI 视频",
    "footer.sections.product.items.models": "全部模型",
    "footer.sections.company.title": "资源",
    "footer.sections.company.items.blog": "博客",
    "footer.sections.company.items.status": "服务状态",
    "footer.sections.company.items.companyHub": "公司与信任",
    "footer.sections.company.items.contact": "联系我们",
    "footer.sections.policies.title": "政策条款",
    "footer.sections.policies.manageCookies": "Cookie 设置",
    "footer.mcpFeature.title": "与您的 AI 助手协同创作。",
    "footer.mcpFeature.body": "支持 Claude、ChatGPT、Codex 或 OpenClaw。在 n8n 中构建视频自动化工作流。通过 MCP 连接您的模型与积分额度。",
    "footer.mcpFeature.cta": "探索 MaxVideoAI MCP",
    "footer.mcpFeature.section": "智能助手与 MCP",
    "footer.mcpFeature.docs": "MCP 文档",
    "footer.mcpFeature.anchors.claude": "连接 Claude",
    "footer.mcpFeature.anchors.chatgpt": "MaxVideoAI for ChatGPT",
    "footer.mcpFeature.anchors.codex": "MaxVideoAI Codex 插件",
    "footer.mcpFeature.anchors.openclaw": "MaxVideoAI OpenClaw 技能",
    "footer.mcpFeature.anchors.n8n": "n8n 视频自动化",

    # auth
    "auth.back": "返回",
    "auth.tabs.signin": "登录",
    "auth.tabs.signup": "创建账户",
    "auth.modes.signup.title": "创建您的工作区账户",
    "auth.modes.signup.description": "创建账户，验证您的邮箱，即可返回工作区开始渲染。",
    "auth.modes.signin.title": "登录您的工作区",
    "auth.modes.signin.description": "使用 Google 或邮箱登录，快速进入工作区。",
    "auth.modes.reset.title": "重置您的密码",
    "auth.modes.reset.description": "我们将向您发送重置密码的安全链接。",
    "auth.continuation.billing.title": "您的 {amount} 充值选择已保存",
    "auth.continuation.billing.body": "创建账户或登录后，您将返回充值页面，并保留该充值金额。",
    "auth.continuation.billingGeneric.title": "您的充值选择已保存",
    "auth.continuation.billingGeneric.body": "创建账户或登录后，您将返回充值页面以安全继续。",
    "auth.continuation.video.title": "您的生成设置已保存",
    "auth.continuation.video.body": "在此继续，您将返回相同的视频模型与配置参数。",
    "auth.continuation.image.title": "您的图像设置已保存",
    "auth.continuation.image.body": "在此继续，您将返回相同的图像模型与配置参数。",
    "auth.continuation.audio.title": "您的音频工作区已就绪",
    "auth.continuation.audio.body": "在此继续，您将返回生成音频界面。",
    "auth.continuation.library.title": "您将返回媒体库",
    "auth.continuation.library.body": "在此继续，您将返回保存的媒体与最近渲染结果。",
    "auth.continuation.tool.title": "您的工具设置已保存",
    "auth.continuation.tool.body": "在此继续，您将返回相同的创作工具。",
    "auth.google": "使用 Google 继续",
    "auth.divider": "邮箱登录",
    "auth.fields.email": "电子邮箱",
    "auth.fields.password": "密码",
    "auth.fields.confirmPassword": "确认密码",
    "auth.placeholders.email": "you@domain.com",
    "auth.placeholders.passwordNew": "至少 6 个字符",
    "auth.placeholders.password": "••••••••",
    "auth.forgotPassword": "忘记密码？",
    "auth.actions.signin": "邮箱登录",
    "auth.actions.signup": "创建账户",
    "auth.actions.reset": "发送重置链接",
    "auth.links.backToSignIn": "返回登录",
    "auth.links.newAccount": "创建新账户",
    "auth.links.haveAccount": "已有账户？去登录",
    "auth.terms.prefix": "我已阅读并同意",
    "auth.terms.termsLabel": "服务条款",
    "auth.terms.infix": "与",
    "auth.terms.privacyLabel": "隐私政策",
    "auth.terms.suffix": "。",
    "auth.terms.error": "您必须同意服务条款和隐私政策才能继续。",
    "auth.terms.age": "我确认已年满 {age} 周岁。",
    "auth.terms.marketing": "同意接收不定期产品更新邮件。可随时取消订阅。",
    "auth.signupSuggestion.title": "第一次来？",
    "auth.signupSuggestion.body": "使用 {email} 直接创建账户，无需重复填写信息。",
    "auth.signupSuggestion.accept": "创建该账户",
    "auth.signupSuggestion.decline": "重新尝试",
    "auth.modeGroup": "选择账户访问模式",
    "auth.passwordVisibility.show": "显示密码",
    "auth.passwordVisibility.hide": "隐藏密码",
    "auth.validation.formAttention": "请检查高亮字段后重试。",
    "auth.validation.emailRequired": "请输入您的电子邮箱。",
    "auth.validation.emailInvalid": "请输入有效的电子邮箱地址。",
    "auth.validation.passwordRequired": "请输入密码。",
    "auth.validation.passwordTooShort": "密码长度至少为 6 个字符。",
    "auth.validation.confirmRequired": "请确认密码。",
    "auth.validation.passwordMismatch": "两次输入的密码不一致。",
    "auth.validation.termsRequired": "接受服务条款和隐私政策后方可继续。",
    "auth.validation.ageRequired": "请确认您已达到法定年龄要求。",
    "auth.feedback.signingIn": "正在登录…",
    "auth.feedback.signinRedirecting": "登录成功，正在跳转…",
    "auth.feedback.signinSuggestion": "无法使用该凭据登录。如果您是新用户，无需重新输入即可直接创建账户。",
    "auth.feedback.signupSuggestionReady": "太好了，让我们为您创建账户。",
    "auth.feedback.creatingAccount": "正在创建账户…",
    "auth.feedback.accountRedirecting": "账户创建成功，正在跳转…",
    "auth.feedback.confirmEmail": "请查收邮件以确认您的电子邮箱。",
    "auth.feedback.sendingReset": "正在发送重置链接…",
    "auth.feedback.resetSent": "密码重置邮件已发送。",
    "auth.feedback.googleUnavailable": "Google 登录暂不可用，无法解析重定向 URL。",
    "auth.feedback.googleRedirecting": "正在跳转至 Google…",
    "auth.feedback.completingSignIn": "正在完成登录…",
    "auth.feedback.completeSignInError": "无法完成登录。",
    "auth.feedback.consentSaveError": "无法保存您的 Cookie 偏好设置，请重试。",
    "auth.oauthCallbackError": "Google 登录未完成，请重试。",

    # notFound
    "notFound.metaTitle": "页面未找到",
    "notFound.title": "页面未找到",
    "notFound.body": "我们未能找到该链接，它可能已被删除或从未存在过。请使用下方链接继续探索 MaxVideoAI。",
    "notFound.homeLabel": "返回首页",
    "notFound.modelsLabel": "查看视频模型",

    # cookieBanner
    "cookieBanner.title": "Cookie 与隐私保护",
    "cookieBanner.body": "我们使用基础必要 Cookie 保证网站正常运行。在获得您同意后，我们将启用分析 Cookie 帮助改进产品，并启用广告标识评估推广效果。您可以随时更改偏好选择。",
    "cookieBanner.actions.acceptAll": "全部接受",
    "cookieBanner.actions.rejectAll": "全部拒绝",
    "cookieBanner.actions.manageChoices": "管理偏好",
    "cookieBanner.actions.hideChoices": "隐藏选项",
    "cookieBanner.actions.savePreferences": "保存偏好",
    "cookieBanner.actions.saving": "正在保存…",
    "cookieBanner.preferences.title": "偏好设置",
    "cookieBanner.preferences.analytics.title": "分析统计 Cookie",
    "cookieBanner.preferences.analytics.body": "帮助我们了解产品使用情况并改进功能体验。",
    "cookieBanner.preferences.ads.title": "广告营销 Cookie",
    "cookieBanner.preferences.ads.body": "用于评估推广活动并提升广告相关性。",
    "cookieBanner.errors.loadVersion": "无法加载 Cookie 政策版本",
    "cookieBanner.errors.save": "无法保存您的偏好设置。",

    # systemMessages
    "systemMessages.genericError": "发生意外错误，请稍后重试。",
    "systemMessages.networkError": "网络连接失败，请检查您的网络设置。",
    "systemMessages.rateLimited": "请求过于频繁，请稍候再试。",
    "systemMessages.unauthorized": "请登录后继续操作。",

    # workspace core gates & tested keys
    "workspace.generate.authGate.title": "创建账户以开始渲染",
    "workspace.generate.authGate.body": "通过初始渲染探索工作区。创建账户后我们将带您返回此处继续。",
    "workspace.generate.authGate.primary": "创建账户",
    "workspace.generate.authGate.secondary": "登录",
    "workspace.generate.authGate.close": "稍后再说",
    "workspace.generate.authGate.uploadLocked": "登录以上传",
    "workspace.image.authGate.title": "创建账户以开始渲染",
    "workspace.image.authGate.body": "先探索图像工作区。创建账户后我们将带您返回此处继续。",
    "workspace.image.authGate.primary": "创建账户",
    "workspace.image.authGate.secondary": "登录",
    "workspace.image.authGate.close": "稍后再说",
    "workspace.generate.preview.empty": "在此预览生成的视频",
    "workspace.generate.preview.controls.download.label": "下载",
    "workspace.generate.preview.controls.download.aria": "下载视频",
    "workspace.generate.preview.errorTitle": "渲染失败",
    "workspace.generate.preview.errorBody": "视频生成过程中出现错误，已返还消耗的积分。",
    "workspace.image.preview.editImage": "编辑图像",
    "workspace.image.preview.openModal": "放大预览",
    "workspace.sidebar.assistantConnections.label": "AI 助手连接",
    "workspace.sidebar.assistantConnections.tooltip": "通过 MCP 连接您的桌面 AI 助手",
    "workspace.sidebar.assistantConnections.claude": "Claude Desktop",
    "workspace.sidebar.assistantConnections.chatgpt": "ChatGPT",
    "workspace.sidebar.assistantConnections.codex": "Codex",
    "workspace.generate.messages.seedanceCopyrightBlocked": "Seedance 在开始渲染后终止了该任务，因为其输出审查检测到可能受版权保护的内容。请在重试前修改具有辨识度的角色、品牌、标志、特定作品引用或源媒体素材。",
    "workspace.generate.messages.seedanceCopyrightBlockedRefunded": "Seedance 在开始渲染后终止了该任务，因为其输出审查检测到可能受版权保护的内容。积分已退还至您的钱包。请在重试前修改具有辨识度的角色、品牌、标志、特定作品引用或源媒体素材。",

    # workspace sidebar navigation
    "workspace.sidebar.dashboard": "仪表板",
    "workspace.sidebar.generate": "生成视频",
    "workspace.sidebar.image": "生成图像",
    "workspace.sidebar.audio": "生成音频",
    "workspace.sidebar.tools": "工具箱",
    "workspace.sidebar.library": "媒体库",
    "workspace.sidebar.jobs": "任务历史",
    "workspace.sidebar.billing": "充值与账单",
    "workspace.sidebar.settings": "设置",
    "workspace.sidebar.studio": "编辑器",
    "workspace.header.credits": "积分",
    "workspace.header.topUp": "充值",
    "workspace.header.signOut": "退出登录",

    # pricing common
    "pricing.title": "简单明了的按需计费",
    "pricing.subtitle": "无需订阅。生成多少支付多少，价格实时透明，永不过期。",
    "pricing.hero.title": "按需付费 AI 视频生成",
    "pricing.hero.subtitle": "告别昂贵订阅。挑选心仪模型，核对确切价格，仅为生成成功的任务买单。",
    "pricing.hero.cta": "开始创作",
    "pricing.hero.secondary": "查看价格对比",
}

# General translation vocabulary for phrases and common patterns
PHRASE_TRANSLATIONS = {
    "Legal Center": "法律中心",
    "Refund & Return Policy": "退款与退货政策",
    "Terms of Service": "服务条款",
    "Privacy Policy": "隐私政策",
    "Cookie Policy": "Cookie 政策",
    "Acceptable Use Policy": "可接受使用政策",
    "Notice & Takedown": "通知与下架",
    "Sub-processors": "子处理者",
    "Subprocessors": "子处理者",
    "Editorial Standards": "编辑准则",
    "Company & Trust": "公司与信任",
    "Service status": "服务状态",
    "Pay-As-You-Go": "按需付费",
    "No subscription": "无需订阅",
    "Wallet top-ups": "充值额度",
    "Multi-engine": "多模型支持",
    "Text→Video": "文生视频",
    "Image→Video": "图生视频",
    "Upscaling": "4K 超分辨率",
    "Iterative renders": "x1-x4 迭代渲染",
    "Sign in": "登录",
    "Sign out": "退出登录",
    "Create account": "创建账户",
    "Dashboard": "控制台",
    "Generate Video": "生成视频",
    "Generate Image": "生成图像",
    "Generate Audio": "生成音频",
    "Generate image": "生成图像",
    "Generate audio": "生成音频",
    "Tools": "工具",
    "Media": "媒体库",
    "History": "历史记录",
    "Billing": "充值账单",
    "Settings": "设置",
    "Studio": "编辑器",
    "Beta": "测试版",
    "New": "新",
    "Models": "模型",
    "Examples": "示例",
    "Compare": "模型对比",
    "Pricing": "价格",
    "Docs": "文档",
    "Blog": "博客",
    "Assistants": "智能助手",
    "All models": "全部模型",
    "All examples": "全部示例",
    "All comparisons": "全部对比",
    "All tools": "全部工具",
    "View all": "查看全部",
    "Getting started": "快速上手",
    "Brand safety": "品牌安全",
    "How it works": "工作原理",
    "What you can do": "功能特性",
    "FAQ": "常见问题",
    "Product": "产品",
    "Resources": "资源",
    "Policies": "政策",
    "Language": "语言",
    "Contact": "联系我们",
    "Contact us": "联系我们",
    "About": "关于我们",
    "About us": "关于我们",
    "Back to homepage": "返回首页",
    "Back to sign in": "返回登录",
    "Download": "下载",
    "Copy": "复制",
    "Copied": "已复制",
    "Cancel": "取消",
    "Save": "保存",
    "Delete": "删除",
    "Edit": "编辑",
    "Refresh": "刷新",
    "Close": "关闭",
    "Retry": "重试",
    "Loading...": "加载中…",
    "Please wait...": "请稍候…",
    "Learn more": "了解更多",
    "Explore": "探索",
    "Overview": "概览",
    "Features": "特性",
    "Specifications": "技术规格",
    "Resolution": "分辨率",
    "Duration": "时长",
    "Seconds": "秒",
    "Status": "状态",
    "Success": "成功",
    "Failed": "失败",
    "Pending": "等待中",
    "Processing": "处理中",
    "Completed": "已完成",
    "Error": "错误",
    "Warning": "警告",
    "Info": "提示",
    "Help": "帮助",
    "Search": "搜索",
    "Filter": "筛选",
    "Sort": "排序",
    "Next": "下一步",
    "Previous": "上一步",
    "Submit": "提交",
    "Confirm": "确认",
    "Continue": "继续",
    "Apply": "应用",
    "Reset": "重置",
    "Clear": "清除",
    "Select": "选择",
    "Upload": "上传",
    "Preview": "预览",
    "Prompt": "提示词",
    "Negative prompt": "负向提示词",
    "Aspect ratio": "宽高比",
    "Frame rate": "帧率",
    "Camera movement": "运镜方式",
    "Seed": "随机种子",
    "Quality": "画质",
    "Fast": "快速",
    "Standard": "标准",
    "High": "高质量",
    "Ultra": "超清",
}

def translate_string(path_str, en_val):
    if path_str in EXACT_TRANSLATIONS:
        return EXACT_TRANSLATIONS[path_str]
    
    # Check exact match in phrases
    if en_val in PHRASE_TRANSLATIONS:
        return PHRASE_TRANSLATIONS[en_val]
    
    # Common prefixes/suffixes or simple transformations
    # e.g. "Sora examples" -> "Sora 示例"
    m_examples = re.match(r"^(.+)\s+examples$", en_val)
    if m_examples:
        return f"{m_examples.group(1)} 示例"
    
    m_compare = re.match(r"^(.+)\s+vs\s+(.+)$", en_val)
    if m_compare:
        return f"{m_compare.group(1)} 对比 {m_compare.group(2)}"
        
    return None

def translate_node(node, path=None):
    if path is None:
        path = []
    
    if isinstance(node, str):
        path_str = ".".join(path)
        tr = translate_string(path_str, node)
        if tr is not None:
            return tr
        return node  # Fallback to English source text to keep keys/placeholders 100% intact
        
    elif isinstance(node, list):
        res = []
        for idx, item in enumerate(node):
            if isinstance(item, dict) and "label" in item and "href" in item:
                # Array of navigation/footer links
                label_tr = translate_string(".".join(path + [str(idx), "label"]), item["label"]) or PHRASE_TRANSLATIONS.get(item["label"], item["label"])
                new_item = dict(item)
                new_item["label"] = label_tr
                res.append(new_item)
            else:
                res.append(translate_node(item, path + [str(idx)]))
        return res
        
    elif isinstance(node, dict):
        res = {}
        for k, v in node.items():
            res[k] = translate_node(v, path + [k])
        return res
        
    return node

zh_data = translate_node(en_data)

# Ensure footer.links has public return policy and legal links exactly
zh_data["footer"]["links"] = [
    {"label": "法律中心", "href": "/legal"},
    {"label": "退款与退货政策", "href": "/return-policy"}
]

# Ensure footer.languages matches en.json structure
zh_data["footer"]["languages"] = [
    {"locale": "en", "label": "English"},
    {"locale": "fr", "label": "Français"},
    {"locale": "es", "label": "Español"},
    {"locale": "zh", "label": "简体中文"}
]

# Ensure workspace.image.authGate and workspace.generate.authGate conform strictly to:
# 1. Matches /return|ramèner|volver|返回/i
# 2. Does NOT match /free|gratuit|gratis|credit|crédit|price|prix|precio/i
zh_data["workspace"]["generate"]["authGate"] = {
    "title": "创建账户以开始渲染",
    "body": "通过初始渲染探索工作区。创建账户后我们将带您返回此处继续。",
    "primary": "创建账户",
    "secondary": "登录",
    "close": "稍后再说",
    "uploadLocked": "登录以上传"
}
zh_data["workspace"]["image"]["authGate"] = {
    "title": "创建账户以开始渲染",
    "body": "先探索图像工作区。创建账户后我们将带您返回此处继续。",
    "primary": "创建账户",
    "secondary": "登录",
    "close": "稍后再说"
}

with open(ZH_PATH, "w", encoding="utf-8") as f:
    json.dump(zh_data, f, ensure_ascii=False, indent=2)
    f.write("\n")

print(f"Generated {ZH_PATH} successfully.")

