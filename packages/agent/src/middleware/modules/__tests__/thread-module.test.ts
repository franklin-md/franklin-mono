import { afterEach, describe, expect, it, vi } from 'vitest';

import { InMemoryLocalMcpTransport } from '@franklin/local-mcp';

import { createThreadModule } from '../thread.js';

import type { FranklinModule } from '../types.js';
import { SystemPromptBuilder } from '../types.js';

describe('createThreadModule', () => {
	const disposables: FranklinModule[] = [];

	afterEach(async () => {
		while (disposables.length > 0) {
			const m = disposables.pop();
			if (m?.onDispose) await m.onDispose();
		}
	});

	it('creates an MCP server with new_thread tool and fires onNewThread', async () => {
		const onNewThread = vi.fn(async (req: { task: string; cwd?: string }) => ({
			threadId: `thread-${req.task}`,
		}));

		const transport = new InMemoryLocalMcpTransport();

		const mod = createThreadModule({
			onNewThread,
			transport,
		});
		disposables.push(mod);

		// Run onCreate
		const builder = new SystemPromptBuilder();
		const result = await mod.onCreate!({
			cwd: '/project',
			systemPrompt: builder,
		});

		// Should return an MCP server config
		expect(result.mcpServers).toHaveLength(1);
		expect(result.mcpServers![0]).toMatchObject({
			name: 'franklin-threads',
		});

		// Should have appended a system prompt to the builder
		const builtPrompt = builder.build();
		expect(builtPrompt).toBeTruthy();
		expect(builtPrompt).toContain('new_thread');

		// List tools through MCP client
		const { tools } = await transport.client.listTools();
		expect(tools).toHaveLength(1);
		expect(tools[0]!.name).toBe('new_thread');

		// Call the tool
		const callResult = await transport.client.callTool({
			name: 'new_thread',
			arguments: { task: 'fix tests', cwd: '/other' },
		});

		expect(onNewThread).toHaveBeenCalledWith({
			task: 'fix tests',
			cwd: '/other',
		});
		expect(callResult.isError).toBeFalsy();
		const content = callResult.content as Array<{
			type: string;
			text: string;
		}>;
		expect(JSON.parse(content[0]!.text)).toEqual({
			threadId: 'thread-fix tests',
		});
	});

	it('dispose cleans up MCP server', async () => {
		const transport = new InMemoryLocalMcpTransport();

		const mod = createThreadModule({
			onNewThread: async () => ({ threadId: 'x' }),
			transport,
		});

		await mod.onCreate!({
			cwd: '/project',
			systemPrompt: new SystemPromptBuilder(),
		});

		// Should not throw
		await mod.onDispose!();

		// Accessing client after dispose should fail
		expect(() => transport.client).toThrow();
	});
});
