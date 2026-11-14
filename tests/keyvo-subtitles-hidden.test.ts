// Keyvo 2026-11-14: Subtitles is hidden until a mainland speech-to-text route exists
// (the only route is ElevenLabs Scribe v2 on Fal; Keyvo has no FAL_KEY).
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CREATOR_TOOL_AVAILABILITY,
  getReleasedCreatorToolIds,
  isCreatorPublicPathAvailable,
  isCreatorToolPublic,
} from '../frontend/src/lib/toolbox/creator-availability';

test('subtitles is not released while the other creator tools stay released', () => {
  assert.equal(CREATOR_TOOL_AVAILABILITY.subtitles.publicReleased, false);
  assert.equal(isCreatorToolPublic('subtitles'), false);
  assert.equal(getReleasedCreatorToolIds().includes('subtitles'), false);
  for (const id of ['lip-sync', 'product-photo-editor', 'product-video-editor', 'motion-transfer'] as const) {
    assert.equal(isCreatorToolPublic(id), true, id);
  }
});

test('the public subtitles path is not offered to sitemap or discovery', () => {
  assert.equal(isCreatorPublicPathAvailable('/tools/subtitles'), false);
  assert.equal(isCreatorPublicPathAvailable('/tools/lip-sync'), true);
});
