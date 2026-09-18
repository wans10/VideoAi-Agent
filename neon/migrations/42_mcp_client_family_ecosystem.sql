-- Extend privacy-safe MCP client attribution to the complete integration registry.
-- Existing rows and the historical `other` bucket remain unchanged.
-- The migration runner replays every file, so do not downgrade a later Glama constraint.
DO $mcp_client_family$
DECLARE
  current_definition TEXT;
BEGIN
  LOCK TABLE mcp_audit_events IN ACCESS EXCLUSIVE MODE;
  SELECT pg_get_constraintdef(oid) INTO current_definition
  FROM pg_constraint
  WHERE conrelid = 'mcp_audit_events'::regclass
    AND conname = 'mcp_audit_events_client_family_check'
    AND contype = 'c';

  IF current_definition IN (
    'CHECK (((client_family IS NULL) OR (client_family = ANY (ARRAY[''chatgpt''::text, ''claude''::text, ''codex''::text, ''openclaw''::text, ''n8n''::text, ''cursor''::text, ''githubCopilot''::text, ''geminiCli''::text, ''microsoftCopilot''::text, ''other''::text]))))',
    'CHECK (((client_family IS NULL) OR (client_family = ANY (ARRAY[''chatgpt''::text, ''claude''::text, ''codex''::text, ''openclaw''::text, ''n8n''::text, ''glama''::text, ''cursor''::text, ''githubCopilot''::text, ''geminiCli''::text, ''microsoftCopilot''::text, ''other''::text]))))'
  ) THEN
    RETURN;
  END IF;

  IF current_definition IS DISTINCT FROM
    'CHECK (((client_family IS NULL) OR (client_family = ANY (ARRAY[''chatgpt''::text, ''claude''::text, ''codex''::text, ''other''::text]))))'
  THEN
    RAISE EXCEPTION 'unexpected MCP client-family constraint; manual review required';
  END IF;

  ALTER TABLE mcp_audit_events DROP CONSTRAINT mcp_audit_events_client_family_check;
  ALTER TABLE mcp_audit_events
    ADD CONSTRAINT mcp_audit_events_client_family_check
    CHECK (client_family IS NULL OR client_family IN (
      'chatgpt', 'claude', 'codex', 'openclaw', 'n8n', 'cursor',
      'githubCopilot', 'geminiCli', 'microsoftCopilot', 'other'
    ));
END
$mcp_client_family$;
