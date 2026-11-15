// Test-only: importing this module first reopens the customer-facing MCP surfaces (KEYVO_MCP_FULL_UI=1) for tests that
// pin MCP being visible. Keyvo hides MCP in production (KEYVO_MCP_UI_HIDDEN); the switch is never set there.
process.env.KEYVO_MCP_FULL_UI = '1';
