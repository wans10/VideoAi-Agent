import { AgentApiError } from '@/server/agent-api/errors';
import type { AgentPrincipal } from '@/server/agent-api/principal';
import { readRequestBearerAccessToken } from '@/lib/request-auth';
import { readDeletionScheduledAt } from '@/lib/account-deletion-flag';
import { createSupabaseRouteClient } from '@/lib/supabase-ssr';
import { hasActiveOAuthGrant, readOAuthUserInfo, type VerifiedOAuthSession } from './oauth-session-validation';
export { hasActiveOAuthGrant } from './oauth-session-validation';
import { directoryOAuthResourcePolicy, satisfiesOAuthResourcePolicy, type McpAuthenticationContext, type OAuthResourcePolicy } from './oauth-resource-policy';
import {
  createDirectMcpAcquisition,
  type McpConnectionAcquisition,
} from '@/lib/mcp-acquisition';

export type OAuthClaims = {
  sub?: unknown;
  client_id?: unknown;
  session_id?: unknown;
  email_verified?: unknown;
  iss?: unknown;
  aud?: unknown;
  exp?: unknown;
  nbf?: unknown;
};

export type OAuthUser = {
  id: string;
  email_confirmed_at?: string | null;
  /** Phone sign-up accounts have no email; a confirmed phone is their verified contact. */
  phone_confirmed_at?: string | null;
  email_verified?: boolean;
  /** Set by the OAuth identity lookup when only the phone is confirmed (no email scope on the grant). */
  phone_verified?: boolean;

  user_metadata?: Record<string, unknown> | null;
  app_metadata?: Record<string, unknown> | null;
};

type OAuthAuthClient = {
  getClaims(accessToken: string): Promise<{
    data: { claims: OAuthClaims } | null;
    error: unknown;
  }>;
  getUser(accessToken: string, oauthClientId?: string): Promise<{
    data: { user: OAuthUser | null };
    error: unknown;
  }>;
};

export type OAuthAdapterDeps = {
  createAuthClient(): Promise<OAuthAuthClient>;
  hasActiveGrant(
    accessToken: string,
    clientId: string,
    requiredScopes: readonly string[] | undefined,
    binding: VerifiedOAuthSession,
  ): Promise<boolean>;
};

const defaultOAuthAdapterDeps: OAuthAdapterDeps = {
  async createAuthClient() {
    const supabase = await createSupabaseRouteClient();
    return {
      async getClaims(accessToken) {
        const result = await supabase.auth.getClaims(accessToken);
        return {
          data: result.data ? { claims: result.data.claims as OAuthClaims } : null,
          error: result.error,
        };
      },
      async getUser(accessToken, oauthClientId) {
        if (oauthClientId) {
          const user = await readOAuthUserInfo(accessToken);
          return { data: { user }, error: user ? null : authenticationRequired() };
        }
        const result = await supabase.auth.getUser(accessToken);
        const user = result.data.user;
        return {
          data: {
            user: user
              ? {
                  id: user.id,
                  email_confirmed_at: user.email_confirmed_at,
                  phone_confirmed_at: user.phone_confirmed_at,
                  identities: user.identities?.map((identity) => ({ provider: identity.provider })) ?? null,
                  app_metadata: user.app_metadata,
                }
              : null,
          },
          error: result.error,
        };
      },
    };
  },
  async hasActiveGrant(_accessToken, clientId, requiredScopes, binding) {
    return hasActiveOAuthGrant(binding, clientId, {}, requiredScopes);
  },
};

