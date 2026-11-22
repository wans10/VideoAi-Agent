/**
 * Declarative erasure plan for an account whose 15-day cooling-off has elapsed.
 * `$1` is always the user id (text). Order matters: children before parents.
 * Inventory and rationale: docs/engineering/account-deletion.md. The Postgres
 * test fails when a user-keyed table is neither planned here nor listed in
 * ACCOUNT_PURGE_RETAINED_TABLES, so new tables cannot silently escape review.
 */
export type PurgeStepKind = 'delete' | 'scrub';

export type PurgeStep = {
  table: string;
  kind: PurgeStepKind;
  sql: string;
  /** Needs the account email from Auth; skipped (counted as 0) when unknown. */
  needsEmail?: boolean;
};

const SENSITIVE_KEYS = `ARRAY['email','phone','mobile','name','full_name','fullName','ip','ip_address','user_agent','userAgent','address','billing_details','customer_email','buyer_email','contact']`;
const scrubJson = (column: string) => `COALESCE(${column}, '{}'::jsonb) - ${SENSITIVE_KEYS}`;

const del = (table: string, where = 'user_id = $1'): PurgeStep => ({
  table,
  kind: 'delete',
  sql: `DELETE FROM ${table} WHERE ${where}`,
});

export const ACCOUNT_PURGE_STEPS: PurgeStep[] = [
  // Stored media (objects are removed from storage before this transaction).
  del('job_outputs'),
  del('media_assets'),
  del('user_assets'),
  del('app_openai_image_results'),
  del('seedance_draft_links'),
  del('video_share_links'),
  del('provider_element_assets'),
  del('flux_draft_cache_sources', 'owner_id = $1'),
  // Library.
  del('library_collection_members'),
  del('library_organization_aliases'),
  del('library_selection_snapshot_items'),
  del('library_selection_snapshots'),
  del('library_collections'),
  del('library_purge_objects'),
  del('library_purge_tokens'),
  del('library_purge_requests'),
  del('library_organization'),
  // Characters.
  del('character_studio_looks'),
  del('character_studio_characters'),
  del('character_studio_recast_quotes'),
  del('character_builder_quotes'),
  // Studio projects and conversations.
  del('studio_task_approvals'),
  del('studio_task_segments'),
  del('studio_tasks'),
  del('studio_task_memory_notes'),
  del('studio_project_commands'),
  del('studio_conversation_responses'),
  del('studio_conversation_steps'),
  del('studio_image_model_usage'),
  del('studio_image_turns'),
  del('studio_conversation_memory'),
  del('studio_project_assets'),
  del('studio_sequences'),
  del('studio_canvas_templates'),
  del('prompt_assistance_analysis_selections'),
  del('creator_operations'),
  // Subtitles.
  del('subtitle_document_revisions', 'document_id IN (SELECT id FROM subtitle_documents WHERE user_id = $1)'),
  del('subtitle_operations'),
  del('subtitle_documents'),
  // MCP and integrations.
  del('mcp_reference_upload_parts'),
  del('mcp_reference_upload_cleanup_objects'),
  del('mcp_reference_upload_attempts'),
  del('mcp_reference_upload_sessions'),
  del('mcp_oauth_connection_bindings'),
  del('mcp_spending_limits'),
  del('mcp_funnel_events'),
  del('mcp_trial_risk_events'),
  del('mcp_audit_events'),
  del('audio_generation_dispatch'),
  del('openai_conversion_outbox'),
  // Behavioural and analytics records.
  del('app_generate_metrics'),
  del('ga4_payment_outbox'),
  del('user_preferences'),
  del('user_roles'),
  { table: 'email_events', kind: 'delete', needsEmail: true, sql: 'DELETE FROM email_events WHERE $1::text IS NOT NULL AND lower(recipient) = lower($2::text)' },
  { table: 'legal_reports', kind: 'scrub', needsEmail: true, sql: `UPDATE legal_reports SET email = NULL, attachment_base64 = NULL, attachment_filename = NULL WHERE $1::text IS NOT NULL AND lower(email) = lower($2::text)` },
  // Consent evidence stays (user id, document, version, time); identifiers go.
  { table: 'user_consents', kind: 'scrub', sql: 'UPDATE user_consents SET ip = NULL, user_agent = NULL WHERE user_id = $1::uuid' },
  // Generation history: keep price and payment linkage, drop content and media.
  {
    table: 'app_jobs',
    kind: 'scrub',
    sql: `UPDATE app_jobs SET prompt = '', thumb_url = '', video_url = NULL, preview_video_url = NULL,
            keyframe_urls = NULL, audio_url = NULL, preview_frame = NULL, local_key = NULL, message = NULL,
            render_ids = NULL, settings_snapshot = NULL, hidden = TRUE, visibility = 'private',
            indexable = FALSE, updated_at = NOW()
          WHERE user_id = $1 AND COALESCE(featured, FALSE) = FALSE`,
  },
  // Billing records are retained without personal identifiers.
  {
    table: 'app_receipts',
    kind: 'scrub',
    sql: `UPDATE app_receipts SET stripe_customer_id = NULL, stripe_hosted_invoice_url = NULL, stripe_invoice_pdf = NULL,
            stripe_receipt_url = NULL, metadata = ${scrubJson('metadata')}
          WHERE user_id = $1`,
  },
  {
    table: 'checkout_attempts',
    kind: 'scrub',
    sql: `UPDATE checkout_attempts SET ip_hash = NULL, metadata = ${scrubJson('metadata')} WHERE user_id = $1`,
  },
  {
    table: 'llmhub_pay_topup_orders',
    kind: 'scrub',
    sql: `UPDATE llmhub_pay_topup_orders SET quote_metadata = ${scrubJson('quote_metadata')} WHERE user_id = $1`,
  },
  {
    table: 'wallet_fraud_cleanup_audit',
    kind: 'scrub',
    sql: 'UPDATE wallet_fraud_cleanup_audit SET email = NULL WHERE user_id = $1',
  },
  // Rows kept only because retained ledgers reference them: content emptied.
  {
    table: 'prompt_assistance_requests',
    kind: 'scrub',
    sql: `UPDATE prompt_assistance_requests SET input_json = '{}'::jsonb, context_json = NULL, response_json = NULL,
            reply_json = NULL, error = NULL WHERE user_id = $1`,
  },
  {
    table: 'studio_media_analysis_runs',
    kind: 'scrub',
    sql: `UPDATE studio_media_analysis_runs SET request_json = '{}'::jsonb, result_json = NULL, error = NULL WHERE user_id = $1`,
  },
  {
    table: 'studio_projects',
    kind: 'delete',
    sql: `DELETE FROM studio_projects p WHERE p.user_id = $1
          AND NOT EXISTS (SELECT 1 FROM studio_media_analysis_runs r WHERE r.project_id = p.id)`,
  },
  {
    table: 'studio_projects',
    kind: 'scrub',
    sql: `UPDATE studio_projects SET name = '', settings = '{}'::jsonb, workspace_state = '{}'::jsonb WHERE user_id = $1`,
  },
  // Profile: identifiers off; the row is removed once the Auth user is gone.
  {
    table: 'profiles',
    kind: 'scrub',
    sql: `UPDATE profiles SET stripe_customer_id = NULL, marketing_opt_in = FALSE, marketing_opt_in_at = NULL WHERE id = $1::uuid`,
  },
];

