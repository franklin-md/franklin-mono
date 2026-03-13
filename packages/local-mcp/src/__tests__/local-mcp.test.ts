import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { createLocalMcp } from '../local-mcp.js';
import { InMemoryLocalMcpTransport } from '../transports/in-memory.js';

import type { ToolDefinition } from '../tools/types.js';

const addSchema = z.object({ x: z.number(), y: z.number() });

function addTool(
	handler: (args: z.infer<typeof addSchema>) => Promise<{ sum: number }>,
): ToolDefinition<z.infer<typeof addSchema>> {
	return {
		name: 'add',
		description: 'Add two numbers',
		schema: addSchema,
		handler,
	};
}

describe('createLocalMcp with InMemoryLocalMcpTransport', () => {
	const transports: InMemoryLocalMcpTransport[] = [];

	afterEach(async () => {
		while (transports.length > 0) {
			const t = transports.pop();
			if (t) await t.dispose();
		}
	});

	it('creates a local MCP and calls a tool through the MCP client', async () => {
		const handler = vi.fn(async (args: z.infer<typeof addSchema>) => ({
			sum: args.x + args.y,
		}));

		const transport = new InMemoryLocalMcpTransport();
		transports.push(transport);

		const mcp = await createLocalMcp(
			{
				name: 'test-mcp',
				tools: [addTool(handler)],
			},
			transport,
		);

		expect(mcp.config.name).toBe('test-mcp');

		const result = await transport.client.callTool({
			name: 'add',
			arguments: { x: 3, y: 4 },
		});

		expect(handler).toHaveBeenCalledWith({ x: 3, y: 4 });
		expect(result.isError).toBeFalsy();

		const content = result.content as Array<{ type: string; text: string }>;
		expect(JSON.parse(content[0]!.text)).toEqual({ sum: 7 });

		await mcp.dispose();
	});

	it('lists tools through the MCP client', async () => {
		const transport = new InMemoryLocalMcpTransport();
		transports.push(transport);

		const greetSchema = z.object({ name: z.string() });

		await createLocalMcp(
			{
				name: 'test-mcp',
				tools: [
					{
						name: 'greet',
						description: 'Say hello',
						schema: greetSchema,
						handler: async (args) => ({
							greeting: `Hello, ${args.name}!`,
						}),
					} satisfies ToolDefinition<z.infer<typeof greetSchema>>,
				],
			},
			transport,
		);

		const { tools } = await transport.client.listTools();
		expect(tools).toHaveLength(1);
		expect(tools[0]!.name).toBe('greet');
		expect(tools[0]!.description).toBe('Say hello');
	});
});
