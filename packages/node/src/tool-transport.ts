import type { McpTransportFactory } from '@franklin/agent';
import { createHttpTransport } from '@franklin/local-mcp';
import { PortManager } from '@franklin/transport';

// Shared port manager for all tool transports in this process.
const portManager = new PortManager();

/**
 * McpTransportFactory for Node.js environments.
 *
 * Spins up an HTTP server on localhost with an auto-assigned port.
 * The agent subprocess connects to it via the MCP relay config
 * injected into the session's mcpServers.
 */
export const createToolTransport: McpTransportFactory = async (tools) => {
	const port = await portManager.allocate();
	try {
		return await createHttpTransport({
			tools,
			serverOptions: { port },
		});
	} catch (error) {
		portManager.release(port);
		throw error;
	}
};
