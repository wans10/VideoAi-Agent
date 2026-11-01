import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import * as React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { Job } from '../frontend/types/jobs';
import type { VideoGroup } from '../frontend/types/video-groups';
import type { SelectedVideoPreview } from '../frontend/src/lib/video-preview-group';
import {
  resolveActiveGroupId,
  resolveActiveVideoGroup,
  shouldDefaultToLatestPreview,
} from '../frontend/app/(core)/(workspace)/app/_lib/workspace-default-preview';
import { resolveImagePreviewEntry } from '../frontend/app/(core)/(workspace)/app/image/_lib/image-workspace-preview';
import type { HistoryEntry } from '../frontend/app/(core)/(workspace)/app/image/_lib/image-workspace-types';

const root = process.cwd();
const appDir = join(root, 'frontend/app/(core)/(workspace)/app');
const read = (...parts: string[]) => readFileSync(join(...parts), 'utf8');

// The owner's rule: a signed-in user opens the workspace on an EMPTY preview. Results appear when the user opens one
// from the rail, follows a deep link, or finishes a generation started here. Logged-out visitors keep their default.

function group(id: string, jobId: string): VideoGroup {
  return {
    id, provider: 'fal', layout: 'x1', status: 'ready', createdAt: '2026-10-30T10:00:00Z',
    items: [{ id: jobId, jobId, url: `/${jobId}.mp4`, aspect: '16:9' }],
  };
}
const groups = [group('g-new', 'job_new'), group('g-old', 'job_old')];

test('only a logged-out visitor defaults to the newest result; unresolved auth never does', () => {
  assert.equal(shouldDefaultToLatestPreview('loggedOut'), true);
  for (const status of ['authed', 'loading', 'unknown', '', null, undefined]) {
    assert.equal(shouldDefaultToLatestPreview(status), false, String(status));
  }
});

test('video: the active group stays empty until a group is chosen or started', () => {
  const none = { activeVideoGroups: groups, activeGroupId: null, selectedPreview: null, hasCompositeOverride: false };
  assert.equal(resolveActiveVideoGroup({ ...none, defaultToLatest: false }), null, 'signed-in entry is empty');
  assert.equal(resolveActiveVideoGroup({ ...none, defaultToLatest: true })?.id, 'g-new', 'logged-out keeps the default');
  // a generation started here (or a click in the rail) sets the active group
  assert.equal(resolveActiveVideoGroup({ ...none, activeGroupId: 'g-old', defaultToLatest: false })?.id, 'g-old');
  // a vanished active group falls back to nothing, not to the newest
  assert.equal(resolveActiveVideoGroup({ ...none, activeGroupId: 'g-gone', defaultToLatest: false }), null);
  assert.equal(resolveActiveVideoGroup({ ...none, activeGroupId: 'g-gone', defaultToLatest: true })?.id, 'g-new');
  // a deep link / opened result selects its group whatever the default is
  const selected = { id: 'job_old' } as SelectedVideoPreview;
  assert.equal(resolveActiveVideoGroup({ ...none, selectedPreview: selected, defaultToLatest: false })?.id, 'g-old');
  assert.equal(resolveActiveVideoGroup({ ...none, selectedPreview: { id: 'job_other' } as SelectedVideoPreview, defaultToLatest: true }), null);
  assert.equal(resolveActiveVideoGroup({ ...none, hasCompositeOverride: true, defaultToLatest: true }), null);
  assert.equal(resolveActiveVideoGroup({ ...none, activeVideoGroups: [], defaultToLatest: true }), null);
});

test('video: the automatic active-group choice no longer picks the newest for signed-in users', () => {
  const ids = ['g-new', 'g-old'];
  assert.equal(resolveActiveGroupId({ activeGroupId: null, groupIds: ids, defaultToLatest: false }), null);
  assert.equal(resolveActiveGroupId({ activeGroupId: null, groupIds: ids, defaultToLatest: true }), 'g-new');
  assert.equal(resolveActiveGroupId({ activeGroupId: 'g-old', groupIds: ids, defaultToLatest: false }), 'g-old');
  assert.equal(resolveActiveGroupId({ activeGroupId: 'g-old', groupIds: [], defaultToLatest: true }), null);
  assert.equal(resolveActiveGroupId({ activeGroupId: 'g-gone', groupIds: ids, defaultToLatest: false }), null);
});

