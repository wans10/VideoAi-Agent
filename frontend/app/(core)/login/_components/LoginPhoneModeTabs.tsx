'use client';

import clsx from 'clsx';
import { Button } from '@/components/ui/Button';
import type { AuthCopy } from '../_lib/login-copy';

export type LoginPhoneTab = 'signin' | 'signup';

type LoginPhoneModeTabsProps = {
  authCopy: AuthCopy;
  tab: LoginPhoneTab;
  disabled: boolean;
  onChange: (tab: LoginPhoneTab) => void;
};

/** 登录 / 注册 tabs above the phone forms. Forgot-password and email views do not show them. */
export function LoginPhoneModeTabs({ authCopy, tab, disabled, onChange }: LoginPhoneModeTabsProps) {
  const options: Array<{ id: LoginPhoneTab; label: string }> = [
    { id: 'signin', label: authCopy.phone.tabs.signin },
    { id: 'signup', label: authCopy.phone.tabs.signup },
  ];

  return (
    <div
      role="group"
      aria-label={authCopy.modeGroup}
      data-testid="phone-mode-tabs"
      className="grid grid-cols-2 gap-1 rounded-pill bg-bg p-1 text-sm font-medium"
    >
      {options.map((option) => {
        const active = tab === option.id;
        return (
          <Button
            key={option.id}
            type="button"
            variant={active ? 'primary' : 'ghost'}
            size="sm"
            aria-pressed={active}
            disabled={disabled}
            onClick={() => onChange(option.id)}
            className={clsx('min-h-11 rounded-pill px-3 py-2', active ? 'shadow-card' : 'hover:bg-surface')}
          >
            {option.label}
          </Button>
        );
      })}
    </div>
  );
}
