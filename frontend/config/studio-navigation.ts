import type { MarketingNavDropdown, MarketingTopNavLink } from './navigation';

/** Public information architecture is organized by production intent. */
export const STUDIO_NAV_LINKS: readonly MarketingTopNavLink[] = [
  { key: 'production', href: '/app', activePaths: ['/app', '/app/image', '/app/audio'] },
  { key: 'craft', href: '/tools', activePaths: ['/tools', '/app/tools'] },
  { key: 'screening', href: '/examples', activePaths: ['/examples', '/video', '/blog', '/models', '/ai-video-engines'] },
  { key: 'pipeline', href: '/mcp', activePaths: ['/mcp', '/integrations', '/workflows'] },
  { key: 'pricing', href: '/pricing' },
];

export const STUDIO_NAV_DROPDOWNS: Record<string, MarketingNavDropdown> = {
  production: { heading: "Set your next scene in motion.", intro: "Choose the stage you need: a shot, a visual reference or a sound.", allHref: '/app', allLabelKey: 'nav.dropdown.production.all', allLabelFallback: "Open production desk", desktopColumns: 2, items: [
    { key: 'shot', href: '/app', icon: 'cinema', label: "Generate a shot", description: "Build the next shot from a brief, reference or clip." },
    { key: 'storyboard', href: '/app/tools/storyboard', icon: 'guides', label: "Plan a sequence", description: "Work out the visual sequence before generation." },
    { key: 'look', href: '/app/image', icon: 'image', label: "Develop the look", description: "Explore the setting, lighting and visual direction." },
    { key: 'sound', href: '/app/audio', icon: 'audio', label: "Design the sound", description: "Prepare voice, music and effects for your shots." },
  ] },
  craft: { heading: "Find the frame before the take.", intro: "Character, camera position and finishing, working toward one visual intention.", allHref: '/tools', allLabelKey: 'nav.dropdown.craft.all', allLabelFallback: "Explore the workshop", desktopColumns: 2, items: [
    { key: 'character', href: '/tools/character-builder', icon: 'character', label: "Character development", description: "Build character references you can return to." },
    { key: 'angle', href: '/tools/angle', icon: 'angle', label: "Camera studies", description: "Study coverage and viewpoints from one image." },
    { key: 'upscale', href: '/tools/upscale', icon: 'upscale', label: "Image finishing", description: "Upscale images and refine their clarity." },
    { key: 'isolate', href: '/tools/background-removal', icon: 'cutout', label: "Subject isolation", description: "Remove video backgrounds for compositing." },
  ] },
  screening: { heading: "Watch the shot. Study the process.", intro: "Use real outputs to develop the approach for your next scene.", allHref: '/examples', allLabelKey: 'nav.dropdown.screening.all', allLabelFallback: "Enter the shot library", desktopColumns: 2, items: [
    { key: 'reels', href: '/examples', icon: 'cinema', label: "Shot library", description: "Inspect generated shots, prompts and settings." },
    { key: 'cinematic', href: '/ai-video-engines/best-for/cinematic-realism', icon: 'cinema', label: "Cinematic studies", description: "Explore light, camera movement and realism." },
    { key: 'commercial', href: '/ai-video-engines/best-for/ads', icon: 'ads', label: "Commercial work", description: "Find an approach for product-led short films." },
    { key: 'journal', href: '/blog', icon: 'docs', label: "Production journal", description: "Prompt methods, workflow breakdowns and practice." },
  ], sections: [{ key: 'reference', titleKey: 'nav.dropdown.screening.reference', titleFallback: 'Technical reference', items: [{ key: 'models', label: 'Model directory', href: '/models', icon: 'guides' }, { key: 'compare', label: 'Compare capabilities', href: '/ai-video-engines', icon: 'guides' }, { key: 'docs', label: 'Production guides', href: '/docs', icon: 'docs' }] }] },
};
