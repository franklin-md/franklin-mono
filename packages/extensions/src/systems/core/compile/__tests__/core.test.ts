/* eslint-disable require-yield */
import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import type { Extension } from '../../../../algebra/types/extension.js';
import type { FullMiddleware } from '../../api/middleware/types.js';
import { buildMiddleware } from '../middleware.js';
import { createCoreRegistrar } from '../registrar/index.js';
import type { CoreRuntime } from '../../runtime.js';
import { apply } from '@franklin/lib/middleware';
import type {
	MiniACPAgent,
	MiniACPClient,
	Chunk,
	ToolExecuteParams,
	Update,
} from '@franklin/mini-acp';
import { resolveToolOutput } from '../../api/tool.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build middleware directly from a single CoreAPI extension, without going
 * through the full Core compiler (which requires a transport and builds a
 * full CoreRuntime). Handlers receive `undefined` as their runtime/ctx —
 * these tests exercise middleware composition and don't touch it.
 */
async function compileExt(ext: Extension): Promise<FullMiddleware> {
	const stubCtx = undefined as unknown as CoreRuntime;
	const { api, registered } = createCoreRegistrar<CoreRuntime>();
	ext(api);
	return buildMiddleware(registered, () => stubCtx);
}

/** Create a minimal MiniACPClient stub for testing with apply(). */
type StubOverrides = {
	[K in keyof MiniACPClient]?: (...args: Parameters<MiniACPClient[K]>) => any;
};

function stubClient(overrides: StubOverrides = {}): MiniACPClient {
	return {
		initialize: vi.fn(async () => {}),
		setContext: vi.fn(async () => {}),
		prompt: vi.fn(async function* () {}),
		cancel: vi.fn(async () => ({ type: 'turn_end' as const, turn: 'end' })),
		...overrides,
	} as unknown as MiniACPClient;
}

type AgentStubOverrides = {
	[K in keyof MiniACPAgent]?: (...args: Parameters<MiniACPAgent[K]>) => any;
};

function stubAgent(overrides: AgentStubOverrides = {}): MiniACPAgent {
	return {
		toolExecute: vi.fn(async ({ call }: ToolExecuteParams) => ({
			toolCallId: call.id,
			content: [{ type: 'text' as const, text: 'ok' }],
		})),
		...overrides,
	} as unknown as MiniACPAgent;
}

/** Collect all items from an AsyncIterable. */
async function collect<T>(iter: AsyncIterable<T>): Promise<T[]> {
	const items: T[] = [];
	for await (const item of iter) items.push(item);
	return items;
}

// ---------------------------------------------------------------------------
// on() — prompt handler tests
// ---------------------------------------------------------------------------

