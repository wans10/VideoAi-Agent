import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';

// Regression: while a generation is in flight the workspace preview flickered. A `jobs:status` event for a job that
// is not in the loaded feed yet triggers a revalidation; it used to call mutate(undefined, { revalidate: true }),
// which sets the SWR data to undefined until the refetch returns. Consumers that read the raw `data` (the image
// workspace history, the video workspace recent jobs) then rendered an empty feed for the duration of every refetch.
test('an unknown-job status event revalidates without ever emptying the loaded feed', async () => {
  const frontend = path.join(process.cwd(), 'frontend');
  const stubs: Record<string, string> = {
    '@/lib/authFetch': `export const authFetch = (url) => window.fixtureFetch(url);`,
    '@/lib/last-known': `export const readLastKnownUserId = () => window.fixtureUser; export const writeLastKnownUserId = (id) => { window.fixtureUser = id; };`,
    '@/lib/supabase-session-hint': `export const hasSupabaseAuthCookie = () => true;`,
    '@/lib/supabaseClient': `export const supabase = { auth: { getSession: async () => ({ data: { session: { user: { id: window.fixtureUser } } } }), onAuthStateChange: (fn) => { window.fixtureAuth = fn; return { data: { subscription: { unsubscribe() {} } } }; } } };`,
  };
  const bundle = await build({ absWorkingDir: frontend, bundle: true, format: 'iife', platform: 'browser', jsx: 'automatic', write: false,
    define: { 'process.env.NODE_ENV': '"test"', 'process.env.S3_PUBLIC_BASE_URL': '""', 'process.env.S3_BUCKET': '""', 'process.env.S3_REGION': '""' }, tsconfig: path.join(frontend, 'tsconfig.json'),
    plugins: [{ name: 'jobs-host-boundaries', setup(builder) {
      builder.onResolve({ filter: /.*/ }, (args) => args.path in stubs ? { path: args.path, namespace: 'fixture' } : undefined);
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, (args) => ({ contents: stubs[args.path], loader: 'js', resolveDir: frontend }));
    } }],
    stdin: { loader: 'tsx', resolveDir: frontend, contents: `
      import React, { act } from 'react';
      import { createRoot } from 'react-dom/client';
      import { SWRConfig } from 'swr';
      import { useInfiniteJobs } from './lib/api-jobs';
      window.IS_REACT_ACT_ENVIRONMENT = true;
      window.fixtureUser = 'account-a';
      window.requests = [];
      window.frames = [];
      window.releases = [];
      window.hold = false;
      window.fixtureFetch = async (url) => {
        window.requests.push(url);
        if (window.hold && String(url).startsWith('/api/jobs?')) await new Promise(resolve => { window.releases.push(resolve); });
        const jobs = String(url).startsWith('/api/jobs?') ? [{
          jobId: 'job-existing', surface: 'image', engineLabel: 'Fixture', durationSec: 0, prompt: 'existing',
          createdAt: '2026-09-07T12:00:00Z', status: 'completed', thumbUrl: 'https://example.invalid/a.png'
        }] : [];
        return { ok: true, status: 200, json: async () => ({ ok: true, jobs, nextCursor: null }) };
      };
      const cache = new Map();
      function Fixture() {
        const feed = useInfiniteJobs(24, { surface: 'image' });
        window.feed = feed;
        window.frames.push({ hasData: Boolean(feed.data), rawJobs: feed.data ? feed.data.flatMap(page => page.jobs).length : -1, stableJobs: feed.stableJobs.length });
        return null;
      }
      const root = createRoot(document.getElementById('root'));
      const render = () => root.render(<SWRConfig value={{ provider: () => cache, dedupingInterval: 0, shouldRetryOnError: false }}><Fixture /></SWRConfig>);
      window.fixture = { act, render, unmount() { root.unmount(); } };
    ` },
  });
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/app/image', runScripts: 'dangerously' });
  (dom.window as any).MessageChannel = class {
    port1 = { onmessage: () => {} };
    port2 = { postMessage: () => setTimeout(() => this.port1.onmessage(), 0) };
  };
  dom.window.eval(bundle.outputFiles[0].text);
  const w = dom.window as any;
  const settle = async () => { await w.fixture.act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); }); };
  try {
    await w.fixture.act(async () => w.fixture.render()); await settle();
    assert.equal(w.feed.stableJobs.length, 1, 'the existing job is loaded');
    assert.equal(w.frames[w.frames.length - 1].rawJobs, 1);
    const jobsRequestsBefore = w.requests.filter((url: string) => url.startsWith('/api/jobs?')).length;

    // A freshly accepted generation: its status event arrives before it is part of the loaded feed.
    w.hold = true;
    const framesBefore = w.frames.length;
    await w.fixture.act(async () => {
      w.dispatchEvent(new w.CustomEvent('jobs:status', { detail: { jobId: 'job-new', status: 'pending' } }));
      await new Promise(resolve => setTimeout(resolve, 20));
    });
    assert.ok(w.requests.filter((url: string) => url.startsWith('/api/jobs?')).length > jobsRequestsBefore, 'the unknown job still triggers a feed revalidation');
    assert.ok(w.releases.length > 0, 'the revalidation is in flight (held)');
    assert.ok(w.feed.data, 'raw feed data stays defined while the refetch is in flight');
    assert.equal(w.feed.data.flatMap((page: any) => page.jobs).length, 1, 'raw feed jobs stay visible while the refetch is in flight');
    assert.equal(w.feed.stableJobs.length, 1, 'stable jobs stay visible while the refetch is in flight');

    w.hold = false;
    await w.fixture.act(async () => { w.releases.splice(0).forEach((release: () => void) => release()); }); await settle();
    const duringAndAfter = w.frames.slice(framesBefore);
    assert.ok(duringAndAfter.length > 0);
    for (const frame of duringAndAfter) {
      assert.equal(frame.hasData, true, 'no render frame sees an undefined feed');
      assert.equal(frame.rawJobs, 1, 'no render frame sees an emptied feed');
      assert.equal(frame.stableJobs, 1);
    }
  } finally { await w.fixture.act(async () => w.fixture.unmount()); dom.window.close(); }
});
