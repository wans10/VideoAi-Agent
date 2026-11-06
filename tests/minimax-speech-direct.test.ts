import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isKeyvoAudioRequestAllowed,
  isKeyvoAudioWorkspaceDisabled,
  isMinimaxSpeechConfigured,
} from '../frontend/config/keyvo-disabled-features';
import { buildMinimaxSpeechRequest, subscribeMinimaxSpeech } from '../frontend/src/server/audio/providers/minimax-speech';
import { subscribeFalModel } from '../frontend/src/server/audio/providers/fal-runner';
import { validateAudioGenerateRequest } from '../frontend/src/server/audio/audio-generate-validation';
import { AUDIO_MINIMAX_SPEECH_MODEL_ID, AUDIO_MINIMAX_VOICE_LABELS, AUDIO_MINIMAX_VOICE_VALUES } from '../frontend/src/lib/audio-generation';

const falInput = {
  text: '你好',
  voice_setting: { voice_id: 'female-shaonv', speed: 1.1, vol: 1, pitch: 0, emotion: 'neutral', english_normalization: false },
  audio_setting: { format: 'mp3', sample_rate: 44100, channel: 1 },
  language_boost: 'Chinese',
  output_format: 'url',
};
const ok = (audio = 'https://minimax-algeng-chat-tts.oss-cn-wulanchabu.aliyuncs.com/a.mp3') =>
  new Response(JSON.stringify({ data: { audio, status: 2 }, extra_info: { audio_length: 1764 }, trace_id: 't1', base_resp: { status_code: 0, status_msg: 'success' } }), { status: 200 });

test('the fal request is translated to the official one, dropping fal-only and unsupported fields', () => {
  const request = buildMinimaxSpeechRequest(falInput) as Record<string, any>;
  assert.equal(request.model, 'speech-02-hd');
  assert.equal(request.stream, false);
  assert.equal(request.output_format, 'url');
  assert.equal(request.language_boost, 'Chinese');
  assert.deepEqual(request.voice_setting, { voice_id: 'female-shaonv', speed: 1.1, vol: 1, pitch: 0 });
  assert.deepEqual(request.audio_setting, { format: 'mp3', sample_rate: 44100, channel: 1 });
  assert.equal('english_normalization' in request.voice_setting, false);
  const happy = buildMinimaxSpeechRequest({ ...falInput, voice_setting: { voice_id: 'x', emotion: 'happy' } }) as Record<string, any>;
  assert.equal(happy.voice_setting.emotion, 'happy');
});

test('a successful synthesis returns the audio URL in the shape the runner reads', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const fetchFn = (async (url: string, init?: RequestInit) => { calls.push({ url, init }); return ok(); }) as typeof fetch;
  const result = await subscribeMinimaxSpeech(falInput, { apiKey: 'k', fetchFn });
  assert.equal(calls[0].url, 'https://api.minimax.cn/v1/t2a_v2');
  assert.equal((calls[0].init?.headers as Record<string, string>).Authorization, 'Bearer k');
  assert.match(String((result.data as any).audio), /^https:\/\//);
  assert.equal(result.requestId, 't1');
});

test('provider errors, business error codes and non-HTTPS audio all fail the synthesis', async () => {
  const run = (response: Response) => subscribeMinimaxSpeech(falInput, { apiKey: 'k', fetchFn: (async () => response) as typeof fetch });
  await assert.rejects(run(new Response('{}', { status: 500 })), /500/);
  await assert.rejects(run(new Response(JSON.stringify({ base_resp: { status_code: 1008, status_msg: 'balance' } }), { status: 200 })), /code 1008/);
  await assert.rejects(run(ok('http://insecure.example/a.mp3')), /no audio URL/);
  await assert.rejects(run(new Response(JSON.stringify({ data: {}, base_resp: { status_code: 0 } }), { status: 200 })), /no audio URL/);
  await assert.rejects(subscribeMinimaxSpeech(falInput, { apiKey: '' }), /key is missing/);
});

