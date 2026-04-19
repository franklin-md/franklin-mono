/* eslint-disable require-yield */
import { describe, it, expect, vi } from 'vitest';
import { apply } from '@franklin/lib/middleware';
import type { StoreRuntime } from '../../systems/store/runtime.js';
import type {
	MiniACPAgent,
	MiniACPClient,
	Chunk,
	ToolExecuteParams,
	Update,
	TurnEnd,
} from '@franklin/mini-acp';
import { StopCode } from '@franklin/mini-acp';
import { compileCoreWithStore } from '../../testing/compile-ext.js';
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
		expect(blocks[0]).toEqual({ kind: 'text', text: 'hello world' });
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
		expect(blocks[0]).toEqual({ kind: 'thinking', text: 'reasoning...' });
		expect(blocks[1]).toEqual({ kind: 'text', text: 'visible' });
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
		expect(blocks[0]).toEqual({ kind: 'thinking', text: 'first second' });
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
			result: [{ type: 'text', text: 'ok' }],
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
			result: [{ type: 'text', text: 'Permission denied' }],
			isError: true,
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
			result: [{ type: 'text', text: 'file contents here' }],
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
		expect(blocks[0]).toEqual({ kind: 'text', text: 'Let me check' });
		expect(blocks[1]).toEqual({
			kind: 'toolUse',
			call: {
				type: 'toolCall',
				id: 'tc1',
				name: 'read_file',
				arguments: { path: '/foo' },
			},
			result: [{ type: 'text', text: 'contents' }],
		});
		expect(blocks[2]).toEqual({
			kind: 'text',
			text: 'Here is the result',
		});
		expect(blocks[3]).toEqual({
			kind: 'turnEnd',
			stopCode: StopCode.Finished,
			stopMessage: undefined,
		});
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
