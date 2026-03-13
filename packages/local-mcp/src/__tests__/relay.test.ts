import { afterEach, describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { createHttpCallbackServer } from '@franklin/transport';

import type { HttpCallbackServer } from '@franklin/transport';

// Use the compiled relay from dist/ — the relay runs as a standalone subprocess
const RELAY_PATH = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	'../../dist/relay/relay.js',
);

interface ToolCallRequest {
	tool: string;
	arguments: { x: number; y: number };
}

describe('MCP Relay', () => {
	const servers: HttpCallbackServer[] = [];
	const clients: Client[] = [];

	afterEach(async () => {
		while (clients.length > 0) {
			const c = clients.pop();
			if (c) await c.close();
		}
		while (servers.length > 0) {
			const s = servers.pop();
			if (s) await s.dispose();
		}
	});

	it('relays tool calls from MCP stdio to HTTP callback', async () => {
		const callbackServer = await createHttpCallbackServer();
		servers.push(callbackServer);

		callbackServer.onRequest(async (body) => {
			const req = body as ToolCallRequest;
			return { product: req.arguments.x * req.arguments.y };
		});

		const tools = [
			{
				name: 'multiply',
				description: 'Multiply two numbers',
				inputSchema: {
					type: 'object',
					properties: {
						x: { type: 'number' },
						y: { type: 'number' },
					},
					required: ['x', 'y'],
				},
			},
		];

		const transport = new StdioClientTransport({
			command: process.execPath,
			args: ['--experimental-strip-types', RELAY_PATH],
			env: {
				...process.env,
				FRANKLIN_CALLBACK_URL: callbackServer.url,
				FRANKLIN_TOOLS: JSON.stringify(tools),
			} as Record<string, string>,
		});

		const client = new Client({ name: 'test-client', version: '0.0.0' });
		clients.push(client);

		await client.connect(transport);

		// List tools
		const { tools: listedTools } = await client.listTools();
		expect(listedTools).toHaveLength(1);
		expect(listedTools[0]!.name).toBe('multiply');

		// Call tool
		const result = await client.callTool({
			name: 'multiply',
			arguments: { x: 6, y: 7 },
		});

		expect(result.isError).toBeFalsy();
		const content = result.content as Array<{ type: string; text: string }>;
		expect(JSON.parse(content[0]!.text)).toEqual({ product: 42 });
	});
});
