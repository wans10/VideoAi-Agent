/** Public release identities. Authenticated execution retains its deployment gate. */
import { CREATOR_TOOL_IDS, type CreatorToolId } from './catalogue';
export { CREATOR_TOOL_IDS, type CreatorToolId } from './catalogue';
export const CREATOR_TOOL_AVAILABILITY: Readonly<Record<CreatorToolId, { publicReleased: boolean }>> = {
  // Keyvo 2026-11-14: hidden. The only speech-to-text route is ElevenLabs Scribe v2 on Fal (no FAL_KEY, no mainland ASR adapter).
  subtitles: { publicReleased: false },
  // Keyvo 2026-11-16: the four remaining creator tools are hidden too (USD quotes vs CNY wallet, CREATOR_TOOLS_ENABLED unset => 404). See keyvo-upstream-deviations.md.
  'lip-sync': { publicReleased: false },
  'product-photo-editor': { publicReleased: false },
  'product-video-editor': { publicReleased: false },
  'motion-transfer': { publicReleased: false },
};
export function isCreatorToolPublic(id: string): id is CreatorToolId {
  return Object.prototype.hasOwnProperty.call(CREATOR_TOOL_AVAILABILITY, id)
    && CREATOR_TOOL_AVAILABILITY[id as CreatorToolId].publicReleased;
}
export function getReleasedCreatorToolIds(): CreatorToolId[] {
  return CREATOR_TOOL_IDS.filter(isCreatorToolPublic);
}
/** Receives canonical English paths, as used by the route discovery owner. */
export function isCreatorPublicPathAvailable(englishPath: string): boolean {
  const id = englishPath.replace(/\/$/, '').match(/^\/tools\/([^/]+)$/)?.[1];
  return !id || !CREATOR_TOOL_IDS.includes(id as CreatorToolId) || isCreatorToolPublic(id);
}
