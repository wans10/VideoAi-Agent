import assert from 'node:assert/strict';
import test from 'node:test';
import {
  resolveWorkspaceEntryKind,
  shouldRestoreStoredPrompt,
} from '../frontend/app/(core)/(workspace)/app/_lib/workspace-prompt-entry';

test('only a reload or history traversal of the first workspace mount in a document resumes', () => {
  const resolve = (navigationType: string | null, firstEntryInDocument = true) =>
    resolveWorkspaceEntryKind({ navigationType, firstEntryInDocument });
  assert.equal(resolve('reload'), 'resume');
  assert.equal(resolve('back_forward'), 'resume');
  assert.equal(resolve('navigate'), 'fresh');
  assert.equal(resolve('prerender'), 'fresh');
  assert.equal(resolve(null), 'fresh');
  // Switching between the video, image and audio tabs mounts again in the same document: fresh, whatever the load was.
  assert.equal(resolve('reload', false), 'fresh');
});

test('a stored prompt returns only on resume, deep links or a guest creation carried over login', () => {
  const base = { signedIn: true, entry: 'fresh' as const, promptDeepLink: false };
  assert.equal(shouldRestoreStoredPrompt(base), false);
  assert.equal(shouldRestoreStoredPrompt({ ...base, entry: 'resume' }), true);
  assert.equal(shouldRestoreStoredPrompt({ ...base, promptDeepLink: true }), true);
  assert.equal(shouldRestoreStoredPrompt({ ...base, guestContinuation: true }), true);
  assert.equal(shouldRestoreStoredPrompt({ ...base, signedIn: false }), true);
});
