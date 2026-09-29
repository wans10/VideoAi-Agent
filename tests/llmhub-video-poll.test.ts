import assert from 'node:assert/strict';
import test from 'node:test';

import { runLlmhubVideoPoll } from '../frontend/server/llmhub-video-poll.ts';

function pendingJob() {
  return {
    job_id: 'job-1', user_id: 'user-1', engine_id: 'wan-3', engine_label: 'Wan 3',
    provider_job_id: 'task-1', status: 'queued', duration_sec: 5,
    thumb_url: 'https://media.maxvideoai.com/thumb.jpg', preview_video_url: null,
    keyframe_urls: null, aspect_ratio: '16:9', has_audio: false,
    final_price_cents: 100, pricing_snapshot: {},
    settings_snapshot: { core: { resolution: '720p', aspectRatio: '16:9' } },
    currency: 'CNY', payment_status: 'paid_wallet', created_at: new Date().toISOString(),
  };
}

test('LLM Hub completion copies authenticated MP4 and persists owned output', async () => {
  const sql: string[] = [];
  const writes: Array<{ sql: string; params?: unknown[] }> = [];
  const events: string[] = [];
  const queryFn = async (statement: string, params?: unknown[]) => {
    sql.push(statement);
    writes.push({ sql: statement, params });
    if (statement.includes('FROM app_jobs WHERE provider')) return [pendingJob()];
    if (statement.includes('SELECT pa.id')) return [];
    if (statement.includes('UPDATE app_jobs SET status')) return [{ job_id: 'job-1' }];
    return [];
  };
  const response = await runLlmhubVideoPoll({ deps: {
    queryFn: queryFn as never,
    client: {
      status: async () => ({ status: 'completed', progress: 100, raw: { status: 'completed' } }),
      content: async () => { events.push('download'); return new Response('mp4', { headers: { 'content-type': 'video/mp4' } }); },
    },
    claimFn: (async () => ({ checked: async () => {}, release: async () => {} })) as never,
    copyFn: (async () => { events.push('copy'); return 'https://media.maxvideoai.com/owned.mp4'; }) as never,
    metadataFn: (async () => ({ width: 1280, height: 720, durationSec: 5, fps: 24 })) as never,
    audioFn: (async () => true) as never,
    upsertOutputsFn: (async () => { events.push('outputs'); }) as never,
    previewFn: (async () => {}) as never,
    keyframesFn: (async () => {}) as never,
  } });
  assert.equal((await response.json()).updates, 1);
  assert.deepEqual(events, ['download', 'copy', 'outputs']);
  assert.ok(sql.some((statement) => statement.includes("status = 'completed'")));
  assert.equal(writes.find((write) => write.sql.includes("status = 'completed'"))?.params?.[5], true);
});

test('LLM Hub image generation accepts the source image ratio while checking resolution', async () => {
  const statements: string[] = [];
  const queryFn = async (sql: string) => {
    statements.push(sql);
    if (sql.includes('FROM app_jobs WHERE provider')) return [{
      ...pendingJob(),
      engine_id: 'seedance-2-5',
      settings_snapshot: { inputMode: 'i2v', core: { resolution: '480p', aspectRatio: '16:9', audio: null } },
    }];
    if (sql.includes('SELECT pa.id')) return [];
    if (sql.includes('UPDATE app_jobs SET status')) return [{ job_id: 'job-1' }];
    return [];
  };
  const response = await runLlmhubVideoPoll({ deps: {
    queryFn: queryFn as never,
    client: {
      status: async () => ({ status: 'completed', progress: 100, raw: {} }),
      content: async () => new Response('mp4', { headers: { 'content-type': 'video/mp4' } }),
    },
    claimFn: (async () => ({ checked: async () => {}, release: async () => {} })) as never,
    copyFn: (async () => 'https://media.maxvideoai.com/owned.mp4') as never,
    metadataFn: (async () => ({ width: 884, height: 464, durationSec: 5, fps: 24 })) as never,
    audioFn: (async () => true) as never,
    upsertOutputsFn: (async () => {}) as never,
    previewFn: (async () => {}) as never,
    keyframesFn: (async () => {}) as never,
  } });
  assert.equal((await response.json()).updates, 1);
  assert.ok(statements.some((sql) => sql.includes("status = 'completed'")));
  assert.equal(statements.some((sql) => sql.includes('INSERT INTO app_receipts')), false);
});

