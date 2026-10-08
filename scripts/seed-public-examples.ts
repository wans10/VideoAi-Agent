/**
 * Seed public showcase examples, playlists, and playlist items into the application database.
 * Run with: DATABASE_URL='<connection-string>' npx tsx --tsconfig frontend/tsconfig.json scripts/seed-public-examples.ts
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Pool } from 'pg';
import type { PublicExamplesSnapshot } from '../frontend/server/local-public-examples-data';

const databaseUrl = process.env.DATABASE_URL_UNPOOLED?.trim() || process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.error('DATABASE_URL or DATABASE_URL_UNPOOLED is required.');
  process.exit(1);
}

const pool = new Pool({ connectionString: databaseUrl });

async function seed() {
  const jsonPath = resolve(__dirname, '../frontend/config/public-examples.json');
  const snapshot: PublicExamplesSnapshot = JSON.parse(readFileSync(jsonPath, 'utf8'));

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.info(`Seeding ${Object.keys(snapshot.cards).length} public example jobs...`);
    let jobsInserted = 0;

    for (const card of Object.values(snapshot.cards)) {
      const usd = card.priceLabel?.match(/^\$([\d,]+)\.(\d{2})$/);
      const finalPriceCents = usd ? Number(usd[1].replaceAll(',', '')) * 100 + Number(usd[2]) : null;
      const currency = usd ? 'USD' : null;

      await client.query(
        `
        INSERT INTO app_jobs (
          job_id, engine_id, engine_label, duration_sec, prompt,
          thumb_url, video_url, preview_video_url, aspect_ratio,
          has_audio, visibility, indexable, final_price_cents, currency,
          status, surface, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9,
          $10, 'public', TRUE, $11, $12,
          'completed', 'video', NOW(), NOW()
        )
        ON CONFLICT (job_id) DO UPDATE SET
          engine_id = EXCLUDED.engine_id,
          engine_label = EXCLUDED.engine_label,
          duration_sec = EXCLUDED.duration_sec,
          prompt = EXCLUDED.prompt,
          thumb_url = COALESCE(NULLIF(EXCLUDED.thumb_url, ''), app_jobs.thumb_url),
          video_url = COALESCE(NULLIF(EXCLUDED.video_url, ''), app_jobs.video_url),
          preview_video_url = COALESCE(NULLIF(EXCLUDED.preview_video_url, ''), app_jobs.preview_video_url),
          aspect_ratio = EXCLUDED.aspect_ratio,
          has_audio = EXCLUDED.has_audio,
          visibility = 'public',
          indexable = TRUE,
          final_price_cents = COALESCE(EXCLUDED.final_price_cents, app_jobs.final_price_cents),
          currency = COALESCE(EXCLUDED.currency, app_jobs.currency),
          updated_at = NOW()
        `,
        [
          card.id,
          card.engineIconId,
          card.engineLabel,
          card.durationSec,
          card.promptFull ?? card.prompt,
          card.rawPosterUrl ?? null,
          card.videoUrl ?? null,
          card.previewVideoUrl ?? null,
          card.aspectRatio ?? null,
          card.hasAudio,
          finalPriceCents,
          currency,
        ]
      );
      jobsInserted++;
    }

    console.info(`Seeded ${jobsInserted} jobs into app_jobs.`);

    // Seed playlists
    for (const [family, feed] of Object.entries(snapshot.feeds)) {
      const slug = family === '' ? 'marketing-examples' : `family-${family}`;
      const name = family === '' ? 'Showcase Examples' : `Family · ${family}`;

      const playlistRes = await client.query(
        `
        INSERT INTO playlists (slug, name, is_public, created_at, updated_at)
        VALUES ($1, $2, TRUE, NOW(), NOW())
        ON CONFLICT (slug) DO UPDATE SET
          name = EXCLUDED.name,
          is_public = TRUE,
          updated_at = NOW()
        RETURNING id
        `,
        [slug, name]
      );

      const playlistId = playlistRes.rows[0]?.id;
      if (!playlistId) continue;

      const videoIds = feed.playlist.length ? feed.playlist : feed['date-desc'];
      for (let i = 0; i < videoIds.length; i++) {
        const videoId = videoIds[i];
        await client.query(
          `
          INSERT INTO playlist_items (playlist_id, video_id, order_index, created_at)
          VALUES ($1, $2, $3, NOW())
          ON CONFLICT (playlist_id, video_id) DO UPDATE SET
            order_index = EXCLUDED.order_index
          `,
          [playlistId, videoId, i]
        );
      }
      console.info(`Seeded playlist "${slug}" with ${videoIds.length} items.`);
    }

    await client.query('COMMIT');
    console.info('Successfully finished seeding public examples and playlists.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to seed public examples:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