function isConfirmedAt(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function authenticationRequired(): AgentApiError {
  return new AgentApiError('AUTH_REQUIRED', 'Authentication required.');
}

async function resolveOAuthPrincipal(
  request: Request,
  deps: OAuthAdapterDeps,
  requireClientBinding: boolean,
  resourcePolicy?: OAuthResourcePolicy,
): Promise<AgentPrincipal> {
  const accessToken = readRequestBearerAccessToken(request);
  if (!accessToken) {
    throw authenticationRequired();
  }

  const auth = await deps.createAuthClient();
  const claimsResult = await auth.getClaims(accessToken);
  const subject =
    typeof claimsResult.data?.claims.sub === 'string'
      ? claimsResult.data.claims.sub.trim()
      : '';
  if (claimsResult.error || !subject) {
    throw authenticationRequired();
  }
  // getClaims verifies the signed token first. Resource policy never comes from
  // token fields, forwarded headers, tool arguments or editable user_metadata.
  if (resourcePolicy && !satisfiesOAuthResourcePolicy(claimsResult.data!.claims, resourcePolicy)) {
    throw authenticationRequired();
  }

  const rawClientId = claimsResult.data?.claims.client_id;
  const clientId = typeof rawClientId === 'string' && rawClientId.trim() ? rawClientId.trim() : null;
  if (requireClientBinding && !clientId) {
    throw authenticationRequired();
  }
  const rawSessionId = claimsResult.data?.claims.session_id;
  const sessionId = typeof rawSessionId === 'string' ? rawSessionId.trim() : '';
  if (clientId && !sessionId) throw authenticationRequired();
  // UserInfo validates the live OAuth identity. The service-only Auth lookup
  // independently checks consent, exact user/session/client binding and scopes.
  const userPromise = auth.getUser(accessToken, clientId ?? undefined);
  const activeGrantPromise = clientId
    ? deps.hasActiveGrant(accessToken, clientId, resourcePolicy?.requiredGrantScopes, { userId: subject, sessionId }).catch(() => false)
    : Promise.resolve(true);
  const [userResult, hasActiveGrant] = await Promise.all([
    userPromise,
    activeGrantPromise,
  ]);
  const user = userResult.data.user;
  if (userResult.error || !user || user.id !== subject) {
    throw authenticationRequired();
  }
  // An account in its deletion cooling-off cannot use MCP or API clients.
  if (readDeletionScheduledAt(user)) {
    throw authenticationRequired();
  }
  if (!hasActiveGrant) {
    throw authenticationRequired();
  }

  return {
    userId: subject,
    clientId,
    // `emailVerified` means "verified contact": a confirmed email, or a confirmed phone for
    // Keyvo phone-only accounts (they have no email to verify).
    emailVerified: user.email_verified === true || user.phone_verified === true || isConfirmedAt(user.email_confirmed_at) || isConfirmedAt(user.phone_confirmed_at),
    authMethod: 'oauth',
  };
}

export function resolveAgentPrincipal(
  request: Request,
  deps: OAuthAdapterDeps = defaultOAuthAdapterDeps,
): Promise<AgentPrincipal> {
  return resolveOAuthPrincipal(request, deps, false);
}

export function resolveMcpAgentPrincipal(
  request: Request,
  deps: OAuthAdapterDeps = defaultOAuthAdapterDeps,
  resourcePolicy?: OAuthResourcePolicy,
): Promise<AgentPrincipal> {
  return resolveOAuthPrincipal(request, deps, true, resourcePolicy);
}

export function resolveMcpRequestPrincipal(
  request: Request,
  context: McpAuthenticationContext,
  deps: OAuthAdapterDeps = defaultOAuthAdapterDeps,
  env: Readonly<Record<string, string | undefined>> = process.env,
): Promise<AgentPrincipal> {
  const policy = context.distributionProfile === 'openai-directory'
    ? directoryOAuthResourcePolicy(context.resourceUrl, env.NEXT_PUBLIC_SUPABASE_URL ?? '')
    : undefined;
  return resolveMcpAgentPrincipal(request, deps, policy);
}

export type AuthenticatedMcpConnection = {
  principal: AgentPrincipal;
  acquisition: McpConnectionAcquisition;
};

/**
 * Classifies a host connection only after the caller has resolved a normalized OAuth principal.
 * Task 7 will own any durable landing-acquisition binding; this seam never reads browser state.
 */
export function createDirectAuthenticatedMcpConnection(
  principal: AgentPrincipal,
): AuthenticatedMcpConnection {
  return {
    principal,
    acquisition: createDirectMcpAcquisition(),
  };
}
