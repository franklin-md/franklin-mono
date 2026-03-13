import { createHttpCallbackServer } from '@franklin/transport';

import type { HttpCallbackServer } from '@franklin/transport';
import type { LocalMcpTransport, McpServerConfig } from '../../types.js';
import type { AnyToolDefinition } from '../../tools/types.js';
import { toJsonSchema } from '../../schema.js';
import { getRelayPath } from './relay/path.js';
import { RELAY_NAME } from './relay/tags.js';
import { serializeRelayEnv } from './relay/env.js';

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
		this.callbackServer = await createHttpCallbackServer();

		const handlerMap = new Map<string, AnyToolDefinition>();
		for (const tool of tools) {
			handlerMap.set(tool.name, tool);
		}

		this.callbackServer.onRequest(async (body) => {
			const req = body as ToolCallRequest;
			const tool = handlerMap.get(req.tool);
			if (!tool) {
				throw new Error(`Unknown tool: ${req.tool}`);
			}

			const parsed: unknown = tool.schema.parse(req.arguments);
			return tool.handler(parsed);
		});

		const toolSchemas = tools.map((t) => ({
			name: t.name,
			description: t.description,
			inputSchema: toJsonSchema(t.schema),
		}));

		return {
			name: RELAY_NAME,
			command: process.execPath,
			args: [getRelayPath()],
			env: serializeRelayEnv({
				callbackUrl: this.callbackServer.url,
				tools: toolSchemas,
			}),
		};
	}

	async dispose(): Promise<void> {
		await this.callbackServer?.dispose();
		this.callbackServer = undefined;
	}
}
