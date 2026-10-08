import argparse
import json
import glob
import os
import re

EN_DIR = 'content/models/en'
ZH_DIR = 'content/models/zh'




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
    parser = argparse.ArgumentParser(description='Project models while preserving reviewed Chinese editorial content.')
    parser.add_argument('--output-dir', default=ZH_DIR)
    parser.add_argument('--model', action='append', help='Limit projection to explicitly selected model slugs.')
    parser.add_argument('--check', action='store_true', help='Validate without writing files.')
    args = parser.parse_args()
    os.makedirs(args.output_dir, exist_ok=True)
    count = 0
    for file_path in sorted(glob.glob(f'{EN_DIR}/*.json')):
        slug = os.path.basename(file_path)[:-5]
        if args.model and slug not in args.model:
            continue
        with open(file_path, encoding='utf-8') as source:
            en_data = json.load(source)
        authored_path = os.path.join(ZH_DIR, f'{slug}.json')
        if os.path.exists(authored_path):
            with open(authored_path, encoding='utf-8') as authored:
                zh_data = json.load(authored)
        else:
            zh_data = localize_model_file(en_data)
        if 'archive' in en_data:
            archive = zh_data.get('archive')
            assert archive, f'[{slug}] Add reviewed Chinese archive content before projection'
            assert set(archive) == set(en_data['archive']), f'[{slug}] Archive structure differs'
            assert [item['modelId'] for item in archive['alternatives']] == [item['modelId'] for item in en_data['archive']['alternatives']], f'[{slug}] Archive alternatives differ'
        # Structural fields are copied without replacing authored prose or localized links.
        for field in ('inputSpecs', 'outputSpecs', 'inputs', 'outputs'):
            if field in en_data:
                zh_data[field] = en_data[field]
        zh_data = localize_model_file(zh_data)
        validate_zh_model(slug, zh_data)
        if not args.check:
            with open(os.path.join(args.output_dir, f'{slug}.json'), 'w', encoding='utf-8') as out:
                json.dump(zh_data, out, ensure_ascii=False, indent=2)
                out.write('\n')
        count += 1
    if args.model:
        assert count == len(set(args.model)), 'One or more requested models were not found'
    print(f'Successfully validated {count} models' + ('' if args.check else f' in {args.output_dir}'))

if __name__ == '__main__':
    main()
