/* eslint-disable require-yield */
import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { createCoreCompiler } from '../compiler.js';
import { compile, combine } from '../../types.js';
import type { Compiler } from '../../types.js';
import type { Extension } from '../../../types/extension.js';
import type {
	ClientMiddleware,
	FullMiddleware,
} from '../../../api/core/middleware/types.js';
import { apply } from '../../../api/core/middleware/apply.js';
import { passThrough } from '../../../api/core/middleware/pass-through.js';
import type { MiniACPClient } from '@franklin/mini-acp';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Compile a single CoreAPI extension into FullMiddleware. */
async function compileExt(ext: Extension): Promise<FullMiddleware> {
	return compile(createCoreCompiler(), ext);
}

/** Fill missing ClientMiddleware keys with passThrough. */
function withDefaults(partial: Partial<ClientMiddleware>): ClientMiddleware {
	return {
		initialize: passThrough(),
		setContext: passThrough(),
		prompt: passThrough(),
		cancel: passThrough(),
		...partial,
	} as ClientMiddleware;
}

/** Create a minimal MiniACPClient stub for testing with apply(). */
function stubClient(overrides: Partial<MiniACPClient> = {}): MiniACPClient {
	return {
		initialize: vi.fn(async () => {}),
		setContext: vi.fn(async () => {}),
		prompt: vi.fn(async function* () {}),
		cancel: vi.fn(async () => ({ type: 'turn_end' as const, turn: 'end' })),
		...overrides,
	} as unknown as MiniACPClient;
}

/** Collect all items from an AsyncIterable. */
async function collect<T>(iter: AsyncIterable<T>): Promise<T[]> {
	const items: T[] = [];
	for await (const item of iter) items.push(item);
	return items;
}

// ---------------------------------------------------------------------------
// on() — waterfall tests
// ---------------------------------------------------------------------------

describe('buildCore – on() waterfall', () => {
	it('single prompt handler transforms params', async () => {
		const mw = await compileExt((api) => {
			api.on('prompt', (params) => ({
				message: {
					...params.message,
					content: [
						...params.message.content,
						{ type: 'text' as const, text: ' [injected]' },
					],
				},
			}));
		});

		expect(mw.client).toBeDefined();
		expect(mw.client!.prompt).toBeDefined();

		const received: any[] = [];
		const target = stubClient({
			prompt: async function* (params) {
				received.push(params);
			},
		});

		const wrapped = apply(withDefaults(mw.client!), target);

		const originalContent = [{ type: 'text' as const, text: 'hello' }];
		await collect(
			wrapped.prompt({
				message: { role: 'user', content: originalContent },
			}),
		);

		// The handler appended ' [injected]', so target should see 2 content blocks
		const params = received[0] as { message: { content: { text: string }[] } };
		expect(params.message.content).toHaveLength(2);
		expect(params.message.content[1]?.text).toBe(' [injected]');
	});

	it('multiple prompt handlers chain as waterfall', async () => {
		const calls: string[] = [];

		const mw = await compileExt((api) => {
			api.on('prompt', (params) => {
				calls.push('h1');
				return {
					message: {
						...params.message,
						content: [
							{
								type: 'text' as const,
								text: `h1(${(params.message.content[0] as { type: string; text: string }).text})`,
							},
						],
					},
				};
			});
			api.on('prompt', (params) => {
				calls.push('h2');
				return {
					message: {
						...params.message,
						content: [
							{
								type: 'text' as const,
								text: `h2(${(params.message.content[0] as { type: string; text: string }).text})`,
							},
						],
					},
				};
			});
		});

		const received: any[] = [];
		const target = stubClient({
			prompt: async function* (params) {
				received.push(params);
			},
		});

		const wrapped = apply(withDefaults(mw.client!), target);

		await collect(
			wrapped.prompt({
				message: {
					role: 'user',
					content: [{ type: 'text', text: 'x' }],
				},
			}),
		);

		expect(calls).toEqual(['h1', 'h2']);
		// h2 sees h1's output, so the final text is h2(h1(x))
		const params = received[0] as { message: { content: { text: string }[] } };
		expect(params.message.content[0]?.text).toBe('h2(h1(x))');
	});

	it('handler returning void passes through unchanged', async () => {
		const mw = await compileExt((api) => {
			api.on('prompt', () => {
				// side-effect only, no return
			});
		});

		const received: any[] = [];
		const target = stubClient({
			prompt: async function* (params) {
				received.push(params);
			},
		});

		const wrapped = apply(withDefaults(mw.client!), target);

		const original = {
			message: {
				role: 'user' as const,
				content: [{ type: 'text' as const, text: 'hello' }],
			},
		};
		await collect(wrapped.prompt(original));

		expect(received[0]).toEqual(original);
	});

	it('setContext handler transforms params', async () => {
		const mw = await compileExt((api) => {
			api.on('setContext', (params) => ({
				ctx: {
					...params.ctx,
					config: { model: 'injected-model' },
				},
			}));
		});

		expect(mw.client!.setContext).toBeDefined();

		const received: any[] = [];
		const target = stubClient({
			setContext: async (params) => {
				received.push(params);
			},
		});

		const wrapped = apply(withDefaults(mw.client!), target);

		await wrapped.setContext({
			ctx: { history: { systemPrompt: '', messages: [] } },
		});

		const params = received[0] as { ctx: { config: unknown } };
		expect(params.ctx.config).toEqual({ model: 'injected-model' });
	});
});