const entry = (id: string, createdAt: number): HistoryEntry => ({
  id, jobId: id, engineId: 'engine', engineLabel: 'Engine', mode: 't2i', prompt: id, createdAt,
  description: null, images: [{ url: `/${id}.png`, width: 1, height: 1, mimeType: 'image/png' }], aspectRatio: '1:1',
} as unknown as HistoryEntry);

test('image: no selection means no preview for a signed-in user; a selection or new result shows', () => {
  const history = [entry('img_new', 2), entry('img_old', 1)];
  const base = { historyEntries: history, selectedPreviewEntryId: null, suppressDefaultPreview: false };
  assert.equal(resolveImagePreviewEntry({ ...base, defaultToLatestEntry: false }), undefined, 'signed-in entry is empty');
  assert.equal(resolveImagePreviewEntry({ ...base, defaultToLatestEntry: true })?.id, 'img_new', 'logged-out keeps the default');
  assert.equal(resolveImagePreviewEntry({ ...base, selectedPreviewEntryId: 'img_old', defaultToLatestEntry: false })?.id, 'img_old');
  // a generation started here: the runner adds the entry to local history and selects it
  const afterGeneration = [entry('img_fresh', 3), ...history];
  assert.equal(resolveImagePreviewEntry({ ...base, historyEntries: afterGeneration, selectedPreviewEntryId: 'img_fresh', defaultToLatestEntry: false })?.id, 'img_fresh');
  // a selection that no longer exists falls back to the default flag, never to the newest by accident
  assert.equal(resolveImagePreviewEntry({ ...base, selectedPreviewEntryId: 'img_gone', defaultToLatestEntry: false }), undefined);
  assert.equal(resolveImagePreviewEntry({ ...base, selectedPreviewEntryId: 'img_gone', defaultToLatestEntry: true })?.id, 'img_new');
  assert.equal(resolveImagePreviewEntry({ ...base, historyEntries: [], defaultToLatestEntry: true }), undefined);
});

test('image: the storyboard hand-off keeps the preview empty with or without the default', () => {
  const history = [entry('img_new', 2)];
  for (const defaultToLatestEntry of [false, true]) {
    assert.equal(resolveImagePreviewEntry({ historyEntries: history, selectedPreviewEntryId: null, suppressDefaultPreview: true, defaultToLatestEntry }), undefined);
    assert.equal(resolveImagePreviewEntry({ historyEntries: history, selectedPreviewEntryId: 'img_new', suppressDefaultPreview: true, defaultToLatestEntry })?.id, 'img_new');
  }
});

const pendingJobs: Job[] = ['job_a', 'job_b'].map((jobId, index) => ({
  jobId, engineLabel: 'MiniMax H3', durationSec: 5, prompt: 'fixture', status: 'pending', message: 'IN_PROGRESS',
  createdAt: `2026-10-30T10:0${index}:00.000Z`,
})) as Job[];

async function mountRenderState(authStatus: string | undefined, recentJobs: Job[]) {
  process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'https://maxvideoai-test.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'test-anon-key';
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/app' });
  const previous = new Map<string, PropertyDescriptor | undefined>();
  for (const [key, value] of Object.entries({
    window: dom.window, document: dom.window.document, navigator: dom.window.navigator,
    CustomEvent: dom.window.CustomEvent, React, IS_REACT_ACT_ENVIRONMENT: true, BroadcastChannel: undefined,
    fetch: () => new Promise<Response>(() => undefined),
  })) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  const { useWorkspaceRenderState } = await import('../frontend/app/(core)/(workspace)/app/_hooks/useWorkspaceRenderState');
  let state!: ReturnType<typeof useWorkspaceRenderState>;
  const engineIdByLabel = new Map<string, string>();
  const workspaceCopy = { messages: { seedanceCopyrightBlocked: 'Blocked', seedanceCopyrightBlockedRefunded: 'Refunded' } };
  function Fixture() {
    state = useWorkspaceRenderState({
      recentJobs, engineIdByLabel, provider: 'fal', storageScope: 'user', hydratedForScope: 'user', formIterations: 1,
      compositeOverride: null, compositeOverrideSummary: null, writeScopedStorage: () => undefined,
      workspaceCopy, uiLocale: 'en', authStatus,
    });
    return null;
  }
  const rootNode = createRoot(dom.window.document.getElementById('root')!);
  await act(async () => rootNode.render(React.createElement(Fixture)));
  return {
    get state() { return state; },
    async dispose() {
      await act(async () => rootNode.unmount()); dom.window.close();
      for (const [key, descriptor] of previous) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else Reflect.deleteProperty(globalThis, key);
      }
    },
  };
}

