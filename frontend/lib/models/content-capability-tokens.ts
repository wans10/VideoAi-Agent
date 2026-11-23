/**
 * Authored model copy must not hard-code the resolutions an engine offers: they change when a resolution is added or
 * withdrawn and the copy drifts. Keyvo's Simplified Chinese content may therefore use these tokens, which are replaced
 * with values derived from the engine capabilities (the same data the price calculator offers):
 *   {{resolutions}}     "480p、720p、1080p 或 4K"
 *   {{maxResolution}}   "4K"
 * An unknown engine or an engine without resolutions leaves the text untouched so a missing token is visible in review.
 */
const TOKEN_PATTERN = /\{\{(resolutions|maxResolution)\}\}/g;

function resolutionRank(value: string): number {
  const v = value.trim().toLowerCase();
  if (v.includes('4k')) return 2160;
  if (v.includes('2k')) return 1440;
  const p = v.match(/(\d{3,4})p/);
  return p ? Number(p[1]) : 0;
}

function resolutionLabel(value: string): string {
  const v = value.trim();
  return /^[1-9]k$/i.test(v) ? v.toUpperCase() : v;
}

export function formatZhResolutionList(resolutions: readonly string[]): string | null {
  const sorted = resolutions.filter((value) => resolutionRank(value) > 0).sort((a, b) => resolutionRank(a) - resolutionRank(b)).map(resolutionLabel);
  if (!sorted.length) return null;
  if (sorted.length === 1) return sorted[0]!;
  return `${sorted.slice(0, -1).join('、')} 或 ${sorted[sorted.length - 1]}`;
}

export function formatMaxResolution(resolutions: readonly string[]): string | null {
  const sorted = resolutions.filter((value) => resolutionRank(value) > 0).sort((a, b) => resolutionRank(b) - resolutionRank(a));
  return sorted.length ? resolutionLabel(sorted[0]!) : null;
}

export function applyCapabilityTokens<T>(value: T, resolutions: readonly string[] | null | undefined): T {
  if (!resolutions?.length) return value;
  const list = formatZhResolutionList(resolutions);
  const max = formatMaxResolution(resolutions);
  const walk = (node: unknown): unknown => {
    if (typeof node === 'string') {
      return node.replace(TOKEN_PATTERN, (match, token: string) => (token === 'resolutions' ? list : max) ?? match);
    }
    if (Array.isArray(node)) return node.map(walk);
    if (node && typeof node === 'object') {
      return Object.fromEntries(Object.entries(node as Record<string, unknown>).map(([key, entry]) => [key, walk(entry)]));
    }
    return node;
  };
  return walk(value) as T;
}
