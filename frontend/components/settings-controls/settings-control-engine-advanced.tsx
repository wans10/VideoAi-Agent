'use client';

import { useI18n } from '@/lib/i18n/I18nProvider';
import clsx from 'clsx';
import { Button } from '@/components/ui/Button';
import type { Mode } from '@/types/engines';

type SettingsEngineAdvancedLayout = 'compact' | 'panel';

type SettingsKlingV3ControlsProps = {
  klingShotType: 'customize' | 'intelligent';
  layout: SettingsEngineAdvancedLayout;
  mode: Mode;
  onKlingShotTypeChange?: (value: 'customize' | 'intelligent') => void;
  onVoiceIdsChange?: (value: string) => void;
  showVoiceControls: boolean;
  voiceControlActive: boolean;
  voiceIdsValue: string;
};

type SettingsSeedanceAdvancedControlsProps = {
  cameraFixed: boolean;
  layout: SettingsEngineAdvancedLayout;
  onCameraFixedChange?: (value: boolean) => void;
  onSafetyCheckerChange?: (value: boolean) => void;
  onSeedChange?: (value: string) => void;
  safetyChecker: boolean;
  seedValue: string;
};

const toggleButtonClass =
  'min-h-0 h-auto px-3 py-1.5 text-[13px]';

function activeToggleClass(active: boolean) {
  return active
    ? 'border-brand bg-brand text-on-brand'
    : 'border-hairline bg-surface text-text-secondary hover:border-text-muted hover:bg-surface-2';
}

