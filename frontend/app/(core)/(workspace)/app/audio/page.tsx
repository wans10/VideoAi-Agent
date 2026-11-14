import { isKeyvoAudioWorkspaceDisabled } from '@/config/keyvo-disabled-features';
import { notFound } from 'next/navigation';
import { AppCreationContent } from '@/components/app/AppCreationContent';
import type { Metadata } from 'next';

import { HeaderBar } from '@/components/HeaderBar';
import { AppSidebar } from '@/components/AppSidebar';
import AudioCreationWorkspace from './AudioCreationWorkspace';

export const metadata: Metadata = {
  title: '生成音频 – Keyvo 工作台',
  description: '在 Keyvo 工作台中为视频添加电影化声音设计、氛围配乐和可选的语音配音。',
  robots: {
    index: false,
    follow: true,
  },
};

export const dynamic = 'force-dynamic';

export default function AudioGeneratePage() {
  if (isKeyvoAudioWorkspaceDisabled()) notFound();
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <HeaderBar />
      <div className="flex flex-1 min-w-0 flex-col md:flex-row">
        <AppSidebar />
        <AppCreationContent>
          <AudioCreationWorkspace />
        </AppCreationContent>
      </div>
    </div>
  );
}

