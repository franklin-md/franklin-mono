import type {
	MiniACPAgent,
	ToolExecuteParams,
	ToolResult,
} from '@franklin/mini-acp';
import type { BaseRuntime } from '@franklin/extensibility';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createToolDecorator } from '../decorator.js';
import type { ToolLayer } from '../types.js';

const runtime = {
	dispose: async () => {},
} satisfies BaseRuntime;

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

function emptyLayer(): ToolLayer<typeof runtime> {
	return {
		tools: [],
		observers: {
			toolCall: [],
			toolResult: [],
		},
		getRuntime: () => runtime,
	};
}

describe('createToolDecorator', () => {
	it('executes registered tools instead of delegating to the fallback server', async () => {
		const execute = vi.fn(async ({ input }: { input: string }) =>
			input.toUpperCase(),
		);
		const layer: ToolLayer<typeof runtime> = {
			...emptyLayer(),
			tools: [
				{
					name: 'myTool',
					description: 'A test tool',
					schema: z.object({ input: z.string() }),
					execute,
				},
			],
		};

		const server = fallbackServer();
		const wrapped = await createToolDecorator(layer).server(server);
		const result = await wrapped.toolExecute(
			toolCall('myTool', { input: 'hello' }),
		);

		expect(execute).toHaveBeenCalledWith({ input: 'hello' }, runtime);
		expect(server.toolExecute).not.toHaveBeenCalled();
		expect(text(result)).toBe('HELLO');
	});

	it('delegates unknown tools to the fallback server', async () => {
		const server = fallbackServer();
		const wrapped = await createToolDecorator(emptyLayer()).server(server);

		const result = await wrapped.toolExecute(toolCall('unknownTool'));

		expect(server.toolExecute).toHaveBeenCalledOnce();
		expect(text(result)).toBe('fallback:unknownTool');
	});

	it('notifies tool observers around registered tool execution', async () => {
		const calls: string[] = [];
		const layer: ToolLayer<typeof runtime> = {
			...emptyLayer(),
			tools: [
				{
					name: 'myTool',
					description: 'A test tool',
					schema: z.object({}),
					execute: async () => 'ok',
				},
			],
			observers: {
				toolCall: [
					() => calls.push('call:first'),
					() => calls.push('call:second'),
				],
				toolResult: [
					() => calls.push('result:first'),
					() => calls.push('result:second'),
				],
			},
		};

		const wrapped = await createToolDecorator(layer).server(fallbackServer());
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
		const layer: ToolLayer<typeof runtime> = {
			...emptyLayer(),
			tools: [
				{
					name: 'myTool',
					description: 'A test tool',
					schema: z.object({ input: z.string() }),
					execute,
				},
			],
		};

		const wrapped = await createToolDecorator(layer).server(fallbackServer());
		const result = await wrapped.toolExecute(
			toolCall('myTool', { input: 123 }),
		);

		expect(execute).not.toHaveBeenCalled();
		expect(result.isError).toBe(true);
		expect(text(result)).toContain('Invalid arguments for tool "myTool"');
	});

	it('leaves the client side unchanged', async () => {
		const decorator = createToolDecorator(emptyLayer());
		const client = {} as Parameters<typeof decorator.client>[0];

		await expect(decorator.client(client)).resolves.toBe(client);
	});
});
