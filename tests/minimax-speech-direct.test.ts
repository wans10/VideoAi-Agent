import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isKeyvoAudioRequestAllowed,
  isKeyvoAudioWorkspaceDisabled,
  isMinimaxSpeechConfigured,
} from '../frontend/config/keyvo-disabled-features';
import { buildMinimaxSpeechRequest, subscribeMinimaxSpeech } from '../frontend/src/server/audio/providers/minimax-speech';
import { subscribeFalModel } from '../frontend/src/server/audio/providers/fal-runner';
import { buildSeedAudioDirectRequest, classifySeedAudioFailure, SeedAudioError, SEED_AUDIO_TEXT_PROMPT_MAX_LENGTH, subscribeSeedAudio } from '../frontend/src/server/audio/providers/seed-audio-direct';
import { isSeedAudioConfigured } from '../frontend/config/keyvo-disabled-features';
import { validateAudioGenerateRequest } from '../frontend/src/server/audio/audio-generate-validation';
import { AUDIO_SEED_AUDIO_MODEL_ID, AUDIO_DOUBAO_SEED_VOICE_LABELS, AUDIO_DOUBAO_SEED_VOICE_VALUES, AUDIO_MINIMAX_SPEECH_MODEL_ID, AUDIO_MINIMAX_VOICE_LABELS, AUDIO_MINIMAX_WORKSPACE_VOICE_VALUES } from '../frontend/src/lib/audio-generation';

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
  assert.equal(isKeyvoAudioWorkspaceDisabled({ SEED_AUDIO_ENABLED: 'true', SEED_AUDIO_API_KEY: 'k' }), false, 'either provider opens it');
  assert.equal(isSeedAudioConfigured({ SEED_AUDIO_ENABLED: 'true' }), false);
  assert.equal(isSeedAudioConfigured({ SEED_AUDIO_API_KEY: 'k' }), false);
});

