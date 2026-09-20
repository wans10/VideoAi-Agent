import json
import glob
import os
import re

EN_DIR = 'content/models/en'
ZH_DIR = 'content/models/zh'

os.makedirs(ZH_DIR, exist_ok=True)

# Curated translations for MiniMax H3
MINIMAX_H3 = {
  "marketingName": "MiniMax H3",
  "versionLabel": "H3",
  "seo": {
    "title": "MiniMax H3 AI 视频生成器：4K、参考控制与原生音频",
    "description": "通过文本、首尾帧或图像、视频及音频参考生成 5–15 秒 768P、2K 或 4K 的 MiniMax H3 视频，支持原生立体声音效。",
    "image": "/models/minimax-h3-launch.jpg"
  },
  "overview": "生成 5–15 秒、24 FPS 的 768P、2K 或 4K 视频。支持文生视频、首帧图片动画（可选尾帧），或通过图/视/音频参考指导场景。H3 原生同步生成立体声音频。",
  "hero": {
    "title": "MiniMax H3 — 多模态参考指导 4K AI 视频生成",
    "intro": "将文本、帧或多模态参考转化为 5–15 秒、最高 4K 的视频，支持原生立体声与多镜头调度。",
    "badge": "新上线 · 5–15 秒 · 最高 4K · 原生立体声",
    "ctaPrimary": {
      "label": "使用 MiniMax H3 生成",
      "href": "/app?engine=minimax-h3"
    },
    "secondaryLinks": [
      {
        "label": "查看 MiniMax H3 案例",
        "href": "/zh/examples/hailuo"
      },
      {
        "label": "打开 MiniMax H3 提示词示例",
        "href": "#prompting"
      }
    ]
  },
  "bestUseCases": {
    "title": "MiniMax H3 最佳应用场景",
    "items": [
      {
        "title": "具有生动动作与对白的以角色为核心的电影感场景",
        "icon": "users"
      },
      {
        "title": "保持身份、服装和场景高度连贯的多镜头序列",
        "icon": "storyboard"
      },
      {
        "title": "由视频参考和精确动作提示引导的动作迁移",
        "icon": "camera"
      },
      {
        "title": "带同步音频的高分辨率社交媒体和营销宣传短片",
        "icon": "audio"
      }
    ]
  },
  "technicalOverviewTitle": "MiniMax H3 概览",
  "technicalOverview": [
    {
      "label": "时长",
      "body": "从 5 到 15 秒的任意整数秒"
    },
    {
      "label": "输出",
      "body": "768P、2K 或 4K · 自动、21:9、16:9、4:3、1:1、3:4 或 9:16 · 24 FPS"
    },
    {
      "label": "文本与帧",
      "body": "文生视频，或首帧图片加可选尾帧"
    },
    {
      "label": "参考工作流",
      "body": "最多支持 9 张图片、3 个视频和 3 段音频，单次总计最多 12 个唯一参考素材"
    },
    {
      "label": "音频",
      "body": "每条视频均原生同步生成立体声音频"
    }
  ],
  "tips": {
    "title": "如何执导 MiniMax H3",
    "items": [
      "依次说明角色、动作、场景、镜头和声音。",
      "为每个镜头节拍分配一个明确动作和一个镜头运镜。",
      "为参考素材明确指定角色，例如身份、动作、服装或声音。",
      "仅重复在每个镜头中必须保持连贯的核心特征锚点。"
    ]
  },
  "faqs": [
    {
      "q": "MiniMax H3 支持哪些输入？",
      "a": "支持文本提示词、首帧图片（可选尾帧），或包含图像、视频和音频的参考集。音频参考必须与至少一个图像或视频参考一起使用。"
    },
    {
      "q": "我可以选择什么时长和分辨率？",
      "a": "可选择从 5 到 15 秒的任意整数秒时长，以 24 FPS 渲染 768P、2K 或 4K 规格。"
    },
    {
      "q": "H3 可以使用多少个参考素材？",
      "a": "参考模式最多接受 9 张图片、3 个视频和 3 个音频片段，单次请求总计不超过 12 个唯一参考素材。"
    },
    {
      "q": "MiniMax H3 会生成音频吗？",
      "a": "是的。H3 会随视频一同生成原生立体声音效；无需单独的音频开关。"
    },
    {
      "q": "我可以直接在此页面使用 MiniMax H3 生成吗？",
      "a": "可以。MiniMax H3 已在 MaxVideoAI 上线，每次渲染前均会展示精确价格。"
    }
  ],
  "decision": {
    "modelSlug": "minimax-h3",
    "hero": {
      "eyebrow": "AI 视频 · MiniMax",
      "title": "MiniMax H3",
      "subtitle": "掌控场景，塑造声效。",
      "subtitleHighlights": [
        "掌控场景，塑造声效"
      ],
      "paragraph": "MiniMax H3 支持从文本、图像或混合参考生成 AI 视频。可选 5–15 秒与最高 4K 分辨率，原生支持立体声音频。在同一生成过程中协同指导角色、运镜与动作。",
      "primaryCta": {
        "label": "使用 MiniMax H3 生成",
        "href": "/app?engine=minimax-h3"
      },
      "secondaryCta": {
        "label": "查看 MiniMax H3 案例",
        "href": "/zh/examples/hailuo"
      },
      "quickLinks": [
        {
          "label": "查看 MiniMax H3 Max（768P 快速生成）",
          "href": "/zh/models/minimax-h3-max"
        },
        {
          "label": "与 Kling O3 Pro 对比",
          "href": "/zh/ai-video-engines/kling-o3-pro-vs-minimax-h3?order=minimax-h3"
        },
        {
          "label": "查看价格",
          "href": "/zh/pricing#minimax-h3-pricing"
        },
        {
          "label": "提示词示例",
          "href": "#prompting"
        }
      ]
    },
    "media": {
      "caption": "MiniMax H3 真实渲染",
      "description": "Lio 离开野火瞭望塔，沿着红色信号弹搜救路线指引受困徒步者",
      "renderLabel": "查看完整渲染",
      "badges": [
        "15秒",
        "2K",
        "16:9",
        "立体声"
      ],
      "altContext": "MiniMax H3 野火瞭望塔搜救序列，展示 Lio、红色信号弹及原生立体声对话"
    },
    "features": [
      {
        "title": "三大创作工作流",
        "body": "在单个 H3 引擎内自由切换文生视频、图生视频和参考生视频。",
        "tone": "reference"
      },
      {
        "title": "5–15 秒，最高 4K",
        "body": "支持任意整数秒时长选择，以 24 FPS 渲染 768P、2K 或 4K。",
        "tone": "quality"
      },
      {
        "title": "多模态参考执导",
        "body": "结合图像、视频和音频参考，协同引导角色身份、表现、动作与声音。",
        "tone": "continuity"
      },
      {
        "title": "原生立体声音效",
        "body": "在同一次渲染中，随画面同步生成环境音、音效、音乐或对白。",
        "tone": "audio"
      }
    ],
    "decisionCards": [
      {
        "title": "从文字剧本开始？",
        "body": "使用文生视频并选择自动或固定宽高比，通过单个提示词获得完整镜头。",
        "cta": {
          "label": "通过文本生成",
          "href": "/app?engine=minimax-h3"
        }
      },
      {
        "title": "需要精准控制起止镜头？",
        "body": "让起始图片动起来并可选择添加结束图片；H3 会自动遵循源构图。",
        "cta": {
          "label": "通过首尾帧生成",
          "href": "/app?engine=minimax-h3"
        }
      },
      {
        "title": "执导特定连贯角色？",
        "body": "使用参考模式在整个场景中指定身份、服装、动作和声音线索。",
        "cta": {
          "label": "打开提示词实验室",
          "href": "#prompting"
        }
      }
    ],
    "referenceWorkflows": [
      {
        "title": "文生视频",
        "body": "描述角色、动作、场景、镜头和声音，然后选择固定比例或自动比例。"
      },
      {
        "title": "图生视频",
        "body": "上传起始图片和可选的结束图片；输出视频会自动遵循源素材宽高比。"
      },
      {
        "title": "参考生视频",
        "body": "组合最多 9 张图片、3 个视频和 3 个音频片段，单次请求总参考素材不超过 12 个。"
      },
      {
        "title": "原生音频指导",
        "body": "将对白、环境音和同步声音提示直接写入场景提示词中。"
      }
    ],
    "pricingCopy": {
      "title": "MiniMax H3 渲染计费",
      "subtitle": "选择工作流、时长、分辨率与参考素材，在渲染前查看准确价格。",
      "footnote": "包含前 5 张参考图片；超出部分按展示的附加费计费。",
      "ctaLabel": "使用 MiniMax H3 生成",
      "ctaHref": "/app?engine=minimax-h3"
    },
    "meta": {
      "title": "MiniMax H3 AI 视频生成器：4K、参考控制与原生音频",
      "description": "通过文本、首尾帧或图像、视频及音频参考生成 5–15 秒 768P、2K 或 4K 的 MiniMax H3 视频，支持原生立体声音效。"
    }
  },
  "prompting": {
    "modelSlug": "minimax-h3",
    "section": {
      "title": "提示词实验室 — MiniMax H3",
      "intro": "分三步构建提示词：定义表演，指导镜头序列，锁定连贯性与声音。",
      "tip": "为每个镜头分配一个明确动作、一个运镜指令和一个声音事件。",
      "guide": {
        "label": "MiniMax H3 指南",
        "href": "https://minimaxi.com/blog/minimax-h3"
      },
      "referencesTitle": "以角色为先的 H3 场景工作流"
    },
    "tabs": [
      {
        "id": "performance",
        "label": "角色表演",
        "title": "定义角色与动作",
        "description": "建立身份、表情、肢体语言以及场景中的可见变化。",
        "copy": "Character:\n[Appearance, wardrobe, expression and voice]\n\nSetting:\n[Location, time, weather and visual anchors]\n\nAction:\n[One clear physical action and reaction]\n\nSound:\n[Dialogue, ambience and synchronized effects]"
      },
      {
        "id": "shots",
        "label": "镜头调度",
        "title": "指导镜头序列",
        "description": "编写具有明确构图和转场的简短镜头进程。",
        "copy": "Opening shot:\n[Composition + first action + camera move]\n\nDevelopment shot:\n[Performance beat + transition]\n\nFinal shot:\n[Resolution + final frame]\n\nAudio timing:\n[Sound cue linked to each visible event]"
      },
      {
        "id": "references",
        "label": "参考素材",
        "title": "为每个参考素材分配角色",
        "description": "告诉 H3 从每个图片、视频或音频参考中提取什么要素。",
        "copy": "Image references:\n[Identity, wardrobe, location or visual style]\n\nVideo references:\n[Motion, gesture, camera or timing]\n\nAudio references:\n[Voice, rhythm or sonic texture]\n\nContinuity rules:\n[Details that must not drift between shots]"
      }
    ],
    "tabNotes": [
      {
        "tabId": "performance",
        "body": "角色表演定义了一个清晰的角色动作和情绪转变。"
      },
      {
        "tabId": "shots",
        "body": "镜头调度将动作转化为清晰的开始、发展和结局。"
      },
      {
        "tabId": "references",
        "body": "当每个参考文件都具有单一明确的目的时，效果最佳。"
      }
    ],
    "globalPrinciples": [
      "将角色与动作置于风格形容词之前。",
      "将每次运镜与可见的故事节奏联系起来。",
      "在声音的可见起因出现时立即进行描述。",
      "在跨镜头中明确保持身份、服装、光影与画面方向一致。"
    ],
    "engineWhy": [
      "H3 在单个生产级模型中集成了文本、帧以及多模态参考。",
      "多镜头调度支持简短序列创作，而非单一孤立动作。",
      "原生立体声让对白、环境音与特效随画面同步自然展开。"
    ],
    "demo": {
      "title": "灯塔看守人救援场景序列",
      "promptLabel": "用于此次渲染的生产级提示词",
      "prompt": "Create a 15-second cinematic 16:9 film with native multi-shot continuity and native stereo sound. Original fictional character: ELARA, a 34-year-old lighthouse keeper with wind-burned olive skin, dark wavy hair tied back, a weathered mustard raincoat, charcoal sweater, and practical sea boots. Keep her face, clothing, and proportions consistent in every shot. 0.0–3.5 seconds: wide exterior at blue hour, a stone lighthouse on a violent Atlantic cliff, rain sweeping sideways, Elara runs toward the tower carrying a small weathered signal case; handheld tracking camera, realistic wet fabric and foot contact. 3.5–7.5 seconds: interior spiral stairwell, medium close tracking shot as she climbs fast, breath visible, one hand gripping the rail, practical amber lamps, no cuts that break identity. 7.5–11.5 seconds: lantern room, she reaches the controls and throws the emergency lever; orbit from her determined face to the huge Fresnel lens as it powers on. At 10.5 seconds Elara says clearly, with natural lip sync: “Harbor light is alive. Bring them home.” 11.5–15.0 seconds: exterior aerial pullback as the rescue beam sweeps across black waves and reveals a distant lifeboat turning toward safety. Audio: native stereo only—storm wind outside, rain on glass, boots on iron stairs, strained breathing, lever clunk, electrical rise, deep lighthouse mechanism, distant surf, and Elara's exact spoken line. No music. No subtitles, captions, on-screen text, logos, watermarks, beauty-ad framing, or product pack shot. Photorealistic skin and motion, coherent hands, restrained cinematic contrast.",
      "notes": [
        "Elara 的面部、芥末黄雨衣与身材比例在四个故事节拍中锚定了连贯性。",
        "每个定时的镜头都将可见动作与运镜指令及同步声音线索相匹配。"
      ],
      "summary": {
        "subject": "Elara，身穿芥末黄雨衣的灯塔看守人",
        "action": "冲上塔楼，开启透镜并引导救生艇返航",
        "camera": "室外手持跟踪、楼梯近景跟拍、灯室环绕运镜与空中拉远",
        "style": "蓝调时刻暴风雨下的电影级自然主义",
        "output": "15 秒 2K 多镜头场景，带原生立体声对白"
      },
      "presentationOverrides": {
        "modeLabel": "文生视频",
        "outputLabel": "2K 渲染",
        "duration": "15s",
        "aspectRatio": "16:9",
        "audioChipMode": "supported",
        "audioChipLabel": "原生立体声音效",
        "altContext": "MiniMax H3 灯塔看守人救援场景序列"
      }
    },
    "imageExamples": None
  },
  "examples": {
    "modelSlug": "minimax-h3",
    "showWhenEmpty": False,
    "section": {
      "title": "MiniMax H3 真实输出案例",
      "intro": "查看经过验证的 MaxVideoAI 渲染案例，测试角色连贯性、运镜调度、参考控制与同步音效。",
      "defaultCtaLabel": "查看全部 MiniMax H3 案例",
      "recreateLabel": "复现此场景"
    },
    "filters": [
      {
        "id": "all",
        "label": "全部"
      },
      {
        "id": "cinematic",
        "label": "电影感"
      },
      {
        "id": "audio",
        "label": "音频"
      },
      {
        "id": "vertical",
        "label": "竖屏"
      }
    ],
    "proofItems": [
      {
        "id": "character",
        "icon": "users",
        "title": "角色连贯性",
        "body": "在整个序列中检查面部、服装与表演。"
      },
      {
        "id": "camera",
        "icon": "maximize",
        "title": "运镜调度",
        "body": "从一个节拍到下一个节拍跟踪构图、镜头移动和转场。"
      },
      {
        "id": "references",
        "icon": "sparkles",
        "title": "参考素材控制",
        "body": "将期望的角色身份、动作与声音与最终视频进行对比。"
      },
      {
        "id": "audio",
        "icon": "audio",
        "title": "原生立体声音效",
        "body": "评估对白时序、环境音与同步声音效果。"
      },
      {
        "id": "production",
        "icon": "shield",
        "title": "真实生产级渲染",
        "body": "此页面上的每个案例均通过 MaxVideoAI 生成。"
      }
    ],
    "fallbackItems": None
  }
}

