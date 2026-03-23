import { describe, it, expect, vi } from 'vitest';
import { createCoreCompiler } from '../../compile/core/compiler.js';
import { createStoreCompiler } from '../../compile/store/compiler.js';
import { compile, combine } from '../../compile/types.js';
import { apply } from '../../api/core/middleware/apply.js';
import type { MiniACPClient, Chunk, Update } from '@franklin/mini-acp';
import { conversationExtension } from '../conversation/extension.js';
import type { ConversationTurn } from '../conversation/types.js';

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

function getStore(result: any): ConversationTurn[] {
	return result.stores.get('conversation')!.store.get() as ConversationTurn[];
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('conversationExtension', () => {
	function compileConversation() {
		const compiler = combine(createCoreCompiler(), createStoreCompiler());
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

		const turns = getStore(result);
		expect(turns).toHaveLength(1);
		expect(turns[0]!.entries).toHaveLength(1);
		expect(turns[0]!.entries[0]!.type).toBe('user');
	});

	it('coalesces text chunks by messageId', async () => {
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

		const turns = getStore(result);
		expect(turns).toHaveLength(1);
		// user entry + one coalesced text entry
		expect(turns[0]!.entries).toHaveLength(2);
		const textEntry = turns[0]!.entries[1]!;
		expect(textEntry.type).toBe('text');
		expect((textEntry as any).content).toHaveLength(2);
	});

	it('separates thinking chunks from text chunks', async () => {
		const result = await compileConversation();

		const textChunk: Chunk = {
			type: 'chunk',
			messageId: 'm1',
			role: 'assistant',
			content: { type: 'text', text: 'visible' },
		};
		const thinkingChunk: Chunk = {
			type: 'chunk',
			messageId: 'm2',
			role: 'assistant',
			content: { type: 'thinking', text: 'reasoning...' },
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

		const turns = getStore(result);
		const entries = turns[0]!.entries;
		// user + thought + text = 3 entries
		expect(entries).toHaveLength(3);
		expect(entries[1]!.type).toBe('thought');
		expect(entries[2]!.type).toBe('text');
	});

	it('records toolCall chunks as tool call entries', async () => {
		const result = await compileConversation();

		const toolChunk: Chunk = {
			type: 'chunk',
			messageId: 'm1',
			role: 'assistant',
			content: {
				type: 'toolCall',
				id: 'tc1',
				name: 'read_file',
				arguments: { path: '/foo' },
			},
		};

		const target = stubClient({
			prompt: async function* () {
				yield toolChunk;
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

		const turns = getStore(result);
		const entries = turns[0]!.entries;
		// user + toolCall = 2
		expect(entries).toHaveLength(2);
		expect(entries[1]!.type).toBe('toolCall');
		expect((entries[1] as any).name).toBe('read_file');
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

		const turns = getStore(result);
		expect(turns).toHaveLength(2);
	});
});
