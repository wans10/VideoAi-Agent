import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { startDisposablePostgres } from './helpers/disposable-postgres';

test('migration 98 adds nullable contact columns idempotently and the server helper writes only the owner row', { timeout: 120000 }, async (t) => {
  const pg = await startDisposablePostgres('contact-email');
  const previous = process.env.DATABASE_URL;
  process.env.DATABASE_URL = pg.databaseUrl;
  const db = await import('../frontend/src/lib/db');
  t.after(async () => {
    await db.getDb().end();
    if (previous === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previous;
    await pg.cleanup();
  });

  // Minimal profiles shape from migrations 00/03/04: the migration only adds to it.
  await pg.pool.query('CREATE TABLE profiles (id text PRIMARY KEY, synced_from_supabase boolean NOT NULL DEFAULT false, marketing_opt_in boolean, marketing_opt_in_at timestamptz)');
  await pg.pool.query("INSERT INTO profiles (id, marketing_opt_in) VALUES ('owner', true), ('other', false)");

  const migration = readFileSync('neon/migrations/98_profile_contact_email.sql', 'utf8');
  await pg.pool.query(migration);
  await pg.pool.query(migration);

  const columns = await pg.pool.query(
    "SELECT column_name, is_nullable, data_type FROM information_schema.columns WHERE table_name = 'profiles' AND column_name IN ('contact_email', 'contact_email_at') ORDER BY column_name"
  );
  assert.deepEqual(columns.rows, [
    { column_name: 'contact_email', is_nullable: 'YES', data_type: 'text' },
    { column_name: 'contact_email_at', is_nullable: 'YES', data_type: 'timestamp with time zone' },
  ]);
  const constraints = await pg.pool.query("SELECT conname FROM pg_constraint WHERE conname = 'profiles_contact_email_length_check'");
  assert.equal(constraints.rowCount, 1, 'the length check exists once after a re-run');

  const { saveProfileContactEmail, readProfileContactEmail } = await import('../frontend/server/contact-email');
  assert.equal(await readProfileContactEmail('owner'), null, 'existing profiles start without a contact email');
  assert.equal(await saveProfileContactEmail('owner', 'member.one@example.com'), 'member.one@example.com');
  assert.equal(await saveProfileContactEmail('owner', 'member.one@example.com'), 'member.one@example.com', 'the repeat is idempotent');
  assert.equal(await readProfileContactEmail('owner'), 'member.one@example.com');
  assert.equal(await readProfileContactEmail('other'), null, 'other accounts are untouched');

  const marketing = await pg.pool.query("SELECT id, marketing_opt_in FROM profiles WHERE id IN ('owner', 'other') ORDER BY id");
  assert.deepEqual(marketing.rows, [{ id: 'other', marketing_opt_in: false }, { id: 'owner', marketing_opt_in: true }], 'opt-in columns are not changed');

  await saveProfileContactEmail('new-user', 'new.user@example.com');
  assert.equal(await readProfileContactEmail('new-user'), 'new.user@example.com', 'a profile row is created when none exists yet');

  await assert.rejects(
    () => pg.pool.query("UPDATE profiles SET contact_email = 'x' WHERE id = 'owner'"),
    /profiles_contact_email_length_check/,
    'a value shorter than the minimum is rejected by the database'
  );
  await assert.rejects(
    () => pg.pool.query("UPDATE profiles SET contact_email = repeat('a', 255) WHERE id = 'owner'"),
    /profiles_contact_email_length_check/,
    'a value longer than 254 characters is rejected by the database'
  );
});
