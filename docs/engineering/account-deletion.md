# Account deletion and data export (Keyvo)

Owner decision (China PIPL): every customer, whether a phone-only account or a legacy email account, can
export their data and delete their account. This guide owns the policy, the data inventory, the request and
purge flows, scheduling and the dry run. Read it before touching `frontend/server/account-privacy.ts`,
`account-purge*.ts`, `app/api/account/**` or the settings privacy tab.

## Policy

- **Request**: Settings > 隐私与安全 > 注销账号. The user types `注销` and re-enters the password (the SMS
  sign-up flow forces a password, so every account has one; users who forgot it reset it through the SMS login
  first). The password is verified server side with Supabase Auth on a throwaway client.
- **Refused while the wallet balance is above zero** (any currency), with a zh message telling the user to use
  the balance or contact support for a refund. There is no refund flow in this feature.
- **15-day cooling-off.** The request sets `profiles.marked_for_deletion_at`, mirrors the instant into the
  Supabase user's `app_metadata.keyvo_deletion_scheduled_at`, records an `account_privacy_events` row, revokes
  all sessions (admin global sign-out) and returns the purge date (`marked + 15 days`).
- During the cooling-off the user cannot use the product. Signing in again lands on `/account/deletion`
  ("账号已申请注销") with the purge date, **Cancel deletion**, **Export my data** and **Sign out**.
- After 15 days the purge job erases personal data. Payment, order, receipt and wallet-ledger records are kept
  with personal identifiers removed; the user id stays only as an opaque id.

## Guard (fail closed, no extra round trip)

`getRouteAuthContext(req, options)` in `frontend/src/lib/supabase-ssr.ts` already validates the session with
Supabase Auth (`getUser`). The same response carries `app_metadata`, so a flagged account is returned as
**signed out** (`userId: null`) to every route, including generation, checkout and top-up. Only routes passing
`{ allowScheduledDeletion: true }` see the user: `/api/account/delete`, `/delete/cancel`, `/delete/status` and
`/api/account/export` (sign-out never needed auth). `middleware.ts` redirects flagged page requests (protected
prefixes) to `/account/deletion`. A token that survives revocation is therefore still useless.
The flag is written to Auth only after the database flag; if the Auth write fails the database flag is rolled
back and the user can retry. Do not add routes with the allowance without a security review.

## Export

`POST /api/account/export` (rate limit: one per 10 minutes per user, durable via `account_privacy_events`
with an in-memory fallback) builds a gzip JSON with `buildDsarPayload` (`frontend/server/dsar.ts`): account id,
email, phone (full number, to its owner), name, profile (marketing consent, ToS/privacy/cookie versions, age
confirmation), preferences, consents (including IP and user agent held about the user), wallet balances,
receipts (customer-facing fields only), generation history with prompts and media URLs, and the media asset
list. Lists are capped at 2000 rows (`limits.truncated` names any capped list). It never selects provider ids,
costs, vendor accounts, fee splits or pricing snapshots, and every query is scoped to the caller. The archive
goes to private object storage under `exports/<user>/` with a 48 h signed URL. If storage is not configured the
route answers 503 `storage_unavailable` and the UI shows a zh message. Archives are deleted by the purge job;
also add a bucket lifecycle rule (7 days) on the `exports/` prefix.

## Data inventory

`frontend/server/account-purge-plan.ts` is the executable inventory. `tests/account-purge-postgres.test.ts`
applies the whole schema (ensure functions plus every migration) to a disposable PostgreSQL and fails when a
table with a user-identifying column is neither planned nor listed in `ACCOUNT_PURGE_RETAINED_TABLES`.
Add new tables to the plan (and this table) in the same change.

