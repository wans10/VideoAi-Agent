export type VerifiedOAuthSession = { userId: string; sessionId: string };

type OAuthLookupDeps = {
  supabaseUrl?: string;
  anonKey?: string;
  serviceRoleKey?: string;
  fetcher?: typeof fetch;
};

/** `email_verified` is the email claim; `phone_verified` is set only when a Keyvo phone is confirmed. */
export type OAuthIdentity = { id: string; email_verified: boolean; phone_verified?: true };

const isConfirmedAt = (value: unknown): boolean => typeof value === 'string' && value.trim().length > 0;

function identity(id: string, emailVerified: boolean, phoneVerified: boolean): OAuthIdentity {
  return phoneVerified ? { id, email_verified: emailVerified, phone_verified: true } : { id, email_verified: emailVerified };
}

/** Administrative record for the subject; any failure means "unavailable", never a thrown auth error. */
async function readAdministrativeContact(
  supabaseUrl: string,
  serviceRoleKey: string,
  sub: string,
  fetcher: typeof fetch,
): Promise<{ email: boolean; phone: boolean } | null> {
  try {
    const response = await fetcher(new URL(`/auth/v1/admin/users/${encodeURIComponent(sub)}`, supabaseUrl), {
      headers: { accept: 'application/json', apikey: serviceRoleKey, authorization: `Bearer ${serviceRoleKey}` },
      cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return null;
    const user: unknown = await response.json();
    if (!user || typeof user !== 'object' || Array.isArray(user)) return null;
    const { id, email_confirmed_at, phone_confirmed_at } = user as {
      id?: unknown; email_confirmed_at?: unknown; phone_confirmed_at?: unknown;
    };
    if (id !== sub) return null;
    return { email: isConfirmedAt(email_confirmed_at), phone: isConfirmedAt(phone_confirmed_at) };
  } catch {
    return null;
  }
}

export async function readOAuthUserInfo(
  accessToken: string,
  deps: OAuthLookupDeps = {},
): Promise<OAuthIdentity | null> {
  const supabaseUrl = deps.supabaseUrl ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = deps.anonKey ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl?.trim() || !anonKey?.trim()) return null;
  try {
    const response = await (deps.fetcher ?? fetch)(new URL('/auth/v1/oauth/userinfo', supabaseUrl), {
      headers: { accept: 'application/json', apikey: anonKey, authorization: `Bearer ${accessToken}` },
      cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return null;
    const info: unknown = await response.json();
    if (!info || typeof info !== 'object' || Array.isArray(info)) return null;
    const { sub, email_verified } = info as { sub?: unknown; email_verified?: unknown };
    if (typeof sub !== 'string' || !sub.trim()) return null;
    if (email_verified === true) return identity(sub, true, false);
    // UserInfo omits this claim without the email scope. Phone-only Keyvo accounts have no email, so
    // their confirmed phone (read from the administrative record) is the verified contact instead.
    const serviceRoleKey = deps.serviceRoleKey ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
    const record = serviceRoleKey?.trim()
      ? await readAdministrativeContact(supabaseUrl, serviceRoleKey, sub, deps.fetcher ?? fetch)
      : null;
    if (email_verified === undefined) {
      // Without the email claim the administrative record is the only source for email verification.
      if (!record) return null;
      return identity(sub, record.email, record.phone);
    }
    // An explicit false is authoritative for email; only a confirmed phone can still verify the contact.
    return identity(sub, false, record?.phone === true);
  } catch {
    return null;
  }
}

/** Called only after signature verification; never forwards the delegated token to an account endpoint. */
export async function hasActiveOAuthGrant(
  binding: VerifiedOAuthSession,
  clientId: string,
  deps: OAuthLookupDeps = {},
  requiredScopes: readonly string[] = [],
): Promise<boolean> {
  const supabaseUrl = deps.supabaseUrl ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = deps.serviceRoleKey ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl?.trim() || !serviceRoleKey?.trim()
    || !binding.userId?.trim() || !binding.sessionId?.trim() || !clientId.trim()) return false;
  try {
    const response = await (deps.fetcher ?? fetch)(new URL('/rest/v1/rpc/mcp_oauth_grant_is_active', supabaseUrl), {
      method: 'POST',
      headers: {
        accept: 'application/json', 'content-type': 'application/json',
        apikey: serviceRoleKey, authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        p_user_id: binding.userId, p_client_id: clientId, p_session_id: binding.sessionId,
        p_required_scopes: requiredScopes,
      }),
      cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(10_000),
    });
    return response.ok && await response.json() === true;
  } catch {
    return false;
  }
}
