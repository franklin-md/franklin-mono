/* eslint-disable @typescript-eslint/no-deprecated -- Server is needed for raw JSON Schema tools; McpServer requires Zod */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import {
	CallToolRequestSchema,
	ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type { LocalMcpTransport, McpServerConfig } from '../types.js';
import type { AnyToolDefinition } from '../tools/types.js';
import { toJsonSchema } from '../schema.js';
import { createError, createSuccess } from './messages.js';

/**
 * In-memory MCP transport for testing. Runs the MCP server and tools
 * in-process using linked InMemoryTransport pairs — no subprocess, no HTTP.
 *
 * Exposes a `client` property for calling tools directly in tests.
 */
export class InMemoryLocalMcpTransport implements LocalMcpTransport {
	private server: Server | undefined;
	private _client: Client | undefined;

	get client(): Client {
		if (!this._client) {
			throw new Error('Transport not started — call start() first');
		}
		return this._client;
	}

	async start(tools: AnyToolDefinition[]): Promise<McpServerConfig> {
		const toolMap = new Map<string, AnyToolDefinition>();
		for (const tool of tools) {
			toolMap.set(tool.name, tool);
		}

		this.server = new Server(
			{ name: 'local-mcp-test', version: '0.0.0' },
			{ capabilities: { tools: {} } },
		);

		this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
			tools: tools.map((t) => ({
				name: t.name,
				description: t.description,
				inputSchema: toJsonSchema(t.schema),
			})),
		}));

		this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
			const { name, arguments: args } = request.params;
			const tool = toolMap.get(name);
			if (!tool) {
				return createError(`Unknown tool: ${name}`);
			}

			const parsed: unknown = tool.schema.parse(args);
			const result = await tool.handler(parsed);
			return createSuccess(result);
		});

		const [clientTransport, serverTransport] =
			InMemoryTransport.createLinkedPair();

		await this.server.connect(serverTransport);

		this._client = new Client({
			name: 'local-mcp-test-client',
			version: '0.0.0',
		});
		await this._client.connect(clientTransport);

		return {
			name: 'in-memory',
			command: '',
			args: [],
			env: [],
		};
	}

	async dispose(): Promise<void> {
		await this._client?.close();
		await this.server?.close();
		this._client = undefined;
		this.server = undefined;
	}
}