// ---------------------------------------------------------------------------
// registerTool() — short-circuit + context injection
// ---------------------------------------------------------------------------

describe('buildCore – registerTool()', () => {
	const testTool = {
		name: 'myTool',
		description: 'A test tool',
		schema: z.object({ input: z.string() }),
		execute: vi.fn(async (params: { input: string }) => ({
			result: params.input.toUpperCase(),
		})),
	};

	it('short-circuits toolExecute for matching tool', async () => {
		const mw = await compileExt((api) => {
			api.registerTool(testTool);
		});

		expect(mw.server).toBeDefined();
		expect(mw.server!.toolExecute).toBeDefined();

		const next = vi.fn(async () => ({
			toolCallId: 'fallback',
			content: [{ type: 'text' as const, text: 'fallback' }],
		}));

		const result = await mw.server!.toolExecute(
			{
				call: {
					type: 'toolCall',
					id: 'call-1',
					name: 'myTool',
					arguments: { input: 'hello' },
				},
			},
			next,
		);

		expect(testTool.execute).toHaveBeenCalledWith({ input: 'hello' });
		expect(result.toolCallId).toBe('call-1');
		expect(result.content[0]).toEqual({
			type: 'text',
			text: JSON.stringify({ result: 'HELLO' }),
		});
		expect(next).not.toHaveBeenCalled();
	});

	it('passes through to next for non-matching tool', async () => {
		const mw = await compileExt((api) => {
			api.registerTool(testTool);
		});

		const next = vi.fn(async () => ({
			toolCallId: 'other-call',
			content: [{ type: 'text' as const, text: 'from-next' }],
		}));

		const result = await mw.server!.toolExecute(
			{
				call: {
					type: 'toolCall',
					id: 'other-call',
					name: 'unknownTool',
					arguments: {},
				},
			},
			next,
		);

		expect(next).toHaveBeenCalled();
		expect(result.toolCallId).toBe('other-call');
	});

	it('injects tool definitions into setContext', async () => {
		const mw = await compileExt((api) => {
			api.registerTool(testTool);
		});

		expect(mw.client!.setContext).toBeDefined();

		const received: any[] = [];
		const target = stubClient({
			setContext: async (params) => {
				received.push(params);
			},
		});

		const wrapped = apply(withDefaults(mw.client!), target);

		await wrapped.setContext({
			ctx: {
				tools: [
					{
						name: 'existing',
						description: 'existing tool',
						inputSchema: {},
					},
				],
			},
		});

		const ctxParams = received[0] as {
			ctx: {
				tools: { name: string; description: string; inputSchema: unknown }[];
			};
		};
		const tools = ctxParams.ctx.tools;
		expect(tools).toHaveLength(2);
		expect(tools[0]?.name).toBe('existing');
		expect(tools[1]?.name).toBe('myTool');
		expect(tools[1]?.description).toBe('A test tool');
		expect(tools[1]?.inputSchema).toBeDefined();
	});

	it('injects tools even when ctx.tools is undefined', async () => {
		const mw = await compileExt((api) => {
			api.registerTool(testTool);
		});

		const received: any[] = [];
		const target = stubClient({
			setContext: async (params) => {
				received.push(params);
			},
		});

		const wrapped = apply(withDefaults(mw.client!), target);

		await wrapped.setContext({ ctx: {} });

		const ctxParams = received[0] as {
			ctx: { tools: { name: string }[] };
		};
		expect(ctxParams.ctx.tools).toHaveLength(1);
		expect(ctxParams.ctx.tools[0]?.name).toBe('myTool');
	});
});