FILTER_LABELS = {
    'all': '全部',
    'cinematic': '电影感',
    'audio': '音频',
    'vertical': '竖屏',
    'product': '产品',
    'action': '动作',
    'campaign': '广告大片',
    'typography': '文字与版式',
    'reference': '多模态参考',
    'final': '成片',
    'grounded': '写实',
    'edit': '剪辑变化',
    'wide': '宽画幅',
    'character': '角色',
    'batch': '批量生成',
    'ui': '界面',
    'mask': '遮罩',
    'infographic': '信息图',
}

PROOF_ITEMS_MAP = {
    'character': ('角色连贯性', '在整个序列中检验面部、服装与表演连贯度。'),
    'camera': ('运镜调度', '逐节拍跟踪构图、镜头运镜与转场表现。'),
    'references': ('参考素材控制', '对比目标身份、动态与声音在成片中的还原度。'),
    'audio': ('原生立体声音效', '评估对白时序、环境音与音效的同步契合度。'),
    'production': ('真实生产级渲染', '此页面展示的每一个案例均通过 MaxVideoAI 真实生成。'),
    'motion': ('动作表现', '检验复杂肢体动作与物理动态的平滑度。'),
    'realism': ('真实质感', '观察材质细节、光影反射与逼真画质呈现。'),
    'typography': ('文字排版', '评估画面中嵌入文字与排版的清晰度和稳定性。'),
    'edit': ('画面编辑', '检验局部重绘与风格调整的受控表现。'),
    'speed': ('生成速度', '体验端到端超快出片效率。'),
    'consistency': ('视觉一致性', '保持跨镜头视觉风格与色彩基调的高度统一。'),
    'resolution': ('高清画质', '呈现纯净细腻的画面解析度与丰富细节。'),
}