/**
 * Tables with a user-identifying column that deliberately keep their rows.
 * Each keeps only the opaque user id, amounts, ids and timestamps.
 */
export const ACCOUNT_PURGE_RETAINED_TABLES: Record<string, string> = {
  app_receipts: 'payment/wallet ledger (scrubbed above)',
  app_jobs: 'order/price history (scrubbed above)',
  checkout_attempts: 'payment audit (scrubbed above)',
  checkout_interaction_events: 'payment audit, opaque ids only',
  llmhub_pay_topup_orders: 'payment orders (scrubbed above)',
  app_direct_payment_quotes: 'payment quotes, no personal identifiers',
  mcp_generation_quotes: 'paid-generation order records, opaque ids',
  mcp_trial_entitlements: 'trial accounting, opaque ids',
  mcp_trial_support_override_audit: 'support audit, opaque ids',
  studio_assistance_accounts: 'assistance credit ledger',
  studio_assistance_credit_lots: 'assistance credit ledger',
  studio_assistance_output_refunds: 'assistance credit ledger',
  studio_assistance_turns: 'assistance credit ledger, no content',
  studio_assistance_calls: 'assistance credit ledger, no content',
  studio_assistance_choices: 'assistance credit ledger',
  studio_assistance_resolutions: 'assistance credit ledger',
  studio_media_analysis_runs: 'credit funding reference (scrubbed above)',
  prompt_assistance_requests: 'credit refund reference (scrubbed above)',
  prompt_assistance_sessions: 'credit refund reference, no content',
  studio_projects: 'referenced by retained analysis runs (scrubbed above)',
  user_consents: 'consent evidence without identifiers (scrubbed above)',
  user_account_restrictions: 'fraud-prevention record, opaque id',
  wallet_fraud_cleanup_audit: 'financial audit (scrubbed above)',
  admin_audit: 'operator audit trail, opaque target id',
  admin_assistant_review_access: 'operator audit trail',
  admin_assistant_review_annotations: 'operator audit trail',
  admin_studio_review_access: 'operator audit trail',
  account_privacy_events: 'proof of erasure, opaque id',
  legal_reports: 'scrubbed above (matched by email)',
  email_events: 'deleted above (matched by email)',
  profiles: 'removed after the Auth user is deleted',
  app_admins: 'purge refuses operators',
  marketing_media: 'site-owned public media',
  app_customer_tariff_cutover_events: 'operator audit',
  app_customer_tariff_local_activation_events: 'operator audit',
  app_pricing_change_events: 'operator audit',
  app_tariff_batch_operations: 'operator audit',
  editorial_events: 'operator audit',
  editorial_checks: 'operator audit',
  editorial_versions: 'operator audit',
  playlists: 'operator content',
  prompt_assistance_abandoned_requests: 'credit refund reference',
};
