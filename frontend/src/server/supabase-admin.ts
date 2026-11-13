import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { normalizeAccountEmail } from '@/lib/account-identity';

type SupabaseAuthClient = SupabaseClient<Record<string, never>>;

let client: SupabaseAuthClient | null = null;

function isConfigured(): boolean {
  return Boolean((process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim() && (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim());
}

export function getSupabaseAdmin(): SupabaseAuthClient {
  if (!isConfigured()) {
    throw new Error('Supabase service role not configured');
  }
  if (!client) {
    client = createClient(
      String(process.env.NEXT_PUBLIC_SUPABASE_URL),
      String(process.env.SUPABASE_SERVICE_ROLE_KEY),
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );
  }
  return client;
}

export type UserIdentity = {
  id: string;
  /** Null for phone-only accounts (GoTrue returns an empty string for them). */
  email: string | null;
  /** E.164 digits without `+` as stored by GoTrue, or null. Mask before displaying. */
  phone: string | null;
  fullName: string | null;
};

export async function getUserIdentity(userId: string): Promise<UserIdentity | null> {
  if (!isConfigured()) return null;
  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.auth.admin.getUserById(userId);
    if (error || !data?.user) return null;
    const user = data.user;
    const email = normalizeAccountEmail(user.email);
    const phone = typeof user.phone === 'string' && user.phone.trim() ? user.phone.trim() : null;
    const fullName =
      typeof user.user_metadata?.full_name === 'string'
        ? user.user_metadata.full_name
        : typeof user.user_metadata?.name === 'string'
          ? user.user_metadata.name
          : null;
    return { id: user.id, email, phone, fullName };
  } catch (error) {
    console.warn('[supabase-admin] getUserIdentity failed', error instanceof Error ? error.message : error);
    return null;
  }
}
