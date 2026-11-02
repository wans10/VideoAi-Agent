import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test, { afterEach } from 'node:test';
import { NextRequest } from 'next/server';
import { resolveAgentGenerationModeExecutability } from '../frontend/src/server/agent-runtime/model-executability';
import { createEnginesGetHandler } from '../frontend/app/api/engines/_lib/engines-get-handler';
import { getBaseEnginesByCategory } from '../frontend/src/lib/engines';
import {
  filterExecutableWorkspaceEngines,
  reportHiddenWorkspaceEngines,
  resetHiddenWorkspaceEngineLogForTests,
  type WorkspaceModeExecutability,
} from '../frontend/src/server/workspace-engine-availability';
import type { EngineCaps } from '../frontend/types/engines';

const SECRET = 'sk-test-secret-value-1234567890';
const ENVIRONMENT = {
  bytePlusEnabled: false,
  bytePlusApiKey: SECRET,
  providerEnv: { LLMHUB_API_KEY: SECRET, GOOGLE_VERTEX_SERVICE_ACCOUNT_JSON: SECRET },
};

const videoEngines = getBaseEnginesByCategory('video');
const engineById = (id: string): EngineCaps => {
  const engine = videoEngines.find((candidate) => candidate.id === id);
  assert.ok(engine, `expected engine ${id} in the registry`);
  return engine;
};

const available = { executable: true, reason: 'available' } as const;
const missing = { executable: false, reason: 'provider_credentials_missing' } as const;

afterEach(() => resetHiddenWorkspaceEngineLogForTests());

function captureConsole(method: 'info' | 'warn' | 'error', run: () => void | Promise<void>) {
  const lines: string[] = [];
  const original = console[method];
  console[method] = (...args: unknown[]) => { lines.push(args.map(String).join(' ')); };
  const done = () => { console[method] = original; return lines; };
  try {
    const result = run();
    if (result && typeof (result as Promise<void>).then === 'function') {
      return (result as Promise<void>).then(done, (error) => { done(); throw error; });
    }
  } catch (error) {
    done();
    throw error;
  }
  return Promise.resolve(done());
}

test('an engine with a runnable mode is kept and an engine without credentials is hidden with its reason', () => {
  const veo = engineById('veo-3-1');
  const kling = engineById('kling-3-pro');
  const resolve: WorkspaceModeExecutability = (engine) => (engine.id === kling.id ? missing : available);
  const result = filterExecutableWorkspaceEngines([veo, kling], { environment: ENVIRONMENT, resolve });
  assert.deepEqual(result.engines.map((engine) => engine.id), ['veo-3-1']);
  assert.deepEqual(result.hidden, [{ id: 'kling-3-pro', reason: 'provider_credentials_missing' }]);
  assert.equal(result.noneExecutable, false);
});

test('an engine is projected to the modes that can run, with matching modeCaps', () => {
  const engine = videoEngines.find((candidate) => candidate.modes.length > 1 && candidate.modeCaps);
  assert.ok(engine, 'expected a multi-mode engine with modeCaps');
  const [firstMode] = engine.modes;
  const resolve: WorkspaceModeExecutability = (_engine, mode) => (mode === firstMode ? available : missing);
  const result = filterExecutableWorkspaceEngines([engine], { environment: ENVIRONMENT, resolve });
  assert.deepEqual(result.engines[0].modes, [firstMode]);
  assert.deepEqual(Object.keys(result.engines[0].modeCaps ?? {}), engine.modeCaps?.[firstMode] ? [firstMode] : []);
  assert.ok(engine.modes.length > 1, 'the original engine object is not mutated');
});

test('engines that publish their own per-mode availability keep every mode', () => {
  const engine = videoEngines.find((candidate) => candidate.modes.length > 1);
  assert.ok(engine);
  const [firstMode] = engine.modes;
  const resolve: WorkspaceModeExecutability = (_engine, mode) => (mode === firstMode ? available : missing);
  const result = filterExecutableWorkspaceEngines([engine], {
    environment: ENVIRONMENT,
    resolve,
    keepAllModes: () => true,
  });
  assert.deepEqual(result.engines[0].modes, engine.modes);
});

test('a failing check keeps the engine listed and reports only its id', () => {
  const engine = engineById('veo-3-1');
  const reported: string[] = [];
  const result = filterExecutableWorkspaceEngines([engine], {
    environment: ENVIRONMENT,
    resolve: () => { throw new Error(`boom ${SECRET}`); },
    onCheckError: (id) => reported.push(id),
  });
  assert.deepEqual(result.engines.map((candidate) => candidate.id), ['veo-3-1']);
  assert.deepEqual(reported, ['veo-3-1']);
  assert.equal(result.hidden.length, 0);
});

