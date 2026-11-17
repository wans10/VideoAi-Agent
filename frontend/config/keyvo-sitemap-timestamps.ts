import type { SitemapTimestampConfig } from './sitemap-timestamps';

/**
 * Keyvo-owned last-modified dates. The production image has no Git history, so a route without a
 * date here (or in sitemap-timestamps.ts) falls back to the build date from next.config.js.
 * These dates take precedence over the upstream manual map. They record the day the page content or
 * its search metadata last changed; update the entry in the same commit that changes the page.
 * Values were taken from the Git history of each route source on 2026-11-17.
 */
export const KEYVO_SITEMAP_ROUTE_TIMESTAMPS: NonNullable<SitemapTimestampConfig['routes']> = {
    '/': '2026-11-17',
    '/about': '2026-11-17',
    '/ai-video-prompt-generator': '2026-11-10',
    '/changelog': '2026-10-06',
    '/contact': '2026-10-06',
    '/docs': '2026-11-10',
    '/docs/brand-safety': '2026-09-21',
    '/docs/get-started': '2026-11-03',
    '/editorial-standards': '2026-10-06',
    '/legal': '2026-09-18',
    '/legal/acceptable-use': '2026-09-18',
    '/legal/cookies-list': '2026-09-18',
    '/legal/mentions': '2026-09-18',
    '/legal/privacy': '2026-09-18',
    '/legal/subprocessors': '2026-09-18',
    '/legal/takedown': '2026-09-18',
    '/legal/terms': '2026-09-18',
    '/models/image': '2026-11-17',
    '/models/video': '2026-11-17',
    '/return-policy': '2026-10-06',
    '/status': '2026-10-06',
    '/tools': '2026-11-17',
    '/tools/character-builder': '2026-11-10',
    '/workflows': '2026-10-06',
    '/pricing': '2026-11-17',
    '/pay-as-you-go-ai-video-generator': '2026-11-17',
    '/examples/hailuo': '2026-11-17',
    '/examples/happy-horse': '2026-11-17',
    '/examples/seedance': '2026-11-17',
    '/examples/kling': '2026-11-17',
    '/examples/wan': '2026-11-17',
    '/models/happy-horse-1-1': '2026-11-17',
    '/models/seedream-5-0-pro': '2026-11-17',
    '/models/kling-3-4k': '2026-11-17',
    '/models/kling-3-pro': '2026-11-17',
    '/models/kling-3-standard': '2026-11-17',
    '/models/kling-o3-4k': '2026-11-17',
    '/models/kling-o3-pro': '2026-11-17',
    '/models/kling-o3-standard': '2026-11-17',
    '/models/kling-3-turbo-pro': '2026-11-17',
    '/models/kling-3-turbo-standard': '2026-11-17',
};