| Class | Tables | Action |
| --- | --- | --- |
| Media | `media_assets`, `user_assets`, `job_outputs`, `app_openai_image_results`, `seedance_draft_links`, `video_share_links`, `provider_element_assets`, `flux_draft_cache_sources` | delete rows; stored objects deleted first, only keys inside the user's own prefixes (`ownedMediaStorageKeyForUrl`) plus `exports/<user>/`. Never shared or public example assets |
| Library | `library_*` (collections, members, organization, aliases, snapshots) | delete |
| Characters | `character_studio_characters`, `_looks`, `_recast_quotes` | delete |
| Studio | `studio_projects` (+ assets, sequences, commands, notes, tasks, segments, approvals, image turns, conversation memory/steps/responses, model usage), `studio_canvas_templates`, `creator_operations`, `prompt_assistance_analysis_selections` | delete. Projects still referenced by retained analysis runs are blanked instead (name, settings, workspace state) |
| Subtitles | `subtitle_documents`, `_revisions`, `subtitle_operations` | delete |
| MCP | `mcp_reference_upload_*`, `mcp_oauth_connection_bindings`, `mcp_spending_limits`, `mcp_funnel_events`, `mcp_trial_risk_events`, `mcp_audit_events` | delete |
| Behaviour | `app_generate_metrics`, `ga4_payment_outbox`, `user_preferences`, `user_roles`, `email_events` (by email) | delete |
| Consent evidence | `user_consents` | **anonymise**: keep user id, document, version, timestamps, locale and source; null `ip` and `user_agent` |
| Generation history | `app_jobs` | **anonymise**: prompt, thumbnails, media URLs, keyframes, settings emptied, hidden and private; engine, price, currency and payment fields kept. Rows with `featured = TRUE` (operator-curated public content) are left untouched and their media is not deleted; delist them in admin first if they must go |
| Billing | `app_receipts`, `checkout_attempts`, `llmhub_pay_topup_orders`, `wallet_fraud_cleanup_audit` | **anonymise**: customer id, hosted invoice/receipt URLs, IP hash, email removed and personal keys stripped from metadata; amounts, ids, types, timestamps kept (retained as the law requires) |
| Retained as is | `app_direct_payment_quotes`, `checkout_interaction_events`, `mcp_generation_quotes`, `mcp_trial_entitlements`, `mcp_trial_support_override_audit`, `studio_assistance_*` credit ledger, `prompt_assistance_sessions`, `user_account_restrictions`, operator audit tables, `account_privacy_events` | retained: opaque id, amounts and timestamps only |
| Referenced by retained ledgers | `prompt_assistance_requests`, `studio_media_analysis_runs` | rows kept, content blanked (input, context, response, result) |
| Profile | `profiles` | identifiers cleared first; the row is deleted only after the Auth user is gone, so an interrupted run is retried |
| Identity | Supabase Auth user | deleted last through the admin API; phone and email are freed for a later sign-up |

Known limits: `mcp_generation_quotes.request_json` and `studio_assistance_*` keep opaque ids and amounts but
`request_json` may reference prompt text; revisit with legal advice. Orders keep the user id as an opaque id.

## Purge job

`POST /api/cron/account-purge` (`frontend/app/api/cron/_lib/account-purge-handler.ts`,
`frontend/server/account-purge.ts`).

- Auth: `Authorization: Bearer $CRON_SECRET`; refuses (401) when `CRON_SECRET` is unset.
- **Safe by default**: it only erases when `ACCOUNT_PURGE_ENABLED=true`; otherwise every run is a dry run.
  `?dryRun=1` forces a dry run even when enabled. `?limit=N` (default 5, max 20) bounds the batch.
- Candidates: `marked_for_deletion_at <= now() - 15 days`, oldest first. Re-checked per user: id is a UUID,
  flag set and old enough. Skipped with a reason: `wallet_balance`, `active_jobs` (queued/running jobs),
  `operator_account` (admins), `identity_unavailable` (Supabase unreachable).
- Per user: delete owned storage objects, one database transaction (savepoint per step, so a table that is
  absent in an older database is skipped), delete the Auth user, delete the profile tombstone, record
  `purged`. Any failure leaves the account marked, records `purge_failed` and is retried next run.
  Idempotent: a purged user is no longer a candidate.
- Response and logs contain counts per table and failure classes only, never row data.

### Dry run

```bash
curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" \
  "https://<keyvo host>/api/cron/account-purge?dryRun=1&limit=20"
```

The report lists each due user, per-step counts (`media_assets:delete`, `app_jobs:scrub`, ...) and the number
of storage objects that would be removed. Nothing is written.

### Scheduling on the Aliyun/AWS host (Docker, 1Panel)

The app has no built-in scheduler on this host. In 1Panel create a **计划任务** (Shell, daily, e.g. 03:30):

```bash
curl -fsS -m 280 -X POST -H "Authorization: Bearer ${CRON_SECRET}" \
  "http://127.0.0.1:<app port>/api/cron/account-purge?limit=20" >> /var/log/keyvo-account-purge.log
```

Set `CRON_SECRET` in the container environment (the same value the other cron routes use) and, when the owner
is ready, `ACCOUNT_PURGE_ENABLED=true`. Run one dry run first and read it before enabling.

## Database

Migration `neon/migrations/98_account_privacy_events.sql` is additive and idempotent: it creates
`account_privacy_events` (audit and export rate limit) and a partial index on
`profiles.marked_for_deletion_at`. The code is feature-guarded: until it is applied, events are not recorded,
the export limit uses process memory, and requests, cancellation and the purge still work (the purge never
reads the table). Apply it before enabling the purge so `purged` proofs are kept.

## Privacy policy wording the owner must add

State: the retention of order, payment and wallet records after deletion (without personal identifiers, for the
legally required period); the 15-day cooling-off and how to cancel; that deletion removes account identity,
generations, prompts and uploaded media; that consent records are kept without IP or device data; how to
export data (Settings > 隐私与安全); that deletion is refused while a wallet balance remains; and the contact
channel for refunds and requests.
