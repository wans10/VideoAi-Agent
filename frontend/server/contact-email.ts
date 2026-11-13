import { query } from '@/lib/db';

/**
 * Keyvo phone sign-up contact email (profiles.contact_email, migration 98). Stored in our own database
 * only: never written to GoTrue, never used as a login identity, not verified.
 */
export async function saveProfileContactEmail(userId: string, email: string): Promise<string> {
  const rows = await query<{ contact_email: string | null }>(
    `INSERT INTO profiles (id, contact_email, contact_email_at, synced_from_supabase)
     VALUES ($1, $2, NOW(), TRUE)
     ON CONFLICT (id)
     DO UPDATE SET contact_email = EXCLUDED.contact_email,
                   contact_email_at = EXCLUDED.contact_email_at
     RETURNING contact_email`,
    [userId, email]
  );
  return rows[0]?.contact_email ?? email;
}

export async function readProfileContactEmail(userId: string): Promise<string | null> {
  const rows = await query<{ contact_email: string | null }>(
    `SELECT contact_email FROM profiles WHERE id = $1 LIMIT 1`,
    [userId]
  );
  return rows[0]?.contact_email ?? null;
}
