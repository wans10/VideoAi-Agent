import assert from 'node:assert/strict';
import test from 'node:test';

import { KEYVO_MCP_TRIAL_DISABLED } from '../../frontend/config/keyvo-disabled-features';
import { getAgentAccountStatus } from '../../frontend/src/server/agent-api/account-status';
import { getTrialEligibility } from '../../frontend/src/server/agent-api/trial-eligibility';
import { resolveAgentPrincipal } from '../../frontend/src/server/mcp/oauth-adapter';

// Keyvo closed the MCP included trial (KEYVO_MCP_TRIAL_DISABLED): mainland users cannot reach the Claude/Codex hosts the
// server serves. The former end-to-end trial lifecycle (Seedance Mini cost ceiling, risk accounting, reservation and
// provider outcomes) can no longer run, because trial rows cannot be created: eligibility never offers one, confirmation
// refuses trial funding and the migration guard pins a different engine. Those paths stay covered at unit level by
// tests/mcp-trial-*.test.ts, whose dormant-machinery cases explicitly reopen the switch. This lane now pins the
// fail-closed behavior through the real OAuth principal and account-status services.
const ACCOUNT_URL = 'https://maxvideoai.com/account/connections';

async function oauthFixture(provider: 'email' | 'google', confirmed: boolean) {
  const userId = `t9-${provider}-${confirmed ? 'verified' : 'unverified'}`;
  return resolveAgentPrincipal(new Request('https://api.maxvideoai.com/mcp', {
    headers: { authorization: 'Bearer t9-local-fixture-token' },
  }), {
    async createAuthClient() {
      return {
        async getClaims() {
          return {
            data: { claims: { sub: userId, client_id: `t9-${provider}-client`, iat: 1_789_372_800 } },
            error: null,
          };
        },
        async getUser() {
          return {
            data: {
              user: {
                id: userId,
                email_confirmed_at: confirmed ? '2026-07-17T10:00:00Z' : null,
                identities: [{ provider }],
              },
            },
            error: null,
          };
        },
      };
    },
    async hasActiveGrant() {
      return true;
    },
  });
}

test('local OAuth fixtures normalize verified email and Google identities without claiming hosted signup', async () => {
  const email = await oauthFixture('email', true);
  const google = await oauthFixture('google', true);
  assert.deepEqual(email, {
    userId: 't9-email-verified', clientId: 't9-email-client',
    emailVerified: true, authMethod: 'oauth',
  });
  assert.deepEqual(google, {
    userId: 't9-google-verified', clientId: 't9-google-client',
    emailVerified: true, authMethod: 'oauth',
  });
  for (const provider of ['email', 'google'] as const) {
    const unverified = await oauthFixture(provider, false);
    assert.equal(unverified.emailVerified, false);
    assert.deepEqual(await getTrialEligibility(unverified, {
      featureEnabled: true,
      environmentEnabled: 'true',
      verificationUrl: ACCOUNT_URL,
    }), {
      status: 'verification_required',
      nextAction: { type: 'verify_email', url: ACCOUNT_URL },
    });
  }
});

test('local OAuth fixtures still normalize verified email and Google identities', async () => {
  const email = await oauthFixture('email', true);
  const google = await oauthFixture('google', true);
  assert.deepEqual(email, {
    userId: 't9-email-verified', clientId: 't9-email-client',
    emailVerified: true, authMethod: 'oauth',
  });
  assert.deepEqual(google, {
    userId: 't9-google-verified', clientId: 't9-google-client',
    emailVerified: true, authMethod: 'oauth',
  });
});

test('the included trial is closed for every principal even with the feature flag and environment on', async () => {
  assert.equal(KEYVO_MCP_TRIAL_DISABLED, true);
  for (const provider of ['email', 'google'] as const) {
    for (const confirmed of [true, false]) {
      const principal = await oauthFixture(provider, confirmed);
      const dependencies = {
        featureEnabled: true,
        environmentEnabled: 'true',
        verificationUrl: ACCOUNT_URL,
        async getAccountRestriction() { throw new Error('a closed trial must not read restrictions'); },
        async getEntitlement() { throw new Error('a closed trial must not read entitlements'); },
        async listPublicEngines() { throw new Error('a closed trial must not read the catalog'); },
      };
      assert.deepEqual(await getTrialEligibility(principal, dependencies), { status: 'disabled' });

      const status = await getAgentAccountStatus(principal, {
        async getWalletSummary() {
          return { balanceCents: 0, currency: 'USD', pendingCents: 0, hasCompletedTopUp: false };
        },
        accountUrl: ACCOUNT_URL,
        trialEligibilityDependencies: dependencies,
      });
      assert.deepEqual(status.trial, { status: 'disabled' });
    }
  }
});
