import type { StreamEvent } from '@franklin/mini-acp';
import {
	createMockMiniACP,
	textChunkStream,
	turn,
	turnEnd,
} from '@franklin/mini-acp/mock';
import { describe, expect, it } from 'vitest';

import { combineAll } from '../../harness/modules/combine.js';
import { createRuntime } from '../../harness/modules/create.js';
import { createCoreModule } from '../../modules/core/module.js';
import { StoreRegistry } from '../../modules/store/api/registry/index.js';
import { createStoreModule } from '../../modules/store/module.js';
import { conversationExtension } from '../conversation/bundle.js';

type RaceWinner = 'subscriber-processed' | 'prompt-drained';

const TOKEN_INTERVAL_MS = 5;
const CHUNK_COUNT = 24;
const TOKEN_TEXT = 'x'.repeat(CHUNK_COUNT);
const BLOCKER = new Int32Array(new SharedArrayBuffer(4));

function blockFor(ms: number): void {
	if (ms <= 0) return;
	Atomics.wait(BLOCKER, 0, 0, Math.ceil(ms));
}

function pacedTurn() {
	return turn([
		textChunkStream(TOKEN_TEXT, {
			tokenizer: (text) => text.split(''),
			delayMs: (_chunk, index) => index * TOKEN_INTERVAL_MS,
			delayMode: 'elapsed',
		}),
		turnEnd(),
	]);
}

async function collect(iterable: AsyncIterable<StreamEvent>): Promise<void> {
	for await (const _event of iterable) {
		// Drain the prompt stream.
	}
}

async function createConversationRuntime() {
	const mock = createMockMiniACP({ defaultTurn: pacedTurn() });
	const module = combineAll([
		createCoreModule(mock.connector),
		createStoreModule(new StoreRegistry()),
	] as const);
	const runtime = await createRuntime(module, module.emptyState(), [
		conversationExtension.extension,
	]);
	return runtime;
}

describe('conversationExtension event loop integration', () => {
	it('lets subscriber macrotasks run when sync subscriber work stays below the token interval', async () => {
		const runtime = await createConversationRuntime();
		const store = runtime.getStore(conversationExtension.keys.conversation);
		let resolveSubscriber: (winner: RaceWinner) => void = () => {};
		const subscriberProcessed = new Promise<RaceWinner>((resolve) => {
			resolveSubscriber = resolve;
		});
		let scheduled = false;

		store.subscribe((turns) => {
			const latestBlock = turns.at(-1)?.response.blocks[0];
			if (!scheduled && latestBlock?.kind === 'text') {
				scheduled = true;
				setTimeout(() => resolveSubscriber('subscriber-processed'), 0);
			}
			blockFor(1);
		});

		try {
			const promptDrained = collect(
				runtime.prompt({
					role: 'user',
					content: [{ type: 'text', text: 'hi' }],
				}),
			).then((): RaceWinner => 'prompt-drained');

			await expect(
				Promise.race([subscriberProcessed, promptDrained]),
			).resolves.toBe('subscriber-processed');
		} finally {
			await runtime.dispose();
		}
	});

	it('lets subscriber macrotasks run even when sync subscriber work exceeds the token interval', async () => {
		const runtime = await createConversationRuntime();
		const store = runtime.getStore(conversationExtension.keys.conversation);
		let resolveSubscriber: (winner: RaceWinner) => void = () => {};
		const subscriberProcessed = new Promise<RaceWinner>((resolve) => {
			resolveSubscriber = resolve;
		});
		let scheduled = false;

		store.subscribe((turns) => {
			const latestBlock = turns.at(-1)?.response.blocks[0];
			if (!scheduled && latestBlock?.kind === 'text') {
				scheduled = true;
				setTimeout(() => resolveSubscriber('subscriber-processed'), 0);
			}
			blockFor(TOKEN_INTERVAL_MS + 3);
		});

		try {
			const promptDrained = collect(
				runtime.prompt({
					role: 'user',
					content: [{ type: 'text', text: 'hi' }],
				}),
			).then((): RaceWinner => 'prompt-drained');

			await expect(
				Promise.race([subscriberProcessed, promptDrained]),
			).resolves.toBe('subscriber-processed');
		} finally {
			await runtime.dispose();
		}
	});
});
