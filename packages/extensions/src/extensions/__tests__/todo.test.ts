import { describe, it, expect, vi } from 'vitest';
import { apply } from '@franklin/lib/middleware';
import type { MiniACPClient, ToolResult } from '@franklin/mini-acp';
import { compileCoreWithStore } from '../../testing/compile-ext.js';
import { todoExtension } from '../todo/extension.js';
import { todoKey } from '../todo/key.js';
import type { Todo } from '../todo/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type StubOverrides = { [K in keyof MiniACPClient]?: (...args: any[]) => any };
type PromptParams = Parameters<MiniACPClient['prompt']>[0];

function stubClient(overrides: StubOverrides = {}): MiniACPClient {
	return {
		initialize: vi.fn(async () => {}),
		setContext: vi.fn(async () => {}),
		prompt: vi.fn(async function* () {
			yield* [];
		}),
		cancel: vi.fn(async () => {}),
		...overrides,
	} as unknown as MiniACPClient;
}

async function collect<T>(iter: AsyncIterable<T>): Promise<T[]> {
	const items: T[] = [];
	for await (const item of iter) items.push(item);
	return items;
}

function getToolResultText(result: ToolResult): string {
	const [content] = result.content;
	if (!content || content.type !== 'text') {
		throw new Error('Expected a text tool result');
	}
	return content.text;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('todoExtension', () => {
	function compileWithTodo() {
		return compileCoreWithStore(todoExtension());
	}

	it('registers 3 tools', async () => {
		const { tools } = await compileWithTodo();

		expect(tools).toHaveLength(3);
		expect(tools.map((t) => t.name).sort()).toEqual([
			'add_todo',
			'complete_todo',
			'list_todos',
		]);
	});

	it('add_todo tool creates a todo', async () => {
		const { middleware } = await compileWithTodo();

		const addResult = await middleware.server.toolExecute(
			{
				call: {
					type: 'toolCall',
					id: 'c1',
					name: 'add_todo',
					arguments: { text: 'Buy groceries' },
				},
			},
			vi.fn(),
		);

		expect(addResult.toolCallId).toBe('c1');
		const parsed = JSON.parse(getToolResultText(addResult)) as { id: string };
		expect(parsed.id).toBeDefined();
	});

	it('complete_todo marks a todo as completed', async () => {
		const { middleware } = await compileWithTodo();
		const next = vi.fn();

		const addResult = await middleware.server.toolExecute(
			{
				call: {
					type: 'toolCall',
					id: 'c1',
					name: 'add_todo',
					arguments: { text: 'Test todo' },
				},
			},
			next,
		);

		const { id } = JSON.parse(getToolResultText(addResult)) as { id: string };

		await middleware.server.toolExecute(
			{
				call: {
					type: 'toolCall',
					id: 'c2',
					name: 'complete_todo',
					arguments: { id },
				},
			},
			next,
		);

		const listResult = await middleware.server.toolExecute(
			{
				call: {
					type: 'toolCall',
					id: 'c3',
					name: 'list_todos',
					arguments: {},
				},
			},
			next,
		);

		const todos = (
			JSON.parse(getToolResultText(listResult)) as { todos: Todo[] }
		).todos;
		expect(todos).toHaveLength(1);
		expect(todos[0]?.completed).toBe(true);
	});

	it('injects formatted todos into prompt params', async () => {
		const { middleware } = await compileWithTodo();

		await middleware.server.toolExecute(
			{
				call: {
					type: 'toolCall',
					id: 'c1',
					name: 'add_todo',
					arguments: { text: 'Buy milk' },
				},
			},
			vi.fn(),
		);

		const received: PromptParams[] = [];
		const target = stubClient({
			prompt: async function* (params: PromptParams) {
				received.push(params);
				yield* [];
			},
		});

		const wrapped = apply(middleware.client, target);
		await collect(
			wrapped.prompt({
				role: 'user',
				content: [{ type: 'text', text: 'hello' }],
			}),
		);

		const params = received[0] as {
			content: { type: string; text: string }[];
		};
		expect(params.content[0]?.text).toContain('<todos>');
		expect(params.content[0]?.text).toContain('Buy milk');
		expect(params.content[1]?.text).toBe('hello');
	});

	it('no injection when todo list is empty', async () => {
		const { middleware } = await compileWithTodo();

		const received: PromptParams[] = [];
		const target = stubClient({
			prompt: async function* (params: PromptParams) {
				received.push(params);
				yield* [];
			},
		});

		const wrapped = apply(middleware.client, target);
		await collect(
			wrapped.prompt({
				role: 'user',
				content: [{ type: 'text', text: 'hello' }],
			}),
		);

		const params = received[0] as {
			content: { type: string; text: string }[];
		};
		expect(params.content).toHaveLength(1);
		expect(params.content[0]?.text).toBe('hello');
	});

	it('todos end up in the store runtime', async () => {
		const { middleware, stores } = await compileWithTodo();

		await middleware.server.toolExecute(
			{
				call: {
					type: 'toolCall',
					id: 'c1',
					name: 'add_todo',
					arguments: { text: 'Test store' },
				},
			},
			vi.fn(),
		);

		const todos = stores.getStore(todoKey).get();
		expect(todos).toHaveLength(1);
		expect(todos[0]?.text).toBe('Test store');
	});
});
