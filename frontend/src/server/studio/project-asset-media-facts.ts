import type { WorkspaceAssetRecord } from '@/app/(core)/(workspace)/app/studio/_shared/_lib/workspace-types';

/** Refresh only measured facts for an already resolved owned reference; preserve authored asset identity and presentation. */
export function refreshStudioProjectAssetMediaFacts(existing: WorkspaceAssetRecord, resolved: WorkspaceAssetRecord): WorkspaceAssetRecord {
  const facts = resolved.mediaFacts;
  if (!facts || facts.source !== 'probe') return existing;
  return {
    ...existing,
    mediaFacts: facts,
    ...(facts.durationSec !== undefined ? {durationSec: facts.durationSec} : {}),
    ...(facts.width !== undefined ? {width: facts.width} : {}),
    ...(facts.height !== undefined ? {height: facts.height} : {}),
    ...(typeof facts.hasAudio === 'boolean' ? {hasAudio: facts.hasAudio, ...(resolved.kind === 'video' ? {audioProvenance: facts.hasAudio ? 'embedded' as const : 'none' as const} : {})} : {}),
  };
}
