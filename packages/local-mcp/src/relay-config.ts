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
	name: string;
	callbackUrl: string;
	tools: SerializedToolDefinition[];
}): McpServerConfig {
	const env = serializeRelayEnv(options);

	// When running inside Electron, process.execPath is the Electron binary.
	// ELECTRON_RUN_AS_NODE=1 forces it to behave as a plain Node process so
	// it can execute the relay script.
	if (process.versions.electron) {
		env.push({ name: 'ELECTRON_RUN_AS_NODE', value: '1' });
	}

	return {
		name: options.name,
		command: process.execPath,
		args: [getRelayPath()],
		env,
	};
}