test('video hook: a signed-in user enters on an empty preview with the rail populated', async () => {
  for (const authStatus of ['authed', undefined]) {
    const fixture = await mountRenderState(authStatus, pendingJobs);
    try {
      assert.ok(fixture.state.activeVideoGroups.length > 0, 'the rail still has the history groups');
      assert.equal(fixture.state.activeGroupId, null);
      assert.equal(fixture.state.activeVideoGroup, null, `no default preview for ${String(authStatus)}`);
    } finally { await fixture.dispose(); }
  }
});

test('video hook: opening a group, a generation started here or a deep link selects it', async () => {
  const fixture = await mountRenderState('authed', pendingJobs);
  try {
    const [first, second] = fixture.state.activeVideoGroups;
    assert.ok(first && second);
    // clicking a rail item / the runner starting a generation both set the active group
    await act(async () => fixture.state.setActiveGroupId(second.id));
    assert.equal(fixture.state.activeVideoGroup?.id, second.id);
    // ?job=… / an opened result selects the preview, which wins over the active group
    await act(async () => fixture.state.setSelectedPreview({ id: first.items[0].jobId ?? first.items[0].id } as SelectedVideoPreview));
    assert.equal(fixture.state.activeVideoGroup?.id, first.id);
  } finally { await fixture.dispose(); }
});

test('video hook: a logged-out visitor keeps the default newest group', async () => {
  const fixture = await mountRenderState('loggedOut', pendingJobs);
  try {
    assert.ok(fixture.state.activeVideoGroup, 'the logged-out default is unchanged');
    assert.equal(fixture.state.activeVideoGroup?.id, fixture.state.activeVideoGroups[0].id);
  } finally { await fixture.dispose(); }
});

test('video hook: a pending render restored after a refresh stays visible for a signed-in user', async () => {
  const { convertJobToLocalRender } = await import('../frontend/app/(core)/(workspace)/app/_lib/workspace-render-status');
  const { serializePendingRenders } = await import('../frontend/app/(core)/(workspace)/app/_lib/render-persistence');
  const stored = serializePendingRenders([convertJobToLocalRender(pendingJobs[0])]);
  const fixture = await mountRenderState('authed', []);
  try {
    assert.equal(fixture.state.activeVideoGroup, null);
    await act(async () => fixture.state.hydratePendingRendersFromStorage(stored));
    assert.ok(fixture.state.activeGroupId, 'the stored pending render keeps its active group');
    assert.ok(fixture.state.activeVideoGroup, 'its in-progress state is still shown');
  } finally { await fixture.dispose(); }
});

test('the wiring: the server, the draft hydration and the remembered-preview restore no longer default for signed-in users', () => {
  // server: no latest-job query for a signed-in user
  const initialPreview = read(root, 'frontend/src/server/app-initial-preview.ts');
  assert.doesNotMatch(initialPreview, /FROM app_jobs/, 'the signed-in latest job is not queried');
  assert.match(initialPreview, /if \(userId\) return null;/);
  assert.match(initialPreview, /resolveStarterInitialPreview\(\)/, 'logged-out visitors keep the starter sample');
  // draft hydration: the "select the newest job" effect is gated on the logged-out default
  const draftHydration = read(appDir, '_hooks/useWorkspaceDraftHydration.ts');
  assert.match(draftHydration, /const defaultToLatestPreview = shouldDefaultToLatestPreview\(authStatus\);/);
  assert.match(draftHydration, /if \(!defaultToLatestPreview\) return;\s*\n\s*if \(selectedPreview \|\| rendersLength > 0\) return;/);
  // remembered preview restore only for the public (logged-out) scope
  const videoSettings = read(appDir, '_hooks/useWorkspaceVideoSettings.ts');
  assert.match(videoSettings, /if \(accountScope !== 'public'\) return;/);
  // the route passes the auth status to the render state; the image route passes the server-derived account
  assert.match(read(appDir, 'AppClient.tsx'), /authStatus: app\.authStatus,\s*\n\s*\}\);\s*\n\s*const activeDraft/);
  assert.match(read(appDir, 'image/ImageWorkspace.tsx'), /defaultToLatestEntry: !accountId/);
  assert.match(read(appDir, 'image/_hooks/useImageWorkspaceDisplayState.ts'), /defaultToLatestEntry = false/);
});
