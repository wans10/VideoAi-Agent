import assert from 'node:assert/strict';
import test from 'node:test';
import { startStudioAuthFixture, STUDIO_FIXTURE_OWNERS } from './helpers/studio-auth-fixture';

test('isolated admin identity API requires service credentials and preserves directory/detail contracts', async t => {
  const auth = await startStudioAuthFixture();
  t.after(() => auth.close());
  const headers = { authorization: `Bearer ${auth.serviceRoleKey}`, apikey: auth.serviceRoleKey };
  for (const rejected of [{}, { authorization: `Bearer ${auth.anonKey}`, apikey: auth.anonKey }, { authorization: `Bearer ${auth.createSession(STUDIO_FIXTURE_OWNERS[0]).access_token}`, apikey: auth.anonKey }]) {
    assert.equal((await fetch(`${auth.origin}/auth/v1/admin/users`, { headers: rejected })).status, 403);
  }
  const first = await fetch(`${auth.origin}/auth/v1/admin/users?page=1&per_page=2`, { headers });
  assert.equal(first.status, 200);
  const body = await first.json();
  assert.deepEqual(body.users.map((u: { id: string }) => u.id), [...STUDIO_FIXTURE_OWNERS]);
  assert.equal(body.total, 3);
  const second = await (await fetch(`${auth.origin}/auth/v1/admin/users?page=2&per_page=2`, { headers })).json();
  assert.equal(second.users.length, 1);
  const profile = await (await fetch(`${auth.origin}/auth/v1/admin/users/${STUDIO_FIXTURE_OWNERS[0]}`, { headers })).json();
  assert.equal(profile.id, STUDIO_FIXTURE_OWNERS[0]);
  assert.equal((await fetch(`${auth.origin}/auth/v1/admin/users/unknown`, { headers })).status, 404);
  assert.equal((await fetch(`${auth.origin}/auth/v1/admin/users/${profile.id}`, { headers: { apikey: auth.anonKey } })).status, 403);
});