test('only MiniMax and Seed Audio preset voice over is allowed while fal features are hidden', () => {
  assert.equal(isKeyvoAudioRequestAllowed({ pack: 'voice_only', voiceModel: 'minimax' }), true);
  assert.equal(isKeyvoAudioRequestAllowed({ pack: 'voice_only', voiceModel: 'seed' }), true);
  assert.equal(isKeyvoAudioRequestAllowed({ pack: 'voice_only', voiceModel: 'seed', hasReference: true }), false, 'no reference voices');
  for (const request of [
    { pack: 'voice_only', voiceModel: 'eleven-v4' },
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
  const saved = { ...process.env };
  try {
    Object.assign(process.env, { MINIMAX_SPEECH_ENABLED: 'true', MINIMAX_API_KEY: 'k' });
    delete process.env.SEED_AUDIO_ENABLED; delete process.env.SEED_AUDIO_API_KEY;
    assert.equal(refuseUnavailableAudioRequest({ pack: 'voice_only', voiceModel: 'minimax' }), null);
    assert.equal(refuseUnavailableAudioRequest({ pack: 'voice_only', voiceModel: 'seed' })?.status, 404, 'Seed Audio needs its own switch');
    Object.assign(process.env, { SEED_AUDIO_ENABLED: 'true', SEED_AUDIO_API_KEY: 'k' });
    assert.equal(refuseUnavailableAudioRequest({ pack: 'voice_only', voiceModel: 'seed' }), null);
    for (const body of [
      { pack: 'music_only', mood: 'epic' }, { pack: 'voice_only', voiceModel: 'eleven-v4' },
      { pack: 'voice_only', voiceModel: 'seed', voiceSampleUrl: 'https://x.example/a.mp3' },
      { pack: 'voice_only', voiceModel: 'seed', voiceMode: 'clone' }, { pack: 'voice_only' }, null, 'x',
    ]) {
      assert.equal(refuseUnavailableAudioRequest(body)?.status, 404, JSON.stringify(body));
    }
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key];
    Object.assign(process.env, saved);
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
  assert.equal(reference.voiceModel, 'minimax', 'a reference voice falls back to MiniMax');
  const seed = applyKeyvoVoiceOnly({ ...fresh, voiceModel: 'seed', voice: 'zh_male_liufei_uranus_bigtts' });
  assert.deepEqual([seed.voiceModel, seed.voice], ['seed', 'zh_male_liufei_uranus_bigtts'], 'a mainland Seed voice is kept');
  assert.equal(applyKeyvoVoiceOnly({ ...fresh, voiceModel: 'seed', voice: 'kian_en_zh' }).voice, 'default', 'a fal-only voice name is dropped');
});

test('every listed MiniMax voice has a label', () => {
  for (const voice of AUDIO_MINIMAX_WORKSPACE_VOICE_VALUES) assert.ok(AUDIO_MINIMAX_VOICE_LABELS[voice], voice);
});

test('the fal Seed Audio request is translated to the Volcengine one', () => {
  const request = buildSeedAudioDirectRequest({
    prompt: 'Voice over script: 你好。', output_format: 'mp3', sample_rate: 24000,
    speed: 1.5, volume: 0.5, pitch: 3, voice: 'zh_female_vv_uranus_bigtts',
  }) as Record<string, any>;
  assert.equal(request.model, 'seed-audio-1.0');
  assert.equal(request.text_prompt, 'Voice over script: 你好。');
  assert.equal(request.speaker, 'zh_female_vv_uranus_bigtts');
  assert.deepEqual(request.audio_config, { format: 'mp3', sample_rate: 24000, speech_rate: 50, loudness_rate: -50, pitch_rate: 3 });
  const bounds = buildSeedAudioDirectRequest({ prompt: 'p', speed: 2, volume: 0.5, pitch: 99 }) as Record<string, any>;
  assert.deepEqual([bounds.audio_config.speech_rate, bounds.audio_config.loudness_rate, bounds.audio_config.pitch_rate], [100, -50, 12]);
  const unchanged = buildSeedAudioDirectRequest({ prompt: 'p', speed: 1, volume: 1, pitch: 0 }) as Record<string, any>;
  assert.deepEqual(Object.keys(unchanged.audio_config).sort(), ['format', 'sample_rate']);
  // fal-only voice names have no Doubao equivalent: the voice follows the prompt instead of sending an invalid speaker.
  assert.equal('speaker' in (buildSeedAudioDirectRequest({ prompt: 'p', voice: 'mindy_en_es_id_pt_zh' }) as object), false);
  // Format and sample rate are kept consistent: ogg_opus only supports 48 kHz.
  assert.equal((buildSeedAudioDirectRequest({ prompt: 'p', output_format: 'ogg_opus', sample_rate: 24000 }) as any).audio_config.sample_rate, 48000);
  assert.throws(() => buildSeedAudioDirectRequest({ prompt: 'p', audio_urls: ['https://x.example/a.mp3'] }), /Reference voices/);
});

test('Seed Audio returns the signed URL and fails on errors, bad codes and a missing URL', async () => {
  const seen: Array<{ url: string; init?: RequestInit }> = [];
  const respond = (body: unknown, status = 200) => (async (url: string, init?: RequestInit) => { seen.push({ url, init }); return new Response(JSON.stringify(body), { status, headers: { 'X-Tt-Logid': 'log1' } }); }) as typeof fetch;
  const good = await subscribeSeedAudio({ prompt: 'p' }, { apiKey: 'k', fetchFn: respond({ audio: 'AAAA', url: 'https://cdn.example.com/a.mp3', original_duration: 3.08 }) });
  assert.equal(seen[0].url, 'https://openspeech.bytedance.com/api/v3/tts/create');
  assert.equal((seen[0].init?.headers as Record<string, string>)['X-Api-Key'], 'k');
  assert.match((seen[0].init?.headers as Record<string, string>)['X-Api-Request-Id'], /^[0-9a-f-]{36}$/);
  assert.deepEqual(good.data, { audio: { url: 'https://cdn.example.com/a.mp3' }, duration: 3.08 });
  assert.equal(good.requestId, 'log1');
  await assert.rejects(subscribeSeedAudio({ prompt: 'p' }, { apiKey: 'k', fetchFn: respond({ code: 45000030, message: 'not granted' }, 403) }), /403/);
  await assert.rejects(subscribeSeedAudio({ prompt: 'p' }, { apiKey: 'k', fetchFn: respond({ code: 55000000, message: 'x' }) }), /code 55000000/);
  await assert.rejects(subscribeSeedAudio({ prompt: 'p' }, { apiKey: 'k', fetchFn: respond({ audio: 'AAAA' }) }), /no audio URL/);
  await assert.rejects(subscribeSeedAudio({ prompt: 'p' }, { apiKey: 'k', fetchFn: respond({ url: 'http://insecure.example/a.mp3' }) }), /no audio URL/);
  await assert.rejects(subscribeSeedAudio({ prompt: 'p' }, { apiKey: '' }), /key is missing/);
});

test('Seed Audio follows the documented contract: model override, text limit and error classification', async () => {
  // https://docs.volcengine.com/docs/doubao-voice/audio-generation-http
  assert.equal((buildSeedAudioDirectRequest({ prompt: 'p' }) as any).model, 'seed-audio-1.0');
  assert.equal((buildSeedAudioDirectRequest({ prompt: 'p' }, 'seed-audio-1.1') as any).model, 'seed-audio-1.1');
  assert.equal(SEED_AUDIO_TEXT_PROMPT_MAX_LENGTH, 3000);
  assert.doesNotThrow(() => buildSeedAudioDirectRequest({ prompt: 'x'.repeat(3000) }));
  assert.throws(() => buildSeedAudioDirectRequest({ prompt: 'x'.repeat(3001) }), (error: unknown) => error instanceof SeedAudioError && error.kind === 'invalid_request');
  assert.throws(() => buildSeedAudioDirectRequest({ prompt: '  ' }), /text prompt/);

  let calls = 0;
  const fetchFn = (async (_url: string, init?: RequestInit) => {
    calls += 1;
    return new Response(JSON.stringify({ url: 'https://cdn.example.com/a.mp3', model: JSON.parse(String(init?.body)).model }), { status: 200 });
  }) as typeof fetch;
  await assert.rejects(subscribeSeedAudio({ prompt: 'x'.repeat(3001) }, { apiKey: 'k', fetchFn }), /3000 characters/);
  assert.equal(calls, 0, 'an over-long text is refused before any provider call');
  let sentModel: unknown = null;
  await subscribeSeedAudio({ prompt: 'p' }, { apiKey: 'k', model: 'seed-audio-1.1', fetchFn: (async (_u: string, init?: RequestInit) => {
    sentModel = JSON.parse(String(init?.body)).model;
    return new Response(JSON.stringify({ url: 'https://cdn.example.com/a.mp3' }), { status: 200 });
  }) as typeof fetch });
  assert.equal(sentModel, 'seed-audio-1.1');

  // Documented audio-generation codes (https://docs.volcengine.com/docs/6561/2534853).
  for (const code of [45001125, 45001104, 45001127, 45001130, 55001310, 55001311]) assert.equal(classifySeedAudioFailure(400, code), 'content_rejected');
  for (const code of [45001001, 45001115, 45001116, 45001117, 40000020, 40402002]) assert.equal(classifySeedAudioFailure(400, code), 'invalid_request');
  assert.equal(classifySeedAudioFailure(403, 45000030), 'auth');
  assert.equal(classifySeedAudioFailure(401, null), 'auth');
  assert.equal(classifySeedAudioFailure(429, null), 'rate_limited');
  assert.equal(classifySeedAudioFailure(500, 55001309), 'provider_error');
  const reject = (body: unknown, status: number) => (async () => new Response(JSON.stringify(body), { status })) as typeof fetch;
  await assert.rejects(subscribeSeedAudio({ prompt: 'p' }, { apiKey: 'k', fetchFn: reject({ code: 45001125, message: 'audit' }, 400) }),
    (error: unknown) => error instanceof SeedAudioError && error.kind === 'content_rejected' && /review \(400, code 45001125\)/.test(error.message));
});

test('subscribeFalModel sends Seed Audio to the mainland API only when it is configured', async () => {
  const saved = { e: process.env.SEED_AUDIO_ENABLED, k: process.env.SEED_AUDIO_API_KEY, f: globalThis.fetch };
  try {
    process.env.SEED_AUDIO_ENABLED = 'true';
    process.env.SEED_AUDIO_API_KEY = 'sk';
    const seen: string[] = [];
    globalThis.fetch = (async (url: string) => { seen.push(String(url)); return new Response(JSON.stringify({ url: 'https://cdn.example.com/a.mp3', original_duration: 1 }), { status: 200 }); }) as typeof fetch;
    const result = await subscribeFalModel(AUDIO_SEED_AUDIO_MODEL_ID, { prompt: 'p', voice: 'zh_male_liufei_uranus_bigtts' });
    assert.deepEqual(seen, ['https://openspeech.bytedance.com/api/v3/tts/create']);
    assert.equal((result.data as any).audio.url, 'https://cdn.example.com/a.mp3');
  } finally {
    globalThis.fetch = saved.f;
    for (const [key, value] of [['SEED_AUDIO_ENABLED', saved.e], ['SEED_AUDIO_API_KEY', saved.k]] as const) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});

test('validation accepts a Doubao speaker and every listed Doubao voice has a label', () => {
  const valid = validateAudioGenerateRequest({
    pack: 'voice_only', voiceModel: 'seed', script: '欢迎使用。', language: 'chinese',
    seedAudioVoice: 'zh_female_vv_uranus_bigtts', locale: 'zh',
  } as never);
  assert.equal(valid.seedAudioVoice, 'zh_female_vv_uranus_bigtts');
  assert.throws(() => validateAudioGenerateRequest({ pack: 'voice_only', voiceModel: 'seed', script: 'x', seedAudioVoice: 'not_a_voice' } as never), /voice is invalid/i);
  assert.equal(AUDIO_DOUBAO_SEED_VOICE_VALUES.length, 20);
  for (const voice of AUDIO_DOUBAO_SEED_VOICE_VALUES) assert.ok(AUDIO_DOUBAO_SEED_VOICE_LABELS[voice], voice);
});

test('the selected T2A model is sent; requests without one keep speech-02-hd', () => {
  const pick = (model: string, extra: Record<string, unknown> = {}) => buildMinimaxSpeechRequest({ ...falInput, model, ...extra }) as Record<string, any>;
  assert.equal(pick('speech-2.8-hd').model, 'speech-2.8-hd');
  assert.equal(pick('speech-02-turbo').model, 'speech-02-turbo');
  assert.equal((buildMinimaxSpeechRequest(falInput) as Record<string, any>).model, 'speech-02-hd');
  assert.throws(() => pick('speech-01-hd'), /model is unsupported/);
  // fluent/whisper only reach speech-2.6-*; other models drop them and let the model choose.
  const emotion = (model: string, value: string) => pick(model, { voice_setting: { voice_id: 'x', emotion: value } }).voice_setting.emotion;
  assert.equal(emotion('speech-2.6-hd', 'whisper'), 'whisper');
  assert.equal(emotion('speech-2.8-hd', 'whisper'), undefined);
  assert.equal(emotion('speech-02-hd', 'fluent'), undefined);
  assert.equal(emotion('speech-2.8-turbo', 'calm'), 'calm');
  assert.throws(() => pick('speech-02-hd', { language_boost: 'Persian' }), /language/);
  assert.equal(pick('speech-2.8-hd', { language_boost: 'Persian' }).language_boost, 'Persian');
});

test('documented T2A limits are enforced before the request is sent', () => {
  const pick = (extra: Record<string, unknown>) => () => buildMinimaxSpeechRequest({ ...falInput, model: 'speech-2.8-hd', ...extra });
  assert.throws(pick({ text: 'a'.repeat(10_000) }), /1 to 9999/);
  assert.throws(pick({ text: '  ' }), /1 to 9999/);
  assert.throws(pick({ voice_setting: { voice_id: 'x', speed: 2.5 } }), /speed/);
  assert.throws(pick({ voice_setting: { voice_id: 'x', vol: 0 } }), /volume/);
  assert.doesNotThrow(pick({ voice_setting: { voice_id: 'x', vol: 10 } }));
  assert.throws(pick({ voice_setting: { voice_id: 'x', pitch: 1.5 } }), /pitch/);
  assert.throws(pick({ audio_setting: { sample_rate: 48000 } }), /sample rate/);
  assert.throws(pick({ audio_setting: { sample_rate: 44100, channel: 3 } }), /channel/);
});

test('rate limits: the local 20 RPM guard and MiniMax 1002/429 answers are reported as rate limited', async () => {
  const { resetMinimaxRateLimits, MINIMAX_RATE_LIMITS } = await import('../frontend/src/server/minimax-rate-limit');
  const { MinimaxSpeechError, MINIMAX_SPEECH_RATE_LIMIT_MARKER } = await import('../frontend/src/server/audio/providers/minimax-speech');
  assert.equal(MINIMAX_RATE_LIMITS.speech_t2a.requestsPerMinute, 20);
  resetMinimaxRateLimits();
  try {
    let calls = 0;
    const fetchFn = (async () => { calls += 1; return ok(); }) as typeof fetch;
    const now = 1_900_000_000_000;
    for (let index = 0; index < 20; index += 1) await subscribeMinimaxSpeech(falInput, { apiKey: 'k', fetchFn, now });
    const refused = await subscribeMinimaxSpeech(falInput, { apiKey: 'k', fetchFn, now: now + 1000 }).catch((error) => error);
    assert.ok(refused instanceof MinimaxSpeechError);
    assert.equal(refused.kind, 'rate_limited');
    assert.ok(refused.message.includes(MINIMAX_SPEECH_RATE_LIMIT_MARKER));
    assert.equal(refused.retryAfterMs, 59_000);
    assert.equal(calls, 20);
    await subscribeMinimaxSpeech(falInput, { apiKey: 'k', fetchFn, now: now + 60_001 });
    assert.equal(calls, 21);
    resetMinimaxRateLimits();
    for (const response of [
      new Response(JSON.stringify({ base_resp: { status_code: 1002, status_msg: 'rate limit' } }), { status: 200 }),
      new Response('{}', { status: 429 }),
    ]) {
      const error = await subscribeMinimaxSpeech(falInput, { apiKey: 'k', fetchFn: (async () => response) as typeof fetch }).catch((caught) => caught);
      assert.equal(error.kind, 'rate_limited');
      assert.ok(error.message.includes(MINIMAX_SPEECH_RATE_LIMIT_MARKER));
    }
  } finally {
    resetMinimaxRateLimits();
  }
});

test('the workspace model choice is validated, priced per model, and absent for MCP-shaped requests', async () => {
  const { buildAudioPricingPresentation } = await import('../frontend/src/lib/audio-generation');
  const { minimaxSpeechVendorCostUsdCents, countMinimaxBillingCharacters } = await import('../frontend/src/lib/minimax-speech-models');
  const valid = validateAudioGenerateRequest({ pack: 'voice_only', voiceModel: 'minimax', script: '你好 world', minimaxSpeechModel: 'speech-2.8-turbo' } as never);
  assert.equal(valid.minimaxSpeechModel, 'speech-2.8-turbo');
  const legacy = validateAudioGenerateRequest({ pack: 'voice_only', voiceModel: 'minimax', script: '你好 world' } as never);
  assert.equal('minimaxSpeechModel' in legacy, false);
  assert.throws(() => validateAudioGenerateRequest({ pack: 'voice_only', voiceModel: 'minimax', script: 'x', minimaxSpeechModel: 'speech-01-hd' } as never), /model is unsupported/);
  assert.throws(() => validateAudioGenerateRequest({ pack: 'voice_only', voiceModel: 'seed', script: 'x', minimaxSpeechModel: 'speech-2.8-hd' } as never), /model is unsupported/);

  assert.equal(countMinimaxBillingCharacters('你好 world'), 10);
  const script = '你好 world';
  const price = (minimaxSpeechModel?: string) => buildAudioPricingPresentation({ pack: 'voice_only', durationSec: 3, voiceModel: 'minimax', script, ...(minimaxSpeechModel ? { minimaxSpeechModel } : {}) } as never);
  // Historical speech-02-hd price is unchanged, also when chosen explicitly.
  assert.equal(price().vendorSubtotalCents, Array.from(script).length * 0.01);
  assert.equal(price('speech-02-hd').vendorSubtotalCents, price().vendorSubtotalCents);
  // PROVISIONAL CNY list prices: HD 3.50, Turbo 2.00 per 10,000 billing characters at 8 CNY/USD.
  assert.ok(Math.abs(price('speech-2.8-hd').vendorSubtotalCents - 10 * 3.5 / 10_000 * 100 / 8) < 1e-9);
  assert.ok(Math.abs(price('speech-2.8-turbo').vendorSubtotalCents - minimaxSpeechVendorCostUsdCents('speech-2.8-turbo', script).usdCents) < 1e-9);
  assert.equal(price('speech-2.6-turbo').meta.minimaxSpeechModel, 'speech-2.6-turbo');
  assert.equal('minimaxSpeechModel' in price().meta, false);
});

test('the voice-over draft defaults to speech-2.8-hd and repairs unknown stored models', async () => {
  const { newAudioDraft, repairAudioCreationDraft, buildAudioCreationRequest } = await import('../frontend/src/lib/audio-creation');
  const draft = newAudioDraft('voice');
  assert.equal(draft.minimaxSpeechModel, 'speech-2.8-hd');
  const repaired = repairAudioCreationDraft('voice', { ...draft, minimaxSpeechModel: 'speech-01-hd' as never });
  assert.equal(repaired.minimaxSpeechModel, 'speech-2.8-hd');
  const request = buildAudioCreationRequest('voice', { ...draft, voiceModel: 'minimax', script: 'x', minimaxSpeechModel: 'speech-2.6-hd' }, 'zh');
  assert.equal(request.minimaxSpeechModel, 'speech-2.6-hd');
  const seed = buildAudioCreationRequest('voice', { ...draft, voiceModel: 'seed', script: 'x' }, 'zh');
  assert.equal('minimaxSpeechModel' in seed, false);
});

test('fal never receives a newer T2A model when the mainland API is off', async () => {
  const saved = process.env.MINIMAX_SPEECH_ENABLED;
  try {
    delete process.env.MINIMAX_SPEECH_ENABLED;
    await assert.rejects(subscribeFalModel(AUDIO_MINIMAX_SPEECH_MODEL_ID, { ...falInput, model: 'speech-2.8-hd' }), /mainland MiniMax API/);
  } finally {
    if (saved === undefined) delete process.env.MINIMAX_SPEECH_ENABLED; else process.env.MINIMAX_SPEECH_ENABLED = saved;
  }
});