describe('buildCore – prompt handlers', () => {
	it('single prompt handler transforms params', async () => {
		const mw = await compileExt((api) => {
			api.on('prompt', (ctx) => {
				ctx.appendContent({ type: 'text', text: ' [injected]' });
			});
		});

		expect(mw.client).toBeDefined();
		expect(mw.client.prompt).toBeDefined();

		const received: any[] = [];
		const target = stubClient({
			prompt: async function* (params) {
				received.push(params);
			},
		});

		const wrapped = apply(mw.client, target);

		const originalContent = [{ type: 'text' as const, text: 'hello' }];
		await collect(wrapped.prompt({ role: 'user', content: originalContent }));

		const params = received[0] as { content: { text: string }[] };
		expect(params.content).toHaveLength(2);
		expect(params.content[1]?.text).toBe(' [injected]');
	});

	it('multiple prompt handlers compose content against the original request', async () => {
		const calls: string[] = [];
		const seenInputs: string[] = [];

		const mw = await compileExt((api) => {
			api.on('prompt', (ctx) => {
				calls.push('h1');
				seenInputs.push(
					(ctx.request.content[0] as { type: string; text: string }).text,
				);
				ctx.prependContent({ type: 'text', text: 'h1' });
			});
			api.on('prompt', (ctx) => {
				calls.push('h2');
				seenInputs.push(
					(ctx.request.content[0] as { type: string; text: string }).text,
				);
				ctx.prependContent({ type: 'text', text: 'h2' });
			});
		});

		const received: any[] = [];
		const target = stubClient({
			prompt: async function* (params) {
				received.push(params);
			},
		});

		const wrapped = apply(mw.client, target);

		await collect(
			wrapped.prompt({
				role: 'user',
				content: [{ type: 'text', text: 'x' }],
			}),
		);

		expect(calls).toEqual(['h1', 'h2']);
		expect(seenInputs).toEqual(['x', 'x']);
		const params = received[0] as { content: { text: string }[] };
		expect(params.content.map((item) => item.text)).toEqual(['h1', 'h2', 'x']);
	});

	it('handler returning void passes through unchanged', async () => {
		let seenRequest: unknown;

		const mw = await compileExt((api) => {
			api.on('prompt', (ctx) => {
				seenRequest = ctx.request;
			});
		});

		const received: any[] = [];
		const target = stubClient({
			prompt: async function* (params) {
				received.push(params);
			},
		});

		const wrapped = apply(mw.client, target);

		const original = {
			role: 'user' as const,
			content: [{ type: 'text' as const, text: 'hello' }],
		};
		await collect(wrapped.prompt(original));

		expect(seenRequest).toBe(original);
		expect(received[0]).toBe(original);
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
		execute: vi.fn(async (params: { input: string }) =>
			params.input.toUpperCase(),
		),
	};

	it('short-circuits toolExecute for matching tool', async () => {
		const mw = await compileExt((api) => {
			api.registerTool(testTool);
		});

		expect(mw.server).toBeDefined();
		expect(mw.server.toolExecute).toBeDefined();

		const next = vi.fn(async () => ({
			toolCallId: 'fallback',
			content: [{ type: 'text' as const, text: 'fallback' }],
		}));

		const result = await mw.server.toolExecute(
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

		expect(testTool.execute).toHaveBeenCalledWith(
			{ input: 'hello' },
			undefined,
		);
		expect(result.toolCallId).toBe('call-1');
		expect(result.content[0]).toEqual({
			type: 'text',
			text: 'HELLO',
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

		const result = await mw.server.toolExecute(
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

	it('catches tool execute errors and returns isError result', async () => {
		const error = new Error('tool exploded');
		const failingTool = {
			name: 'failTool',
			description: 'A tool that throws',
			schema: z.object({}),
			execute: vi.fn(async () => {
				throw error;
			}),
		};

		const mw = await compileExt((api) => {
			api.registerTool(failingTool);
		});

		const next = vi.fn();

		const result = await mw.server.toolExecute(
			{
				call: {
					type: 'toolCall',
					id: 'call-fail',
					name: 'failTool',
					arguments: {},
				},
			},
			next,
		);

		expect(result.toolCallId).toBe('call-fail');
		expect(result.isError).toBe(true);
		expect(result.content[0]).toEqual({
			type: 'text',
			text: 'Error: tool exploded',
		});
		expect(next).not.toHaveBeenCalled();
	});

	it('catches non-Error throws and returns isError result', async () => {
		const failingTool = {
			name: 'failTool',
			description: 'A tool that throws a string',
			schema: z.object({}),
			execute: vi.fn(async () => {
				// eslint-disable-next-line @typescript-eslint/only-throw-error
				throw 'raw string error';
			}),
		};

		const mw = await compileExt((api) => {
			api.registerTool(failingTool);
		});

		const next = vi.fn();

		const result = await mw.server.toolExecute(
			{
				call: {
					type: 'toolCall',
					id: 'call-fail-2',
					name: 'failTool',
					arguments: {},
				},
			},
			next,
		);

		expect(result.toolCallId).toBe('call-fail-2');
		expect(result.isError).toBe(true);
		expect(result.content[0]).toEqual({
			type: 'text',
			text: 'raw string error',
		});
	});

	it('still notifies toolResult observer when tool throws', async () => {
		const results: Array<{ toolCallId: string; isError?: boolean }> = [];

		const mw = await compileExt((api) => {
			api.registerTool({
				name: 'failTool',
				description: 'throws',
				schema: z.object({}),
				execute: async () => {
					throw new Error('boom');
				},
			});
			api.on('toolResult', (event) => {
				results.push({
					toolCallId: event.toolCallId,
					isError: event.isError,
				});
			});
		});

		const wrapped = apply(mw.server, stubAgent());
		await wrapped.toolExecute({
			call: {
				type: 'toolCall',
				id: 'call-obs',
				name: 'failTool',
				arguments: {},
			},
		});

		expect(results).toEqual([{ toolCallId: 'call-obs', isError: true }]);
	});

	it('injects tool definitions into setContext', async () => {
		const mw = await compileExt((api) => {
			api.registerTool(testTool);
		});

		expect(mw.client.setContext).toBeDefined();

		const received: any[] = [];
		const target = stubClient({
			setContext: async (params) => {
				received.push(params);
			},
		});

		const wrapped = apply(mw.client, target);

		await wrapped.setContext({
			tools: [
				{
					name: 'existing',
					description: 'existing tool',
					inputSchema: {},
				},
			],
		});

		const ctxParams = received[0] as {
			tools: { name: string; description: string; inputSchema: unknown }[];
		};
		const tools = ctxParams.tools;
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

		const wrapped = apply(mw.client, target);

		await wrapped.setContext({});

		const ctxParams = received[0] as {
			tools: { name: string }[];
		};
		expect(ctxParams.tools).toHaveLength(1);
		expect(ctxParams.tools[0]?.name).toBe('myTool');
	});
});

// ---------------------------------------------------------------------------
// registerTool() — spec-based overload
// ---------------------------------------------------------------------------

describe('buildCore – registerTool() spec overload', () => {
	it('spec-based registration produces same middleware as inline', async () => {
		const { toolSpec } = await import('../../api/tool-spec.js');

		const spec = toolSpec(
			'specTool',
			'Doubles a number',
			z.object({ value: z.number() }),
		);
		const executeFn = vi.fn(async (params: { value: number }) =>
			JSON.stringify({ doubled: params.value * 2 }),
		);

		const mw = await compileExt((api) => {
			api.registerTool(spec, executeFn);
		});

		const next = vi.fn();
		const result = await mw.server.toolExecute(
			{
				call: {
					type: 'toolCall',
					id: 'call-spec',
					name: 'specTool',
					arguments: { value: 5 },
				},
			},
			next,
		);

		expect(executeFn).toHaveBeenCalledWith({ value: 5 }, undefined);
		expect(result.content[0]).toEqual({
			type: 'text',
			text: JSON.stringify({ doubled: 10 }),
		});
		expect(next).not.toHaveBeenCalled();

		const received: any[] = [];
		const target = stubClient({
			setContext: async (params) => {
				received.push(params);
			},
		});
		const wrapped = apply(mw.client, target);
		await wrapped.setContext({});

		const ctxParams = received[0] as { tools: { name: string }[] };
		expect(ctxParams.tools).toHaveLength(1);
		expect(ctxParams.tools[0]?.name).toBe('specTool');
	});
});

// ---------------------------------------------------------------------------
// Empty extension
// ---------------------------------------------------------------------------

describe('buildCore – empty extension', () => {
	it('produces passthrough middleware for an empty extension', async () => {
		const mw = await compileExt(() => {
			// no registrations
		});

		expect(mw.client).toBeDefined();
		expect(mw.client.prompt).toBeDefined();
		expect(mw.client.setContext).toBeDefined();
		expect(mw.client.initialize).toBeDefined();
		expect(mw.client.cancel).toBeDefined();
		expect(mw.server).toBeDefined();
		expect(mw.server.toolExecute).toBeDefined();
	});
});

// ---------------------------------------------------------------------------
// Stream observer events
// ---------------------------------------------------------------------------

describe('buildCore – stream observers', () => {
	it('on("chunk") fires for each chunk event', async () => {
		const observed: Chunk[] = [];

		const mw = await compileExt((api) => {
			api.on('chunk', (event) => {
				observed.push(event);
			});
		});

		const chunk1: Chunk = {
			type: 'chunk',
			messageId: 'm1',
			role: 'assistant',
			content: { type: 'text', text: 'hello' },
		};
		const chunk2: Chunk = {
			type: 'chunk',
			messageId: 'm1',
			role: 'assistant',
			content: { type: 'text', text: ' world' },
		};

		const target = stubClient({
			prompt: async function* () {
				yield chunk1;
				yield chunk2;
			},
		});

		const wrapped = apply(mw.client, target);
		const events = await collect(
			wrapped.prompt({
				role: 'user',
				content: [{ type: 'text', text: 'hi' }],
			}),
		);

		expect(observed).toEqual([chunk1, chunk2]);
		expect(events).toEqual([chunk1, chunk2]);
	});

	it('on("update") fires for update events only', async () => {
		const observed: Update[] = [];

		const mw = await compileExt((api) => {
			api.on('update', (event) => {
				observed.push(event);
			});
		});

		const chunk: Chunk = {
			type: 'chunk',
			messageId: 'm1',
			role: 'assistant',
			content: { type: 'text', text: 'hello' },
		};
		const update: Update = {
			type: 'update',
			messageId: 'm1',
			message: {
				role: 'assistant',
				content: [{ type: 'text', text: 'hello world' }],
			},
		};

		const target = stubClient({
			prompt: async function* () {
				yield chunk;
				yield update;
			},
		});

		const wrapped = apply(mw.client, target);
		await collect(
			wrapped.prompt({
				role: 'user',
				content: [{ type: 'text', text: 'hi' }],
			}),
		);

		expect(observed).toEqual([update]);
	});

	it('multiple observers on same event fire in registration order', async () => {
		const calls: string[] = [];

		const mw = await compileExt((api) => {
			api.on('chunk', () => {
				calls.push('observer1');
			});
			api.on('chunk', () => {
				calls.push('observer2');
			});
		});

		const target = stubClient({
			prompt: async function* () {
				yield {
					type: 'chunk',
					messageId: 'm1',
					role: 'assistant',
					content: { type: 'text', text: 'hi' },
				} as Chunk;
			},
		});

		const wrapped = apply(mw.client, target);
		await collect(
			wrapped.prompt({
				role: 'user',
				content: [{ type: 'text', text: 'hi' }],
			}),
		);

		expect(calls).toEqual(['observer1', 'observer2']);
	});

	it('observers and prompt handlers coexist', async () => {
		const observed: Chunk[] = [];
		const promptCalls: string[] = [];

		const mw = await compileExt((api) => {
			api.on('prompt', (ctx) => {
				promptCalls.push('handler');
				ctx.appendContent({ type: 'text', text: ' [injected]' });
			});
			api.on('chunk', (event) => {
				observed.push(event);
			});
		});

		const chunk: Chunk = {
			type: 'chunk',
			messageId: 'm1',
			role: 'assistant',
			content: { type: 'text', text: 'response' },
		};

		const received: any[] = [];
		const target = stubClient({
			prompt: async function* (params) {
				received.push(params);
				yield chunk;
			},
		});

		const wrapped = apply(mw.client, target);
		await collect(
			wrapped.prompt({
				role: 'user',
				content: [{ type: 'text', text: 'hi' }],
			}),
		);

		expect(promptCalls).toEqual(['handler']);
		expect(
			(received[0] as { content: { text: string }[] }).content,
		).toHaveLength(2);
		expect(observed).toEqual([chunk]);
	});

	it('no observers uses fast path — events pass through correctly', async () => {
		const mw = await compileExt((api) => {
			api.on('prompt', () => {
				// side effect only, no stream observers
			});
		});

		const chunk: Chunk = {
			type: 'chunk',
			messageId: 'm1',
			role: 'assistant',
			content: { type: 'text', text: 'hello' },
		};

		const target = stubClient({
			prompt: async function* () {
				yield chunk;
			},
		});

		const wrapped = apply(mw.client, target);
		const events = await collect(
			wrapped.prompt({
				role: 'user',
				content: [{ type: 'text', text: 'hi' }],
			}),
		);

		expect(events).toEqual([chunk]);
	});
});

describe('buildCore – tool observers', () => {
	it('on("toolCall") and on("toolResult") fire for delegated tool execution', async () => {
		const calls: Array<{ name: string }> = [];
		const results: Array<{ toolCallId: string; callName: string }> = [];

		const mw = await compileExt((api) => {
			api.on('toolCall', (event) => {
				calls.push({ name: event.call.name });
			});
			api.on('toolResult', (event) => {
				results.push({
					toolCallId: event.toolCallId,
					callName: event.call.name,
				});
			});
		});

		const target = stubAgent({
			toolExecute: vi.fn(async ({ call }: ToolExecuteParams) => ({
				toolCallId: call.id,
				content: [{ type: 'text' as const, text: 'from-next' }],
			})),
		});

		const wrapped = apply(mw.server, target);
		const result = await wrapped.toolExecute({
			call: {
				type: 'toolCall',
				id: 'call-1',
				name: 'lookup',
				arguments: { value: 1 },
			},
		});

		expect(result.toolCallId).toBe('call-1');
		expect(calls).toEqual([{ name: 'lookup' }]);
		expect(results).toEqual([{ toolCallId: 'call-1', callName: 'lookup' }]);
	});

	it('tool observers fire for extension-registered tools', async () => {
		const calls: string[] = [];
		const results: string[] = [];

		const mw = await compileExt((api) => {
			api.registerTool({
				name: 'myTool',
				description: 'A test tool',
				schema: z.object({ input: z.string() }),
				execute: async ({ input }) => input.toUpperCase(),
			});
			api.on('toolCall', (event) => {
				calls.push(event.call.id);
			});
			api.on('toolResult', (event) => {
				results.push(event.toolCallId);
			});
		});

		const wrapped = apply(mw.server, stubAgent());
		const result = await wrapped.toolExecute({
			call: {
				type: 'toolCall',
				id: 'call-2',
				name: 'myTool',
				arguments: { input: 'hello' },
			},
		});

		expect(result.toolCallId).toBe('call-2');
		expect(calls).toEqual(['call-2']);
		expect(results).toEqual(['call-2']);
	});
});

// ---------------------------------------------------------------------------
// resolveToolOutput
// ---------------------------------------------------------------------------

describe('resolveToolOutput', () => {
	it('converts a string to ToolOutput', () => {
		const result = resolveToolOutput('hello');
		expect(result).toEqual({
			content: [{ type: 'text', text: 'hello' }],
		});
	});

	it('passes through a ToolOutput unchanged', () => {
		const output = {
			content: [{ type: 'text' as const, text: 'already structured' }],
			isError: true,
		};
		const result = resolveToolOutput(output);
		expect(result).toBe(output);
	});
});

// ---------------------------------------------------------------------------
// registerTool — ToolOutput passthrough (isError)
// ---------------------------------------------------------------------------

describe('buildCore – registerTool() ToolOutput passthrough', () => {
	it('preserves isError when execute returns a full ToolOutput', async () => {
		const mw = await compileExt((api) => {
			api.registerTool({
				name: 'errorTool',
				description: 'Returns an error ToolOutput',
				schema: z.object({}),
				execute: async () => ({
					content: [{ type: 'text' as const, text: 'bad input' }],
					isError: true,
				}),
			});
		});

		const next = vi.fn();
		const result = await mw.server.toolExecute(
			{
				call: {
					type: 'toolCall',
					id: 'call-err',
					name: 'errorTool',
					arguments: {},
				},
			},
			next,
		);

		expect(result.isError).toBe(true);
		expect(result.content[0]).toEqual({ type: 'text', text: 'bad input' });
	});
});
