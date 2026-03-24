import { describe, it, expect, vi } from 'vitest';
import { createCoreCompiler } from '../../compile/core/compiler.js';
import { createStoreCompiler } from '../../compile/store/compiler.js';
import { compile, combine } from '../../compile/types.js';
import { apply } from '../../api/core/middleware/apply.js';
import { createEmptyStoreResult } from '../../api/store/registry/result.js';
import type { MiniACPClient, Chunk, Update } from '@franklin/mini-acp';
import { conversationExtension } from '../conversation/extension.js';
import type { ConversationTurn } from '../conversation/types.js';
import type { StoreResult } from '../../api/index.js';
import { StoreRegistry } from '../../api/store/registry/index.js';

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

async function collect<T>(iter: AsyncIterable<T>): Promise<T[]> {
	const items: T[] = [];
	for await (const item of iter) items.push(item);
	return items;
}

function getStore(stores: StoreResult): ConversationTurn[] {
	return stores.get('conversation')!.store.get() as ConversationTurn[];
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('conversationExtension', () => {
	function compileConversation() {
		const registry = new StoreRegistry();
		const seed = createEmptyStoreResult(registry);
		const compiler = combine(
			createCoreCompiler(),
			createStoreCompiler(seed),
		);
		return compile(compiler, conversationExtension());
	}

	it('records user message on prompt', async () => {
		const result = await compileConversation();

		const target = stubClient();
		const wrapped = apply(result.client, target);

		await collect(
			wrapped.prompt({
				message: {
					role: 'user',
					content: [{ type: 'text', text: 'hello' }],
				},
			}),
		);

		const turns = getStore(result.stores);
		expect(turns).toHaveLength(1);
		expect(turns[0]!.messages).toHaveLength(1);
		expect(turns[0]!.messages[0]!.role).toBe('user');
	});

	it('coalesces text chunks by messageId into one assistant message', async () => {
		const result = await compileConversation();

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

		const wrapped = apply(result.client, target);
		await collect(
			wrapped.prompt({
				message: {
					role: 'user',
					content: [{ type: 'text', text: 'hi' }],
				},
			}),
		);

		const turns = getStore(result.stores);
		expect(turns).toHaveLength(1);
		// user message + one coalesced assistant message
		expect(turns[0]!.messages).toHaveLength(2);
		const assistantMsg = turns[0]!.messages[1]!;
		expect(assistantMsg.role).toBe('assistant');
		expect(assistantMsg.content).toHaveLength(2);
	});

	it('coalesces thinking and text chunks into the same assistant message', async () => {
		const result = await compileConversation();

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

		const wrapped = apply(result.client, target);
		await collect(
			wrapped.prompt({
				message: {
					role: 'user',
					content: [{ type: 'text', text: 'hi' }],
				},
			}),
		);

		const turns = getStore(result.stores);
		const messages = turns[0]!.messages;
		// user + one assistant message with mixed content
		expect(messages).toHaveLength(2);
		const assistantMsg = messages[1]!;
		expect(assistantMsg.role).toBe('assistant');
		expect(assistantMsg.content).toHaveLength(2);
		expect(assistantMsg.content[0]!.type).toBe('thinking');
		expect(assistantMsg.content[1]!.type).toBe('text');
	});

	it('different messageIds create separate assistant messages', async () => {
		const result = await compileConversation();

		const chunk1: Chunk = {
			type: 'chunk',
			messageId: 'm1',
			role: 'assistant',
			content: { type: 'text', text: 'first' },
		};
		const chunk2: Chunk = {
			type: 'chunk',
			messageId: 'm2',
			role: 'assistant',
			content: { type: 'text', text: 'second' },
		};

		const target = stubClient({
			prompt: async function* () {
				yield chunk1;
				yield chunk2;
			},
		});

		const wrapped = apply(result.client, target);
		await collect(
			wrapped.prompt({
				message: {
					role: 'user',
					content: [{ type: 'text', text: 'hi' }],
				},
			}),
		);

		const turns = getStore(result.stores);
		const messages = turns[0]!.messages;
		// user + two separate assistant messages
		expect(messages).toHaveLength(3);
		expect(messages[1]!.role).toBe('assistant');
		expect(messages[2]!.role).toBe('assistant');
	});

	it('records toolCall chunks as content within assistant message', async () => {
		const result = await compileConversation();

		const toolUpdate: Update = {
			type: 'update',
			message: {
				role: 'assistant',
				content: [
					{
						type: 'toolCall',
						id: 'tc1',
						name: 'read_file',
						arguments: { path: '/foo' },
					},
				],
			},
		};

		const target = stubClient({
			prompt: async function* () {
				yield toolUpdate;
			},
		});

		const wrapped = apply(result.client, target);
		await collect(
			wrapped.prompt({
				message: {
					role: 'user',
					content: [{ type: 'text', text: 'hi' }],
				},
			}),
		);

		const turns = getStore(result.stores);
		const messages = turns[0]!.messages;
		// user + assistant with toolCall content
		expect(messages).toHaveLength(2);
		const assistantMsg = messages[1]!;
		expect(assistantMsg.role).toBe('assistant');
		expect(assistantMsg.content[0]!.type).toBe('toolCall');
	});

	it('multiple turns from multiple prompt calls', async () => {
		const result = await compileConversation();

		const target = stubClient();
		const wrapped = apply(result.client, target);

		// First prompt
		await collect(
			wrapped.prompt({
				message: {
					role: 'user',
					content: [{ type: 'text', text: 'first' }],
				},
			}),
		);

		// Second prompt
		await collect(
			wrapped.prompt({
				message: {
					role: 'user',
					content: [{ type: 'text', text: 'second' }],
				},
			}),
		);

		const turns = getStore(result.stores);
		expect(turns).toHaveLength(2);
	});
});