test('a list that would become empty is returned unfiltered instead of leaving the picker with nothing', () => {
  const engines = [engineById('veo-3-1'), engineById('kling-3-pro')];
  const result = filterExecutableWorkspaceEngines(engines, { environment: ENVIRONMENT, resolve: () => missing });
  assert.equal(result.noneExecutable, true);
  assert.deepEqual(result.engines.map((engine) => engine.id), ['veo-3-1', 'kling-3-pro']);
  assert.equal(result.hidden.length, 2);
});

test('the diagnostic line lists engine ids with reasons, never secrets, once per interval', async () => {
  const hidden = [
    { id: 'kling-3-pro', reason: 'provider_credentials_missing' },
    { id: 'minimax-h3', reason: 'provider_disabled' },
  ];
  const lines = await captureConsole('info', () => {
    assert.equal(reportHiddenWorkspaceEngines('video', { hidden, noneExecutable: false }, 1_000), true);
    assert.equal(reportHiddenWorkspaceEngines('video', { hidden, noneExecutable: false }, 1_000 + 9 * 60_000), false);
    assert.equal(reportHiddenWorkspaceEngines('image', { hidden, noneExecutable: false }, 1_000 + 9 * 60_000), true);
    assert.equal(reportHiddenWorkspaceEngines('video', { hidden, noneExecutable: false }, 1_000 + 10 * 60_000), true);
    assert.equal(reportHiddenWorkspaceEngines('video', { hidden: [], noneExecutable: false }, 1_000 + 30 * 60_000), false);
  });
  assert.equal(lines.length, 3);
  assert.equal(
    lines[0],
    '[engines] hidden in the workspace picker (video): kling-3-pro(provider_credentials_missing), minimax-h3(provider_disabled) [non-admin view: models whose route is admin-only are hidden; admins see them]',
  );
  assert.ok(lines.every((line) => !line.includes(SECRET)));
});

function handlerWith(overrides: Parameters<typeof createEnginesGetHandler>[0]) {
  return createEnginesGetHandler({
    resolveLaunchCanaryRequestContext: async () => null,
    fetchEngineAverageDurations: async () => [],
    loadAppEngineScoreMap: async () => ({}),
    getGenerationEnvironment: () => ENVIRONMENT,
    resolveIsAdmin: async () => false,
    ...overrides,
  });
}

const enginesRequest = (query = 'category=video') => new NextRequest(`https://app.keyvo.cn/api/engines?${query}`);

test('the workspace API no longer hides the Veo family and drops engines whose provider is not configured', async () => {
  const veo = engineById('veo-3-1');
  const omni = engineById('gemini-omni-flash');
  const kling = engineById('kling-3-pro');
  const lines: string[] = [];
  const original = console.info;
  console.info = (...args: unknown[]) => { lines.push(args.map(String).join(' ')); };
  try {
    const response = await handlerWith({
      getPublicConfiguredEnginesByCategory: async () => [veo, omni, kling],
      resolveModeExecutability: (engine) => (engine.id === 'kling-3-pro' ? missing : available),
    })(enginesRequest());
    const body = await response.json() as { engines: EngineCaps[] };
    assert.deepEqual(body.engines.map((engine) => engine.id).sort(), ['gemini-omni-flash', 'veo-3-1']);
  } finally {
    console.info = original;
  }
  assert.equal(lines.length, 1);
  assert.match(lines[0], /^\[engines\] hidden in the workspace picker \(video\): kling-3-pro\(provider_credentials_missing\) \[non-admin view[^\]]*\]$/);
  assert.ok(!lines[0].includes(SECRET));
});

test('the degraded fallback applies the same availability rule', async () => {
  const wan = engineById('wan-3');
  const calls: string[] = [];
  const errors = await captureConsole('error', async () => {
    const response = await handlerWith({
      getPublicConfiguredEnginesByCategory: async () => { throw new Error('database unavailable'); },
      resolveModeExecutability: (engine) => { calls.push(engine.id); return engine.id === wan.id ? available : missing; },
    })(enginesRequest());
    const body = await response.json() as { engines: EngineCaps[]; degraded?: boolean };
    assert.equal(body.degraded, true);
    assert.deepEqual(body.engines.map((engine) => engine.id), ['wan-3']);
  });
  assert.equal(errors.length, 1);
  assert.ok(calls.length > 1, 'every base engine was checked');
});

