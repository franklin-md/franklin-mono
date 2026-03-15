import { createHttpCallbackServer } from '@franklin/transport';

import type { HttpCallbackServer } from '@franklin/transport';
import type { LocalMcpTransport, McpServerConfig } from '../../types.js';
import type { AnyToolDefinition } from '../../tools/types.js';
import { createRelayConfig } from '../../relay-config.js';
import { ToolsManager } from '../../tools/manager.js';

interface ToolCallRequest {
	tool: string;
	arguments: unknown;
}

/**
 * HTTP-based MCP transport for production use.
 *
 * 1. Starts an HTTP callback server
 * 2. Registers a handler that dispatches tool calls to ToolDefinition handlers
 * 3. Returns McpServerConfig pointing at the relay subprocess with
 *    FRANKLIN_CALLBACK_URL and FRANKLIN_TOOLS in env
 */
export class HttpLocalMcpTransport implements LocalMcpTransport {
	private callbackServer: HttpCallbackServer | undefined;

	async start(tools: AnyToolDefinition[]): Promise<McpServerConfig> {
		const manager = new ToolsManager(tools);
		this.callbackServer = await createHttpCallbackServer({
			handler: async (body: unknown) => {
				const req = body as ToolCallRequest;
				return manager.dispatch(req.tool, req.arguments);
			},
		});

		return createRelayConfig({
			callbackUrl: this.callbackServer.url,
			tools: manager.listTools(),
		});
	}

	async dispose(): Promise<void> {
		await this.callbackServer?.dispose();
		this.callbackServer = undefined;
	}
}
