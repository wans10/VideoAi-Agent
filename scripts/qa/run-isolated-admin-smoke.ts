import { spawn } from 'node:child_process';
import { startDisposablePostgres } from '../../tests/helpers/disposable-postgres';
import { startStudioAuthFixture, STUDIO_FIXTURE_OWNERS } from '../../tests/helpers/studio-auth-fixture';

async function run(command: string, args: string[], env: NodeJS.ProcessEnv) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { env, stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code, signal) => code === 0 ? resolve() : reject(new Error(`${command} exited ${code ?? signal}`)));
  });
}

async function main() {
  const database = await startDisposablePostgres('admin-smoke');
  try {
    const auth = await startStudioAuthFixture({ appOrigin: 'http://localhost:3001' });
    try {
      // Ignore caller credentials: this lane owns its disposable DB and loopback auth.
      const env = { ...process.env, DATABASE_URL: database.databaseUrl,
        DATABASE_URL_UNPOOLED: database.databaseUrl,
        NEXT_PUBLIC_SUPABASE_URL: auth.origin, NEXT_PUBLIC_SUPABASE_ANON_KEY: auth.anonKey,
        SUPABASE_SERVICE_ROLE_KEY: auth.serviceRoleKey, NEXT_PUBLIC_SITE_URL: 'http://localhost:3001',
        ADMIN_SMOKE_REQUIRE_USER_DIRECTORY: '1',
        SITE_URL: 'http://localhost:3001', COOKIE_DOMAIN: '', NEXT_PUBLIC_COOKIE_DOMAIN: '',
        LOCAL_ADMIN_BYPASS_USER_ID: STUDIO_FIXTURE_OWNERS[0],
        EXAMPLES_PLAYLIST_SLUG: 'examples',
        MIGRATIONS_DIR: `${process.cwd()}/neon/migrations` };
      await run('pnpm', ['exec', 'tsx', '--tsconfig', 'frontend/tsconfig.json', 'docker/scripts/bootstrap-schema.ts'], env);
      await run('bash', ['docker/scripts/migrate.sh'], env);
      await database.pool.query("INSERT INTO user_roles(user_id,role) VALUES($1,'admin') ON CONFLICT DO NOTHING", [STUDIO_FIXTURE_OWNERS[0]]);
      await database.pool.query(`INSERT INTO app_jobs(job_id,user_id,status,engine_id,engine_label,progress,surface,currency,payment_status,duration_sec,prompt,thumb_url)
        VALUES('admin-smoke-image',$1,'completed','nano-banana-lite','Nano Banana Lite',100,'image','USD','paid_wallet',1,'Isolated fixture','/assets/frames/thumb-1x1.svg')`, [STUDIO_FIXTURE_OWNERS[0]]);
      await database.pool.query(`INSERT INTO app_receipts(user_id,type,amount_cents,currency,job_id,description)
        VALUES($1,'charge',4,'USD','admin-smoke-image','Isolated admin image fixture')`, [STUDIO_FIXTURE_OWNERS[0]]);
      // Opening-board interactions need a connected video destination, not an image starter.
      await database.pool.query(`INSERT INTO playlists(slug,name,is_public) VALUES('examples','Isolated examples',TRUE),('family-wan','Isolated Wan family',TRUE)
        ON CONFLICT(slug) DO NOTHING`);
      await run('pnpm', ['exec', 'playwright', 'test', '-c', 'playwright.admin.config.ts'], env);
    } finally { await auth.close(); }
  } finally { await database.cleanup(); }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