test('the video and image pickers share one availability rule and the family filter is gone', () => {
  const handler = readFileSync('frontend/app/api/engines/_lib/engines-get-handler.ts', 'utf8');
  const imagePage = readFileSync('frontend/app/(core)/(workspace)/app/image/page.tsx', 'utf8');
  assert.doesNotMatch(handler, /isKeyvoVisibleFamily|isKeyvoWorkspaceEngine/);
  assert.match(handler, /filterExecutableWorkspaceEngines/);
  assert.match(imagePage, /filterExecutableWorkspaceEngines/);
  assert.match(imagePage, /reportHiddenWorkspaceEngines\('image'/);
  assert.match(imagePage, /resolveWorkspaceViewerIsAdmin/);
  assert.match(handler, /resolveIsAdmin/);
});

const FAKE_SERVICE_ACCOUNT = JSON.stringify({
  client_email: 'svc@example.iam.gserviceaccount.com',
  private_key: 'not-a-real-key',
  project_id: 'example-project',
});

function veoEnvironment(flags: Record<string, string>) {
  return {
    ...ENVIRONMENT,
    providerEnv: {
      GOOGLE_VERTEX_VEO_ENABLED: 'true',
      GOOGLE_VERTEX_PROJECT_ID: 'example-project',
      GOOGLE_VERTEX_SERVICE_ACCOUNT_JSON: FAKE_SERVICE_ACCOUNT,
      ...flags,
    },
  };
}

async function listedIds(isAdmin: boolean, flags: Record<string, string>) {
  const veo = engineById('veo-3-1');
  const response = await handlerWith({
    getPublicConfiguredEnginesByCategory: async () => [veo],
    getGenerationEnvironment: () => veoEnvironment(flags),
    resolveModeExecutability: resolveAgentGenerationModeExecutability,
    resolveIsAdmin: async () => isAdmin,
  })(enginesRequest());
  const body = await response.json() as { engines: EngineCaps[] };
  return body.engines.map((engine) => engine.id);
}

test('an admin-only route is listed for admins and hidden from everyone else', async () => {
  const flags = { GOOGLE_VERTEX_VEO_ADMIN_ONLY: 'true', GOOGLE_VERTEX_VEO_PUBLIC_ROUTING_ENABLED: 'false' };
  const info = console.info;
  const warn = console.warn;
  console.info = () => {};
  console.warn = () => {};
  try {
    // With nothing else listed the member list would be empty and fail open, so add a runnable engine beside it.
    const wan = engineById('wan-3');
    const run = async (isAdmin: boolean) => {
      const response = await handlerWith({
        getPublicConfiguredEnginesByCategory: async () => [engineById('veo-3-1'), wan],
        getGenerationEnvironment: () => veoEnvironment(flags),
        resolveModeExecutability: (engine, mode, environment, options) => engine.id === wan.id
          ? available
          : resolveAgentGenerationModeExecutability(engine, mode, environment, options),
        resolveIsAdmin: async () => isAdmin,
      })(enginesRequest());
      return (await response.json() as { engines: EngineCaps[] }).engines.map((engine) => engine.id).sort();
    };
    assert.deepEqual(await run(false), ['wan-3']);
    assert.deepEqual(await run(true), ['veo-3-1', 'wan-3']);
  } finally {
    console.info = info;
    console.warn = warn;
  }
});

test('a publicly routed model is listed for admins and members alike', async () => {
  const flags = { GOOGLE_VERTEX_VEO_ADMIN_ONLY: 'false', GOOGLE_VERTEX_VEO_PUBLIC_ROUTING_ENABLED: 'true' };
  assert.deepEqual(await listedIds(false, flags), ['veo-3-1']);
  assert.deepEqual(await listedIds(true, flags), ['veo-3-1']);
});

test('a failing admin lookup falls back to the member list', async () => {
  const flags = { GOOGLE_VERTEX_VEO_ADMIN_ONLY: 'true', GOOGLE_VERTEX_VEO_PUBLIC_ROUTING_ENABLED: 'false' };
  const veo = engineById('veo-3-1');
  const wan = engineById('wan-3');
  const response = await handlerWith({
    getPublicConfiguredEnginesByCategory: async () => [veo, wan],
    getGenerationEnvironment: () => veoEnvironment(flags),
    resolveModeExecutability: (engine, mode, environment, options) => engine.id === wan.id
      ? available
      : resolveAgentGenerationModeExecutability(engine, mode, environment, options),
    resolveIsAdmin: async () => { throw new Error('session lookup failed'); },
  })(enginesRequest());
  const body = await response.json() as { engines: EngineCaps[] };
  assert.deepEqual(body.engines.map((engine) => engine.id), ['wan-3']);
});

test('Qwen image engines are executable with a Beijing Model Studio key and hidden without one', () => {
  const qwen = getBaseEnginesByCategory('image').find((engine) => engine.providerMeta?.provider === 'alibaba_qwen_image');
  assert.ok(qwen, 'expected a Qwen image engine in the registry');
  const withEnv = (providerEnv: Record<string, string>) =>
    resolveAgentGenerationModeExecutability(qwen, 't2i', { bytePlusEnabled: false, providerEnv });
  assert.deepEqual(
    withEnv({ ALIBABA_MODEL_STUDIO_API_KEY: SECRET, ALIBABA_MODEL_STUDIO_BASE_URL: 'https://dashscope.aliyuncs.com' }),
    available,
  );
  assert.deepEqual(withEnv({ ALIBABA_MODEL_STUDIO_API_KEY: SECRET }), missing);
  assert.deepEqual(withEnv({}), missing);
});
