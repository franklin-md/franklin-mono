import { getRelayPath } from './transports/http/relay/path.js';
import { serializeRelayEnv } from './transports/http/relay/env.js';

import type { McpServerConfig } from './types.js';
import type { SerializedToolDefinition } from './tools/types.js';

/**
 * Builds the {@link McpServerConfig} that tells an ACP agent how to spawn
 * the MCP relay subprocess. The relay bridges MCP stdio ↔ HTTP POST to a
 * callback server.
 */
export function createRelayConfig(options: {
	callbackUrl: string;
	tools: SerializedToolDefinition[];
}): McpServerConfig {
	return {
		command: process.execPath,
		args: [getRelayPath()],
		env: serializeRelayEnv(options),
	};
}
