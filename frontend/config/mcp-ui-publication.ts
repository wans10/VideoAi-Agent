import mcpPublication from './mcp-publication.json';
import { isKeyvoMcpUiHidden } from './keyvo-disabled-features';

/**
 * Publication inputs for customer-facing and discovery surfaces (pages, navigation, sitemap, llms.txt, app menus).
 * While Keyvo hides MCP (KEYVO_MCP_UI_HIDDEN) public marketing and indexing are forced off here, whatever the
 * publication JSON says. Server and protocol code keeps reading `mcp-publication.json` directly.
 */
export const mcpUiPublication = isKeyvoMcpUiHidden()
  ? { ...mcpPublication, publicMarketing: false, publicIndexing: false }
  : mcpPublication;