TAB_LABELS_MAP = {
    'performance': '角色表演',
    'shots': '镜头调度',
    'references': '参考素材',
    'lighting': '光影氛围',
    'camera': '镜头运镜',
    'composition': '画面构图',
    'style': '视觉风格',
    'motion': '动态节奏',
    'sound': '声音设计',
    'continuity': '连贯性控制',
    'framing': '取景构图',
    'action': '动作指令',
    'cinematography': '电影摄影',
}

def localize_href(href: str) -> str:
    if not href or not isinstance(href, str):
        return href
    if href.startswith('#') or href.startswith('/app') or href.startswith('http'):
        return href
    if href.startswith('/models/'):
        return '/zh' + href
    if href.startswith('/examples/'):
        return '/zh' + href
    if href == '/examples' or href.startswith('/examples?'):
        return '/zh' + href
    if href.startswith('/pricing'):
        return '/zh' + href
    if href.startswith('/ai-video-engines/'):
        return '/zh' + href
    if href == '/models':
        return '/zh/models'
    if href == '/generate':
        return '/app'
    if href == '/workflows':
        return '/zh/workflows'
    if href.startswith('/blog/'):
        return '/zh' + href
    return href

def translate_label_text(text: str, model_name: str) -> str:
    if not text or not isinstance(text, str):
        return text
    t = text.strip()
    exact = {
        'View pricing': '查看价格',
        'Prompt examples': '提示词示例',
        'Open Prompt Lab': '打开提示词实验室',
        'View full render': '查看完整渲染',
        'Recreate this scene': '复现此场景',
        'Text-to-video': '文生视频',
        'Image-to-video': '图生视频',
        'Reference-to-video': '参考生视频',
        'Native stereo audio': '原生立体声音效',
        'Native stereo sound': '原生立体声',
        'Production prompt used for this render': '用于此次渲染的生产级提示词',
        'Generate from text': '通过文本生成',
        'Generate from frames': '通过首尾帧生成',
        'Generate from image': '通过图片生成',
        'Generate with references': '通过参考素材生成',
    }
    if t in exact:
        return exact[t]
    
    m = re.match(r'^Generate with (.+)$', t)
    if m:
        return f'使用 {m.group(1)} 生成'
    m = re.match(r'^View (.+) examples$', t)
    if m:
        return f'查看 {m.group(1)} 案例'
    m = re.match(r'^View all (.+) examples$', t)
    if m:
        return f'查看全部 {m.group(1)} 案例'
    m = re.match(r'^Real (.+) render$', t)
    if m:
        return f'{m.group(1)} 真实渲染'
    m = re.match(r'^Real (.+) outputs$', t)
    if m:
        return f'{m.group(1)} 真实生成案例'
    m = re.match(r'^Prompt Lab — (.+)$', t)
    if m:
        return f'提示词实验室 — {m.group(1)}'
    m = re.match(r'^(.+) guide$', t)
    if m:
        return f'{m.group(1)} 指南'
    m = re.match(r'^Compare with (.+)$', t)
    if m:
        return f'与 {m.group(1)} 对比'
    m = re.match(r'^See (.+) for (.+)$', t)
    if m:
        return f'查看 {m.group(1)}（{m.group(2)}）'
    m = re.match(r'^AI video · (.+)$', t)
    if m:
        return f'AI 视频 · {m.group(1)}'
    m = re.match(r'^AI image · (.+)$', t)
    if m:
        return f'AI 图像 · {m.group(1)}'
    m = re.match(r'^(.+) pricing for your render$', t)
    if m:
        return f'{m.group(1)} 渲染计费'

    return text

