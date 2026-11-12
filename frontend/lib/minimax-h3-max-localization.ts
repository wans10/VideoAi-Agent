import type { EngineInputField } from '@/types/engines';

/**
 * Keyvo (zh) copy for MiniMax-H3-Max's prompt expansion control, which MiniMax's own API takes as
 * `extra.prompt_expansion_mode`. The option values stay the provider's keys (disabled / balanced / quality).
 */
const ZH: Record<string, [string, string]> = {
  prompt_expansion_mode: [
    '提示词扩展',
    'disabled：按原样使用提示词；balanced（默认）：适度补充画面与镜头细节；quality：补充更多电影化细节，适合简短提示词。',
  ],
};

export function localizeMinimaxH3MaxField(field: EngineInputField, locale: string, engineId?: string): EngineInputField {
  if (engineId !== 'minimax-h3-max' || locale !== 'zh') return field;
  const copy = ZH[field.id];
  return copy ? { ...field, label: copy[0], description: copy[1] } : field;
}
