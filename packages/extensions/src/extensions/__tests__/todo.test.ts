import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { createCoreCompiler } from '../../compile/core/compiler.js';
import { createStoreCompiler } from '../../compile/store/compiler.js';
import { compile, combine } from '../../compile/types.js';
import { apply } from '../../api/core/middleware/apply.js';
import type { MiniACPClient } from '@franklin/mini-acp';
import { todoExtension } from '../todo/extension.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StubOverrides = { [K in keyof MiniACPClient]?: (...args: any[]) => any };

function stubClient(overrides: StubOverrides = {}): MiniACPClient {
	return {
		initialize: vi.fn(async () => {}),
		setContext: vi.fn(async () => {}),
		prompt: vi.fn(async function* () {}),
		cancel: vi.fn(async () => ({ type: 'turn_end' as const, turn: 'end' })),
		...overrides,
	} as unknown as MiniACPClient;
}

async function collect<T>(iter: AsyncIterable<T>): Promise<T[]> {
	const items: T[] = [];
	for await (const item of iter) items.push(item);
	return items;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('todoExtension', () => {
	function compileWithTodo() {
		const compiler = combine(createCoreCompiler(), createStoreCompiler());
		return compile(compiler, todoExtension());
	}

	it('registers 3 tools into setContext', async () => {
		const result = await compileWithTodo();

		const received: any[] = [];
		const target = stubClient({
			setContext: async (params) => {
				received.push(params);
			},
		});

		const wrapped = apply(result.client, target);
		await wrapped.setContext({ ctx: {} });

		const tools = (received[0] as { ctx: { tools: { name: string }[] } }).ctx
			.tools;
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
		const parsed = JSON.parse(
			(addResult.content[0] as { type: string; text: string }).text,
		);
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

		const { id } = JSON.parse(
			(addResult.content[0] as { type: string; text: string }).text,
		);

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

		const todos = JSON.parse(
			(listResult.content[0] as { type: string; text: string }).text,
		).todos;
		expect(todos).toHaveLength(1);
		expect(todos[0].completed).toBe(true);
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
		const received: any[] = [];
		const target = stubClient({
			prompt: async function* (params) {
				received.push(params);
			},
		});

		const wrapped = apply(result.client, target);
		await collect(
			wrapped.prompt({
				message: {
					role: 'user',
					content: [{ type: 'text', text: 'hello' }],
				},
			}),
		);

		const params = received[0] as {
			message: { content: { type: string; text: string }[] };
		};
		// First content block should be the todos injection
		expect(params.message.content[0]?.text).toContain('<todos>');
		expect(params.message.content[0]?.text).toContain('Buy milk');
		// Original content preserved
		expect(params.message.content[1]?.text).toBe('hello');
	});

	it('no injection when todo list is empty', async () => {
		const result = await compileWithTodo();

		const received: any[] = [];
		const target = stubClient({
			prompt: async function* (params) {
				received.push(params);
			},
		});

		const wrapped = apply(result.client, target);
		await collect(
			wrapped.prompt({
				message: {
					role: 'user',
					content: [{ type: 'text', text: 'hello' }],
				},
			}),
		);

		const params = received[0] as {
			message: { content: { type: string; text: string }[] };
		};
		expect(params.message.content).toHaveLength(1);
		expect(params.message.content[0]?.text).toBe('hello');
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
		const todos = todoStore!.store.get();
		expect(todos).toHaveLength(1);
		expect((todos as any[])[0].text).toBe('Test store');
	});
});