def localize_model_file(data: dict) -> dict:
    slug = data.get('marketingName', '')
    res = json.loads(json.dumps(data))
    model_name = res.get('marketingName', slug)
    
    # 1. hero
    if 'hero' in res:
        h = res['hero']
        if 'ctaPrimary' in h:
            h['ctaPrimary']['href'] = localize_href(h['ctaPrimary'].get('href', ''))
            h['ctaPrimary']['label'] = translate_label_text(h['ctaPrimary'].get('label', ''), model_name)
        if 'secondaryLinks' in h:
            for item in h['secondaryLinks']:
                item['href'] = localize_href(item.get('href', ''))
                item['label'] = translate_label_text(item.get('label', ''), model_name)
                
    # 2. technicalOverview
    if 'technicalOverview' in res:
        for item in res['technicalOverview']:
            if 'link' in item:
                item['link']['href'] = localize_href(item['link'].get('href', ''))
                item['link']['label'] = translate_label_text(item['link'].get('label', ''), model_name)
                
    # 3. decision
    if 'decision' in res:
        dec = res['decision']
        if 'hero' in dec:
            dh = dec['hero']
            if 'eyebrow' in dh:
                dh['eyebrow'] = translate_label_text(dh['eyebrow'], model_name)
            if 'primaryCta' in dh:
                dh['primaryCta']['href'] = localize_href(dh['primaryCta'].get('href', ''))
                dh['primaryCta']['label'] = translate_label_text(dh['primaryCta'].get('label', ''), model_name)
            if 'secondaryCta' in dh:
                dh['secondaryCta']['href'] = localize_href(dh['secondaryCta'].get('href', ''))
                dh['secondaryCta']['label'] = translate_label_text(dh['secondaryCta'].get('label', ''), model_name)
            if 'quickLinks' in dh:
                for ql in dh['quickLinks']:
                    ql['href'] = localize_href(ql.get('href', ''))
                    ql['label'] = translate_label_text(ql.get('label', ''), model_name)
        if 'media' in dec:
            dm = dec['media']
            if 'caption' in dm:
                dm['caption'] = translate_label_text(dm['caption'], model_name)
            if 'renderLabel' in dm:
                dm['renderLabel'] = translate_label_text(dm['renderLabel'], model_name)
        if 'decisionCards' in dec:
            for card in dec['decisionCards']:
                if 'cta' in card:
                    card['cta']['href'] = localize_href(card['cta'].get('href', ''))
                    card['cta']['label'] = translate_label_text(card['cta'].get('label', ''), model_name)
        if 'pricingCopy' in dec:
            pc = dec['pricingCopy']
            if 'title' in pc:
                pc['title'] = translate_label_text(pc['title'], model_name)
            if 'ctaLabel' in pc:
                pc['ctaLabel'] = translate_label_text(pc['ctaLabel'], model_name)
            if 'ctaHref' in pc:
                pc['ctaHref'] = localize_href(pc.get('ctaHref', ''))

    # 4. prompting
    if 'prompting' in res:
        p = res['prompting']
        if 'section' in p:
            ps = p['section']
            if 'title' in ps:
                ps['title'] = translate_label_text(ps['title'], model_name)
            if 'guide' in ps and ps['guide']:
                ps['guide']['href'] = localize_href(ps['guide'].get('href', ''))
                ps['guide']['label'] = translate_label_text(ps['guide'].get('label', ''), model_name)
        if 'tabs' in p:
            for tab in p['tabs']:
                tid = tab.get('id', '')
                if tid in TAB_LABELS_MAP:
                    tab['label'] = TAB_LABELS_MAP[tid]
        if 'demo' in p and p['demo']:
            demo = p['demo']
            if 'promptLabel' in demo:
                demo['promptLabel'] = translate_label_text(demo['promptLabel'], model_name)
            if 'presentationOverrides' in demo:
                po = demo['presentationOverrides']
                if 'modeLabel' in po:
                    po['modeLabel'] = translate_label_text(po['modeLabel'], model_name)
                if 'audioChipLabel' in po and po['audioChipLabel']:
                    po['audioChipLabel'] = translate_label_text(po['audioChipLabel'], model_name)

    # 5. examples
    if 'examples' in res:
        ex = res['examples']
        if 'section' in ex:
            es = ex['section']
            if 'title' in es:
                es['title'] = translate_label_text(es['title'], model_name)
            if 'defaultCtaLabel' in es and es['defaultCtaLabel']:
                es['defaultCtaLabel'] = translate_label_text(es['defaultCtaLabel'], model_name)
            if 'recreateLabel' in es and es['recreateLabel']:
                es['recreateLabel'] = translate_label_text(es['recreateLabel'], model_name)
        if 'filters' in ex:
            for f in ex['filters']:
                fid = f.get('id', '')
                if fid in FILTER_LABELS:
                    f['label'] = FILTER_LABELS[fid]
        if 'proofItems' in ex:
            for pi in ex['proofItems']:
                pid = pi.get('id', '')
                if pid in PROOF_ITEMS_MAP:
                    pi['title'] = PROOF_ITEMS_MAP[pid][0]
                    pi['body'] = PROOF_ITEMS_MAP[pid][1]

    return res