test('a completed task with temporarily unavailable content stays active for the next poll', async () => {
  let contentReads = 0;
  const statements: string[] = [];
  const queryFn = async (sql: string) => {
    statements.push(sql);
    if (sql.includes('FROM app_jobs WHERE provider')) return [pendingJob()];
    if (sql.includes('SELECT pa.id')) return [];
    if (sql.includes('UPDATE app_jobs SET status')) return [{ job_id: 'job-1' }];
    return [];
  };
  const deps = {
    queryFn: queryFn as never,
    client: {
      status: async () => ({ status: 'completed', progress: 100, raw: {} }),
      content: async () => {
        contentReads += 1;
        if (contentReads === 1) throw new Error('LLM Hub video content is unavailable (410).');
        return new Response('mp4', { headers: { 'content-type': 'video/mp4' } });
      },
    },
    claimFn: (async () => ({ checked: async () => {}, release: async () => {} })) as never,
    copyFn: (async () => 'https://media.maxvideoai.com/owned.mp4') as never,
    metadataFn: (async () => ({ width: 1280, height: 720, durationSec: 5, fps: 24 })) as never,
    audioFn: (async () => false) as never,
    upsertOutputsFn: (async () => {}) as never,
    previewFn: (async () => {}) as never,
    keyframesFn: (async () => {}) as never,
  };
  const originalWarn = console.warn;
  console.warn = () => {};
  try {
    assert.equal((await (await runLlmhubVideoPoll({ deps })).json()).updates, 0);
  } finally {
    console.warn = originalWarn;
  }
  assert.equal(statements.some((sql) => sql.includes("status = 'failed'")), false);
  assert.equal((await (await runLlmhubVideoPoll({ deps })).json()).updates, 1);
  assert.equal(contentReads, 2);
  assert.ok(statements.some((sql) => sql.includes("status = 'completed'")));
});

test('LLM Hub terminal failure records a CNY wallet refund', async () => {
  const writes: Array<{ sql: string; params?: unknown[] }> = [];
  const queryFn = async (sql: string, params?: unknown[]) => {
    writes.push({ sql, params });
    if (sql.includes('FROM app_jobs WHERE provider')) return [pendingJob()];
    if (sql.includes('SELECT pa.id')) return [];
    if (sql.includes('INSERT INTO app_receipts')) return [{ id: 'refund-1' }];
    if (sql.includes("SELECT id FROM app_receipts WHERE job_id")) return [{ id: 'refund-1' }];
    if (sql.includes('UPDATE app_jobs SET status')) return [{ job_id: 'job-1' }];
    return [];
  };
  const response = await runLlmhubVideoPoll({ deps: {
    queryFn: queryFn as never,
    client: {
      status: async () => ({ status: 'failed', progress: 0, raw: { status: 'failed' } }),
      content: async () => { throw new Error('content must not be fetched after failure'); },
    },
    claimFn: (async () => ({ checked: async () => {}, release: async () => {} })) as never,
  } });
  assert.equal((await response.json()).updates, 1);
  const refund = writes.find((write) => write.sql.includes('INSERT INTO app_receipts'));
  assert.equal(refund?.params?.[2], 'CNY');
  assert.ok(writes.some((write) => write.sql.includes("payment_status = 'refunded_wallet'")));
  assert.ok(writes.findIndex((write) => write.sql.includes('INSERT INTO app_receipts'))
    < writes.findIndex((write) => write.sql.includes("status = 'failed'")));
});

test('a refund write failure leaves the job active for a later poll', async () => {
  const writes: string[] = [];
  const response = await runLlmhubVideoPoll({ deps: {
    queryFn: (async (sql: string) => {
      writes.push(sql);
      if (sql.includes('FROM app_jobs WHERE provider')) return [pendingJob()];
      if (sql.includes('INSERT INTO app_receipts')) throw new Error('temporary database failure');
      return [];
    }) as never,
    client: {
      status: async () => ({ status: 'failed', progress: 0, raw: { status: 'failed' } }),
      content: async () => { throw new Error('unexpected content fetch'); },
    },
    claimFn: (async () => ({ checked: async () => {}, release: async () => {} })) as never,
  } });
  assert.equal((await response.json()).updates, 0);
  assert.equal(writes.some((sql) => sql.includes("status = 'failed'")), false);
});
