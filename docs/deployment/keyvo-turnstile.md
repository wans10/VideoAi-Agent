# Checkout CAPTCHA (Turnstile) on Docker

Wallet and LLM Hub Pay top-ups go through one checkout guard (`frontend/server/checkout-guard.ts`,
limits in `checkout-guard-policy.ts`). Cloudflare Turnstile is its optional second factor. The
launch configuration is **no Turnstile variables at all**; this page records why, and the ways a
partial configuration breaks top-ups.

## Launch configuration: leave everything unset

Do not set any of `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`,
`TURNSTILE_LEGACY_SITE_KEY`, `TURNSTILE_SECONDARY_SITE_KEY`, `TURNSTILE_SECONDARY_SECRET_KEY`,
`TURNSTILE_WIDGET_MODE`, `CHECKOUT_CAPTCHA_MODE` or `TURNSTILE_DIAGNOSTICS_ENABLED`.
`.env.production.example` deliberately lists none of them.

With nothing set the configuration is `unconfigured`:

- Conditions that would ask for a CAPTCHA (a first top-up with a custom amount, or bursts of
  attempts) are allowed (`captcha_unconfigured_bypass`).
- The hard limits still apply and answer 429: 16 attempts per IP in 15 minutes, 6 per first-time
  user in 15 minutes, and 12 per returning user in one hour.

## What breaks the checkout (HTTP 403 `captcha_required`)

1. **A partial configuration.** Only a site key or only a secret, any legacy/secondary variable
   without the complete set, an unknown `TURNSTILE_WIDGET_MODE`, or `CHECKOUT_CAPTCHA_MODE=off`
   together with transition variables makes the configuration `invalid`. Every order is then
   refused, even below the limits.
2. **Configuring only the runtime.** `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is read by the browser bundle at
   build time (`BillingClient.tsx`) and by the server at run time. If the image was built without it
   but the server has the key and secret, no widget is rendered and a CAPTCHA-triggering order
   cannot be completed. `docker-build-push.yml` does not pass this build argument today.
3. **Reachability.** The widget script comes from `challenges.cloudflare.com`. Its behaviour from
   mainland China has not been tested.

## Enabling it later

1. Add the site key as a repository variable, pass it as a build argument in
   `.github/workflows/docker-build-push.yml`, and rebuild the image.
2. Set the same `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` at run time. Leave the
   other variables unset (the default `compatibility` mode with a single key pair).
3. Set `TURNSTILE_DIAGNOSTICS_ENABLED=1` temporarily and validate with the administrator
   diagnostic page. It never creates a payment session. Turn it off afterwards.
4. Test that the widget loads and passes on a mainland China network before relying on it.
