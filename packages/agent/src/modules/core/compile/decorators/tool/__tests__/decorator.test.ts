import type {
	MiniACPAgent,
	ToolExecuteParams,
	ToolResult,
} from '@franklin/mini-acp';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createToolDecorator } from '../decorator.js';
import { createToolRegistry } from '../registry.js';
import {
	createCoreRegistry,
	createTestRuntime,
} from '../../__tests__/registry.js';
import { toolSpec } from '../../../../api/tool-spec.js';

const runtime = createTestRuntime();

function fallbackServer(): MiniACPAgent {
	const toolExecute: MiniACPAgent['toolExecute'] = async ({ call }) => ({
		toolCallId: call.id,
		content: [{ type: 'text' as const, text: `fallback:${call.name}` }],
	});

	return {
		toolExecute: vi.fn(toolExecute),
	};
}

function toolCall(
	name: string,
	args: Record<string, unknown> = {},
): ToolExecuteParams {
	return {
		call: {
			type: 'toolCall',
			id: 'call-1',
			name,
			arguments: args,
		},
	};
}

function text(result: ToolResult): string {
	return result.content
		.filter((content) => content.type === 'text')
		.map((content) => content.text)
		.join('');
}

describe('createToolDecorator', () => {
	it('returns undefined when no tools or tool observers are registered', () => {
		const registry = createCoreRegistry();
		expect(
			createToolDecorator(createToolRegistry(registry, () => runtime)),
		).toBeUndefined();
	});

	it('executes registered tools instead of delegating to the fallback server', async () => {
		const execute = vi.fn(async ({ input }: { input: string }) =>
			input.toUpperCase(),
		);

		const registrations = createCoreRegistry((api) => {
			api.registerTool(
				toolSpec('myTool', 'A test tool', z.object({ input: z.string() })),
				{ execute },
			);
		});
		const decorator = createToolDecorator(
			createToolRegistry(registrations, () => runtime),
		);
		if (!decorator) throw new Error('Expected tool decorator');

		const server = fallbackServer();
		const wrapped = await decorator.server(server);
		const result = await wrapped.toolExecute(
			toolCall('myTool', { input: 'hello' }),
		);

		expect(execute).toHaveBeenCalledWith({ input: 'hello' }, runtime);
		expect(server.toolExecute).not.toHaveBeenCalled();
		expect(text(result)).toBe('HELLO');
	});

	it('delegates unknown tools to the fallback server when tool observers are registered', async () => {
		const calls: string[] = [];
		const registrations = createCoreRegistry((api) => {
			api.on('toolCall', () => calls.push('call'));
			api.on('toolResult', () => calls.push('result'));
		});
		const decorator = createToolDecorator(
			createToolRegistry(registrations, () => runtime),
		);
		if (!decorator) throw new Error('Expected tool decorator');

		const server = fallbackServer();
		const wrapped = await decorator.server(server);

		const result = await wrapped.toolExecute(toolCall('unknownTool'));

		expect(server.toolExecute).toHaveBeenCalledOnce();
		expect(text(result)).toBe('fallback:unknownTool');
		expect(calls).toEqual(['call', 'result']);
	});

	it('notifies tool observers around registered tool execution', async () => {
		const calls: string[] = [];
		const registrations = createCoreRegistry((api) => {
			api.registerTool(toolSpec('myTool', 'A test tool', z.object({})), {
				execute: async () => 'ok',
			});
			api.on('toolCall', () => calls.push('call:first'));
			api.on('toolCall', () => calls.push('call:second'));
			api.on('toolResult', () => calls.push('result:first'));
			api.on('toolResult', () => calls.push('result:second'));
		});
		const decorator = createToolDecorator(
			createToolRegistry(registrations, () => runtime),
		);
		if (!decorator) throw new Error('Expected tool decorator');

		const wrapped = await decorator.server(fallbackServer());
		await wrapped.toolExecute(toolCall('myTool'));

		expect(calls).toEqual([
			'call:first',
			'call:second',
			'result:first',
			'result:second',
		]);
	});

	it('returns validation errors before execute runs', async () => {
		const execute = vi.fn(async () => 'not reached');
		const registrations = createCoreRegistry((api) => {
			api.registerTool(
				toolSpec('myTool', 'A test tool', z.object({ input: z.string() })),
				{ execute },
			);
		});
		const decorator = createToolDecorator(
			createToolRegistry(registrations, () => runtime),
		);
		if (!decorator) throw new Error('Expected tool decorator');

		const wrapped = await decorator.server(fallbackServer());
		const result = await wrapped.toolExecute(
			toolCall('myTool', { input: 123 }),
		);

		expect(execute).not.toHaveBeenCalled();
		expect(result.isError).toBe(true);
		expect(text(result)).toContain('Invalid arguments for tool "myTool"');
	});

	it('leaves the client side unchanged', async () => {
		const decorator = createToolDecorator(
			createToolRegistry(
				createCoreRegistry((api) => {
					api.registerTool(toolSpec('myTool', 'A test tool', z.object({})), {
						execute: async () => 'ok',
					});
				}),
				() => runtime,
			),
		);
		if (!decorator) throw new Error('Expected tool decorator');
		const client = {} as Parameters<typeof decorator.client>[0];

		await expect(decorator.client(client)).resolves.toBe(client);
	});
});
