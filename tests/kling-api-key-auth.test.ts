import assert from 'node:assert/strict';
import test from 'node:test';

import { KlingDirectClient } from '../frontend/src/server/video-providers/kling-direct/client.ts';
import { hasKlingCredentials } from '../frontend/src/server/video-providers/kling-direct/credentials.ts';
import { resolveVideoProviderRoutingPlan } from '../frontend/src/server/video-providers/router.ts';
import { resolveAgentGenerationModeExecutability } from '../frontend/src/server/agent-runtime/model-executability.ts';
import { getFalEngineById } from '../frontend/src/config/falEngines.ts';

const direct = {
  KLING_DIRECT_ENABLED: 'true',
  KLING_DIRECT_PUBLIC_ROUTING_ENABLED: 'true',
  KLING_DIRECT_ADMIN_ONLY: 'false',
};

test('credentials are an API Key, or both halves of the Access Key pair', () => {
  assert.equal(hasKlingCredentials({ KLING_API_KEY: 'k' }), true);
  assert.equal(hasKlingCredentials({ KLING_ACCESS_KEY: 'a', KLING_SECRET_KEY: 's' }), true);
  assert.equal(hasKlingCredentials({ KLING_ACCESS_KEY: 'a' }), false);
  assert.equal(hasKlingCredentials({ KLING_SECRET_KEY: 's' }), false);
  assert.equal(hasKlingCredentials({ KLING_API_KEY: '  ' }), false);
  assert.equal(hasKlingCredentials({}), false);
});

test('an API Key is the Bearer token as is, and is preferred over a key pair', async () => {
  const seen: string[] = [];
  const client = new KlingDirectClient({
    apiKey: 'api-key-xyz', accessKey: 'ak', secretKey: 'sk', baseUrl: 'https://api-beijing.klingai.com',
  });
  const original = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    seen.push(`${url} ${(init?.headers as Record<string, string>).Authorization}`);
    return Response.json({ code: 0, data: { task_id: 'task-1', task_status: 'submitted' } });
  }) as typeof fetch;
  try {
    await client.createTask({
      createPath: '/v1/videos/text2video', pollPathPrefix: '/v1/videos/text2video', body: { model_name: 'kling-v3', prompt: 'x' },
    } as Parameters<KlingDirectClient['createTask']>[0]);
  } finally { globalThis.fetch = original; }
  assert.deepEqual(seen, ['https://api-beijing.klingai.com/v1/videos/text2video Bearer api-key-xyz']);
});

test('without an API Key the Access Key pair still signs a JWT', async () => {
  let header = '';
  const client = new KlingDirectClient({ accessKey: 'ak', secretKey: 'sk', baseUrl: 'https://api-beijing.klingai.com' });
  const original = globalThis.fetch;
  globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
    header = (init?.headers as Record<string, string>).Authorization;
    return Response.json({ code: 0, data: { task_id: 't', task_status: 'submitted' } });
  }) as typeof fetch;
  try {
    await client.createTask({ createPath: '/v1/videos/text2video', pollPathPrefix: '/v1/videos/text2video', body: {} } as Parameters<KlingDirectClient['createTask']>[0]);
  } finally { globalThis.fetch = original; }
  assert.match(header, /^Bearer [\w-]+\.[\w-]+\.[\w-]+$/);
});

test('routing and executability accept an API Key alone', () => {
  const plan = (env: Record<string, string>) =>
    resolveVideoProviderRoutingPlan({ engineId: 'kling-3-pro', mode: 't2v', isAdmin: false, env } as Parameters<typeof resolveVideoProviderRoutingPlan>[0]);
  assert.equal(plan({ ...direct, KLING_API_KEY: 'k' }).kind, 'kling_direct_primary');
  assert.equal(plan({ ...direct, KLING_ACCESS_KEY: 'a', KLING_SECRET_KEY: 's' }).kind, 'kling_direct_primary');
  assert.equal(plan({ ...direct }).kind, 'fal_only');
  assert.equal(plan({ ...direct, KLING_ACCESS_KEY: 'a' }).kind, 'fal_only');

  const engine = getFalEngineById('kling-3-pro')!.engine;
  const decide = (providerEnv: Record<string, string>) => resolveAgentGenerationModeExecutability(
    engine, 't2v', { providerEnv, falApiKey: undefined, bytePlusEnabled: false } as Parameters<typeof resolveAgentGenerationModeExecutability>[2],
  );
  assert.equal(decide({ ...direct, KLING_API_KEY: 'k' }).executable, true);
  assert.equal(decide({ ...direct }).executable, false);
});