test('subscribeFalModel sends MiniMax Speech to the mainland API only when it is configured', async () => {
  const saved = { e: process.env.MINIMAX_SPEECH_ENABLED, k: process.env.MINIMAX_API_KEY, f: globalThis.fetch };
  try {
    process.env.MINIMAX_SPEECH_ENABLED = 'true';
    process.env.MINIMAX_API_KEY = 'mm';
    const seen: string[] = [];
    globalThis.fetch = (async (url: string) => { seen.push(String(url)); return ok(); }) as typeof fetch;
    const result = await subscribeFalModel(AUDIO_MINIMAX_SPEECH_MODEL_ID, falInput);
    assert.deepEqual(seen, ['https://api.minimax.cn/v1/t2a_v2']);
    assert.match(String((result.data as any).audio), /^https:\/\//);
  } finally {
    globalThis.fetch = saved.f;
    for (const [key, value] of [['MINIMAX_SPEECH_ENABLED', saved.e], ['MINIMAX_API_KEY', saved.k]] as const) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});

test('the audio workspace opens only when MiniMax Speech is switched on with a key', () => {
  assert.equal(isMinimaxSpeechConfigured({}), false);
  assert.equal(isMinimaxSpeechConfigured({ MINIMAX_SPEECH_ENABLED: 'true' }), false);
  assert.equal(isMinimaxSpeechConfigured({ MINIMAX_API_KEY: 'k' }), false);
  assert.equal(isKeyvoAudioWorkspaceDisabled({}), true);
  assert.equal(isKeyvoAudioWorkspaceDisabled({ MINIMAX_SPEECH_ENABLED: 'true', MINIMAX_API_KEY: 'k' }), false);
});

test('only MiniMax voice over is allowed while fal features are hidden', () => {
  assert.equal(isKeyvoAudioRequestAllowed({ pack: 'voice_only', voiceModel: 'minimax' }), true);
  for (const request of [
    { pack: 'voice_only', voiceModel: 'eleven-v4' }, { pack: 'voice_only', voiceModel: 'seed' },
    { pack: 'music_only', voiceModel: null }, { pack: 'song', voiceModel: null },
    { pack: 'sfx_only', voiceModel: null }, { pack: 'cinematic_voice', voiceModel: 'minimax' },
  ]) assert.equal(isKeyvoAudioRequestAllowed(request), false, JSON.stringify(request));
});

test('validation accepts MiniMax voice over in Chinese', () => {
  const valid = validateAudioGenerateRequest({
    pack: 'voice_only', voiceModel: 'minimax', script: '欢迎使用。', language: 'chinese',
    minimaxVoiceId: 'Chinese (Mandarin)_News_Anchor', locale: 'zh',
  } as never);
  assert.equal(valid.minimaxVoiceId, 'Chinese (Mandarin)_News_Anchor');
  assert.equal(valid.language, 'chinese');
});

test('the audio routes refuse every request except MiniMax voice over', async () => {
  const { refuseUnavailableAudioRequest } = await import('../frontend/src/server/audio/keyvo-audio-gate');
  assert.equal(refuseUnavailableAudioRequest({ pack: 'voice_only', voiceModel: 'minimax' }), null);
  for (const body of [
    { pack: 'music_only', mood: 'epic' }, { pack: 'voice_only', voiceModel: 'eleven-v4' },
    { pack: 'voice_only', voiceModel: 'seed' }, { pack: 'voice_only' }, null, 'x',
  ]) {
    const refused = refuseUnavailableAudioRequest(body);
    assert.equal(refused?.status, 404, JSON.stringify(body));
  }
});

test('the workspace offers only voice over, and stored drafts are steered to MiniMax', async () => {
  const { visibleAudioIntents, applyKeyvoVoiceOnly, newAudioDraft } = await import('../frontend/src/lib/audio-creation');
  assert.deepEqual([...visibleAudioIntents()], ['voice']);
  const fresh = applyKeyvoVoiceOnly(newAudioDraft('voice'));
  assert.equal(fresh.voiceModel, 'minimax');
  assert.equal(fresh.minimaxVoiceId, 'Chinese (Mandarin)_News_Anchor');
  const chosen = applyKeyvoVoiceOnly({ ...fresh, minimaxVoiceId: 'female-shaonv' });
  assert.equal(chosen.minimaxVoiceId, 'female-shaonv', 'a valid MiniMax choice is kept');
  const eleven = applyKeyvoVoiceOnly({ ...fresh, voiceModel: 'eleven-v4', minimaxVoiceId: 'Wise_Woman' });
  assert.equal(eleven.voiceModel, 'minimax');
  assert.equal(eleven.minimaxVoiceId, 'Chinese (Mandarin)_News_Anchor');
  const reference = applyKeyvoVoiceOnly({ ...fresh, reference: { url: 'https://x.example/a.mp3', name: 'a.mp3' } });
  assert.equal(reference.reference, null);
});

test('every listed MiniMax voice has a label', () => {
  for (const voice of AUDIO_MINIMAX_VOICE_VALUES) assert.ok(AUDIO_MINIMAX_VOICE_LABELS[voice], voice);
});
