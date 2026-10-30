/**
 * Every example poster and preview on the home works wall goes through this function.
 * The bundled examples are still hosted on the upstream media CDN; moving them to Keyvo's own
 * storage is a one-line change here (plus rewriting the example snapshot), not a change to the wall.
 */
export function showcaseMediaUrl(url: string): string;
export function showcaseMediaUrl(url: string | null | undefined): string | null;
export function showcaseMediaUrl(url: string | null | undefined): string | null {
  return url ? url : null;
}