// ---------------------------------------------------------------------------
// Empty extension
// ---------------------------------------------------------------------------

describe('buildCore – empty extension', () => {
	it('produces no middleware for an empty extension', async () => {
		const mw = await compileExt(() => {
			// no registrations
		});

		expect(mw.client).toBeUndefined();
		expect(mw.server).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// combine()
// ---------------------------------------------------------------------------

describe('combine', () => {
	it('merges APIs from two compilers', async () => {
		const createA = (): Compiler<
			{ greet(n: string): void },
			{ greeted: string[] }
		> => {
			const names: string[] = [];
			return {
				api: {
					greet: (n) => {
						names.push(n);
					},
				},
				async build() {
					return { greeted: names };
				},
			};
		};

		const createB = (): Compiler<
			{ log(m: string): void },
			{ logged: string[] }
		> => {
			const msgs: string[] = [];
			return {
				api: {
					log: (m) => {
						msgs.push(m);
					},
				},
				async build() {
					return { logged: msgs };
				},
			};
		};

		const result = await compile(combine(createA(), createB()), (api) => {
			api.greet('alice');
			api.log('hello');
		});

		expect(result.greeted).toEqual(['alice']);
		expect(result.logged).toEqual(['hello']);
	});

	it('is associative — combine(combine(a,b),c) ≡ combine(a,combine(b,c))', async () => {
		const createA = (): Compiler<{ a(): void }, { aCount: number }> => {
			let count = 0;
			return {
				api: {
					a() {
						count++;
					},
				},
				async build() {
					return { aCount: count };
				},
			};
		};

		const createB = (): Compiler<{ b(): void }, { bCount: number }> => {
			let count = 0;
			return {
				api: {
					b() {
						count++;
					},
				},
				async build() {
					return { bCount: count };
				},
			};
		};

		const createC = (): Compiler<{ c(): void }, { cCount: number }> => {
			let count = 0;
			return {
				api: {
					c() {
						count++;
					},
				},
				async build() {
					return { cCount: count };
				},
			};
		};

		const ext = (api: { a(): void; b(): void; c(): void }) => {
			api.a();
			api.b();
			api.c();
		};

		// Left-associated: combine(combine(a, b), c)
		const leftResult = await compile(
			combine(combine(createA(), createB()), createC()),
			ext,
		);

		// Right-associated: combine(a, combine(b, c))
		const rightResult = await compile(
			combine(createA(), combine(createB(), createC())),
			ext,
		);

		expect(leftResult).toEqual({ aCount: 1, bCount: 1, cCount: 1 });
		expect(rightResult).toEqual({ aCount: 1, bCount: 1, cCount: 1 });
	});

	it('each compiler collects independently', async () => {
		const createCounter = (
			name: string,
		): Compiler<{ inc(): void }, Record<string, number>> => {
			let count = 0;
			return {
				api: {
					inc() {
						count++;
					},
				},
				async build() {
					return { [name]: count };
				},
			};
		};

		// Two compilers with same API shape but different collectors
		const result = await compile(
			combine(createCounter('first'), createCounter('second')),
			(api) => {
				// The merged API has a single `inc` — the second compiler's wins
				// because of object spread order in combine
				api.inc();
			},
		);

		// Second compiler's inc is called (spread overwrites), first sees 0
		expect(result.first).toBe(0);
		expect(result.second).toBe(1);
	});

	it('combines core compiler with a custom compiler', async () => {
		const createTagCompiler = (): Compiler<
			{ tag(t: string): void },
			{ tags: string[] }
		> => {
			const tags: string[] = [];
			return {
				api: {
					tag(t) {
						tags.push(t);
					},
				},
				async build() {
					return { tags };
				},
			};
		};

		const result = await compile(
			combine(createCoreCompiler(), createTagCompiler()),
			(api) => {
				api.on('prompt', (params) => ({
					message: {
						...params.message,
						content: [
							{ type: 'text' as const, text: 'injected' },
							...params.message.content,
						],
					},
				}));
				api.tag('my-ext');
			},
		);

		// Core compiler produced middleware
		expect(result.client).toBeDefined();
		expect(result.client!.prompt).toBeDefined();

		// Tag compiler produced tags
		expect(result.tags).toEqual(['my-ext']);
	});

	it('empty compilers combine to empty result', async () => {
		const createEmpty = (): Compiler<object, object> => ({
			api: {},
			async build() {
				return {};
			},
		});

		const result = await compile(
			combine(createEmpty(), createEmpty()),
			() => {},
		);
		expect(result).toEqual({});
	});
});
