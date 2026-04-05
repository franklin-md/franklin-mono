import { describe, it, expect, vi } from 'vitest';
import { createCoreCompiler } from '../../compile/core/compiler.js';
import { createStoreCompiler } from '../../compile/store/compiler.js';
import { compile, combine } from '../../compile/types.js';
import { apply } from '../../api/core/middleware/apply.js';
import { createEmptyStoreResult } from '../../api/store/registry/result.js';
import type { MiniACPClient, ToolResult } from '@franklin/mini-acp';
import { todoExtension } from '../todo/extension.js';
import type { Todo } from '../todo/types.js';
import { StoreRegistry } from '../../api/store/registry/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type StubOverrides = { [K in keyof MiniACPClient]?: (...args: any[]) => any };
type PromptParams = Parameters<MiniACPClient['prompt']>[0];
type SetContextParams = Parameters<MiniACPClient['setContext']>[0];

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
		const registry = new StoreRegistry();
		const seed = createEmptyStoreResult(registry);
		const compiler = combine(createCoreCompiler(), createStoreCompiler(seed));
		return compile(compiler, todoExtension());
	}

	it('registers 3 tools into setContext', async () => {
		const result = await compileWithTodo();

		const received: SetContextParams[] = [];
		const target = stubClient({
			setContext: async (params: SetContextParams) => {
				received.push(params);
			},
		});

		const wrapped = apply(result.client, target);
		await wrapped.setContext({});

		const tools = (received[0] as { tools: { name: string }[] }).tools;
		expect(tools).toHaveLength(3);
		expect(tools.map((t) => t.name).sort()).toEqual([
			'add_todo',
			'complete_todo',
			'list_todos',
		]);
	});

	it('add_todo tool creates a todo', async () => {
		const result = await compileWithTodo();

		const addResult = await result.server.toolExecute(
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
		const result = await compileWithTodo();
		const next = vi.fn();

		// Add a todo first
		const addResult = await result.server.toolExecute(
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

		// Complete it
		await result.server.toolExecute(
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

		// Verify via list
		const listResult = await result.server.toolExecute(
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
		const result = await compileWithTodo();

		// Add a todo
		await result.server.toolExecute(
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

		// Now call prompt — todos should be prepended
		const received: PromptParams[] = [];
		const target = stubClient({
			prompt: async function* (params: PromptParams) {
				received.push(params);
				yield* [];
			},
		});

		const wrapped = apply(result.client, target);
		await collect(
			wrapped.prompt({
				role: 'user',
				content: [{ type: 'text', text: 'hello' }],
			}),
		);

		const params = received[0] as {
			content: { type: string; text: string }[];
		};
		// First content block should be the todos injection
		expect(params.content[0]?.text).toContain('<todos>');
		expect(params.content[0]?.text).toContain('Buy milk');
		// Original content preserved
		expect(params.content[1]?.text).toBe('hello');
	});

	it('no injection when todo list is empty', async () => {
		const result = await compileWithTodo();

		const received: PromptParams[] = [];
		const target = stubClient({
			prompt: async function* (params: PromptParams) {
				received.push(params);
				yield* [];
			},
		});

		const wrapped = apply(result.client, target);
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

	it('stores todos in a store accessible via StoreResult', async () => {
		const result = await compileWithTodo();

		// Add a todo
		await result.server.toolExecute(
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

		const todoStore = result.stores.get('todo');
		expect(todoStore).toBeDefined();
		if (!todoStore) {
			throw new Error('Expected todo store to exist');
		}
		const todos = todoStore.store.get() as Todo[];
		expect(todos).toHaveLength(1);
		expect(todos[0]?.text).toBe('Test store');
	});
});