export function SettingsKlingV3Controls({
  klingShotType,
  layout,
  mode,
  onKlingShotTypeChange,
  onVoiceIdsChange,
  showVoiceControls,
  voiceControlActive,
  voiceIdsValue,
}: SettingsKlingV3ControlsProps) {
  const { locale } = useI18n();
  const isCompact = layout === 'compact';
  const labelClass = isCompact
    ? 'text-[11px] font-semibold uppercase tracking-micro text-text-muted'
    : 'text-[12px] uppercase tracking-micro text-text-muted';
  const fieldClass = isCompact
    ? 'flex flex-col gap-1.5 text-sm text-text-secondary'
    : 'flex flex-col gap-2 text-sm text-text-secondary';
  const inputClass = isCompact
    ? 'h-10 rounded-input border border-border bg-surface px-3 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
    : 'rounded-input border border-border bg-surface px-3 py-2 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

  const body = (
    <>
      <label className={fieldClass}>
        <span className={labelClass}>{locale === 'zh' ? '镜头模式' : 'Shot type'}</span>
        <div className="flex flex-wrap gap-2">
          {(['customize', 'intelligent'] as const).map((option) => (
            <Button
              key={locale === 'zh' ? (option === 'customize' ? '自定义' : '智能') : option}
              type="button"
              size="sm"
              variant="outline"
              disabled={mode === 'i2v'}
              onClick={() => {
                if (mode === 'i2v') return;
                onKlingShotTypeChange?.(option);
              }}
              className={clsx(toggleButtonClass, activeToggleClass(option === klingShotType))}
            >
              {locale === 'zh' ? (option === 'customize' ? '自定义' : '智能') : option}
            </Button>
          ))}
        </div>
        {mode === 'i2v' ? (
          <span className="text-[11px] text-text-muted">{locale === 'zh' ? '图生视频固定使用自定义镜头模式。' : 'Shot type is locked to customize for image-to-video.'}</span>
        ) : null}
      </label>
      {showVoiceControls ? (
        <label className={fieldClass}>
          <span className={labelClass}>{locale === 'zh' ? '音色 ID（逗号分隔）' : 'Voice IDs (CSV)'}</span>
          <input
            type="text"
            placeholder="voice_1, voice_2"
            value={voiceIdsValue}
            onChange={(event) => onVoiceIdsChange?.(event.currentTarget.value)}
            className={inputClass}
          />
          <span className="text-[11px] text-text-muted">{locale === 'zh' ? '音色控制价格：0.392 美元/秒' : 'Voice control pricing: $0.392/s'}</span>
          {voiceControlActive ? (
            <span className="text-[11px] text-text-muted">{locale === 'zh' ? '启用音色控制时，音频保持开启。' : 'Audio locked on while voice control is enabled.'}</span>
          ) : null}
        </label>
      ) : null}
    </>
  );

  if (isCompact) {
    return (
      <div className="space-y-3">
        <span className={labelClass}>{locale === 'zh' ? 'Kling 控制选项' : 'Kling controls'}</span>
        <div className="grid gap-3 md:grid-cols-2">{body}</div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <span className={labelClass}>{locale === 'zh' ? 'Kling 控制选项' : 'Kling controls'}</span>
      <div className="space-y-2 rounded-input border border-border bg-surface p-3">{body}</div>
    </div>
  );
}

export function SettingsSeedanceAdvancedControls({
  cameraFixed,
  layout,
  onCameraFixedChange,
  onSafetyCheckerChange,
  onSeedChange,
  safetyChecker,
  seedValue,
}: SettingsSeedanceAdvancedControlsProps) {
  const { locale } = useI18n();
  const isCompact = layout === 'compact';
  const labelClass = isCompact
    ? 'text-[11px] font-semibold uppercase tracking-micro text-text-muted'
    : 'text-[12px] uppercase tracking-micro text-text-muted';
  const fieldClass = isCompact
    ? 'flex flex-col gap-1.5 text-sm text-text-secondary'
    : 'flex flex-col gap-2 text-sm text-text-secondary';
  const inputClass = isCompact
    ? 'h-10 rounded-input border border-border bg-surface px-3 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
    : 'rounded-input border border-border bg-surface px-3 py-2 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

  const body = (
    <>
      <label className={fieldClass}>
        <span className={labelClass}>{locale === 'zh' ? '随机种子' : 'Seed'}</span>
        <input
          type="number"
          placeholder={locale === 'zh' ? '-1 表示随机' : '-1 for random'}
          value={seedValue}
          onChange={(event) => onSeedChange?.(event.currentTarget.value)}
          className={inputClass}
        />
        <span className="text-[11px] text-text-muted">{locale === 'zh' ? '使用 -1 随机生成。' : 'Use -1 for random.'}</span>
      </label>
      <label className={fieldClass}>
        <span className={labelClass}>{locale === 'zh' ? '固定镜头' : 'Camera fixed'}</span>
        <div className="flex flex-wrap gap-2">
          {[true, false].map((option) => (
            <Button
              key={option ? 'camera-on' : 'camera-off'}
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onCameraFixedChange?.(option)}
              className={clsx(toggleButtonClass, activeToggleClass(option === cameraFixed))}
            >
              {locale === 'zh' ? (option ? '开启' : '关闭') : (option ? 'On' : 'Off')}
            </Button>
          ))}
        </div>
      </label>
      <label className={fieldClass}>
        <span className={labelClass}>{locale === 'zh' ? '安全检查' : 'Safety checker'}</span>
        <div className="flex flex-wrap gap-2">
          {[true, false].map((option) => (
            <Button
              key={option ? 'safety-on' : 'safety-off'}
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onSafetyCheckerChange?.(option)}
              className={clsx(toggleButtonClass, activeToggleClass(option === safetyChecker))}
            >
              {locale === 'zh' ? (option ? '开启' : '关闭') : (option ? 'On' : 'Off')}
            </Button>
          ))}
        </div>
      </label>
    </>
  );

  if (isCompact) {
    return (
      <div className="space-y-3">
        <span className={labelClass}>{locale === 'zh' ? 'Seedance 高级设置' : 'Seedance advanced'}</span>
        <div className="grid gap-3 md:grid-cols-3">{body}</div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <span className={labelClass}>{locale === 'zh' ? 'Seedance 高级设置' : 'Seedance advanced'}</span>
      <div className="space-y-3 rounded-input border border-border bg-surface p-3">{body}</div>
    </div>
  );
}
