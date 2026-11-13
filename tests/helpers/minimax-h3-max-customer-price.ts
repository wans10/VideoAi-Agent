import { readFileSync } from 'node:fs';

/**
 * MiniMax-H3-Max customer cents for an exact official vendor cost (USD cents). The H3-Max package (2026-11-12) keeps the
 * existing margin rule (default 30%, provider-reference-current: rounded up). The parallel Keyvo official-list rule
 * (owner decision 2026-11-13, profile `official-list-80` in config/pricing-policy.json) sells listed engines, including
 * H3-Max, at round(80% of the official list cost). The expectation follows whichever rule the policy file declares.
 */
export function h3MaxCustomerCents(exactVendorCents: number): number {
  const policy = JSON.parse(readFileSync('frontend/config/pricing-policy.json', 'utf8')) as { compatibilityProfiles: Array<{ id: string }> };
  return policy.compatibilityProfiles.some(({ id }) => id === 'official-list-80')
    ? Math.round(exactVendorCents * 0.8)
    : Math.ceil(exactVendorCents * 1.3 - 1e-9);
}
