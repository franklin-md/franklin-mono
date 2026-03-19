import { describe, expect, it, vi } from 'vitest';

import type { ContentBlock } from '@agentclientprotocol/sdk';
import { AGENT_METHODS } from '@agentclientprotocol/sdk';

import { compileExtension } from '../compile/index.js';
import type { Extension, ExtensionToolDefinition } from '../types/index.js';
import { TodoExtension } from '../examples/todo/index.js';
import {
	createMockTransportFactory,
	createTransportPair,
	sendCommand,
} from './helpers.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Wraps an extension to intercept tool registrations.
 * Returns the wrapped extension + the captured tool list.
 */
function wrapExtension(extension: Extension<any>): {
	wrapped: Extension<any>;
	tools: ExtensionToolDefinition[];
} {
	const tools: ExtensionToolDefinition[] = [];
	const wrapped: Extension<any> = {
		name: extension.name,
		async setup(api) {
			const originalRegisterTool = api.registerTool.bind(api);
			api.registerTool = (tool) => {
				tools.push(tool);
				originalRegisterTool(tool);
			};
			await extension.setup(api);
		},
	};
	return { wrapped, tools };
}

function findTool(tools: ExtensionToolDefinition[], name: string) {
	const tool = tools.find((t) => t.name === name);
	if (!tool) throw new Error(`Tool ${name} not found`);
	return tool;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TodoExtension', () => {
	describe('tool registration', () => {
		it('registers 3 tools and creates a transport', async () => {
			const ext = new TodoExtension();
			const { factory, getTransport } = createMockTransportFactory();
			await compileExtension(ext, factory);

			expect(getTransport()).toBeDefined();
		});
	});

	describe('add_todo', () => {
		it('updates store and returns id', async () => {
			const ext = new TodoExtension();
			const { wrapped, tools } = wrapExtension(ext);
			const { factory } = createMockTransportFactory();
			await compileExtension(wrapped, factory);

			const addTool = findTool(tools, 'add_todo');
			const result = (await addTool.execute({ text: 'Buy milk' })) as {
				id: string;
			};

			expect(result.id).toBeDefined();
			expect(typeof result.id).toBe('string');
			expect(ext.state.get()).toHaveLength(1);
			expect(ext.state.get()[0]!.text).toBe('Buy milk');
			expect(ext.state.get()[0]!.completed).toBe(false);
		});
	});

	describe('complete_todo', () => {
		it('marks a todo as completed', async () => {
			const ext = new TodoExtension();
			const { wrapped, tools } = wrapExtension(ext);
			const { factory } = createMockTransportFactory();
			await compileExtension(wrapped, factory);

			const addTool = findTool(tools, 'add_todo');
			const completeTool = findTool(tools, 'complete_todo');

			const { id } = (await addTool.execute({ text: 'Test' })) as {
				id: string;
			};
			await completeTool.execute({ id });

			expect(ext.state.get()[0]!.completed).toBe(true);
		});

		it('throws on invalid id', async () => {
			const ext = new TodoExtension();
			const { wrapped, tools } = wrapExtension(ext);
			const { factory } = createMockTransportFactory();
			await compileExtension(wrapped, factory);

			const completeTool = findTool(tools, 'complete_todo');

			await expect(completeTool.execute({ id: 'nonexistent' })).rejects.toThrow(
				'Todo not found: nonexistent',
			);
		});
	});

	describe('list_todos', () => {
		it('returns current state', async () => {
			const ext = new TodoExtension();
			const { wrapped, tools } = wrapExtension(ext);
			const { factory } = createMockTransportFactory();
			await compileExtension(wrapped, factory);

			const addTool = findTool(tools, 'add_todo');
			const listTool = findTool(tools, 'list_todos');

			await addTool.execute({ text: 'First' });
			await addTool.execute({ text: 'Second' });

			const result = (await listTool.execute({})) as {
				todos: Array<{ text: string }>;
			};
			expect(result.todos).toHaveLength(2);
			expect(result.todos[0]!.text).toBe('First');
			expect(result.todos[1]!.text).toBe('Second');
		});
	});

	describe('prompt handler', () => {
		it('passes through when no todos', async () => {
			const ext = new TodoExtension();
			const { factory } = createMockTransportFactory();
			const middleware = await compileExtension(ext, factory);

			const { a: agent, b: inner } = createTransportPair();
			const app = middleware(inner);

			const msg = await sendCommand(app, agent, AGENT_METHODS.session_prompt, {
				sessionId: 'test',
				prompt: [{ type: 'text', text: 'hello' }],
			});

			const prompt = (msg as { params: { prompt: ContentBlock[] } }).params
				.prompt;
			expect(prompt).toHaveLength(1);
			expect((prompt[0] as { text: string }).text).toBe('hello');
		});

		it('prepends formatted todo list when todos exist', async () => {
			const ext = new TodoExtension();
			const { wrapped: wrappedExt, tools } = wrapExtension(ext);
			const { factory } = createMockTransportFactory();
			const middleware = await compileExtension(wrappedExt, factory);

			const addTool = findTool(tools, 'add_todo');
			await addTool.execute({ text: 'Buy milk' });

			const { a: agent, b: inner } = createTransportPair();
			const app = middleware(inner);

			const msg = await sendCommand(app, agent, AGENT_METHODS.session_prompt, {
				sessionId: 'test',
				prompt: [{ type: 'text', text: 'hello' }],
			});

			const prompt = (msg as { params: { prompt: ContentBlock[] } }).params
				.prompt;
			expect(prompt).toHaveLength(2);
			const prefix = (prompt[0] as { text: string }).text;
			expect(prefix).toContain('<todos>');
			expect(prefix).toContain('Buy milk');
			expect((prompt[1] as { text: string }).text).toBe('hello');
		});
	});

	describe('store subscription', () => {
		it('fires on tool execution', async () => {
			const ext = new TodoExtension();
			const { wrapped, tools } = wrapExtension(ext);
			const { factory } = createMockTransportFactory();
			await compileExtension(wrapped, factory);

			const listener = vi.fn();
			ext.state.subscribe(listener);

			const addTool = findTool(tools, 'add_todo');
			await addTool.execute({ text: 'Test' });

			expect(listener).toHaveBeenCalledTimes(1);
			expect(listener).toHaveBeenCalledWith(
				expect.arrayContaining([expect.objectContaining({ text: 'Test' })]),
			);
		});
	});

	describe('independence', () => {
		it('two instances are independent', async () => {
			const ext1 = new TodoExtension();
			const ext2 = new TodoExtension();

			const wrap1 = wrapExtension(ext1);
			const wrap2 = wrapExtension(ext2);

			const { factory: f1 } = createMockTransportFactory();
			const { factory: f2 } = createMockTransportFactory();
			await compileExtension(wrap1.wrapped, f1);
			await compileExtension(wrap2.wrapped, f2);

			const addTool1 = findTool(wrap1.tools, 'add_todo');
			await addTool1.execute({ text: 'Instance 1 only' });

			expect(ext1.state.get()).toHaveLength(1);
			expect(ext2.state.get()).toHaveLength(0);
		});
	});
});
