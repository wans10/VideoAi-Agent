import { NextResponse } from 'next/server';
import { isKeyvoAudioRequestAllowed, isMinimaxSpeechConfigured, isSeedAudioConfigured } from '@/config/keyvo-disabled-features';

/**
 * Route-level guard for the audio API: while only MiniMax voice over has a provider, every other pack or voice
 * model is refused before it can be quoted or charged. Validation itself stays provider-neutral.
 */
export function refuseUnavailableAudioRequest(body: unknown): NextResponse | null {
  const record = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  const voiceModel = typeof record.voiceModel === 'string' ? record.voiceModel : null;
  const hasReference = Boolean(record.voiceSampleUrl) || record.voiceMode === 'clone';
  const allowed = isKeyvoAudioRequestAllowed({
    pack: typeof record.pack === 'string' ? record.pack : null,
    voiceModel,
    hasReference,
  }) && (voiceModel === 'seed' ? isSeedAudioConfigured() : voiceModel === 'minimax' ? isMinimaxSpeechConfigured() : true);
  return allowed ? null : NextResponse.json({ ok: false, error: 'audio_unavailable' }, { status: 404 });
}