# Regex definitions for zh href validation
SHARED_HREFS = [re.compile(r'^#(?:prompting|specs)$'), re.compile(r'^\/app(?:\/image)?\?engine=[A-Za-z0-9_-]+$')]
LOCALIZED_ZH_HREF = re.compile(r'^\/zh\/(?:(?:models|examples)(?:\/[^\s?#]+)?|ai-video-engines\/[^\s?#]+(?:\?order=[a-z0-9-]+)?|pricing(?:#[^\s]+)?)$')
INTERNAL_GUIDE_ZH = re.compile(r'^\/zh\/models\/[a-z0-9]+(?:-[a-z0-9]+)*$')

def validate_zh_model(slug: str, data: dict):
    # Validate decision
    dec = data.get('decision')
    assert dec, f"[{slug}] Missing decision"
    assert dec.get('modelSlug') == slug, f"[{slug}] modelSlug mismatch in decision"
    
    links = [
        ('hero.primaryCta.href', dec['hero']['primaryCta']['href']),
        ('hero.secondaryCta.href', dec['hero']['secondaryCta']['href']),
        *[(f'hero.quickLinks.{i}.href', l['href']) for i, l in enumerate(dec['hero'].get('quickLinks', []))],
        *[(f'decisionCards.{i}.cta.href', c['cta']['href']) for i, c in enumerate(dec.get('decisionCards', []))],
        ('pricingCopy.ctaHref', dec['pricingCopy']['ctaHref']),
    ]
    for field, href in links:
        valid = any(p.match(href) for p in SHARED_HREFS) or bool(LOCALIZED_ZH_HREF.match(href))
        assert valid, f"[{slug}] Invalid zh href at {field}: {href}"
        
    # Validate prompting
    prom = data.get('prompting')
    assert prom, f"[{slug}] Missing prompting"
    assert prom.get('modelSlug') == slug, f"[{slug}] modelSlug mismatch in prompting"
    guide_href = prom.get('section', {}).get('guide', {}).get('href') if prom.get('section', {}).get('guide') else None
    if guide_href:
        valid_guide = guide_href.startswith('https://') or bool(INTERNAL_GUIDE_ZH.match(guide_href))
        assert valid_guide, f"[{slug}] Invalid zh guide href: {guide_href}"
        
    # Validate examples
    ex = data.get('examples')
    assert ex, f"[{slug}] Missing examples"
    assert ex.get('modelSlug') == slug, f"[{slug}] modelSlug mismatch in examples"
    assert ex.get('filters', [])[0]['id'] == 'all', f"[{slug}] First filter must be 'all'"
    assert len(ex.get('proofItems', [])) == 5, f"[{slug}] proofItems must have length 5"

def main():
    en_files = sorted(glob.glob(f'{EN_DIR}/*.json'))
    print(f"Found {len(en_files)} files in {EN_DIR}")
    
    count = 0
    for file_path in en_files:
        slug = os.path.basename(file_path)[:-5]
        target_path = os.path.join(ZH_DIR, f'{slug}.json')
        
        if slug == 'minimax-h3':
            zh_data = MINIMAX_H3
        else:
            en_data = json.load(open(file_path, 'r', encoding='utf-8'))
            zh_data = localize_model_file(en_data)
            
        validate_zh_model(slug, zh_data)
        
        with open(target_path, 'w', encoding='utf-8') as out:
            json.dump(zh_data, out, ensure_ascii=False, indent=2)
            out.write('\n')
        count += 1
        
    print(f"Successfully generated and validated {count} files in {ZH_DIR}")

if __name__ == '__main__':
    main()
