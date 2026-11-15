// Run in a child process with KEYVO_MCP_FULL_UI=1 by tests/keyvo-mcp-ui-hidden.test.ts: the rule is read at module load.
import mcpPublication from '../../frontend/config/mcp-publication.json' with { type: 'json' };
import { mcpUiPublication } from '../../frontend/config/mcp-ui-publication';
import { SETTINGS_TAB_ITEMS } from '../../frontend/lib/settings-navigation';

console.log(JSON.stringify({
  same: JSON.stringify(mcpUiPublication) === JSON.stringify(mcpPublication),
  tabs: SETTINGS_TAB_ITEMS.map((item) => item.id),
}));
