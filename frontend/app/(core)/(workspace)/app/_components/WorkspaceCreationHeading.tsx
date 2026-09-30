'use client';

import type { ReactNode } from 'react';
import { useI18n } from '@/lib/i18n/I18nProvider';

export function WorkspaceCreationHeading({ media = 'video', action }: { media?: 'video' | 'image'; action?: ReactNode }) {
  const { t } = useI18n();
  return (
    <header className="app-creation-heading studio-creation-title">
      <div><p className="app-eyebrow">VideoAI · STUDIO</p><h1>{media === 'image' ? t('workspace.header.createImage', 'Create image') : t('workspace.header.createVideo', 'Create video')}</h1></div>
      {action ? <div className="md:hidden">{action}</div> : null}
    </header>
  );
}
