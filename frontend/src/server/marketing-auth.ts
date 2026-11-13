import { createSupabaseServerClient } from '@/lib/supabase-ssr';
import { isUserAdmin } from '@/server/admin';
import { resolveAccountDisplayLabel } from '@/lib/account-identity';

export type MarketingAuthSnapshot = {
  /** Display label: the email, or the masked phone for phone-only accounts. */
  email: string | null;
  isAdmin: boolean;
};

export async function getMarketingAuthSnapshot(): Promise<MarketingAuthSnapshot> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = user?.id ?? null;
    const email = resolveAccountDisplayLabel(user);
    if (!userId) {
      return { email: null, isAdmin: false };
    }
    return {
      email,
      isAdmin: await isUserAdmin(userId),
    };
  } catch {
    return { email: null, isAdmin: false };
  }
}
export async function hasMarketingNavigationSession(): Promise<boolean> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getSession();
    return !error && Boolean(data.session?.access_token);
  } catch {
    return false;
  }
}
