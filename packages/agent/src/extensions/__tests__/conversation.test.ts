/* eslint-disable require-yield */
import { describe, it, expect, vi } from 'vitest';
import { apply } from '@franklin/lib/middleware';
import { z } from 'zod';
import type {
	MiniACPAgent,
	MiniACPClient,
	Chunk,
	ToolExecuteParams,
	Update,
	TurnEnd,
	Usage,
} from '@franklin/mini-acp';
import { StopCode } from '@franklin/mini-acp';
import type { StoreRuntime } from '../../modules/store/runtime.js';
import { compileCoreWithStore } from '../../testing/compile-ext.js';
import { toolSpec } from '../../modules/core/index.js';
import { conversationExtension } from '../conversation/extension.js';
import { conversationKey } from '../conversation/key.js';
import type { ConversationTurn } from '../conversation/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

async function collect<T>(iter: AsyncIterable<T>): Promise<T[]> {
	const items: T[] = [];
	for await (const item of iter) items.push(item);
	return items;
}

function getTurns(stores: StoreRuntime): ConversationTurn[] {
	return stores.getStore(conversationKey).get();
}

function compileConversation() {
	return compileCoreWithStore(conversationExtension());
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('conversationExtension', () => {
	it('registers the conversation store without tools', async () => {
		const { stores, tools } = await compileConversation();

		expect(getTurns(stores)).toEqual([]);
		expect(tools).toEqual([]);
	});

	it('records user prompt on prompt', async () => {
		const { middleware, stores } = await compileConversation();

		const target = stubClient();
		const wrapped = apply(middleware.client, target);

		await collect(
			wrapped.prompt({
				role: 'user',
				content: [{ type: 'text', text: 'hello' }],
			}),
		);

		const turns = getTurns(stores);
		expect(turns).toHaveLength(1);
		expect(turns[0]!.prompt.role).toBe('user');
		expect(turns[0]!.prompt.content).toEqual([{ type: 'text', text: 'hello' }]);
		expect(turns[0]!.response).toEqual({ blocks: [] });
	});

	it('coalesces adjacent text chunks into one text block', async () => {
		const { middleware, stores } = await compileConversation();

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

		const wrapped = apply(middleware.client, target);
		await collect(
			wrapped.prompt({
				role: 'user',
				content: [{ type: 'text', text: 'hi' }],
			}),
		);

		const turns = getTurns(stores);
		expect(turns).toHaveLength(1);
		const blocks = turns[0]!.response.blocks;
		expect(blocks).toHaveLength(1);
		expect(blocks[0]).toEqual({
			kind: 'text',
			text: 'hello world',
			startedAt: expect.any(Number),
		});
		expect(blocks[0]!.endedAt).toBeUndefined();
	});

	it('creates separate blocks for thinking then text', async () => {
		const { middleware, stores } = await compileConversation();

		const thinkingChunk: Chunk = {
			type: 'chunk',
			messageId: 'm1',
			role: 'assistant',
			content: { type: 'thinking', text: 'reasoning...' },
		};
		const textChunk: Chunk = {
			type: 'chunk',
			messageId: 'm1',
			role: 'assistant',
			content: { type: 'text', text: 'visible' },
		};

		const target = stubClient({
			prompt: async function* () {
				yield thinkingChunk;
				yield textChunk;
			},
		});

		const wrapped = apply(middleware.client, target);
		await collect(
			wrapped.prompt({
				role: 'user',
				content: [{ type: 'text', text: 'hi' }],
			}),
		);

		const turns = getTurns(stores);
		const blocks = turns[0]!.response.blocks;
		expect(blocks).toHaveLength(2);
		expect(blocks[0]).toEqual({
			kind: 'thinking',
			text: 'reasoning...',
			startedAt: expect.any(Number),
			endedAt: expect.any(Number),
		});
		expect(blocks[1]).toEqual({
			kind: 'text',
			text: 'visible',
			startedAt: expect.any(Number),
		});
		expect(blocks[1]!.endedAt).toBeUndefined();
	});

	it('coalesces adjacent thinking chunks', async () => {
		const { middleware, stores } = await compileConversation();

		const target = stubClient({
			prompt: async function* () {
				yield {
					type: 'chunk',
					messageId: 'm1',
					role: 'assistant',
					content: { type: 'thinking', text: 'first ' },
				} satisfies Chunk;
				yield {
					type: 'chunk',
					messageId: 'm1',
					role: 'assistant',
					content: { type: 'thinking', text: 'second' },
				} satisfies Chunk;
			},
		});

		const wrapped = apply(middleware.client, target);
		await collect(
			wrapped.prompt({
				role: 'user',
				content: [{ type: 'text', text: 'hi' }],
			}),
		);

		const blocks = getTurns(stores)[0]!.response.blocks;
		expect(blocks).toHaveLength(1);
		expect(blocks[0]).toEqual({
			kind: 'thinking',
			text: 'first second',
			startedAt: expect.any(Number),
		});
		expect(blocks[0]!.endedAt).toBeUndefined();
	});

	it('records tool call from toolExecute as toolUse block', async () => {
		const { middleware, stores } = await compileConversation();

		const agent = stubAgent();
		const wrappedAgent = apply(middleware.server, agent);

		const target = stubClient({
			prompt: async function* () {
				await wrappedAgent.toolExecute({
					call: {
						type: 'toolCall',
						id: 'tc1',
						name: 'read_file',
						arguments: { path: '/foo' },
					},
				});
			},
		});

		const wrapped = apply(middleware.client, target);
		await collect(
			wrapped.prompt({
				role: 'user',
				content: [{ type: 'text', text: 'hi' }],
			}),
		);

		const turns = getTurns(stores);
		const blocks = turns[0]!.response.blocks;
		expect(blocks).toHaveLength(1);
		expect(blocks[0]).toEqual({
			kind: 'toolUse',
			call: {
				type: 'toolCall',
				id: 'tc1',
				name: 'read_file',
				arguments: { path: '/foo' },
			},
			result: {
				content: [{ type: 'text', text: 'ok' }],
			},
			startedAt: expect.any(Number),
			endedAt: expect.any(Number),
		});
	});

	it('records isError from tool result on toolUse block', async () => {
		const { middleware, stores } = await compileConversation();
		const agent = stubAgent({
			toolExecute: vi.fn(async ({ call }: ToolExecuteParams) => ({
				toolCallId: call.id,
				content: [{ type: 'text' as const, text: 'Permission denied' }],
				isError: true,
			})),
		});
		const wrappedAgent = apply(middleware.server, agent);

		const target = stubClient({
			prompt: async function* () {
				await wrappedAgent.toolExecute({
					call: {
						type: 'toolCall',
						id: 'tc1',
						name: 'write_file',
						arguments: { path: '/etc/passwd' },
					},
				});
			},
		});

		const wrapped = apply(middleware.client, target);
		await collect(
			wrapped.prompt({
				role: 'user',
				content: [{ type: 'text', text: 'hi' }],
			}),
		);

		const blocks = getTurns(stores)[0]!.response.blocks;
		expect(blocks).toHaveLength(1);
		expect(blocks[0]).toEqual({
			kind: 'toolUse',
			call: {
				type: 'toolCall',
				id: 'tc1',
				name: 'write_file',
				arguments: { path: '/etc/passwd' },
			},
			result: {
				content: [{ type: 'text', text: 'Permission denied' }],
				isError: true,
			},
			startedAt: expect.any(Number),
			endedAt: expect.any(Number),
		});
	});

	it('records raw registered tool output on toolUse block', async () => {
		type Output = { count: number; files: string[] };
		const spec = toolSpec<'count_matches', { pattern: string }, Output>(
			'count_matches',
			'Counts matches',
			z.object({ pattern: z.string() }),
		);
		const conversation = conversationExtension();
		const { middleware, stores } = await compileCoreWithStore((api) => {
			conversation(api);
			api.registerTool(spec, {
				execute: async ({ pattern }) => ({
					count: pattern.length,
					files: ['src/a.ts'],
				}),
				render: ({ count }) => ({
					content: [{ type: 'text', text: `matches:${count}` }],
				}),
			});
		});
		const wrappedAgent = apply(middleware.server, stubAgent());

		const target = stubClient({
			prompt: async function* () {
				await wrappedAgent.toolExecute({
					call: {
						type: 'toolCall',
						id: 'tc1',
						name: 'count_matches',
						arguments: { pattern: 'foo' },
					},
				});
			},
		});

		const wrapped = apply(middleware.client, target);
		await collect(
			wrapped.prompt({
				role: 'user',
				content: [{ type: 'text', text: 'hi' }],
			}),
		);

		const block = getTurns(stores)[0]!.response.blocks[0];
		expect(block).toMatchObject({
			kind: 'toolUse',
			result: {
				content: [{ type: 'text', text: 'matches:3' }],
			},
			output: { count: 3, files: ['src/a.ts'] },
		});
	});

	it('pairs tool result with matching tool call', async () => {
		const { middleware, stores } = await compileConversation();
		const agent = stubAgent({
			toolExecute: vi.fn(async ({ call }: ToolExecuteParams) => ({
				toolCallId: call.id,
				content: [{ type: 'text' as const, text: 'file contents here' }],
			})),
		});
		const wrappedAgent = apply(middleware.server, agent);

		const target = stubClient({
			prompt: async function* () {
				await wrappedAgent.toolExecute({
					call: {
						type: 'toolCall',
						id: 'tc1',
						name: 'read_file',
						arguments: { path: '/foo' },
					},
				});
			},
		});

		const wrapped = apply(middleware.client, target);
		await collect(
			wrapped.prompt({
				role: 'user',
				content: [{ type: 'text', text: 'hi' }],
			}),
		);

		const blocks = getTurns(stores)[0]!.response.blocks;
		expect(blocks).toHaveLength(1);
		expect(blocks[0]).toEqual({
			kind: 'toolUse',
			call: {
				type: 'toolCall',
				id: 'tc1',
				name: 'read_file',
				arguments: { path: '/foo' },
			},
			result: {
				content: [{ type: 'text', text: 'file contents here' }],
			},
			startedAt: expect.any(Number),
			endedAt: expect.any(Number),
		});
	});

	it('records overlapping registered tool calls with independent lifecycles', async () => {
		type Output = { text: string };
		const spec = toolSpec<'spawn', { name: string; prompt: string }, Output>(
			'spawn',
			'Spawns work',
			z.object({ name: z.string(), prompt: z.string() }),
		);
		const resolvers = new Map<string, (output: Output) => void>();
		const conversation = conversationExtension();
		const { middleware, stores } = await compileCoreWithStore((api) => {
			conversation(api);
			api.registerTool(spec, {
				execute: ({ name }) =>
					new Promise<Output>((resolve) => {
						resolvers.set(name, resolve);
					}),
				render: ({ text }) => ({
					content: [{ type: 'text', text }],
				}),
			});
		});
		let now = 0;
		const dateNow = vi.spyOn(Date, 'now').mockImplementation(() => now);
		const wrappedAgent = apply(middleware.server, stubAgent());

		const target = stubClient({
			prompt: async function* () {
				now = 100;
				const first = wrappedAgent.toolExecute({
					call: {
						type: 'toolCall',
						id: 'tc1',
						name: 'spawn',
						arguments: { name: 'First', prompt: 'Do first' },
					},
				});

				now = 125;
				const second = wrappedAgent.toolExecute({
					call: {
						type: 'toolCall',
						id: 'tc2',
						name: 'spawn',
						arguments: { name: 'Second', prompt: 'Do second' },
					},
				});

				now = 500;
				resolvers.get('First')?.({ text: 'first done' });
				await first;

				now = 900;
				resolvers.get('Second')?.({ text: 'second done' });
				await second;
			},
		});

		try {
			const wrapped = apply(middleware.client, target);
			await collect(
				wrapped.prompt({
					role: 'user',
					content: [{ type: 'text', text: 'fan out' }],
				}),
			);
		} finally {
			dateNow.mockRestore();
		}

		const blocks = getTurns(stores)[0]!.response.blocks;
		expect(blocks).toHaveLength(2);
		expect(blocks[0]).toMatchObject({
			kind: 'toolUse',
			call: { id: 'tc1', name: 'spawn' },
			startedAt: 100,
			endedAt: 500,
			result: {
				content: [{ type: 'text', text: 'first done' }],
			},
		});
		expect(blocks[1]).toMatchObject({
			kind: 'toolUse',
			call: { id: 'tc2', name: 'spawn' },
			startedAt: 125,
			endedAt: 900,
			result: {
				content: [{ type: 'text', text: 'second done' }],
			},
		});
	});

	it('ignores update (no-op until reconciliation is implemented)', async () => {
		const { middleware, stores } = await compileConversation();

		const target = stubClient({
			prompt: async function* () {
				yield {
					type: 'update',
					messageId: 'm1',
					message: {
						role: 'assistant',
						content: [{ type: 'text', text: 'final only' }],
					},
				} satisfies Update;
			},
		});

		const wrapped = apply(middleware.client, target);
		await collect(
			wrapped.prompt({
				role: 'user',
				content: [{ type: 'text', text: 'hi' }],
			}),
		);

		const blocks = getTurns(stores)[0]!.response.blocks;
		expect(blocks).toHaveLength(0);
	});

	it('records turnEnd block', async () => {
		const { middleware, stores } = await compileConversation();

		const turnEnd: TurnEnd = {
			type: 'turnEnd',
			stopCode: StopCode.Finished,
		};

		const target = stubClient({
			prompt: async function* () {
				yield turnEnd;
			},
		});

		const wrapped = apply(middleware.client, target);
		await collect(
			wrapped.prompt({
				role: 'user',
				content: [{ type: 'text', text: 'hi' }],
			}),
		);

		const blocks = getTurns(stores)[0]!.response.blocks;
		expect(blocks).toHaveLength(1);
		expect(blocks[0]).toEqual({
			kind: 'turnEnd',
			stopCode: StopCode.Finished,
			stopMessage: undefined,
			startedAt: expect.any(Number),
			endedAt: expect.any(Number),
		});
	});

	it('records usage on the turnEnd block when present', async () => {
		const { middleware, stores } = await compileConversation();

		const usage: Usage = {
			tokens: { input: 12, output: 5, cacheRead: 0, cacheWrite: 0, total: 17 },
			cost: {
				input: 0.000036,
				output: 0.00003,
				cacheRead: 0,
				cacheWrite: 0,
				total: 0.000066,
			},
		};

		const turnEnd: TurnEnd = {
			type: 'turnEnd',
			stopCode: StopCode.Finished,
			usage,
		};

		const target = stubClient({
			prompt: async function* () {
				yield turnEnd;
			},
		});

		const wrapped = apply(middleware.client, target);
		await collect(
			wrapped.prompt({
				role: 'user',
				content: [{ type: 'text', text: 'hi' }],
			}),
		);

		const blocks = getTurns(stores)[0]!.response.blocks;
		expect(blocks).toHaveLength(1);
		expect(blocks[0]).toEqual({
			kind: 'turnEnd',
			stopCode: StopCode.Finished,
			stopMessage: undefined,
			usage,
			startedAt: expect.any(Number),
			endedAt: expect.any(Number),
		});
	});

	it('records turnEnd with error info', async () => {
		const { middleware, stores } = await compileConversation();

		const turnEnd: TurnEnd = {
			type: 'turnEnd',
			stopCode: StopCode.LlmError,
			stopMessage: 'Missing API key',
		};

		const target = stubClient({
			prompt: async function* () {
				yield turnEnd;
			},
		});

		const wrapped = apply(middleware.client, target);
		await collect(
			wrapped.prompt({
				role: 'user',
				content: [{ type: 'text', text: 'hi' }],
			}),
		);

		const blocks = getTurns(stores)[0]!.response.blocks;
		expect(blocks).toHaveLength(1);
		expect(blocks[0]).toEqual({
			kind: 'turnEnd',
			stopCode: StopCode.LlmError,
			stopMessage: 'Missing API key',
			startedAt: expect.any(Number),
			endedAt: expect.any(Number),
		});
	});

	it('full turn: text chunks + tool call + tool result + more text + turnEnd', async () => {
		const { middleware, stores } = await compileConversation();
		const agent = stubAgent({
			toolExecute: vi.fn(async ({ call }: ToolExecuteParams) => ({
				toolCallId: call.id,
				content: [{ type: 'text' as const, text: 'contents' }],
			})),
		});
		const wrappedAgent = apply(middleware.server, agent);

		const target = stubClient({
			prompt: async function* () {
				yield {
					type: 'chunk',
					messageId: 'm1',
					role: 'assistant',
					content: { type: 'text', text: 'Let me check' },
				} satisfies Chunk;

				await wrappedAgent.toolExecute({
					call: {
						type: 'toolCall',
						id: 'tc1',
						name: 'read_file',
						arguments: { path: '/foo' },
					},
				});

				yield {
					type: 'chunk',
					messageId: 'm2',
					role: 'assistant',
					content: { type: 'text', text: 'Here is the result' },
				} satisfies Chunk;

				yield {
					type: 'turnEnd',
					stopCode: StopCode.Finished,
				} satisfies TurnEnd;
			},
		});

		const wrapped = apply(middleware.client, target);
		await collect(
			wrapped.prompt({
				role: 'user',
				content: [{ type: 'text', text: 'read /foo' }],
			}),
		);

		const turn = getTurns(stores)[0]!;
		expect(turn.prompt.content[0]).toEqual({
			type: 'text',
			text: 'read /foo',
		});

		const blocks = turn.response.blocks;
		expect(blocks).toHaveLength(4);
		expect(blocks[0]).toEqual({
			kind: 'text',
			text: 'Let me check',
			startedAt: expect.any(Number),
			endedAt: expect.any(Number),
		});
		expect(blocks[1]).toEqual({
			kind: 'toolUse',
			call: {
				type: 'toolCall',
				id: 'tc1',
				name: 'read_file',
				arguments: { path: '/foo' },
			},
			result: {
				content: [{ type: 'text', text: 'contents' }],
			},
			startedAt: expect.any(Number),
			endedAt: expect.any(Number),
		});
		expect(blocks[2]).toEqual({
			kind: 'text',
			text: 'Here is the result',
			startedAt: expect.any(Number),
			endedAt: expect.any(Number),
		});
		expect(blocks[3]).toEqual({
			kind: 'turnEnd',
			stopCode: StopCode.Finished,
			stopMessage: undefined,
			startedAt: expect.any(Number),
			endedAt: expect.any(Number),
		});

		// Contiguity at startNewBlock-linked boundaries: when a new block
		// is opened, it closes the trailing block at the same instant, so
		// those two timestamps match exactly.
		// blocks[0] (text) → blocks[1] (toolUse): handleToolCall closes the
		// text via startNewBlock.
		expect(blocks[0]!.endedAt).toBe(blocks[1]!.startedAt);
		// blocks[2] (text) → blocks[3] (turnEnd): handleTurnEnd closes all
		// remaining open blocks at the turnEnd timestamp.
		expect(blocks[2]!.endedAt).toBe(blocks[3]!.startedAt);
		// blocks[1] (toolUse) → blocks[2] (text) is NOT contiguous: the
		// tool-result event closes the toolUse independently of when the
		// next chunk arrives.
		expect(blocks[1]!.endedAt!).toBeLessThanOrEqual(blocks[2]!.startedAt);

		// turnEnd is instantaneous: startedAt === endedAt.
		expect(blocks[3]!.startedAt).toBe(blocks[3]!.endedAt);
	});

	it('multiple turns from multiple prompt calls', async () => {
		const { middleware, stores } = await compileConversation();

		const target = stubClient();
		const wrapped = apply(middleware.client, target);

		await collect(
			wrapped.prompt({
				role: 'user',
				content: [{ type: 'text', text: 'first' }],
			}),
		);

		await collect(
			wrapped.prompt({
				role: 'user',
				content: [{ type: 'text', text: 'second' }],
			}),
		);

		const turns = getTurns(stores);
		expect(turns).toHaveLength(2);
		expect(turns[0]!.prompt.content[0]).toEqual({
			type: 'text',
			text: 'first',
		});
		expect(turns[1]!.prompt.content[0]).toEqual({
			type: 'text',
			text: 'second',
		});
	});
});
