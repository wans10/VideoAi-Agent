import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { HeaderBar } from '@/components/HeaderBar';
import { AppSidebar } from '@/components/AppSidebar';
import { getEngineAliases, listFalEngines } from '@/config/falEngines';
import type { ImageGenerationMode } from '@/types/image-generation';
import ImageWorkspaceSession from './_components/ImageWorkspaceSession.client';
import type { ImageEngineOption } from './ImageWorkspace';
import { sortImageWorkspaceEngineOptions } from './_lib/image-workspace-engine-options';
import {
  filterExecutableWorkspaceEngines,
  reportHiddenWorkspaceEngines,
  resolveWorkspaceViewerIsAdmin,
} from '@/server/workspace-engine-availability';

export const metadata: Metadata = {
  title: '生成图片 – Keyvo 工作台',
  description: '在 Keyvo 工作台中直接创作和编辑高保真图片，支持 Nano Banana 及即将上线的图像引擎。',
  robots: {
    index: false,
    follow: true,
  },
};

export const dynamic = 'force-dynamic';

type ImageGeneratePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getSearchParam(params: Record<string, string | string[] | undefined> | undefined, key: string): string | null {
  const value = params?.[key];
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default async function ImageGeneratePage({ searchParams }: ImageGeneratePageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  if (getSearchParam(resolvedSearchParams, 'tool') === 'storyboard') {
    redirect('/app/tools/storyboard');
  }

  const registryImageEntries = listFalEngines().filter((engine) => (engine.category ?? 'video') === 'image' && engine.surfaces.app.enabled);
  if (!registryImageEntries.length) {
    notFound();
  }
  // Same rule as the video picker (/api/engines): list only what this deployment can run. Fails open.
  const isAdmin = await resolveWorkspaceViewerIsAdmin();
  const availability = filterExecutableWorkspaceEngines(registryImageEntries.map((entry) => entry.engine), { isAdmin });
  reportHiddenWorkspaceEngines('image', availability, Date.now(), isAdmin ? 'admin' : 'member');
  const executableById = new Map(availability.engines.map((engine) => [engine.id, engine]));
  const imageEntries = registryImageEntries.filter((entry) => executableById.has(entry.engine.id));

  const engines: ImageEngineOption[] = sortImageWorkspaceEngineOptions(
    imageEntries.map((entry) => {
      const pricing = entry.engine.pricing;
      const fallbackPrice =
        typeof pricing?.base === 'number' && pricing.base > 0
          ? pricing.base
          : typeof entry.engine.pricingDetails?.flatCents?.default === 'number'
            ? entry.engine.pricingDetails.flatCents.default / 100
            : 0.039;
      const currency = pricing?.currency ?? entry.engine.pricingDetails?.currency ?? 'USD';
      const prompts = entry.prompts
        .filter((prompt) => prompt.mode === 't2i' || prompt.mode === 'i2i')
        .map((prompt) => ({
          title: prompt.title,
          prompt: prompt.prompt,
          notes: prompt.notes,
          mode: prompt.mode as ImageGenerationMode,
        }));
      const executableModes = new Set<string>(executableById.get(entry.engine.id)?.modes ?? []);
      const modes = entry.modes
        .map((modeConfig) => modeConfig.mode)
        .filter((mode): mode is ImageGenerationMode => mode === 't2i' || mode === 'i2i')
        .filter((mode) => executableModes.has(mode));

      return {
        id: entry.id,
        name: entry.marketingName,
        description: entry.seoText ?? entry.seo.description,
        pricePerImage: fallbackPrice,
        currency,
        prompts,
        modes,
        engineCaps: entry.engine,
        aliases: getEngineAliases(entry),
      };
    })
  );

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <HeaderBar />
      <div className="flex flex-1 min-w-0 flex-col md:flex-row">
        <AppSidebar />
        <ImageWorkspaceSession engines={engines} />
      </div>
    </div>
  );
}
