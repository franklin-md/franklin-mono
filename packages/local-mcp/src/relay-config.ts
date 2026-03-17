import { execFileSync } from 'node:child_process';

import { getRelayPath } from './transports/http/relay/path.js';
import { serializeRelayEnv } from './transports/http/relay/env.js';

import type { McpServerConfig } from './types.js';
import type { SerializedToolDefinition } from './tools/types.js';

/**
 * Resolves the Node.js binary path.
 *
 * In Electron, `process.execPath` points to the Electron binary which
 * can't reliably run standalone scripts (module resolution differs).
 * Instead, find the real `node` binary from PATH.
 */
function getNodePath(): string {
	if (!process.versions.electron) {
		return process.execPath;
	}

	try {
		return execFileSync('which', ['node'], { encoding: 'utf-8' }).trim();
	} catch {
		throw new Error(
			'Could not find `node` on PATH. A Node.js installation is required to run MCP relay servers from Electron.',
		);
	}
}

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

	return {
		name: options.name,
		command: getNodePath(),
		args: [getRelayPath()],
		env,
	};
}
