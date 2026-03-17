import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { ExtensionAPI, ExtensionToolDefinition } from '../types/index.js';
import type { Extension } from '../types/index.js';
import { onTool } from '../wrapper/on-tool.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Run setup and return the registered tools. */
async function collectTools(
	ext: Extension,
): Promise<ExtensionToolDefinition[]> {
	const tools: ExtensionToolDefinition[] = [];
	const api: ExtensionAPI = {
		on: () => {},
		registerTool: (tool) => tools.push(tool),
	};
	await ext.setup(api);
	return tools;
}

function findTool(tools: ExtensionToolDefinition[], name: string) {
	const tool = tools.find((t) => t.name === name);
	if (!tool) throw new Error(`Tool ${name} not found`);
	return tool;
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const greetTool: ExtensionToolDefinition<
	{ name: string },
	{ greeting: string }
> = {
	name: 'greet',
	description: 'Greet someone',
	schema: z.object({ name: z.string() }),
	execute: async (params: { name: string }) => ({
		greeting: `Hello, ${params.name}!`,
	}),
};

const counterTool: ExtensionToolDefinition<
	Record<string, never>,
	{ count: number }
> = {
	name: 'counter',
	description: 'Increment counter',
	schema: z.object({}),
	execute: async () => ({ count: 1 }),
};

function createBaseExtension(): Extension {
	return {
		name: 'base',
		async setup(api) {
			api.registerTool(greetTool);
			api.registerTool(counterTool);
		},
	};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('onTool', () => {
	describe('pre-call gating', () => {
		it('blocks execution when call does not invoke next', async () => {
			const gated = onTool(
				createBaseExtension(),
				greetTool,
				async (_params, _next) => {
					throw new Error('Blocked: greet is disabled');
				},
			);

			const tools = await collectTools(gated);
			const tool = findTool(tools, 'greet');

			await expect(tool.execute({ name: 'World' })).rejects.toThrow(
				'Blocked: greet is disabled',
			);
		});

		it('blocks conditionally based on params', async () => {
			const gated = onTool(
				createBaseExtension(),
				greetTool,
				async (params, next) => {
					if (params.name === 'Evil') {
						throw new Error('Blocked: forbidden name');
					}
					return next(params);
				},
			);

			const tools = await collectTools(gated);
			const tool = findTool(tools, 'greet');

			const result = await tool.execute({ name: 'Alice' });
			expect(result).toEqual({ greeting: 'Hello, Alice!' });

			await expect(tool.execute({ name: 'Evil' })).rejects.toThrow(
				'Blocked: forbidden name',
			);
		});

		it('does not affect other tools', async () => {
			const gated = onTool(
				createBaseExtension(),
				greetTool,
				async (_params, _next) => {
					throw new Error('Blocked');
				},
			);

			const tools = await collectTools(gated);
			const counter = findTool(tools, 'counter');

			const result = await counter.execute({} as Record<string, never>);
			expect(result).toEqual({ count: 1 });
		});

		it('can modify params before forwarding', async () => {
			const modified = onTool(
				createBaseExtension(),
				greetTool,
				async (params, next) => {
					return next({ name: params.name.toUpperCase() });
				},
			);

			const tools = await collectTools(modified);
			const tool = findTool(tools, 'greet');

			const result = await tool.execute({ name: 'alice' });
			expect(result).toEqual({ greeting: 'Hello, ALICE!' });
		});
	});

	describe('post-call transformation', () => {
		it('transforms the result after execution', async () => {
			const transformed = onTool(
				createBaseExtension(),
				greetTool,
				async (params, next) => {
					const result = await next(params);
					return { greeting: result.greeting + ' (modified)' };
				},
			);

			const tools = await collectTools(transformed);
			const tool = findTool(tools, 'greet');

			const result = await tool.execute({ name: 'World' });
			expect(result).toEqual({ greeting: 'Hello, World! (modified)' });
		});

		it('can replace the result entirely', async () => {
			const replaced = onTool(
				createBaseExtension(),
				counterTool,
				async (params, next) => {
					const result = await next(params);
					return { count: result.count * 100 };
				},
			);

			const tools = await collectTools(replaced);
			const tool = findTool(tools, 'counter');

			const result = await tool.execute({} as Record<string, never>);
			expect(result).toEqual({ count: 100 });
		});

		it('can observe and log without modifying', async () => {
			const log: Array<{ tool: string; result: unknown }> = [];

			const logged = onTool(
				createBaseExtension(),
				greetTool,
				async (params, next) => {
					const result = await next(params);
					log.push({ tool: 'greet', result });
					return result;
				},
			);

			const tools = await collectTools(logged);
			const tool = findTool(tools, 'greet');
			await tool.execute({ name: 'Test' });

			expect(log).toHaveLength(1);
			expect(log[0]).toEqual({
				tool: 'greet',
				result: { greeting: 'Hello, Test!' },
			});
		});
	});

	describe('composition', () => {
		it('stacks multiple wrappers in onion order', async () => {
			const order: string[] = [];

			const inner = onTool(
				createBaseExtension(),
				greetTool,
				async (params, next) => {
					order.push('inner-before');
					const result = await next(params);
					order.push('inner-after');
					return result;
				},
			);

			const outer = onTool(inner, greetTool, async (params, next) => {
				order.push('outer-before');
				const result = await next(params);
				order.push('outer-after');
				return result;
			});

			const tools = await collectTools(outer);
			const tool = findTool(tools, 'greet');
			await tool.execute({ name: 'Test' });

			expect(order).toEqual([
				'outer-before',
				'inner-before',
				'inner-after',
				'outer-after',
			]);
		});
	});
});
